"use server";

import { uploadAdminBuffer } from "@/lib/admin-storage-upload";
import { getAdminPropertiesForList } from "@/lib/firebase-admin-queries";
import {
  cropAvatarFromScreenshot,
  extractTestimonialFromScreenshot,
} from "@/lib/review-screenshot-extract";
import type { ExtractedTestimonialFields } from "@/lib/review-screenshot-extract";

/** Forma que recibe el cliente: sin la caja normalizada interna, con la URL del avatar ya resuelta. */
export type TestimonialImportResult = Omit<ExtractedTestimonialFields, "avatarBox"> & {
  image?: string;
};

export async function extractTestimonialFromReviewScreenshot(
  formData: FormData
): Promise<{ success: boolean; data?: TestimonialImportResult; error?: string }> {
  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Sube o pega una captura de la reseña" };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "El archivo debe ser una imagen" };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "La imagen no puede superar 8 MB" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // La captura sólo es la entrada del análisis y no se conserva, así que se manda
    // en línea a Gemini en vez de subirla a Storage para que la vuelva a descargarla.
    const properties = await getAdminPropertiesForList().catch(() => []);
    const { avatarBox, ...data } = await extractTestimonialFromScreenshot(
      { buffer, mime: file.type || "image/jpeg" },
      properties.map((p) => ({ id: p.id, title: p.title }))
    );

    if (!data.text.trim()) {
      return {
        success: false,
        error:
          "No se detectó texto de la reseña. Prueba otra captura más nítida o completa.",
      };
    }

    // El avatar sí se conserva (a diferencia de la captura completa): es el
    // asset final que se mostrará en la tarjeta del testimonio.
    let image: string | undefined;
    if (avatarBox) {
      const cropped = await cropAvatarFromScreenshot(buffer, avatarBox);
      if (cropped) {
        image = await uploadAdminBuffer(cropped, "image/png", "testimonial-avatars");
      }
    }

    return { success: true, data: { ...data, image } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al analizar la imagen";
    return { success: false, error: message };
  }
}

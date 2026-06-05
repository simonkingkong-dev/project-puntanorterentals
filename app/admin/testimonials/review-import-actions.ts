"use server";

import { uploadAdminBuffer } from "@/lib/admin-storage-upload";
import { extractTestimonialFromScreenshot } from "@/lib/review-screenshot-extract";
import type { ExtractedTestimonialFields } from "@/lib/review-screenshot-extract";

export async function extractTestimonialFromReviewScreenshot(
  formData: FormData
): Promise<{ success: boolean; data?: ExtractedTestimonialFields; error?: string }> {
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
    const screenshotUrl = await uploadAdminBuffer(
      buffer,
      file.type || "image/jpeg",
      "testimonial-review-imports"
    );
    const data = await extractTestimonialFromScreenshot(screenshotUrl);
    if (!data.text.trim()) {
      return {
        success: false,
        error:
          "No se detectó texto de la reseña. Prueba otra captura más nítida o completa.",
      };
    }
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al analizar la imagen";
    return { success: false, error: message };
  }
}

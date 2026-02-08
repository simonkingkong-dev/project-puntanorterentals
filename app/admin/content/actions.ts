"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

const SITE_CONTENT_COLLECTION = "siteContent";

type ContentType = "text" | "textarea" | "image" | "url";

/**
 * Actualiza un campo del contenido del sitio usando Admin SDK.
 * Evita "Missing or insufficient permissions" al no depender del cliente Firestore.
 */
export async function updateSiteContentAdmin(
  section: string,
  key: string,
  value: string,
  type: ContentType = "text"
): Promise<{ success: boolean; error?: string }> {
  try {
    const snapshot = await adminDb
      .collection(SITE_CONTENT_COLLECTION)
      .where("section", "==", section)
      .where("key", "==", key)
      .limit(1)
      .get();

    const data = {
      section,
      key,
      value,
      type,
      updatedAt: new Date(),
    };

    if (snapshot.empty) {
      await adminDb.collection(SITE_CONTENT_COLLECTION).add(data);
    } else {
      const docRef = snapshot.docs[0].ref;
      await docRef.update(data);
    }

    revalidatePath("/admin/content");
    revalidatePath("/");
    revalidatePath("/about");
    return { success: true };
  } catch (error) {
    console.error("Error updating site content:", error);
    return { success: false, error: "Error al guardar el contenido" };
  }
}

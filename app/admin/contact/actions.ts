"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { ContactInfo } from "@/lib/types";

const CONTACT_INFO_COLLECTION = "contactInfo";

/**
 * Actualiza la información de contacto usando Admin SDK.
 * Permite escribir en Firestore sin depender de Firebase Auth en el cliente.
 */
export async function updateContactInfoAdmin(
  contactData: Omit<ContactInfo, "id" | "updatedAt">
): Promise<{ success: boolean; error?: string }> {
  try {
    const snapshot = await adminDb.collection(CONTACT_INFO_COLLECTION).limit(1).get();

    const dataToSave = {
      ...contactData,
      updatedAt: new Date(),
    };

    if (snapshot.empty) {
      await adminDb.collection(CONTACT_INFO_COLLECTION).add(dataToSave);
    } else {
      const docRef = snapshot.docs[0].ref;
      await docRef.update(dataToSave);
    }

    revalidatePath("/admin/contact");
    return { success: true };
  } catch (error) {
    console.error("Error updating contact info:", error);
    return { success: false, error: "Error al guardar la información de contacto" };
  }
}

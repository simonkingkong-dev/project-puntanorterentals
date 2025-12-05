"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { GlobalAmenity } from "@/lib/types";

// --- CREAR ---
export async function handleCreateAmenity(formData: Omit<GlobalAmenity, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    await adminDb.collection('globalAmenities').add({
      ...formData,
      createdAt: new Date(),
    });
    revalidatePath("/admin/amenities");
  } catch (error) {
    return { success: false, error: "Error al crear la amenidad." };
  }
  redirect("/admin/amenities");
}

// --- ACTUALIZAR ---
export type UpdateAmenityFormData = Partial<Omit<GlobalAmenity, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateAmenity(amenityId: string, formData: UpdateAmenityFormData) {
  if (!amenityId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('globalAmenities').doc(amenityId).update(formData);
    revalidatePath("/admin/amenities");
  } catch (error) {
    return { success: false, error: "Error al actualizar." };
  }
  redirect("/admin/amenities");
}

// --- BORRAR ---
export async function handleDeleteAmenity(amenityId: string) {
  if (!amenityId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('globalAmenities').doc(amenityId).delete();
    revalidatePath("/admin/amenities");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al borrar." };
  }
}
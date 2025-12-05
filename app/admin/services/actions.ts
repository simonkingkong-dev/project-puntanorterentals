"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin"; // Usamos el Admin SDK
import { Service } from "@/lib/types";

// --- CREAR ---
export async function handleCreateService(formData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    await adminDb.collection('services').add({
      ...formData,
      createdAt: new Date(),
    });
    revalidatePath("/admin/services");
  } catch (error) {
    console.error("Error creating service:", error);
    return { success: false, error: "Error al crear el servicio." };
  }
  redirect("/admin/services");
}

// --- ACTUALIZAR ---
export type UpdateServiceFormData = Partial<Omit<Service, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateService(serviceId: string, formData: UpdateServiceFormData) {
  if (!serviceId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('services').doc(serviceId).update({
      ...formData,
      // No actualizamos createdAt
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}/edit`);
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Error al actualizar el servicio." };
  }
  redirect("/admin/services");
}

// --- BORRAR ---
export async function handleDeleteService(serviceId: string) {
  if (!serviceId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('services').doc(serviceId).delete();
    revalidatePath("/admin/services");
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Error al borrar el servicio." };
  }
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { Property } from "@/lib/types";

export async function handleCreateProperty(formData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'availability'>) {
  try {
    // Generamos el slug automáticamente si no viene (seguridad extra)
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newProperty = {
      ...formData,
      slug,
      availability: {}, // Inicializamos disponibilidad vacía
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('properties').add(newProperty);

    revalidatePath("/admin/properties");
    // Redireccionamos después del éxito fuera del try-catch para evitar conflictos de Next.js
  } catch (error) {
    console.error("Error creating property:", error);
    return { success: false, error: "Error al crear la propiedad." };
  }
  
  redirect("/admin/properties");
}


// --- ACTUALIZAR ---

export type UpdatePropertyFormData = Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'availability'>>;

export async function handleUpdateProperty(propertyId: string, formData: UpdatePropertyFormData) {
  if (!propertyId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('properties').doc(propertyId).update({
      ...formData,
      updatedAt: new Date(),
    });

    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}/edit`);
    return { success: true };
  } catch (error) {
    console.error("Error updating property:", error);
    return { success: false, error: "Error al actualizar la propiedad." };
  }
}


// --- BORRAR ---

export async function handleDeleteProperty(propertyId: string) {
  if (!propertyId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('properties').doc(propertyId).delete();
    revalidatePath("/admin/properties");
    return { success: true };
  } catch (error) {
    console.error("Error deleting property:", error);
    return { success: false, error: "Error al borrar la propiedad." };
  }
}
// Archivo: app/admin/amenities/actions.ts

"use server"; // ¡Esto es clave! Marca este archivo como Server Actions

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation"; // Importar redirect
import { deleteGlobalAmenity, updateGlobalAmenity } from "@/lib/firebase/content"; // Importar updateGlobalAmenity
import { GlobalAmenity } from "@/lib/types"; // Importar el tipo

// --- NUEVA FUNCIÓN DE ACTUALIZACIÓN ---

// Definimos el tipo de datos que esperamos del formulario
export type UpdateAmenityFormData = Partial<Omit<GlobalAmenity, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateAmenity(amenityId: string, formData: UpdateAmenityFormData) {
  if (!amenityId) {
    return { success: false, error: "ID de amenidad no provisto." };
  }

  try {
    // 1. Llama a Firebase para actualizar
    await updateGlobalAmenity(amenityId, formData);
    
    // 2. Refresca la lista en la página de amenidades
    revalidatePath("/admin/amenities"); 
    
  } catch (error) {
    console.error("Error updating amenity:", error);
    return { success: false, error: "Error al actualizar la amenidad." };
  }

  // 3. Redirige al usuario de vuelta a la lista
  // Hacemos esto fuera del try/catch para asegurar que ocurra si no hay error
  redirect("/admin/amenities");
}

// --- FUNCIÓN DE BORRADO EXISTENTE ---

export async function handleDeleteAmenity(amenityId: string) {
  if (!amenityId) {
    return { success: false, error: "ID de amenidad no provisto." };
  }
  try {
    await deleteGlobalAmenity(amenityId);
    revalidatePath("/admin/amenities"); 
    return { success: true };
  } catch (error) {
    console.error("Error deleting amenity:", error);
    return { success: false, error: "Error al borrar la amenidad." };
  }
}
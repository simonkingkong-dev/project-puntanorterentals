// Archivo: app/admin/amenities/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation"; // <--- AÑADIR import
import { deleteGlobalAmenity, updateGlobalAmenity } from "@/lib/firebase/content"; // <--- AÑADIR updateGlobalAmenity
import { GlobalAmenity } from "@/lib/types"; // <--- AÑADIR import

// --- CORREGIDO: AÑADE ESTA NUEVA FUNCIÓN ---

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
// --- FIN DE LA NUEVA FUNCIÓN ---


export async function handleDeleteAmenity(amenityId: string) {
  // ... (Tu función de borrado existente) ...
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
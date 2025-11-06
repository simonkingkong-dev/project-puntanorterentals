// Archivo: app/admin/properties/actions.ts

"use server"; 

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteProperty, updateProperty } from "@/lib/firebase/properties"; 
import { Property } from "@/lib/types"; 

// --- NUEVA FUNCIÓN DE ACTUALIZACIÓN ---

// Definimos el tipo de datos que esperamos del formulario de edición
export type UpdatePropertyFormData = Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'availability'>>;

export async function handleUpdateProperty(propertyId: string, formData: UpdatePropertyFormData) {
  if (!propertyId) {
    return { success: false, error: "ID de propiedad no provisto." };
  }

  try {
    // 1. Llama a Firebase para actualizar
    // El slug y la disponibilidad se manejan por separado, no en este formulario.
    await updateProperty(propertyId, formData);
    
    // 2. Refresca la lista en la página de propiedades
    revalidatePath("/admin/properties"); 
    // También refresca la página de edición
    revalidatePath(`/admin/properties/${propertyId}/edit`); 
    
  } catch (error) {
    console.error("Error updating property:", error);
    return { success: false, error: "Error al actualizar la propiedad." };
  }

  // 3. Redirige al usuario de vuelta a la lista
  redirect("/admin/properties");
}


// --- FUNCIÓN DE BORRADO EXISTENTE ---

export async function handleDeleteProperty(propertyId: string) {
  if (!propertyId) {
    return { success: false, error: "ID de propiedad no provisto." };
  }

  try {
    await deleteProperty(propertyId);
    revalidatePath("/admin/properties"); 
    return { success: true };
  } catch (error) {
    console.error("Error deleting property:", error);
    return { success: false, error: "Error al borrar la propiedad." };
  }
}
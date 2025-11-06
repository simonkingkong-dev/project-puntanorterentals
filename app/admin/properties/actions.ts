// Archivo: app/admin/properties/actions.ts

"use server"; // ¡Importante!

import { revalidatePath } from "next/cache";
import { deleteProperty } from "@/lib/firebase/properties"; // Importamos la nueva función

export async function handleDeleteProperty(propertyId: string) {
  if (!propertyId) {
    return { success: false, error: "ID de propiedad no provisto." };
  }

  try {
    // 1. Llama a Firebase para borrar
    await deleteProperty(propertyId);
    
    // 2. Refresca la lista en la página de propiedades
    revalidatePath("/admin/properties"); 
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting property:", error);
    return { success: false, error: "Error al borrar la propiedad." };
  }
}
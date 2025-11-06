// Archivo: app/admin/services/actions.ts

"use server"; // ¡Importante!

import { revalidatePath } from "next/cache";
import { deleteService } from "@/lib/firebase/services"; // Importamos la nueva función

export async function handleDeleteService(serviceId: string) {
  if (!serviceId) {
    return { success: false, error: "ID de servicio no provisto." };
  }

  try {
    // 1. Llama a Firebase para borrar
    await deleteService(serviceId);
    
    // 2. Refresca la lista en la página de servicios
    revalidatePath("/admin/services"); 
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Error al borrar el servicio." };
  }
}
// Archivo: app/admin/services/actions.ts

"use server"; 

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation"; // <--- AÑADIR import
import { deleteService, updateService } from "@/lib/firebase/services"; // <--- AÑADIR updateService
import { Service } from "@/lib/types"; // <--- AÑADIR import

// --- CORREGIDO: AÑADE ESTA NUEVA FUNCIÓN ---

// Definimos el tipo de datos que esperamos del formulario
export type UpdateServiceFormData = Partial<Omit<Service, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateService(serviceId: string, formData: UpdateServiceFormData) {
  if (!serviceId) {
    return { success: false, error: "ID de servicio no provisto." };
  }

  try {
    // 1. Llama a Firebase para actualizar
    await updateService(serviceId, formData);
    
    // 2. Refresca la lista en la página de servicios
    revalidatePath("/admin/services"); 
    
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Error al actualizar el servicio." };
  }

  // 3. Redirige al usuario de vuelta a la lista
  redirect("/admin/services");
}

// --- Tu función handleDeleteService existente ---
export async function handleDeleteService(serviceId: string) {
  if (!serviceId) {
    return { success: false, error: "ID de servicio no provisto." };
  }

  try {
    await deleteService(serviceId);
    revalidatePath("/admin/services"); 
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Error al borrar el servicio." };
  }
}
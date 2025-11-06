// Archivo: app/admin/testimonials/actions.ts

"use server"; // ¡Importante!

import { revalidatePath } from "next/cache";
// Importamos la función de borrado que ya existe
import { deleteTestimonial } from "@/lib/firebase/content"; 

export async function handleDeleteTestimonial(testimonialId: string) {
  if (!testimonialId) {
    return { success: false, error: "ID de testimonio no provisto." };
  }

  try {
    // 1. Llama a Firebase para borrar
    await deleteTestimonial(testimonialId);
    
    // 2. Refresca la lista en la página de testimonios
    revalidatePath("/admin/testimonials"); 
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return { success: false, error: "Error al borrar el testimonio." };
  }
}
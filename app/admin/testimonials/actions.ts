// Archivo: app/admin/testimonials/actions.ts

"use server"; 

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// CORREGIDO: Añadir 'updateTestimonial'
import { deleteTestimonial, updateTestimonial } from "@/lib/firebase/content"; 
import { Testimonial } from "@/lib/types"; // <--- AÑADIR import

// --- CORREGIDO: AÑADE ESTA NUEVA FUNCIÓN ---

// Definimos el tipo de datos que esperamos del formulario
export type UpdateTestimonialFormData = Partial<Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateTestimonial(testimonialId: string, formData: UpdateTestimonialFormData) {
  if (!testimonialId) {
    return { success: false, error: "ID de testimonio no provisto." };
  }

  try {
    // 1. Llama a Firebase para actualizar
    await updateTestimonial(testimonialId, formData);
    
    // 2. Refresca la lista en la página de testimonios
    revalidatePath("/admin/testimonials"); 
    
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return { success: false, error: "Error al actualizar el testimonio." };
  }

  // 3. Redirige al usuario de vuelta a la lista
  redirect("/admin/testimonials");
}

// --- Tu función handleDeleteTestimonial existente ---
export async function handleDeleteTestimonial(testimonialId: string) {
  if (!testimonialId) {
    return { success: false, error: "ID de testimonio no provisto." };
  }
  try {
    await deleteTestimonial(testimonialId);
    revalidatePath("/admin/testimonials"); 
    return { success: true };
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return { success: false, error: "Error al borrar el testimonio." };
  }
}
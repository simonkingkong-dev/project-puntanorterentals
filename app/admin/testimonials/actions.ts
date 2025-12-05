"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { Testimonial } from "@/lib/types";

// --- CREAR ---
export async function handleCreateTestimonial(formData: Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    await adminDb.collection('testimonials').add({
      ...formData,
      createdAt: new Date(),
    });
    revalidatePath("/admin/testimonials");
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return { success: false, error: "Error al crear el testimonio." };
  }
  redirect("/admin/testimonials");
}

// --- ACTUALIZAR ---
export type UpdateTestimonialFormData = Partial<Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'>>;

export async function handleUpdateTestimonial(testimonialId: string, formData: UpdateTestimonialFormData) {
  if (!testimonialId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('testimonials').doc(testimonialId).update({
      ...formData,
    });
    revalidatePath("/admin/testimonials");
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return { success: false, error: "Error al actualizar." };
  }
  redirect("/admin/testimonials");
}

// --- BORRAR ---
export async function handleDeleteTestimonial(testimonialId: string) {
  if (!testimonialId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('testimonials').doc(testimonialId).delete();
    revalidatePath("/admin/testimonials");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al borrar." };
  }
}
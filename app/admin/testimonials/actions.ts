"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { Testimonial } from "@/lib/types";

type TestimonialWriteData = Omit<Testimonial, "id" | "createdAt">;

function normalizePropertyId(propertyId?: string): string | undefined {
  const trimmed = propertyId?.trim();
  return trimmed ? trimmed : undefined;
}

async function revalidateTestimonialPaths(propertyIds: Array<string | undefined>) {
  revalidatePath("/admin/testimonials");
  revalidatePath("/");

  const uniqueIds = [...new Set(propertyIds.filter(Boolean))] as string[];
  await Promise.all(
    uniqueIds.map(async (id) => {
      const snap = await adminDb.collection("properties").doc(id).get();
      const slug = snap.data()?.slug as string | undefined;
      if (slug) revalidatePath(`/properties/${slug}`);
    })
  );
}

function buildCreatePayload(formData: TestimonialWriteData) {
  const propertyId = normalizePropertyId(formData.propertyId);
  const { propertyId: _omit, ...rest } = formData;
  return {
    ...rest,
    ...(propertyId ? { propertyId } : {}),
    createdAt: new Date(),
  };
}

function buildUpdatePayload(formData: UpdateTestimonialFormData) {
  const payload: Record<string, unknown> = { ...formData };

  if ("propertyId" in formData) {
    const propertyId = normalizePropertyId(formData.propertyId);
    delete payload.propertyId;
    if (propertyId) {
      payload.propertyId = propertyId;
    } else {
      payload.propertyId = FieldValue.delete();
    }
  }

  return payload;
}

// --- CREAR ---
export async function handleCreateTestimonial(formData: TestimonialWriteData) {
  const propertyId = normalizePropertyId(formData.propertyId);

  try {
    await adminDb.collection("testimonials").add(buildCreatePayload(formData));
    await revalidateTestimonialPaths([propertyId]);
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return { success: false, error: "Error al crear el testimonio." };
  }
  redirect("/admin/testimonials");
}

// --- ACTUALIZAR ---
export type UpdateTestimonialFormData = Partial<TestimonialWriteData>;

export async function handleUpdateTestimonial(
  testimonialId: string,
  formData: UpdateTestimonialFormData
) {
  if (!testimonialId) return { success: false, error: "ID requerido" };

  const previousSnap = await adminDb.collection("testimonials").doc(testimonialId).get();
  const previousPropertyId = previousSnap.data()?.propertyId as string | undefined;
  const nextPropertyId =
    "propertyId" in formData
      ? normalizePropertyId(formData.propertyId)
      : previousPropertyId;

  try {
    await adminDb
      .collection("testimonials")
      .doc(testimonialId)
      .update(buildUpdatePayload(formData));
    await revalidateTestimonialPaths([previousPropertyId, nextPropertyId]);
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
    const snap = await adminDb.collection("testimonials").doc(testimonialId).get();
    const propertyId = snap.data()?.propertyId as string | undefined;
    await adminDb.collection("testimonials").doc(testimonialId).delete();
    await revalidateTestimonialPaths([propertyId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al borrar." };
  }
}

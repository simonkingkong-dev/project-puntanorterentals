"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { BUSINESS_REVIEW_PLATFORM_STATS_DOC } from "@/lib/business-review-platform-stats";
import { normalizePlatformAverageRating } from "@/lib/review-platform-stats";
import type { PropertyReviewChannel, Testimonial } from "@/lib/types";

const REVIEW_CHANNELS: PropertyReviewChannel[] = [
  "airbnb",
  "booking",
  "google",
  "vrbo",
  "tripadvisor",
  "other",
];

function isReviewChannel(v: string): v is PropertyReviewChannel {
  return (REVIEW_CHANNELS as string[]).includes(v);
}

async function revalidateAllPropertyPublicPages() {
  const snapshot = await adminDb.collection("properties").get();
  for (const doc of snapshot.docs) {
    const slug = doc.data()?.slug;
    if (slug) revalidatePath(`/properties/${slug}`);
  }
  revalidatePath("/");
  revalidateTag("guest-ratings", "max");
}

type TestimonialWriteData = Omit<Testimonial, "id" | "createdAt">;

function normalizePropertyId(propertyId?: string): string | undefined {
  const trimmed = propertyId?.trim();
  return trimmed ? trimmed : undefined;
}

async function revalidateTestimonialPaths(propertyIds: Array<string | undefined>) {
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  await revalidateAllPropertyPublicPages();

  const uniqueIds = Array.from(new Set(propertyIds.filter(Boolean))) as string[];
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

export async function saveBusinessReviewPlatformStat(data: {
  channel: PropertyReviewChannel;
  averageRating: number;
  reviewCount: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!isReviewChannel(data.channel)) return { success: false, error: "Canal inválido" };

  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const existing = (snap.data()?.stats ?? {}) as Record<string, { status?: string }>;

  await docRef.set(
    {
      stats: {
        ...existing,
        [data.channel]: {
          channel: data.channel,
          averageRating: normalizePlatformAverageRating(data.averageRating),
          reviewCount: Math.max(0, Math.round(data.reviewCount)),
          screenshotUrl: "",
          status: existing[data.channel]?.status ?? "draft",
          updatedAt: new Date(),
        },
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
}

export async function publishBusinessReviewPlatformStat(channel: PropertyReviewChannel) {
  if (!isReviewChannel(channel)) return { success: false, error: "Canal inválido" };

  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const stats = (snap.data()?.stats ?? {}) as Record<string, Record<string, unknown>>;
  const row = stats[channel];
  if (!row) return { success: false, error: "Guarda el canal antes de publicar" };

  await docRef.set(
    {
      stats: {
        ...stats,
        [channel]: { ...row, status: "published", updatedAt: new Date() },
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
}

export async function unpublishBusinessReviewPlatformStat(channel: PropertyReviewChannel) {
  if (!isReviewChannel(channel)) return { success: false, error: "Canal inválido" };

  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const stats = (snap.data()?.stats ?? {}) as Record<string, Record<string, unknown>>;
  const row = stats[channel];
  if (!row) return { success: false, error: "No encontrado" };

  await docRef.set(
    {
      stats: {
        ...stats,
        [channel]: { ...row, status: "draft", updatedAt: new Date() },
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
}

export async function saveGlobalReviewAggregate(data: {
  averageRating: number;
  reviewCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const currentStatus =
    (snap.data()?.aggregateOverride as { status?: string } | undefined)?.status ?? "draft";

  await docRef.set(
    {
      aggregateOverride: {
        averageRating: normalizePlatformAverageRating(data.averageRating),
        reviewCount: Math.max(0, Math.round(data.reviewCount)),
        status: currentStatus,
        updatedAt: new Date(),
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
}

export async function publishGlobalReviewAggregate() {
  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const current = snap.data()?.aggregateOverride as Record<string, unknown> | undefined;
  if (!current) return { success: false, error: "Guarda el acumulado antes de publicar" };

  await docRef.set(
    {
      aggregateOverride: {
        ...current,
        status: "published",
        updatedAt: new Date(),
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
}

export async function unpublishGlobalReviewAggregate() {
  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const current = snap.data()?.aggregateOverride as Record<string, unknown> | undefined;
  if (!current) return { success: false, error: "No hay acumulado guardado" };

  await docRef.set(
    {
      aggregateOverride: {
        ...current,
        status: "draft",
        updatedAt: new Date(),
      },
    },
    { merge: true }
  );

  revalidatePath("/admin/testimonials");
  await revalidateAllPropertyPublicPages();
  return { success: true };
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

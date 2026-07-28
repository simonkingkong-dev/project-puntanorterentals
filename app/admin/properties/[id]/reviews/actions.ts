"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { uploadAdminBuffer } from "@/lib/admin-storage-upload";
import { extractPlatformStatsFromScreenshot, extractReviewFromScreenshot } from "@/lib/review-screenshot-extract";
import { normalizePlatformAverageRating } from "@/lib/review-platform-stats";
import type { PropertyReview, PropertyReviewChannel } from "@/lib/types";

const CHANNELS: PropertyReviewChannel[] = [
  "airbnb",
  "booking",
  "google",
  "vrbo",
  "tripadvisor",
  "other",
];

function isChannel(v: string): v is PropertyReviewChannel {
  return (CHANNELS as string[]).includes(v);
}

async function revalidatePropertyPublicPage(propertyId: string) {
  const prop = await adminDb.collection("properties").doc(propertyId).get();
  const slug = prop.data()?.slug;
  if (slug) revalidatePath(`/properties/${slug}`);
}

async function unpublishOtherPlatformStats(
  propertyId: string,
  channel: PropertyReviewChannel,
  exceptId?: string
) {
  const snapshot = await adminDb
    .collection("property_review_stats")
    .where("propertyId", "==", propertyId)
    .where("channel", "==", channel)
    .where("status", "==", "published")
    .get();

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    if (doc.id !== exceptId) {
      batch.update(doc.ref, { status: "draft" });
    }
  });
  await batch.commit();
}

export async function uploadAndExtractPropertyReviews(
  propertyId: string,
  formData: FormData
): Promise<{ success: boolean; created: number; error?: string }> {
  if (!propertyId) return { success: false, created: 0, error: "ID de propiedad requerido" };

  const entries = formData.getAll("screenshots");
  const channels = formData.getAll("channels").map(String);

  if (entries.length === 0) {
    return { success: false, created: 0, error: "Sube al menos un screenshot" };
  }

  const propertySnap = await adminDb.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) {
    return { success: false, created: 0, error: "Propiedad no encontrada" };
  }

  const existing = await adminDb
    .collection("property_reviews")
    .where("propertyId", "==", propertyId)
    .get();
  let sortBase = existing.size;

  let created = 0;

  for (let i = 0; i < entries.length; i++) {
    const file = entries[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const channelRaw = channels[i] ?? "other";
    const channel = isChannel(channelRaw) ? channelRaw : "other";

    const buffer = Buffer.from(await file.arrayBuffer());
    const screenshotUrl = await uploadAdminBuffer(
      buffer,
      file.type || "image/jpeg",
      `property-reviews/${propertyId}`
    );

    let extracted;
    try {
      extracted = await extractReviewFromScreenshot({
        buffer,
        mime: file.type || "image/jpeg",
      });
    } catch {
      extracted = {
        author: "Huésped",
        rating: 5,
        text: "",
        locale: "es" as const,
      };
    }

    await adminDb.collection("property_reviews").add({
      propertyId,
      channel,
      author: extracted.author,
      rating: extracted.rating,
      text: extracted.text,
      reviewDate: extracted.reviewDate ?? null,
      locale: extracted.locale ?? "es",
      screenshotUrl,
      status: "draft",
      sortOrder: sortBase++,
      extractedBy: process.env.GEMINI_API_KEY ? "ai" : "manual",
      createdAt: new Date(),
    });
    created++;
  }

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  revalidatePath(`/properties/${propertySnap.data()?.slug}`);

  return { success: true, created };
}

export async function updatePropertyReview(
  reviewId: string,
  propertyId: string,
  data: {
    author: string;
    rating: number;
    text: string;
    reviewDate?: string;
    channel: PropertyReviewChannel;
    sortOrder: number;
  }
) {
  if (!reviewId || !propertyId) return { success: false, error: "IDs requeridos" };

  await adminDb.collection("property_reviews").doc(reviewId).update({
    author: data.author.trim(),
    rating: Math.min(5, Math.max(1, Math.round(data.rating))),
    text: data.text.trim(),
    reviewDate: data.reviewDate?.trim() || null,
    channel: data.channel,
    sortOrder: data.sortOrder,
  });

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  return { success: true };
}

export async function publishPropertyReview(reviewId: string, propertyId: string) {
  await adminDb.collection("property_reviews").doc(reviewId).update({ status: "published" });
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function unpublishPropertyReview(reviewId: string, propertyId: string) {
  await adminDb.collection("property_reviews").doc(reviewId).update({ status: "draft" });
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function deletePropertyReview(reviewId: string, propertyId: string) {
  await adminDb.collection("property_reviews").doc(reviewId).delete();
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function createPropertyReviewPlatformStatManual(
  propertyId: string,
  data: {
    channel: PropertyReviewChannel;
    averageRating: number;
    reviewCount: number;
  }
): Promise<{ success: boolean; statId?: string; error?: string }> {
  if (!propertyId) return { success: false, error: "ID de propiedad requerido" };
  if (!isChannel(data.channel)) return { success: false, error: "Canal inválido" };

  const propertySnap = await adminDb.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) return { success: false, error: "Propiedad no encontrada" };

  const ref = await adminDb.collection("property_review_stats").add({
    propertyId,
    channel: data.channel,
    averageRating: normalizePlatformAverageRating(data.averageRating),
    reviewCount: Math.max(0, Math.round(data.reviewCount)),
    screenshotUrl: "",
    status: "draft",
    extractedBy: "manual",
    createdAt: new Date(),
  });

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true, statId: ref.id };
}

export async function uploadAndExtractPropertyReviewStats(
  propertyId: string,
  formData: FormData
): Promise<{ success: boolean; created: number; error?: string }> {
  if (!propertyId) return { success: false, created: 0, error: "ID de propiedad requerido" };

  const entries = formData.getAll("statScreenshots");
  const channels = formData.getAll("statChannels").map(String);

  if (entries.length === 0) {
    return { success: false, created: 0, error: "Sube al menos un screenshot de promedio" };
  }

  const propertySnap = await adminDb.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) {
    return { success: false, created: 0, error: "Propiedad no encontrada" };
  }

  let created = 0;

  for (let i = 0; i < entries.length; i++) {
    const file = entries[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const channelRaw = channels[i] ?? "other";
    const channel = isChannel(channelRaw) ? channelRaw : "other";

    const buffer = Buffer.from(await file.arrayBuffer());
    const screenshotUrl = await uploadAdminBuffer(
      buffer,
      file.type || "image/jpeg",
      `property-review-stats/${propertyId}`
    );

    let extracted;
    try {
      extracted = await extractPlatformStatsFromScreenshot({
        buffer,
        mime: file.type || "image/jpeg",
      });
    } catch {
      extracted = {
        averageRating: 5,
        reviewCount: 0,
      };
    }

    await adminDb.collection("property_review_stats").add({
      propertyId,
      channel,
      averageRating: normalizePlatformAverageRating(extracted.averageRating),
      reviewCount: Math.max(0, Math.round(extracted.reviewCount)),
      screenshotUrl,
      status: "draft",
      extractedBy: process.env.GEMINI_API_KEY ? "ai" : "manual",
      createdAt: new Date(),
    });
    created++;
  }

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);

  return { success: true, created };
}

export async function updatePropertyReviewPlatformStat(
  statId: string,
  propertyId: string,
  data: {
    channel: PropertyReviewChannel;
    averageRating: number;
    reviewCount: number;
  }
) {
  if (!statId || !propertyId) return { success: false, error: "IDs requeridos" };

  await adminDb.collection("property_review_stats").doc(statId).update({
    channel: data.channel,
    averageRating: normalizePlatformAverageRating(data.averageRating),
    reviewCount: Math.max(0, Math.round(data.reviewCount)),
  });

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function publishPropertyReviewPlatformStat(statId: string, propertyId: string) {
  const snap = await adminDb.collection("property_review_stats").doc(statId).get();
  if (!snap.exists) return { success: false, error: "No encontrado" };

  const channel = snap.data()?.channel as PropertyReviewChannel;
  await unpublishOtherPlatformStats(propertyId, channel, statId);
  await adminDb.collection("property_review_stats").doc(statId).update({ status: "published" });

  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function unpublishPropertyReviewPlatformStat(statId: string, propertyId: string) {
  await adminDb.collection("property_review_stats").doc(statId).update({ status: "draft" });
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

export async function deletePropertyReviewPlatformStat(statId: string, propertyId: string) {
  await adminDb.collection("property_review_stats").doc(statId).delete();
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  await revalidatePropertyPublicPage(propertyId);
  return { success: true };
}

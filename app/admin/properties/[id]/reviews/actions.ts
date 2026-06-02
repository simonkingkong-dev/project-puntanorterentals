"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { uploadAdminBuffer } from "@/lib/admin-storage-upload";
import { extractReviewFromScreenshot } from "@/lib/review-screenshot-extract";
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
      extracted = await extractReviewFromScreenshot(screenshotUrl);
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
  const prop = await adminDb.collection("properties").doc(propertyId).get();
  const slug = prop.data()?.slug;
  if (slug) revalidatePath(`/properties/${slug}`);
  return { success: true };
}

export async function unpublishPropertyReview(reviewId: string, propertyId: string) {
  await adminDb.collection("property_reviews").doc(reviewId).update({ status: "draft" });
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  const prop = await adminDb.collection("properties").doc(propertyId).get();
  const slug = prop.data()?.slug;
  if (slug) revalidatePath(`/properties/${slug}`);
  return { success: true };
}

export async function deletePropertyReview(reviewId: string, propertyId: string) {
  await adminDb.collection("property_reviews").doc(reviewId).delete();
  revalidatePath(`/admin/properties/${propertyId}/reviews`);
  return { success: true };
}

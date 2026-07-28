"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { syncRevyoosReviews, type RevyoosSyncResult } from "@/lib/revyoos/sync";
import {
  autoSelectRealisticForProperty,
  autoSelectRealisticForHome,
} from "@/lib/revyoos/manage";

export async function syncRevyoosReviewsAction(): Promise<
  { success: true; result: RevyoosSyncResult } | { success: false; error: string }
> {
  try {
    const result = await syncRevyoosReviews();
    revalidatePath("/admin/testimonials");
    revalidatePath("/admin/properties");
    return { success: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al sincronizar Revyoos";
    return { success: false, error: message };
  }
}

async function revalidatePropertyPageForReview(reviewId: string) {
  const snap = await adminDb.collection("revyoos_reviews").doc(reviewId).get();
  const propertyId = snap.data()?.propertyId as string | undefined;
  if (!propertyId) return;
  const propSnap = await adminDb.collection("properties").doc(propertyId).get();
  const slug = propSnap.data()?.slug as string | undefined;
  if (slug) revalidatePath(`/properties/${slug}`);
}

type ActionResult = { success: true } | { success: false; error: string };

export async function setRevyoosReviewPublishedAction(
  reviewId: string,
  published: boolean
): Promise<ActionResult> {
  try {
    await adminDb
      .collection("revyoos_reviews")
      .doc(reviewId)
      .update({ status: published ? "published" : "draft" });
    await revalidatePropertyPageForReview(reviewId);
    revalidatePath("/admin/testimonials/revyoos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

export async function setRevyoosReviewFeaturedAction(
  reviewId: string,
  featured: boolean
): Promise<ActionResult> {
  try {
    await adminDb.collection("revyoos_reviews").doc(reviewId).update({ featuredOnHome: featured });
    revalidatePath("/");
    revalidatePath("/admin/testimonials/revyoos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

/** `displayText` vacío borra el override y vuelve a mostrar el texto original de la plataforma. */
export async function updateRevyoosReviewDisplayTextAction(
  reviewId: string,
  displayText: string
): Promise<ActionResult> {
  try {
    const trimmed = displayText.trim();
    await adminDb
      .collection("revyoos_reviews")
      .doc(reviewId)
      .update({ displayText: trimmed || FieldValue.delete() });
    await revalidatePropertyPageForReview(reviewId);
    revalidatePath("/");
    revalidatePath("/admin/testimonials/revyoos");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

export async function autoSelectRealisticForPropertyAction(
  propertyId: string
): Promise<{ success: true; selectedCount: number; totalCount: number } | { success: false; error: string }> {
  try {
    const result = await autoSelectRealisticForProperty(propertyId);
    const propSnap = await adminDb.collection("properties").doc(propertyId).get();
    const slug = propSnap.data()?.slug as string | undefined;
    if (slug) revalidatePath(`/properties/${slug}`);
    revalidatePath("/admin/testimonials/revyoos");
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al auto-seleccionar" };
  }
}

export async function autoSelectRealisticForHomeAction(): Promise<
  { success: true; selectedCount: number; totalCount: number } | { success: false; error: string }
> {
  try {
    const result = await autoSelectRealisticForHome();
    revalidatePath("/");
    revalidatePath("/admin/testimonials/revyoos");
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al auto-seleccionar" };
  }
}

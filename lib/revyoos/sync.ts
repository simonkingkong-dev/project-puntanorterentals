/**
 * Sincroniza las reseñas de Revyoos hacia Firestore (`revyoos_reviews`).
 * Idempotente: cada reseña se guarda con su `externalId` de Revyoos como id
 * de documento, así que volver a correr el sync sólo actualiza/agrega, nunca duplica.
 */
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { getAdminProperties } from "@/lib/firebase-admin-queries";
import { BUSINESS_REVIEW_PLATFORM_STATS_DOC } from "@/lib/business-review-platform-stats";
import { normalizePlatformAverageRating } from "@/lib/review-platform-stats";
import {
  fetchAllRevyoosReviews,
  normalizeRevyoosPlatform,
  stripReviewHtml,
  type RevyoosRawReview,
} from "@/lib/revyoos/client";
import type { PropertyReviewChannel } from "@/lib/types";

const FIRESTORE_BATCH_LIMIT = 500;
const REVYOOS_COLLECTION = "revyoos_reviews";

export interface RevyoosSyncResult {
  totalFetched: number;
  imported: number;
  unmappedHoldings: Array<{ holdingId: string; holdingName: string; count: number }>;
  byProperty: Record<string, number>;
}

function buildDocPayload(raw: RevyoosRawReview, propertyId: string, isNew: boolean) {
  const rating = Number(raw.score_reviews);
  const payload: Record<string, unknown> = {
    externalId: raw._id,
    propertyId,
    platform: normalizeRevyoosPlatform(raw.type_source_reviews) as PropertyReviewChannel,
    author: (raw.name_user_reviews ?? "").trim() || "Guest",
    avatarUrl: raw.img_user_reviews || null,
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
    title: (raw.title_reviews ?? "").trim() || null,
    text: stripReviewHtml(raw.content_reviews),
    ownerResponse: stripReviewHtml(raw.owner_response_reviews) || null,
    lang: raw.lang ?? null,
    reviewDate: new Date(raw.date),
    sourceUrl: raw.sourceUrl ?? null,
  };
  // Sólo se fijan en la primera escritura: en un re-sync, {merge:true} sin estos
  // campos deja intacta la curación manual del admin (status/featuredOnHome/displayText).
  if (isNew) {
    payload.status = "draft";
    payload.featuredOnHome = false;
  }
  return payload;
}

async function getExistingRevyoosReviewIds(): Promise<Set<string>> {
  const snapshot = await adminDb.collection(REVYOOS_COLLECTION).select().get();
  return new Set(snapshot.docs.map((d) => d.id));
}

async function upsertReviews(
  reviews: Array<{ raw: RevyoosRawReview; propertyId: string }>,
  existingIds: Set<string>
): Promise<number> {
  let written = 0;
  for (let i = 0; i < reviews.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = reviews.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const { raw, propertyId } of chunk) {
      const ref = adminDb.collection(REVYOOS_COLLECTION).doc(raw._id);
      batch.set(ref, buildDocPayload(raw, propertyId, !existingIds.has(raw._id)), { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

/** Actualiza el acumulado global (site_settings/business_review_platform_stats) con los números reales de Revyoos, sin tocar el estado draft/published que ya tenga el admin configurado. */
async function updateBusinessAggregate(meta: {
  rating: number;
  reviewCount: number;
  ratings: Array<{ type: string; rating: string; reviewCount: number }>;
}) {
  const docRef = adminDb.collection("site_settings").doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC);
  const snap = await docRef.get();
  const existingStats = (snap.data()?.stats ?? {}) as Record<string, { status?: string }>;
  const existingAggregate = snap.data()?.aggregateOverride as { status?: string } | undefined;

  const nextStats: Record<string, unknown> = { ...existingStats };
  for (const r of meta.ratings) {
    const channel = normalizeRevyoosPlatform(r.type);
    if (channel === "other") continue;
    nextStats[channel] = {
      channel,
      averageRating: normalizePlatformAverageRating(Number(r.rating)),
      reviewCount: Math.max(0, Math.round(r.reviewCount)),
      screenshotUrl: "",
      status: existingStats[channel]?.status ?? "draft",
      updatedAt: new Date(),
    };
  }

  await docRef.set(
    {
      stats: nextStats,
      aggregateOverride: {
        averageRating: normalizePlatformAverageRating(meta.rating),
        reviewCount: Math.max(0, Math.round(meta.reviewCount)),
        status: existingAggregate?.status ?? "draft",
        updatedAt: new Date(),
      },
    },
    { merge: true }
  );
}

export async function syncRevyoosReviews(): Promise<RevyoosSyncResult> {
  const [{ meta, reviews }, properties, existingIds] = await Promise.all([
    fetchAllRevyoosReviews(),
    getAdminProperties(),
    getExistingRevyoosReviewIds(),
  ]);

  const holdingToProperty = new Map<string, string>();
  for (const p of properties) {
    if (p.revyoosHoldingId) holdingToProperty.set(p.revyoosHoldingId, p.id);
  }

  const mapped: Array<{ raw: RevyoosRawReview; propertyId: string }> = [];
  const unmapped = new Map<string, { holdingName: string; count: number }>();

  for (const raw of reviews) {
    const holdingId = raw.holding?._id;
    const propertyId = holdingId ? holdingToProperty.get(holdingId) : undefined;
    if (!propertyId) {
      const key = holdingId ?? "(sin holding)";
      const entry = unmapped.get(key) ?? { holdingName: raw.holding?.name ?? "?", count: 0 };
      entry.count++;
      unmapped.set(key, entry);
      continue;
    }
    mapped.push({ raw, propertyId });
  }

  const imported = await upsertReviews(mapped, existingIds);
  await updateBusinessAggregate(meta);

  const byProperty: Record<string, number> = {};
  for (const { propertyId } of mapped) {
    byProperty[propertyId] = (byProperty[propertyId] ?? 0) + 1;
  }

  return {
    totalFetched: reviews.length,
    imported,
    unmappedHoldings: Array.from(unmapped.entries()).map(([holdingId, v]) => ({
      holdingId,
      holdingName: v.holdingName,
      count: v.count,
    })),
    byProperty,
  };
}

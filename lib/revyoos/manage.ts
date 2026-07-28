/**
 * Consultas y acciones para la pantalla de gestión manual de reseñas Revyoos
 * (`/admin/testimonials/revyoos`). Separado de `sync.ts` (que sólo importa datos
 * crudos) y de los getters públicos en `firebase-admin-queries.ts` (que sólo leen
 * lo ya curado) — este archivo es el que decide/escribe la curación.
 */
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAllRevyoosReviewsForPropertyAdmin,
  getAllRevyoosReviewsAdmin,
} from "@/lib/firebase-admin-queries";
import { pickRealisticReviews, ensurePlatformDiversity } from "@/lib/revyoos/realistic-sample";
import type { RevyoosReview } from "@/lib/types";

const FIRESTORE_BATCH_LIMIT = 500;
const REVYOOS_COLLECTION = "revyoos_reviews";

/** Mismo rango que se usaba para la selección automática, ahora sólo como punto de partida sugerido. */
const AUTO_SELECT_TARGET_COUNT_PROPERTY = 30;
const AUTO_SELECT_TARGET_COUNT_HOME = 35;
const AUTO_SELECT_MIN_AVG = 4.3;
const AUTO_SELECT_MAX_AVG = 4.7;

export interface RevyoosManagePage {
  reviews: RevyoosReview[];
  total: number;
  page: number;
  pageSize: number;
}

function matchesSearch(r: RevyoosReview, q: string): boolean {
  return r.author.toLowerCase().includes(q) || r.text.toLowerCase().includes(q);
}

function paginate(all: RevyoosReview[], page = 1, pageSize = 25): RevyoosManagePage {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { reviews: all.slice(start, start + pageSize), total: all.length, page: safePage, pageSize };
}

/** Todas las reseñas (draft + published) de una propiedad, para la pantalla de gestión. */
export async function getRevyoosReviewsForPropertyManageAdmin(
  propertyId: string,
  options?: { page?: number; pageSize?: number; search?: string }
): Promise<RevyoosManagePage> {
  const all = await getAllRevyoosReviewsForPropertyAdmin(propertyId);
  const q = options?.search?.trim().toLowerCase();
  const filtered = q ? all.filter((r) => matchesSearch(r, q)) : all;
  return paginate(filtered, options?.page, options?.pageSize);
}

/** Todas las reseñas (draft + published) de todas las propiedades, para la pestaña "Carrusel de inicio". */
export async function getRevyoosReviewsForHomeManageAdmin(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  onlyFeatured?: boolean;
}): Promise<RevyoosManagePage> {
  let all = await getAllRevyoosReviewsAdmin();
  if (options?.onlyFeatured) all = all.filter((r) => r.featuredOnHome);
  const q = options?.search?.trim().toLowerCase();
  const filtered = q ? all.filter((r) => matchesSearch(r, q)) : all;
  return paginate(filtered, options?.page, options?.pageSize);
}

async function batchUpdate(updates: Array<{ id: string; data: Record<string, string | boolean> }>) {
  for (let i = 0; i < updates.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = updates.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const { id, data } of chunk) {
      batch.update(adminDb.collection(REVYOOS_COLLECTION).doc(id), data);
    }
    await batch.commit();
  }
}

/** Reemplaza la selección "publicada" de una propiedad por una muestra realista (4.3-4.7),
 * como punto de partida para que el admin la ajuste a mano. */
export async function autoSelectRealisticForProperty(
  propertyId: string
): Promise<{ selectedCount: number; totalCount: number }> {
  const all = await getAllRevyoosReviewsForPropertyAdmin(propertyId);
  const chosen = pickRealisticReviews(all, {
    targetCount: AUTO_SELECT_TARGET_COUNT_PROPERTY,
    minAvg: AUTO_SELECT_MIN_AVG,
    maxAvg: AUTO_SELECT_MAX_AVG,
  });
  const chosenIds = new Set(chosen.map((r) => r.id));

  await batchUpdate(
    all.map((r) => ({
      id: r.id,
      data: { status: chosenIds.has(r.id) ? "published" : "draft" },
    }))
  );

  return { selectedCount: chosen.length, totalCount: all.length };
}

/** Reemplaza el set "destacado en inicio" por una muestra realista y diversa en plataforma,
 * cruzando todas las propiedades. */
export async function autoSelectRealisticForHome(): Promise<{ selectedCount: number; totalCount: number }> {
  const all = await getAllRevyoosReviewsAdmin();
  const rawSample = pickRealisticReviews(all, {
    targetCount: AUTO_SELECT_TARGET_COUNT_HOME,
    minAvg: AUTO_SELECT_MIN_AVG,
    maxAvg: AUTO_SELECT_MAX_AVG,
  });
  const chosen = ensurePlatformDiversity(rawSample, all);
  const chosenIds = new Set(chosen.map((r) => r.id));

  await batchUpdate(
    all.map((r) => ({
      id: r.id,
      data: { featuredOnHome: chosenIds.has(r.id) },
    }))
  );

  return { selectedCount: chosen.length, totalCount: all.length };
}

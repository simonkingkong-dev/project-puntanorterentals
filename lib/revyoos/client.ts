/**
 * Cliente para la API pública de widgets de Revyoos (agregador de reseñas
 * conectado a Airbnb/Booking/Google).
 *
 * No requiere API key: es el mismo endpoint que usa el script público del
 * widget (`universalWidgetBuilder.js`). El identificador de cuenta se toma
 * de REVYOOS_USER_ID; no es secreto (ya viaja visible en el `<script>` del sitio).
 */
import "server-only";
import type { PropertyReviewChannel } from "@/lib/types";

const DEFAULT_HOST = "https://www.revyoos.com";
/** Extraído del atributo data-revyoos-widget del script público del sitio. */
const DEFAULT_USER_ID = "6a67da943065850a8b7d9f7a";
/** La API rechaza (400) límites de página mayores a 50. */
const PAGE_LIMIT = 50;
/** Tope de páginas por sync, por seguridad ante datos inesperados. */
const MAX_PAGES = 40;

function getUserId(): string {
  return process.env.REVYOOS_USER_ID?.trim() || DEFAULT_USER_ID;
}

function getHost(): string {
  return process.env.REVYOOS_HOST?.trim() || DEFAULT_HOST;
}

export interface RevyoosPlatformRating {
  type: string;
  rating: string;
  reviewCount: number;
}

export interface RevyoosRawReview {
  _id: string;
  type_source_reviews: string;
  content_reviews: string;
  title_reviews?: string;
  score_reviews: number;
  date: string;
  name_user_reviews: string;
  img_user_reviews?: string | null;
  owner_response_reviews?: string;
  hide?: boolean;
  lang?: string;
  sourceUrl?: string;
  holding?: { _id: string; name: string; slug?: string };
}

interface RevyoosDataResponse {
  rating: string;
  reviewCount: number;
  ratings: RevyoosPlatformRating[];
  reviews: RevyoosRawReview[];
  hasMore: boolean;
}

async function revyoosFetch(params: Record<string, string>): Promise<RevyoosDataResponse> {
  const url = `${getHost()}/api/widgets/data?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // Revyoos valida el origen contra las URLs configuradas para el widget;
      // el dominio propio siempre está autorizado.
      Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://puntanorterentals.com/",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Revyoos API error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { success: boolean; data?: RevyoosDataResponse };
  if (!json.success || !json.data) {
    throw new Error("Revyoos API: respuesta sin datos");
  }
  return json.data;
}

/** Todas las reseñas de la cuenta conectada (todas las propiedades), paginando hasta agotar `hasMore`. */
export async function fetchAllRevyoosReviews(): Promise<{
  meta: { rating: number; reviewCount: number; ratings: RevyoosPlatformRating[] };
  reviews: RevyoosRawReview[];
}> {
  const userId = getUserId();
  const all: RevyoosRawReview[] = [];
  let meta: { rating: number; reviewCount: number; ratings: RevyoosPlatformRating[] } | null = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await revyoosFetch({ userId, page: String(page), limit: String(PAGE_LIMIT) });
    if (!meta) {
      meta = {
        rating: Number(data.rating),
        reviewCount: data.reviewCount,
        ratings: data.ratings ?? [],
      };
    }
    const batch = data.reviews ?? [];
    all.push(...batch);
    if (!data.hasMore || batch.length === 0) break;
  }

  return { meta: meta ?? { rating: 0, reviewCount: 0, ratings: [] }, reviews: all };
}

const KNOWN_PLATFORMS: PropertyReviewChannel[] = ["airbnb", "booking", "google"];

/** Revyoos ya usa "airbnb"/"booking"/"google", que coinciden con PropertyReviewChannel. Cualquier otro valor cae en "other". */
export function normalizeRevyoosPlatform(raw: string): PropertyReviewChannel {
  const lower = raw?.toLowerCase().trim();
  return (KNOWN_PLATFORMS as string[]).includes(lower) ? (lower as PropertyReviewChannel) : "other";
}

export function stripReviewHtml(html: string | undefined | null): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

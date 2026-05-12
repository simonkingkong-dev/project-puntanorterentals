/** Query keys forwarded between listing ↔ property detail so filters persist when navigating back. */

export const LISTING_SEARCH_KEYS = ['checkIn', 'checkOut', 'guests'] as const;

export type ListingSearchKey = (typeof LISTING_SEARCH_KEYS)[number];

export interface ListingSearchSelection {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export function listingSearchQueryFromURLSearchParams(sp: URLSearchParams): string {
  const qs = new URLSearchParams();
  for (const key of LISTING_SEARCH_KEYS) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }
  return qs.toString();
}

export function listingSearchQueryFromServerSearchParams(
  sp: Record<string, string | string[] | undefined>
): string {
  const qs = new URLSearchParams();
  for (const key of LISTING_SEARCH_KEYS) {
    const raw = sp[key];
    const v = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (v) qs.set(key, v);
  }
  return qs.toString();
}

export function listingSearchSelectionFromServerSearchParams(
  sp: Record<string, string | string[] | undefined>
): ListingSearchSelection {
  const getFirstValue = (key: ListingSearchKey) => {
    const raw = sp[key];
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  };

  const guests = Number(getFirstValue('guests'));

  return {
    checkIn: getFirstValue('checkIn'),
    checkOut: getFirstValue('checkOut'),
    guests: Number.isFinite(guests) && guests > 0 ? guests : undefined,
  };
}

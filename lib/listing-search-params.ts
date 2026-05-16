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

/** True if any listing search filter has a non-empty value (handles raw URL params or normalized SearchParams). */
export function listingSearchHasAnyActiveFilters(
  params: Partial<Record<ListingSearchKey | 'location', string | number | undefined>>
): boolean {
  const cin =
    typeof params.checkIn === 'string'
      ? params.checkIn.trim()
      : '';
  const cout =
    typeof params.checkOut === 'string'
      ? params.checkOut.trim()
      : '';
  const loc =
    typeof params.location === 'string'
      ? params.location.trim()
      : '';
  let guestNum = NaN;
  if (typeof params.guests === 'number') {
    guestNum = params.guests;
  } else if (typeof params.guests === 'string') {
    guestNum = Number(params.guests);
  }
  return Boolean(
    cin ||
    cout ||
    loc ||
    (Number.isFinite(guestNum) && guestNum > 0)
  );
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

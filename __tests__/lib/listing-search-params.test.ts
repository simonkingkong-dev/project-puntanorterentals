import {
  listingSearchQueryFromServerSearchParams,
  listingSearchSelectionFromServerSearchParams,
} from '@/lib/listing-search-params';

describe('listing search params', () => {
  it('forwards only listing search keys into the detail query string', () => {
    const query = listingSearchQueryFromServerSearchParams({
      checkIn: '2026-06-10',
      checkOut: '2026-06-14',
      guests: '4',
      ignored: 'value',
    });

    expect(query).toBe('checkIn=2026-06-10&checkOut=2026-06-14&guests=4');
  });

  it('normalizes server search params into an initial selection', () => {
    expect(
      listingSearchSelectionFromServerSearchParams({
        checkIn: '2026-06-10',
        checkOut: '2026-06-14',
        guests: '4',
      })
    ).toEqual({
      checkIn: '2026-06-10',
      checkOut: '2026-06-14',
      guests: 4,
    });
  });

  it('drops invalid guest counts', () => {
    expect(
      listingSearchSelectionFromServerSearchParams({
        checkIn: '2026-06-10',
        checkOut: '2026-06-14',
        guests: 'many',
      })
    ).toEqual({
      checkIn: '2026-06-10',
      checkOut: '2026-06-14',
      guests: undefined,
    });
  });
});

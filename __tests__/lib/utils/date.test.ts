import { generateDateRange, calculateNights, isDateAvailable } from '@/lib/utils/date';

describe('generateDateRange', () => {
  it('generates inclusive date strings from start to end', () => {
    const start = new Date('2025-01-10');
    const end = new Date('2025-01-12');
    const range = generateDateRange(start, end);
    expect(range).toEqual(['2025-01-10', '2025-01-11', '2025-01-12']);
  });

  it('returns single day when start equals end', () => {
    const d = new Date('2025-06-15');
    expect(generateDateRange(d, d)).toEqual(['2025-06-15']);
  });
});

describe('calculateNights', () => {
  it('returns correct number of nights between two dates', () => {
    const checkIn = new Date('2025-01-10');
    const checkOut = new Date('2025-01-13');
    expect(calculateNights(checkIn, checkOut)).toBe(3);
  });

  it('accepts string dates', () => {
    expect(calculateNights('2025-01-01', '2025-01-05')).toBe(4);
  });
});

describe('isDateAvailable', () => {
  it('returns true when date is not explicitly false', () => {
    expect(isDateAvailable('2025-01-01', {})).toBe(true);
    expect(isDateAvailable('2025-01-01', { '2025-01-02': false })).toBe(true);
  });

  it('returns false when availability[date] is false', () => {
    expect(isDateAvailable('2025-01-01', { '2025-01-01': false })).toBe(false);
  });
});

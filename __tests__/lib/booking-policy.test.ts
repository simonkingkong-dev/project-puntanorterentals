import {
  DEFAULT_CHECK_IN_HOUR,
  DEFAULT_MIN_NIGHTS,
  PROPERTY_TIMEZONE,
  countNightsBetween,
  getMinNights,
  validateMinNights,
  validateWebCheckInLeadTime,
  isSameDayWebBookingOpen,
  isCheckInDateDisabledForWebBooking,
  WEB_LAST_MINUTE_CUTOFF_HOUR,
} from '@/lib/booking-policy';

describe('minimum nights', () => {
  it('defaults to 1 when unset or invalid', () => {
    expect(DEFAULT_MIN_NIGHTS).toBe(1);
    expect(getMinNights({})).toBe(1);
    expect(getMinNights({ minNights: 0 })).toBe(1);
    expect(getMinNights({ minNights: -3 })).toBe(1);
    expect(getMinNights({ minNights: Number.NaN })).toBe(1);
  });

  it('reads and floors a configured minimum', () => {
    expect(getMinNights({ minNights: 2 })).toBe(2);
    expect(getMinNights({ minNights: 3.7 })).toBe(3);
  });

  it('counts nights ignoring the time of day', () => {
    // Check-in por la noche y salida por la mañana siguen siendo 2 noches.
    const checkIn = new Date(2026, 7, 1, 23, 30);
    const checkOut = new Date(2026, 7, 3, 6, 0);
    expect(countNightsBetween(checkIn, checkOut)).toBe(2);
  });

  it('accepts a stay that meets the minimum', () => {
    const result = validateMinNights(new Date(2026, 7, 1), new Date(2026, 7, 3), 2);
    expect(result.allowed).toBe(true);
  });

  it('rejects a stay below the minimum and says how many nights are needed', () => {
    const result = validateMinNights(new Date(2026, 7, 1), new Date(2026, 7, 2), 2);
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/mínimo de 2 noches/i);
  });

  it('rejects a check-out that is not after check-in', () => {
    const result = validateMinNights(new Date(2026, 7, 1), new Date(2026, 7, 1), 1);
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/posterior/i);
  });

  it('does not reject anything when the minimum is 1', () => {
    expect(validateMinNights(new Date(2026, 7, 1), new Date(2026, 7, 2), 1).allowed).toBe(true);
  });
});

describe('booking-policy', () => {
  it('exports cutoff at 21:00 (15:00 + 6h)', () => {
    expect(WEB_LAST_MINUTE_CUTOFF_HOUR).toBe(21);
    expect(DEFAULT_CHECK_IN_HOUR).toBe(15);
  });

  it('allows future check-in dates', () => {
    const now = new Date('2026-07-21T18:00:00-05:00');
    const checkIn = new Date('2026-07-22T05:00:00-05:00');
    expect(validateWebCheckInLeadTime(checkIn, now, PROPERTY_TIMEZONE).allowed).toBe(true);
  });

  it('rejects past check-in dates', () => {
    const now = new Date('2026-07-21T10:00:00-05:00');
    const checkIn = new Date('2026-07-20T05:00:00-05:00');
    const result = validateWebCheckInLeadTime(checkIn, now, PROPERTY_TIMEZONE);
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/ya no está disponible/i);
  });

  it('allows same-day check-in before 21:00 Isla Mujeres', () => {
    const now = new Date('2026-07-21T20:30:00-05:00');
    const checkIn = new Date('2026-07-21T05:00:00-05:00');
    expect(validateWebCheckInLeadTime(checkIn, now, PROPERTY_TIMEZONE).allowed).toBe(true);
    expect(isSameDayWebBookingOpen(now, PROPERTY_TIMEZONE)).toBe(true);
  });

  it('rejects same-day check-in at or after 21:00 Isla Mujeres', () => {
    const now = new Date('2026-07-21T21:00:00-05:00');
    const checkIn = new Date('2026-07-21T05:00:00-05:00');
    const result = validateWebCheckInLeadTime(checkIn, now, PROPERTY_TIMEZONE);
    expect(result.allowed).toBe(false);
    expect(result.error).toMatch(/21:00/i);
    expect(isSameDayWebBookingOpen(now, PROPERTY_TIMEZONE)).toBe(false);
  });

  it('disables today on calendar after cutoff', () => {
    const now = new Date('2026-07-21T21:15:00-05:00');
    const today = new Date('2026-07-21T12:00:00-05:00');
    expect(isCheckInDateDisabledForWebBooking(today, now, PROPERTY_TIMEZONE)).toBe(true);
  });
});

import {
  DEFAULT_CHECK_IN_HOUR,
  PROPERTY_TIMEZONE,
  validateWebCheckInLeadTime,
  isSameDayWebBookingOpen,
  isCheckInDateDisabledForWebBooking,
  WEB_LAST_MINUTE_CUTOFF_HOUR,
} from '@/lib/booking-policy';

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

import { computeDisplayNightlyRate } from "@/lib/property-list-item";

function futureDateKey(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("computeDisplayNightlyRate", () => {
  const futureA = futureDateKey(5);
  const futureB = futureDateKey(10);

  it("returns the minimum rate among available future dates", () => {
    const rate = computeDisplayNightlyRate({
      pricePerNight: 500,
      dailyRates: {
        [futureA]: 320,
        [futureB]: 180,
      },
      availability: {
        [futureA]: true,
        [futureB]: true,
      },
    });
    expect(rate).toBe(180);
  });

  it("ignores unavailable dates even if they have a lower rate", () => {
    const rate = computeDisplayNightlyRate({
      pricePerNight: 500,
      dailyRates: {
        [futureA]: 100,
        [futureB]: 250,
      },
      availability: {
        [futureA]: false,
        [futureB]: true,
      },
    });
    expect(rate).toBe(250);
  });

  it("prefers lowestAvailableNightlyRate when set by daily cron", () => {
    const rate = computeDisplayNightlyRate({
      pricePerNight: 500,
      lowestAvailableNightlyRate: 199,
      dailyRates: { [futureA]: 400 },
      availability: { [futureA]: true },
    });
    expect(rate).toBe(199);
  });
});

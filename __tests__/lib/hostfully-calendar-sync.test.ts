import { parseHostfullyCalendarResponse } from "@/lib/hostfully-calendar-sync";
import { HOSTFULLY_PRICE_MARKUP_MULTIPLIER } from "@/lib/hostfully-price-markup";

describe("parseHostfullyCalendarResponse", () => {
  it("extracts availability and marked-up daily rates from the nested v3.2 shape (calendar.entries[].pricing.value)", () => {
    // Forma real devuelta por GET /property-calendar/{uid} en Hostfully v3.2.
    const raw = {
      calendar: {
        propertyUid: "7eadb529-372b-48dc-9ec6-426770d20796",
        entries: [
          {
            date: "2026-09-29",
            pricing: { currency: "USD", value: 50 },
            availability: { unavailable: false },
          },
          {
            date: "2026-09-30",
            pricing: { currency: "USD", value: 50 },
            availability: { unavailable: false },
          },
          {
            date: "2026-10-02",
            pricing: { currency: "USD", value: 38 },
            availability: { unavailable: true, unavailabilityReason: "BOOKING" },
          },
        ],
      },
    };

    const { availability, dailyRates } = parseHostfullyCalendarResponse(raw);

    expect(availability).toEqual({
      "2026-09-29": true,
      "2026-09-30": true,
      "2026-10-02": false,
    });

    const expected50 = Math.round(50 * HOSTFULLY_PRICE_MARKUP_MULTIPLIER * 100) / 100;
    expect(dailyRates["2026-09-29"]).toBe(expected50);
    expect(dailyRates["2026-09-30"]).toBe(expected50);
    // Fecha no disponible: no se guarda tarifa (evita ofertar un precio que no se puede reservar).
    expect(dailyRates["2026-10-02"]).toBeUndefined();
  });

  it("still supports the flat legacy shape ({dates: [{date, rate, available}]})", () => {
    const raw = {
      dates: [
        { date: "2026-11-01", rate: 40, available: true },
        { date: "2026-11-02", price: 45, available: true },
        { date: "2026-11-03", dailyRate: 60, available: false },
      ],
    };

    const { dailyRates, availability } = parseHostfullyCalendarResponse(raw);

    const expected40 = Math.round(40 * HOSTFULLY_PRICE_MARKUP_MULTIPLIER * 100) / 100;
    const expected45 = Math.round(45 * HOSTFULLY_PRICE_MARKUP_MULTIPLIER * 100) / 100;
    expect(dailyRates["2026-11-01"]).toBe(expected40);
    expect(dailyRates["2026-11-02"]).toBe(expected45);
    expect(dailyRates["2026-11-03"]).toBeUndefined();
    expect(availability["2026-11-03"]).toBe(false);
  });
});

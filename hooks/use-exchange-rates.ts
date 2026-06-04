"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@/components/ui/currency-select";

export function useExchangeRates(currency: Currency) {
  const [usdMxnRate, setUsdMxnRate] = useState<number | null>(null);
  const [usdEurRate, setUsdEurRate] = useState<number | null>(null);

  useEffect(() => {
    if (currency === "MXN") {
      fetch("/api/exchange-rate?from=USD&to=MXN")
        .then((r) => r.json())
        .then((data) => setUsdMxnRate(typeof data.rate === "number" ? data.rate : 17.2))
        .catch(() => setUsdMxnRate(17.2));
      setUsdEurRate(null);
      return;
    }
    if (currency === "EUR") {
      fetch("/api/exchange-rate?from=USD&to=EUR")
        .then((r) => r.json())
        .then((data) => setUsdEurRate(typeof data.rate === "number" ? data.rate : 0.92))
        .catch(() => setUsdEurRate(0.92));
      setUsdMxnRate(null);
      return;
    }
    setUsdMxnRate(null);
    setUsdEurRate(null);
  }, [currency]);

  return { usdMxnRate, usdEurRate };
}

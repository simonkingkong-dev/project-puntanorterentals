"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Currency } from "@/components/ui/currency-select";
import { convertUsdToDisplay, formatDisplayMoney } from "@/lib/format-display-money";
import {
  parseCurrency,
  readStoredListingCurrency,
} from "@/lib/parse-currency";
import { useExchangeRates } from "@/hooks/use-exchange-rates";

/** Moneda del listado: query `currency`, o preferencia guardada en sesión, o USD. */
export function useListingDisplayCurrency() {
  const searchParams = useSearchParams();
  const urlCurrency = searchParams.get("currency");
  const [currency, setCurrency] = useState<Currency>(() =>
    parseCurrency(urlCurrency)
  );

  useEffect(() => {
    if (urlCurrency) {
      setCurrency(parseCurrency(urlCurrency));
      return;
    }
    setCurrency(readStoredListingCurrency() ?? "USD");
  }, [urlCurrency]);

  const { usdMxnRate, usdEurRate } = useExchangeRates(currency);

  const formatFromUsd = (amountUsd: number) =>
    formatDisplayMoney(
      convertUsdToDisplay(amountUsd, currency, usdMxnRate, usdEurRate),
      currency
    );

  return { currency, formatFromUsd };
}

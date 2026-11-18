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
import { suggestCurrencyFromBrowser } from "@/lib/currency-suggestion";

/** Moneda del listado: query `currency`, o preferencia guardada en sesión, o la sugerida por ubicación. */
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
    // Sin elección previa: se sugiere según la ubicación (MX→MXN, Europa→EUR, resto USD).
    setCurrency(readStoredListingCurrency() ?? suggestCurrencyFromBrowser());
  }, [urlCurrency]);

  const { usdMxnRate, usdEurRate } = useExchangeRates(currency);

  const formatFromUsd = (amountUsd: number) =>
    formatDisplayMoney(
      convertUsdToDisplay(amountUsd, currency, usdMxnRate, usdEurRate),
      currency
    );

  return { currency, formatFromUsd };
}

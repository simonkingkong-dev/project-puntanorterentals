"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { messages, type Locale } from "@/lib/i18n/messages";
import {
  isSupportedLocale,
  persistLocalePreference,
} from "@/lib/i18n/locale-utils";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem("locale");
    const storedLocale = isSupportedLocale(stored) ? stored : null;

    if (storedLocale && storedLocale !== initialLocale) {
      persistLocalePreference(storedLocale);
      router.refresh();
      return;
    }

    const resolved = storedLocale ?? initialLocale;
    persistLocalePreference(resolved);
    setLocaleState(resolved);
  }, [initialLocale, router]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    persistLocalePreference(next);
    router.refresh();
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, fallback?: string) =>
        messages[locale][key] ?? fallback ?? key,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

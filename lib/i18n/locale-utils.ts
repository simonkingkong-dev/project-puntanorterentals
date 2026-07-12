import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/messages";

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(input: string | null | undefined): input is Locale {
  return input === "es" || input === "en";
}

export function parseLocaleCookie(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "en" || lower === "es") return lower;
  return null;
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const parts = header.split(",").map((part) => part.trim().split(";")[0]?.toLowerCase());
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("en")) return "en";
    if (part.startsWith("es")) return "es";
  }
  return null;
}

export function persistLocalePreference(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("locale", locale);
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

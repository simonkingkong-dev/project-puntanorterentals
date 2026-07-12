import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, messages, type Locale } from "@/lib/i18n/messages";
import { localeFromAcceptLanguage, parseLocaleCookie } from "@/lib/i18n/locale-utils";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = parseLocaleCookie(cookieStore.get("locale")?.value);
  if (fromCookie) return fromCookie;

  const acceptLanguage = (await headers()).get("accept-language");
  const fromHeader = localeFromAcceptLanguage(acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}

export async function tServer(key: string, fallback?: string): Promise<string> {
  const locale = await getServerLocale();
  return messages[locale][key] ?? fallback ?? key;
}

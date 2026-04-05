import { cookies } from "next/headers";
import { DEFAULT_LOCALE, messages, type Locale } from "@/lib/i18n/messages";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value?.toLowerCase();
  if (raw === "en") return "en";
  if (raw === "es") return "es";
  return DEFAULT_LOCALE;
}

export async function tServer(key: string, fallback?: string): Promise<string> {
  const locale = await getServerLocale();
  return messages[locale][key] ?? fallback ?? key;
}

import type { Locale } from "@/lib/i18n/messages";

type SiteContentMap = Record<string, string | undefined>;

export function contentMap(items: { key: string; value: string }[]): SiteContentMap {
  return Object.fromEntries(items.map((item) => [item.key, item.value]));
}

export function pickSiteContent(
  content: SiteContentMap,
  key: string,
  locale: Locale,
  fallback: string
): string {
  return content[`${key}_${locale}`]?.trim() || content[key]?.trim() || fallback;
}

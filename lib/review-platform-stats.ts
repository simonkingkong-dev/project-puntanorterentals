import type { PropertyReviewPlatformStat } from "@/lib/types";

export type ReviewPlatformStatInput = Pick<
  PropertyReviewPlatformStat,
  "averageRating" | "reviewCount" | "channel"
>;

export interface AggregateReviewStats {
  averageRating: number;
  totalReviews: number;
  platformCount: number;
}

export function normalizePlatformAverageRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(5, Math.max(0, value));
  return Math.round(clamped * 10) / 10;
}

export function computeAggregateReviewStats(
  stats: ReviewPlatformStatInput[]
): AggregateReviewStats | null {
  const valid = stats.filter(
    (stat) => stat.reviewCount > 0 && stat.averageRating > 0
  );
  if (valid.length === 0) return null;

  const totalReviews = valid.reduce((sum, stat) => sum + stat.reviewCount, 0);
  const weightedSum = valid.reduce(
    (sum, stat) => sum + stat.averageRating * stat.reviewCount,
    0
  );

  return {
    averageRating: normalizePlatformAverageRating(weightedSum / totalReviews),
    totalReviews,
    platformCount: valid.length,
  };
}

export function formatReviewAverage(value: number, locale: "es" | "en"): string {
  return value.toLocaleString(locale === "en" ? "en-US" : "es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatReviewCount(count: number, locale: "es" | "en"): string {
  return count.toLocaleString(locale === "en" ? "en-US" : "es-MX");
}

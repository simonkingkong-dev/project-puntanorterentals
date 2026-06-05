import { Star } from "lucide-react";
import type { PropertyReviewPlatformStat } from "@/lib/types";
import type { Locale } from "@/lib/i18n/messages";
import { messages } from "@/lib/i18n/messages";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { GLOBAL_REVIEW_PLATFORM_CHANNELS } from "@/lib/business-review-platform-stats";
import {
  computeAggregateReviewStats,
  formatReviewAverage,
  formatReviewCount,
} from "@/lib/review-platform-stats";

function RatingStars({ rating, size = "md" }: { rating: number; size?: "md" | "lg" }) {
  const rounded = Math.round(rating);
  const iconClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconClass} ${i < rounded ? "fill-current" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

function sortPlatformStats(stats: PropertyReviewPlatformStat[]) {
  const order = GLOBAL_REVIEW_PLATFORM_CHANNELS as readonly string[];
  return [...stats].sort(
    (a, b) =>
      (order.indexOf(a.channel) === -1 ? 99 : order.indexOf(a.channel)) -
      (order.indexOf(b.channel) === -1 ? 99 : order.indexOf(b.channel))
  );
}

interface HomeGuestRatingsSummaryProps {
  locale: Locale;
  platformStats: PropertyReviewPlatformStat[];
  globalAggregate: { averageRating: number; reviewCount: number } | null;
}

export default function HomeGuestRatingsSummary({
  locale,
  platformStats,
  globalAggregate,
}: HomeGuestRatingsSummaryProps) {
  const L = messages[locale];
  if (platformStats.length === 0 && !globalAggregate) return null;

  const sortedStats = sortPlatformStats(platformStats);
  const computed = computeAggregateReviewStats(sortedStats);
  const aggregate = globalAggregate
    ? {
        averageRating: globalAggregate.averageRating,
        totalReviews: globalAggregate.reviewCount,
        platformCount: computed?.platformCount ?? sortedStats.length,
      }
    : computed;

  const showHeadline =
    aggregate &&
    (globalAggregate != null ||
      (computed != null && computed.platformCount > 0));

  return (
    <div className="max-w-4xl mx-auto mb-10 md:mb-12">
      {showHeadline && aggregate ? (
        <div className="flex flex-col items-center text-center gap-3 mb-8 rounded-2xl border bg-background px-6 py-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums">
              {formatReviewAverage(aggregate.averageRating, locale)}
            </span>
            <RatingStars rating={aggregate.averageRating} size="lg" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-gray-900 text-base">
              {aggregate.platformCount > 1
                ? L.reviews_stats_aggregate_combined
                : L.reviews_stats_aggregate_single}
            </p>
            <p>
              {L.reviews_stats_total_reviews.replace(
                "{count}",
                formatReviewCount(aggregate.totalReviews, locale)
              )}
            </p>
          </div>
        </div>
      ) : null}

      {sortedStats.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sortedStats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-xl border bg-background px-5 py-4 text-center shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">
                {getReviewChannelLabel(stat.channel, locale)}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-2xl font-bold text-gray-900 tabular-nums">
                  {formatReviewAverage(stat.averageRating, locale)}
                </span>
                <RatingStars rating={stat.averageRating} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {L.reviews_stats_platform_reviews.replace(
                  "{count}",
                  formatReviewCount(stat.reviewCount, locale)
                )}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

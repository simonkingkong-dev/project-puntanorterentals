"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { PropertyReviewPlatformStat } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import {
  computeAggregateReviewStats,
  formatReviewAverage,
  formatReviewCount,
} from "@/lib/review-platform-stats";
import { useLocale } from "@/components/providers/locale-provider";

interface PropertyReviewStatsSummaryProps {
  platformStats: PropertyReviewPlatformStat[];
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rounded ? "fill-current" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

export default function PropertyReviewStatsSummary({
  platformStats,
}: PropertyReviewStatsSummaryProps) {
  const { locale, t } = useLocale();

  if (platformStats.length === 0) return null;

  const aggregate = computeAggregateReviewStats(platformStats);

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      {aggregate && aggregate.platformCount > 1 ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatReviewAverage(aggregate.averageRating, locale)}
            </span>
            <RatingStars rating={aggregate.averageRating} />
          </div>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">
              {t(
                aggregate.platformCount > 1
                  ? "reviews_stats_aggregate_combined"
                  : "reviews_stats_aggregate_single",
                aggregate.platformCount > 1
                  ? "Combined average across platforms"
                  : "Average rating"
              )}
            </p>
            <p>
              {t("reviews_stats_total_reviews", "{count} reviews").replace(
                "{count}",
                formatReviewCount(aggregate.totalReviews, locale)
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          {t("reviews_stats_by_platform", "By platform")}
        </p>
        {platformStats.map((stat) => (
          <div
            key={stat.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-gray-50 p-3"
          >
            <div className="relative w-full sm:w-28 h-16 shrink-0 rounded overflow-hidden border bg-white">
              <Image
                src={stat.screenshotUrl}
                alt=""
                fill
                className="object-contain object-center"
                sizes="112px"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                {getReviewChannelLabel(stat.channel, locale)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-lg font-bold text-gray-900">
                  {formatReviewAverage(stat.averageRating, locale)}
                </span>
                <RatingStars rating={stat.averageRating} />
                <span className="text-sm text-gray-600">
                  ·{" "}
                  {t("reviews_stats_platform_reviews", "{count} reviews").replace(
                    "{count}",
                    formatReviewCount(stat.reviewCount, locale)
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

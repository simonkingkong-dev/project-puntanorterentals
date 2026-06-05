import type { PropertyReviewChannel, PropertyReviewPlatformStat } from "@/lib/types";

export const BUSINESS_REVIEW_PLATFORM_STATS_DOC = "business_review_platform_stats";

export type BusinessReviewPlatformStatRecord = {
  channel: PropertyReviewChannel;
  averageRating: number;
  reviewCount: number;
  screenshotUrl?: string;
  status: "draft" | "published";
  updatedAt?: Date;
};

export type GlobalReviewAggregateOverride = {
  averageRating: number;
  reviewCount: number;
  status: "draft" | "published";
  updatedAt?: Date;
};

export type BusinessReviewPlatformStatsDoc = {
  stats?: Partial<Record<PropertyReviewChannel, BusinessReviewPlatformStatRecord>>;
  aggregateOverride?: GlobalReviewAggregateOverride;
};

/** Canales que se gestionan como promedios globales en Testimonios. */
export const GLOBAL_REVIEW_PLATFORM_CHANNELS = [
  "google",
  "airbnb",
  "booking",
] as const satisfies readonly PropertyReviewChannel[];

export type GlobalReviewPlatformChannel = (typeof GLOBAL_REVIEW_PLATFORM_CHANNELS)[number];

export function businessStatToPlatformStat(
  channel: PropertyReviewChannel,
  record: BusinessReviewPlatformStatRecord
): PropertyReviewPlatformStat {
  return {
    id: `business-${channel}`,
    propertyId: "",
    channel,
    averageRating: record.averageRating,
    reviewCount: record.reviewCount,
    screenshotUrl: record.screenshotUrl?.trim() || "",
    status: record.status,
    createdAt: record.updatedAt ?? new Date(),
    extractedBy: "manual",
  };
}

export function mergePropertyAndBusinessPlatformStats(
  propertyId: string,
  propertyStats: PropertyReviewPlatformStat[],
  businessStats: PropertyReviewPlatformStat[]
): PropertyReviewPlatformStat[] {
  const propertyChannels = new Set(propertyStats.map((s) => s.channel));
  const merged = [
    ...propertyStats,
    ...businessStats
      .filter((s) => s.status === "published" && !propertyChannels.has(s.channel))
      .map((s) => ({ ...s, propertyId })),
  ];
  return merged.sort((a, b) => a.channel.localeCompare(b.channel));
}

"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import type { PropertyReview, PropertyReviewPlatformStat, RevyoosReview, Testimonial } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { getNameInitials } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import PropertyReviewStatsSummary from "@/components/ui/property-review-stats-summary";
import RevyoosReviews from "@/components/ui/revyoos-reviews";

interface PropertyCuratedReviewsProps {
  reviews: PropertyReview[];
  platformStats?: PropertyReviewPlatformStat[];
  globalAggregate?: { averageRating: number; reviewCount: number } | null;
  testimonials?: Testimonial[];
  propertyId?: string;
  revyoosReviews?: RevyoosReview[];
  revyoosReviewsTotal?: number;
}

function TestimonialReviewCard({
  testimonial,
  locale,
}: {
  testimonial: Testimonial;
  locale: "es" | "en";
}) {
  return (
    <article className="p-4 rounded-lg border bg-white flex gap-4">
      {testimonial.image ? (
        <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border">
          <Image
            src={testimonial.image}
            alt={testimonial.name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
          {getNameInitials(testimonial.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {testimonial.platform ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
              {getReviewChannelLabel(testimonial.platform, locale)}
            </span>
          ) : null}
          <span className="font-medium text-gray-900 text-sm">{testimonial.name}</span>
          {testimonial.location ? (
            <span className="text-sm text-gray-500">{testimonial.location}</span>
          ) : null}
          <span className="flex items-center gap-0.5 text-amber-600">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < testimonial.rating ? "fill-current" : "text-gray-300"
                }`}
              />
            ))}
          </span>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed italic">
          &ldquo;{testimonial.text}&rdquo;
        </p>
      </div>
    </article>
  );
}

export default function PropertyCuratedReviews({
  reviews,
  platformStats = [],
  globalAggregate = null,
  testimonials = [],
  propertyId,
  revyoosReviews = [],
  revyoosReviewsTotal = 0,
}: PropertyCuratedReviewsProps) {
  const { locale, t } = useLocale();

  if (
    reviews.length === 0 &&
    testimonials.length === 0 &&
    platformStats.length === 0 &&
    revyoosReviewsTotal === 0 &&
    !globalAggregate
  ) {
    return (
      <p className="text-gray-500 text-sm">
        {t("reviews_empty_curated", "No hay reseñas publicadas para esta propiedad.")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PropertyReviewStatsSummary
        platformStats={platformStats}
        globalAggregate={globalAggregate}
      />

      {propertyId && revyoosReviewsTotal > 0 ? (
        <RevyoosReviews
          propertyId={propertyId}
          initialReviews={revyoosReviews}
          total={revyoosReviewsTotal}
        />
      ) : null}

      {reviews.length > 0 || testimonials.length > 0 ? (
        <div className="space-y-4">
          {reviews.length > 0 ? (
            <p className="text-sm font-semibold text-gray-900">
              {t("reviews_individual_heading", "Guest reviews")}
            </p>
          ) : null}

          {reviews.map((review) => (
            <article
              key={review.id}
              className="p-4 rounded-lg border bg-gray-50 flex flex-col sm:flex-row gap-4"
            >
              <div className="relative w-full sm:w-24 h-16 shrink-0 rounded overflow-hidden border bg-white">
                <Image
                  src={review.screenshotUrl}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="96px"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                    {getReviewChannelLabel(review.channel, locale)}
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-600">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < review.rating ? "fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </span>
                  <span className="font-medium text-gray-900 text-sm">{review.author}</span>
                  {review.reviewDate && (
                    <span className="text-sm text-gray-500">{review.reviewDate}</span>
                  )}
                </div>
                {review.text ? (
                  <p className="text-gray-600 text-sm leading-relaxed">{review.text}</p>
                ) : null}
              </div>
            </article>
          ))}

          {testimonials.map((testimonial) => (
            <TestimonialReviewCard
              key={testimonial.id}
              testimonial={testimonial}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

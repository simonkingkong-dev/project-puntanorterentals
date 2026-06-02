"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import type { PropertyReview } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { useLocale } from "@/components/providers/locale-provider";

interface PropertyCuratedReviewsProps {
  reviews: PropertyReview[];
}

export default function PropertyCuratedReviews({ reviews }: PropertyCuratedReviewsProps) {
  const { locale, t } = useLocale();

  if (reviews.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        {t("reviews_empty_curated", "No hay reseñas publicadas para esta propiedad.")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}

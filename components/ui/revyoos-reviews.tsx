"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import RevyoosReviewDialog from "@/components/ui/revyoos-review-dialog";
import type { RevyoosReview } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { getNameInitials } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

interface RevyoosReviewsProps {
  propertyId: string;
  initialReviews: RevyoosReview[];
  total: number;
}

const PAGE_SIZE = 9;

function RevyoosCard({
  review,
  locale,
  onOpen,
}: {
  review: RevyoosReview;
  locale: "es" | "en";
  onOpen: (review: RevyoosReview) => void;
}) {
  const dateFnsLocale = locale === "en" ? enUS : esLocale;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(review)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(review);
        }
      }}
      className="p-4 rounded-lg border bg-white flex flex-col gap-3 text-left cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="flex items-start gap-3">
        {review.avatarUrl ? (
          <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border">
            <Image src={review.avatarUrl} alt="" fill className="object-cover" sizes="40px" unoptimized />
          </div>
        ) : (
          <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {getNameInitials(review.author)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-gray-900 text-sm truncate">{review.author}</span>
            <span className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.round(review.rating) ? "fill-current" : "text-gray-300"}`}
                />
              ))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-0.5">
            {review.sourceUrl ? (
              <a
                href={review.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-orange-700 hover:underline"
              >
                {getReviewChannelLabel(review.platform, locale)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="font-semibold uppercase tracking-wide text-orange-700">
                {getReviewChannelLabel(review.platform, locale)}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {formatDistanceToNow(new Date(review.reviewDate), { addSuffix: true, locale: dateFnsLocale })}
            </span>
          </div>
        </div>
      </div>

      <div>
        {review.title ? <p className="font-medium text-gray-900 text-sm mb-1">{review.title}</p> : null}
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line line-clamp-3">
          {review.text}
        </p>
      </div>
    </article>
  );
}

function parseFetchedReview(raw: RevyoosReview): RevyoosReview {
  return { ...raw, reviewDate: new Date(raw.reviewDate) };
}

export default function RevyoosReviews({ propertyId, initialReviews, total }: RevyoosReviewsProps) {
  const { locale, t } = useLocale();
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<RevyoosReview | null>(null);

  if (total === 0) return null;

  const loadMore = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/revyoos-reviews?offset=${reviews.length}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { reviews: RevyoosReview[] };
      const next = (data.reviews ?? []).map(parseFetchedReview);
      setReviews((prev) => [...prev, ...next]);
    } catch {
      // Falla silenciosa: el botón queda disponible para reintentar.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-900">
        {t("reviews_verified_heading", "Verified reviews")} ({total})
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review) => (
          <RevyoosCard key={review.id} review={review} locale={locale} onOpen={setSelectedReview} />
        ))}
      </div>
      {reviews.length < total ? (
        <div className="text-center pt-2">
          <Button type="button" variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t("reviews_load_more", "Load more reviews")}
          </Button>
        </div>
      ) : null}
      <RevyoosReviewDialog
        review={selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      />
    </div>
  );
}

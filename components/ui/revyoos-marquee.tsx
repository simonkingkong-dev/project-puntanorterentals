import Image from "next/image";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";
import type { RevyoosReview } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { getNameInitials } from "@/lib/utils";

interface RevyoosMarqueeProps {
  reviews: RevyoosReview[];
  locale: "es" | "en";
}

/** Segundos de animación por tarjeta (calibra la velocidad del loop sin depender de JS). */
const SECONDS_PER_CARD = 4.4;
const MIN_DURATION_SECONDS = 45;

function MarqueeCard({ review, locale }: { review: RevyoosReview; locale: "es" | "en" }) {
  const dateFnsLocale = locale === "en" ? enUS : esLocale;

  return (
    <article className="w-72 sm:w-80 shrink-0 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        {review.avatarUrl ? (
          <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden border">
            <Image src={review.avatarUrl} alt="" fill className="object-cover" sizes="36px" unoptimized />
          </div>
        ) : (
          <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
            {getNameInitials(review.author)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 text-sm truncate">{review.author}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.round(review.rating) ? "fill-current" : "text-gray-300"}`}
                />
              ))}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold uppercase tracking-wide text-orange-700">
              {getReviewChannelLabel(review.platform, locale)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{review.text}</p>
      <p className="text-xs text-gray-400 mt-2">
        {formatDistanceToNow(review.reviewDate, { addSuffix: true, locale: dateFnsLocale })}
      </p>
    </article>
  );
}

/**
 * Carrusel horizontal infinito (loop CSS puro, sin JS): la lista se duplica una
 * vez y el keyframe recorre exactamente -50%, así que el corte es imperceptible.
 */
export default function RevyoosMarquee({ reviews, locale }: RevyoosMarqueeProps) {
  if (reviews.length === 0) return null;

  const duration = Math.max(MIN_DURATION_SECONDS, Math.round(reviews.length * SECONDS_PER_CARD));

  return (
    <div
      className="revyoos-marquee-viewport overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
      style={{ ["--revyoos-marquee-duration" as string]: `${duration}s` }}
    >
      <div className="revyoos-marquee-track flex w-max gap-4 py-2">
        {[...reviews, ...reviews].map((review, i) => (
          <MarqueeCard key={`${review.id}-${i}`} review={review} locale={locale} />
        ))}
      </div>
    </div>
  );
}

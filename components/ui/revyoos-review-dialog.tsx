"use client";

import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RevyoosReview } from "@/lib/types";
import { getReviewChannelLabel } from "@/lib/review-channels";
import { getNameInitials } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

interface RevyoosReviewDialogProps {
  review: RevyoosReview | null;
  onOpenChange: (open: boolean) => void;
}

/** Detalle completo de una reseña Revyoos, abierto al hacer clic en su tarjeta. */
export default function RevyoosReviewDialog({ review, onOpenChange }: RevyoosReviewDialogProps) {
  const { locale, t } = useLocale();

  return (
    <Dialog open={review != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {review ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                {review.avatarUrl ? (
                  <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border">
                    <Image
                      src={review.avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {getNameInitials(review.author)}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <DialogTitle className="text-base">{review.author}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < Math.round(review.rating) ? "fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </span>
                    <span aria-hidden="true">·</span>
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
                      {new Date(review.reviewDate).toLocaleDateString(
                        locale === "en" ? "en-US" : "es-MX",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              {review.title ? <p className="font-medium text-gray-900">{review.title}</p> : null}
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{review.text}</p>
              {review.ownerResponse ? (
                <div className="border-l-2 border-orange-200 pl-3">
                  <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-1">
                    {t("reviews_owner_response", "Response from the host")}
                  </p>
                  <p className="text-gray-600 text-sm whitespace-pre-line">{review.ownerResponse}</p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

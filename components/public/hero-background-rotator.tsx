"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroBackgroundRotatorProps {
  images: string[];
  intervalMs?: number;
}

export default function HeroBackgroundRotator({
  images,
  intervalMs = 15000,
}: HeroBackgroundRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeImage = images[activeIndex];
  const hasMultiple = images.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      const next = ((index % images.length) + images.length) % images.length;
      setActiveIndex(next);
    },
    [images.length]
  );

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!hasMultiple) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
  }, [hasMultiple, images.length, intervalMs]);

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const handleManualNav = useCallback(
    (index: number) => {
      goTo(index);
      resetTimer();
    },
    [goTo, resetTimer]
  );

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    resetTimer();
  }, [images.length, resetTimer]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
    resetTimer();
  }, [images.length, resetTimer]);

  if (!activeImage) return null;

  return (
    <div className="absolute inset-0">
      <Image
        key={activeImage}
        src={activeImage}
        alt=""
        fill
        className="object-cover object-[center_35%] sm:object-center brightness-[0.72]"
        priority={activeIndex === 0}
        sizes="100vw"
        quality={75}
      />

      {hasMultiple && (
        <>
          <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2 px-4 pointer-events-auto">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleManualNav(index)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all duration-300 ring-1 ring-white/40",
                  index === activeIndex
                    ? "bg-white scale-110"
                    : "bg-white/40 hover:bg-white/70"
                )}
                aria-label={`Imagen ${index + 1} de ${images.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>

          <div className="absolute inset-y-0 left-0 right-0 z-20 hidden md:flex items-center justify-between px-3 pointer-events-none">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pointer-events-auto rounded-full bg-black/35 text-white hover:bg-black/50 hover:text-white h-10 w-10"
              onClick={goPrev}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pointer-events-auto rounded-full bg-black/35 text-white hover:bg-black/50 hover:text-white h-10 w-10"
              onClick={goNext}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

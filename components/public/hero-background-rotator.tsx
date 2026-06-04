"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HeroBackgroundRotatorProps {
  images: string[];
  intervalMs?: number;
}

const FADE_MS = 1200;

export default function HeroBackgroundRotator({
  images,
  intervalMs = 8000,
}: HeroBackgroundRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasMultiple = images.length > 1;

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

  useEffect(() => {
    images.forEach((src, index) => {
      if (index === 0) return;
      const img = new window.Image();
      img.src = src;
    });
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-neutral-900">
      {images.map((src, index) => (
        <div
          key={src}
          aria-hidden={index !== activeIndex}
          className={cn(
            "absolute inset-0 bg-cover bg-[center_35%] sm:bg-center brightness-[0.72] transition-opacity ease-in-out",
            index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
          style={{
            backgroundImage: `url(${JSON.stringify(src)})`,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
    </div>
  );
}

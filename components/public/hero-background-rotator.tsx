"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface HeroBackgroundRotatorProps {
  images: string[];
  intervalMs?: number;
}

export default function HeroBackgroundRotator({
  images,
  intervalMs = 10000,
}: HeroBackgroundRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images, intervalMs]);

  if (!activeImage) return null;

  return (
    <div className="absolute inset-0">
      <Image
        key={activeImage}
        src={activeImage}
        alt=""
        fill
        className="object-cover brightness-[0.72]"
        priority={activeIndex === 0}
        sizes="100vw"
        quality={75}
      />
    </div>
  );
}

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

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images, intervalMs]);

  return (
    <div className="absolute inset-0">
      {images.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover brightness-[0.72]"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';

type HeroCarouselProps = {
  images: string[];
  intervalMs?: number;
};

export default function HeroCarousel({ images, intervalMs = 7000 }: HeroCarouselProps) {
  const sanitizedImages = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (sanitizedImages.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sanitizedImages.length);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, sanitizedImages.length]);

  if (!sanitizedImages.length) return null;

  return (
    <div className="absolute inset-0">
      {sanitizedImages.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={index !== activeIndex}
        >
          <img src={src} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

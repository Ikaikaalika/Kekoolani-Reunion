/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HeroCarouselProps = {
  images: Array<{ src: string; alt?: string | null }>;
  intervalMs?: number;
};

export default function HeroCarousel({ images, intervalMs = 7000 }: HeroCarouselProps) {
  const sanitizedImages = useMemo(
    () => images.filter((image) => image?.src).map((image) => ({ src: image.src, alt: image.alt ?? '' })),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const isVideo = useCallback((src: string) => /\.(mp4|mov|webm|ogg)$/i.test(src), []);
  const activeSrc = sanitizedImages[activeIndex];
  const activeIsVideo = activeSrc ? isVideo(activeSrc) : false;

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % sanitizedImages.length);
  }, [sanitizedImages.length]);

  useEffect(() => {
    if (sanitizedImages.length <= 1) return;
    if (activeIsVideo) return;

    const interval = window.setInterval(() => {
      advance();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [advance, activeIsVideo, intervalMs, sanitizedImages.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeIndex) {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => undefined);
        }
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex]);

  if (!sanitizedImages.length) return null;

  return (
    <div className="absolute inset-0">
      {sanitizedImages.map((image, index) => {
        const isActive = index === activeIndex;
        const video = isVideo(image.src);

        return (
          <div
            key={image.src}
            className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!isActive}
          >
            {video ? (
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                autoPlay={isActive}
                onEnded={advance}
                aria-label={image.alt || 'Reunion highlight video'}
              >
                <source src={image.src} />
              </video>
            ) : (
              <img src={image.src} alt={image.alt || 'Reunion highlight'} className="h-full w-full object-cover" />
            )}
          </div>
        );
      })}
    </div>
  );
}

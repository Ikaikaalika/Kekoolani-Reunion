/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
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
  const [isPaused, setIsPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const isVideo = useCallback((src: string) => /\.(mp4|mov|webm|ogg)$/i.test(src), []);
  const isLocalAsset = useCallback((src: string) => src.startsWith('/'), []);
  const activeSrc = sanitizedImages[activeIndex]?.src;
  const activeIsVideo = activeSrc ? isVideo(activeSrc) : false;
  const prefersReducedMotion = usePrefersReducedMotion();

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % sanitizedImages.length);
  }, [sanitizedImages.length]);

  useEffect(() => {
    if (sanitizedImages.length <= 1) return;
    if (activeIsVideo) return;
    if (isPaused) return;

    const interval = window.setInterval(() => {
      advance();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [advance, activeIsVideo, intervalMs, isPaused, sanitizedImages.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeIndex && !isPaused) {
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
  }, [activeIndex, isPaused, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
  }, [prefersReducedMotion]);

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
                onEnded={isPaused ? undefined : advance}
                aria-label={image.alt || 'Reunion highlight video'}
              >
                <source src={image.src} />
              </video>
            ) : isLocalAsset(image.src) ? (
              <Image
                src={image.src}
                alt={image.alt || 'Reunion highlight'}
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="object-cover"
                priority={index === 0}
              />
            ) : (
              <img src={image.src} alt={image.alt || 'Reunion highlight'} className="h-full w-full object-cover" />
            )}
          </div>
        );
      })}
      {sanitizedImages.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            type="button"
            className="rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white backdrop-blur"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-pressed={isPaused}
          >
            {isPaused ? 'Play' : 'Pause'}
          </button>
        </div>
      )}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return prefersReducedMotion;
}

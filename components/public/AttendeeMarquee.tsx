/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEventHandler } from 'react';

type Attendee = {
  name?: string | null;
  photoUrl?: string | null;
  showName: boolean;
  showPhoto: boolean;
  lineage?: string | null;
};

type AttendeeMarqueeProps = {
  attendees: Attendee[];
};

const BUBBLE_SIZES = [112, 120, 128, 136];
const BUBBLE_OFFSETS = [-28, -12, 8, 20, -18, 14];
const BUBBLE_DRIFTS = [5.5, 6.5, 7.2, 8.4, 9.1];
const FAST_SPEED_SCALE = 0.375;
const TOP_BASE_DURATION = 36;
const BOTTOM_BASE_DURATION = 48;
const MIN_BUBBLES_PER_ROW = 12;
const DRAG_THRESHOLD_PX = 6;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AttendeeMarquee({ attendees }: AttendeeMarqueeProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [repeatCount, setRepeatCount] = useState(2);
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const topTrackRef = useRef<HTMLDivElement | null>(null);
  const bottomTrackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const speedRef = useRef(FAST_SPEED_SCALE);
  const pausedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; top: number; bottom: number } | null>(null);
  const dragMovedRef = useRef(false);
  const lastDragEndRef = useRef(0);
  const widthsRef = useRef({ top: 0, bottom: 0 });
  const offsetsRef = useRef({ top: 0, bottom: 0 });
  const items = useMemo(
    () =>
      attendees
        .map((attendee) => {
          const name = attendee.name?.trim() ?? '';
          const showName = attendee.showName && Boolean(name);
          const showPhoto = attendee.showPhoto && Boolean(attendee.photoUrl);
          if (!showName && !showPhoto) return null;
          return {
            ...attendee,
            name,
            showName,
            showPhoto
          };
        })
        .filter(Boolean) as Array<Attendee & { name: string }>,
    [attendees]
  );
  const isEmpty = items.length === 0;

  const loopItems = useMemo(() => {
    if (!items.length) return [];
    const repeats = Math.max(2, repeatCount);
    return Array.from({ length: repeats }, () => items).flat();
  }, [items, repeatCount]);
  const reverseItems = useMemo(() => [...loopItems].reverse(), [loopItems]);

  const getBubbleStyle = (index: number, rowOffset: number) => {
    const size = BUBBLE_SIZES[(index + rowOffset) % BUBBLE_SIZES.length];
    const offset = BUBBLE_OFFSETS[(index + rowOffset) % BUBBLE_OFFSETS.length];
    const drift = BUBBLE_DRIFTS[(index + rowOffset) % BUBBLE_DRIFTS.length];
    return {
      '--bubble-size': `${size}px`,
      '--bubble-offset': `${offset}px`,
      '--bubble-drift': `${drift}s`,
      '--bubble-delay': `${(index % 6) * 0.45}s`
    } as CSSProperties;
  };

  const isMotionPaused = isPaused;

  useEffect(() => {
    pausedRef.current = isMotionPaused;
  }, [isMotionPaused]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (isEmpty) return;
    const updateWidths = () => {
      if (topTrackRef.current) {
        widthsRef.current.top = topTrackRef.current.scrollWidth / 2;
      }
      if (bottomTrackRef.current) {
        widthsRef.current.bottom = bottomTrackRef.current.scrollWidth / 2;
      }
      const container = marqueeRef.current;
      const track = topTrackRef.current;
      if (container && track) {
        const unitWidth = track.scrollWidth / (2 * repeatCount);
        if (unitWidth > 0) {
          const minRepeat = Math.max(2, Math.ceil(MIN_BUBBLES_PER_ROW / items.length));
          const neededByWidth = Math.max(2, Math.ceil((container.offsetWidth * 2) / unitWidth));
          const needed = Math.max(minRepeat, neededByWidth);
          if (needed > repeatCount) {
            setRepeatCount(needed);
          }
        }
      }
      offsetsRef.current.top = wrapOffset(offsetsRef.current.top, widthsRef.current.top);
      offsetsRef.current.bottom = wrapOffset(offsetsRef.current.bottom, widthsRef.current.bottom);
    };

    updateWidths();

    const observer = new ResizeObserver(updateWidths);
    if (topTrackRef.current) observer.observe(topTrackRef.current);
    if (bottomTrackRef.current) observer.observe(bottomTrackRef.current);
    if (marqueeRef.current) observer.observe(marqueeRef.current);

    return () => observer.disconnect();
  }, [loopItems.length, isEmpty, repeatCount, items.length]);

  useEffect(() => {
    if (isEmpty) return;
    const tick = (time: number) => {
      const marquee = marqueeRef.current;
      const topTrack = topTrackRef.current;
      const bottomTrack = bottomTrackRef.current;
      if (!marquee || !topTrack || !bottomTrack) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const lastTime = lastTimeRef.current ?? time;
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTimeRef.current = time;

      const nextSpeed = speedRef.current;

      if (!pausedRef.current) {
        const topWidth = widthsRef.current.top;
        if (topWidth > 0) {
          const topSpeed = (topWidth / TOP_BASE_DURATION) * nextSpeed;
          offsetsRef.current.top = (offsetsRef.current.top + topSpeed * delta) % topWidth;
          topTrack.style.transform = `translate3d(${-offsetsRef.current.top}px, 0, 0)`;
        }

        const bottomWidth = widthsRef.current.bottom;
        if (bottomWidth > 0) {
        const bottomSpeed = (bottomWidth / BOTTOM_BASE_DURATION) * nextSpeed;
        const nextBottom = wrapOffset(offsetsRef.current.bottom - bottomSpeed * delta, bottomWidth);
        offsetsRef.current.bottom = nextBottom;
        bottomTrack.style.transform = `translate3d(${-nextBottom}px, 0, 0)`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isEmpty]);

  const wrapOffset = (value: number, width: number) => {
    if (width <= 0) return 0;
    const wrapped = value % width;
    return wrapped < 0 ? wrapped + width : wrapped;
  };

  const handleBubbleClick = (bubbleId: string) => (event: MouseEvent<HTMLButtonElement>) => {
    if (Date.now() - lastDragEndRef.current < 200) {
      return;
    }
    event.stopPropagation();
    setActiveBubbleId((prev) => {
      const next = prev === bubbleId ? null : bubbleId;
      setIsPaused(Boolean(next));
      return next;
    });
  };

  const handleSectionClick = () => {
    if (Date.now() - lastDragEndRef.current < 200) {
      return;
    }
    if (!activeBubbleId && !isPaused) return;
    setActiveBubbleId(null);
    setIsPaused(false);
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    dragStartRef.current = {
      x: event.clientX,
      top: offsetsRef.current.top,
      bottom: offsetsRef.current.bottom
    };
    dragMovedRef.current = false;
    lastDragEndRef.current = 0;
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (!dragStartRef.current) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    if (!dragMovedRef.current && Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
      setIsDragging(true);
      setIsPaused(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!dragMovedRef.current) return;

    const topWidth = widthsRef.current.top;
    if (topTrackRef.current && topWidth > 0) {
      const nextTop = wrapOffset(dragStartRef.current.top - deltaX, topWidth);
      offsetsRef.current.top = nextTop;
      topTrackRef.current.style.transform = `translate3d(${-nextTop}px, 0, 0)`;
    }

    const bottomWidth = widthsRef.current.bottom;
    if (bottomTrackRef.current && bottomWidth > 0) {
      const nextBottom = wrapOffset(dragStartRef.current.bottom - deltaX, bottomWidth);
      offsetsRef.current.bottom = nextBottom;
      bottomTrackRef.current.style.transform = `translate3d(${-nextBottom}px, 0, 0)`;
    }
  };

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIdRef.current = null;
    dragStartRef.current = null;
    const wasDragging = dragMovedRef.current;
    dragMovedRef.current = false;
    setIsDragging(false);
    if (wasDragging) {
      lastDragEndRef.current = Date.now();
      setActiveBubbleId(null);
    }
    setIsPaused(false);
  };

  return isEmpty ? (
    <div className="marquee-empty">
      No registrants yet. Be the first to register and share your family.
    </div>
  ) : (
    <div className="relative">
      <div className="absolute right-6 top-0 z-10">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-sand-700 shadow-soft"
          onClick={() => setIsPaused((prev) => !prev)}
          aria-pressed={isPaused}
        >
          {isMotionPaused ? 'Play' : 'Pause'}
        </button>
      </div>
      <div
        ref={marqueeRef}
        className={`marquee marquee--js${isMotionPaused ? ' marquee--paused' : ''}${
          isDragging ? ' marquee--dragging' : ''
        }`}
        onClick={handleSectionClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={topTrackRef} className="marquee-track marquee-track-top">
        {loopItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `top-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          const accessibleLabel = attendee.showName ? attendee.name : 'Reunion attendee';
          return (
            <button
              key={`${keyBase}-${index}`}
              type="button"
              className={bubbleClass}
              style={getBubbleStyle(index, 0)}
              onClick={handleBubbleClick(bubbleId)}
              aria-pressed={activeBubbleId === bubbleId}
              aria-label={accessibleLabel}
            >
              {attendee.showPhoto && (
                <div className="marquee-bubble-core animate-float">
                  {attendee.photoUrl ? (
                    <img
                      src={attendee.photoUrl}
                      alt={attendee.showName ? attendee.name : ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                      {getInitials(attendee.name)}
                    </div>
                  )}
                </div>
              )}
              {attendee.showName && (
                <span className="marquee-bubble-label" data-lineage={lineage}>
                  {attendee.name}
                </span>
              )}
            </button>
          );
        })}
        {loopItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `top-duplicate-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          const accessibleLabel = attendee.showName ? attendee.name : 'Reunion attendee';
          return (
            <button
              key={`${keyBase}-duplicate-${index}`}
              type="button"
              className={bubbleClass}
              style={getBubbleStyle(index, 1)}
              aria-hidden="true"
              tabIndex={-1}
              onClick={handleBubbleClick(bubbleId)}
              aria-label={accessibleLabel}
            >
              {attendee.showPhoto && (
                <div className="marquee-bubble-core animate-float">
                  {attendee.photoUrl ? (
                    <img src={attendee.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                      {getInitials(attendee.name)}
                    </div>
                  )}
                </div>
              )}
              {attendee.showName && (
                <span className="marquee-bubble-label" data-lineage={lineage}>
                  {attendee.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div ref={bottomTrackRef} className="marquee-track marquee-track-bottom marquee-track-reverse">
        {reverseItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `bottom-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          const accessibleLabel = attendee.showName ? attendee.name : 'Reunion attendee';
          return (
            <button
              key={`${keyBase}-alt-${index}`}
              type="button"
              className={bubbleClass}
              style={getBubbleStyle(index, 2)}
              onClick={handleBubbleClick(bubbleId)}
              aria-pressed={activeBubbleId === bubbleId}
              aria-label={accessibleLabel}
            >
              {attendee.showPhoto && (
                <div className="marquee-bubble-core animate-float">
                  {attendee.photoUrl ? (
                    <img
                      src={attendee.photoUrl}
                      alt={attendee.showName ? attendee.name : ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                      {getInitials(attendee.name)}
                    </div>
                  )}
                </div>
              )}
              {attendee.showName && (
                <span className="marquee-bubble-label" data-lineage={lineage}>
                  {attendee.name}
                </span>
              )}
            </button>
          );
        })}
        {reverseItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `bottom-duplicate-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          const accessibleLabel = attendee.showName ? attendee.name : 'Reunion attendee';
          return (
            <button
              key={`${keyBase}-alt-duplicate-${index}`}
              type="button"
              className={bubbleClass}
              style={getBubbleStyle(index, 3)}
              aria-hidden="true"
              tabIndex={-1}
              onClick={handleBubbleClick(bubbleId)}
              aria-label={accessibleLabel}
            >
              {attendee.showPhoto && (
                <div className="marquee-bubble-core animate-float">
                  {attendee.photoUrl ? (
                    <img src={attendee.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                      {getInitials(attendee.name)}
                    </div>
                  )}
                </div>
              )}
              {attendee.showName && (
                <span className="marquee-bubble-label" data-lineage={lineage}>
                  {attendee.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
      </div>
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
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

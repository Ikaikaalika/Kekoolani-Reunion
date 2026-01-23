/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';

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
const FAST_SPEED_SCALE = 1;
const SLOW_SPEED_SCALE = 0.8;
const TOP_BASE_DURATION = 36;
const BOTTOM_BASE_DURATION = 48;
const SPEED_SMOOTHING = 0.12;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AttendeeMarquee({ attendees }: AttendeeMarqueeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const topTrackRef = useRef<HTMLDivElement | null>(null);
  const bottomTrackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const speedRef = useRef(FAST_SPEED_SCALE);
  const targetSpeedRef = useRef(FAST_SPEED_SCALE);
  const pausedRef = useRef(false);
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

  if (!items.length) {
    return (
      <div className="marquee-empty">
        No registrants yet. Be the first to register and share your family.
      </div>
    );
  }

  const loopItems = items.length > 8 ? items : [...items, ...items];
  const reverseItems = [...loopItems].reverse();

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

  useEffect(() => {
    targetSpeedRef.current = isHovered ? SLOW_SPEED_SCALE : FAST_SPEED_SCALE;
  }, [isHovered]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const updateWidths = () => {
      if (topTrackRef.current) {
        widthsRef.current.top = topTrackRef.current.scrollWidth / 2;
      }
      if (bottomTrackRef.current) {
        widthsRef.current.bottom = bottomTrackRef.current.scrollWidth / 2;
      }
    };

    updateWidths();

    const observer = new ResizeObserver(updateWidths);
    if (topTrackRef.current) observer.observe(topTrackRef.current);
    if (bottomTrackRef.current) observer.observe(bottomTrackRef.current);

    return () => observer.disconnect();
  }, [loopItems.length]);

  useEffect(() => {
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

      const currentSpeed = speedRef.current;
      const targetSpeed = targetSpeedRef.current;
      const nextSpeed = currentSpeed + (targetSpeed - currentSpeed) * SPEED_SMOOTHING;
      speedRef.current = nextSpeed;

      const slowFactor = nextSpeed > 0 ? 1 / nextSpeed : 1;
      marquee.style.setProperty('--float-speed', slowFactor.toFixed(3));

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
          offsetsRef.current.bottom = (offsetsRef.current.bottom + bottomSpeed * delta) % bottomWidth;
          bottomTrack.style.transform = `translate3d(${offsetsRef.current.bottom}px, 0, 0)`;
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
  }, []);

  const handleBubbleClick = (bubbleId: string) => (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setActiveBubbleId((prev) => {
      const next = prev === bubbleId ? null : bubbleId;
      setIsPaused(Boolean(next));
      return next;
    });
  };

  const handleSectionClick = () => {
    if (!activeBubbleId && !isPaused) return;
    setActiveBubbleId(null);
    setIsPaused(false);
  };

  const handleSectionEnter = () => {
    setIsHovered(true);
  };

  const handleSectionLeave = () => {
    setIsHovered(false);
    setIsPaused(false);
    setActiveBubbleId(null);
  };

  return (
    <div
      ref={marqueeRef}
      className={`marquee marquee--js${isPaused ? ' marquee--paused' : ''}`}
      onClick={handleSectionClick}
      onMouseEnter={handleSectionEnter}
      onMouseLeave={handleSectionLeave}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onTouchCancel={() => setIsHovered(false)}
    >
      <div
        ref={topTrackRef}
        className="marquee-track marquee-track-top"
      >
        {loopItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `top-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 0)}
              onClick={handleBubbleClick(bubbleId)}
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
            </div>
          );
        })}
        {loopItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `top-duplicate-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-duplicate-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 1)}
              aria-hidden="true"
              onClick={handleBubbleClick(bubbleId)}
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
            </div>
          );
        })}
      </div>
      <div
        ref={bottomTrackRef}
        className="marquee-track marquee-track-bottom marquee-track-reverse"
      >
        {reverseItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `bottom-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-alt-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 2)}
              onClick={handleBubbleClick(bubbleId)}
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
            </div>
          );
        })}
        {reverseItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleId = `bottom-duplicate-${index}-${keyBase}`;
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}${
            activeBubbleId === bubbleId ? ' marquee-bubble--active' : ''
          }`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-alt-duplicate-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 3)}
              aria-hidden="true"
              onClick={handleBubbleClick(bubbleId)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

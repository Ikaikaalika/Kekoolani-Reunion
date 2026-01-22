/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AttendeeMarquee({ attendees }: AttendeeMarqueeProps) {
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
        Registrations are opening soon. Check back to see who is coming.
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

  return (
    <div className="marquee">
      <div className="marquee-track marquee-track-top" style={{ '--marquee-duration': '48s' } as CSSProperties}>
        {loopItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}`;
          const lineage = attendee.lineage ?? '';
          return (
            <div key={`${keyBase}-${index}`} className={bubbleClass} style={getBubbleStyle(index, 0)}>
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
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-duplicate-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 1)}
              aria-hidden="true"
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
        className="marquee-track marquee-track-bottom marquee-track-reverse"
        style={{ '--marquee-duration': '60s' } as CSSProperties}
      >
        {reverseItems.map((attendee, index) => {
          const keyBase = attendee.name || attendee.photoUrl || 'attendee';
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}`;
          const lineage = attendee.lineage ?? '';
          return (
            <div key={`${keyBase}-alt-${index}`} className={bubbleClass} style={getBubbleStyle(index, 2)}>
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
          const bubbleClass = `marquee-bubble${attendee.showPhoto ? '' : ' marquee-bubble--name-only'}`;
          const lineage = attendee.lineage ?? '';
          return (
            <div
              key={`${keyBase}-alt-duplicate-${index}`}
              className={bubbleClass}
              style={getBubbleStyle(index, 3)}
              aria-hidden="true"
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

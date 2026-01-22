/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from 'react';

type Attendee = {
  name: string;
  photoUrl?: string | null;
};

type AttendeeMarqueeProps = {
  attendees: Attendee[];
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AttendeeMarquee({ attendees }: AttendeeMarqueeProps) {
  const items = useMemo(() => attendees.filter((item) => item.name.trim()), [attendees]);

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white/80 p-8 text-center text-sm text-sand-600">
        Registrations are opening soon. Check back to see who is coming.
      </div>
    );
  }

  const loopItems = items.length > 8 ? items : [...items, ...items];

  return (
    <div className="marquee">
      <div className="marquee-track">
        {loopItems.map((attendee, index) => (
          <div
            key={`${attendee.name}-${index}`}
            className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-soft animate-float"
            style={{ animationDelay: `${(index % 6) * 0.6}s` }}
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-sand-200 bg-emerald-100 text-sand-900">
              {attendee.photoUrl ? (
                <img src={attendee.photoUrl} alt={attendee.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                  {getInitials(attendee.name)}
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-sand-900">{attendee.name}</p>
          </div>
        ))}
        {loopItems.map((attendee, index) => (
          <div
            key={`${attendee.name}-duplicate-${index}`}
            className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-soft animate-float"
            style={{ animationDelay: `${(index % 6) * 0.6}s` }}
            aria-hidden="true"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-sand-200 bg-emerald-100 text-sand-900">
              {attendee.photoUrl ? (
                <img src={attendee.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                  {getInitials(attendee.name)}
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-sand-900">{attendee.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

type CountdownProps = {
  targetIso: string;
  fallback?: string;
};

type CountdownState = {
  isValid: boolean;
  isComplete: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const pad = (value: number) => String(value).padStart(2, '0');

function getCountdown(target: Date, now: Date): CountdownState {
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(target.getTime())) {
    return { isValid: false, isComplete: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  if (diff <= 0) {
    return { isValid: true, isComplete: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { isValid: true, isComplete: false, days, hours, minutes, seconds };
}

export default function Countdown({ targetIso, fallback }: CountdownProps) {
  const targetDate = useMemo(() => new Date(targetIso), [targetIso]);
  const [state, setState] = useState<CountdownState>(() => getCountdown(targetDate, new Date()));

  useEffect(() => {
    if (!state.isValid || state.isComplete) return;

    const interval = window.setInterval(() => {
      setState(getCountdown(targetDate, new Date()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state.isComplete, state.isValid, targetDate]);

  if (!state.isValid) {
    return <p className="text-base text-white/80">{fallback ?? 'Countdown coming soon.'}</p>;
  }

  if (state.isComplete) {
    return <p className="text-base text-white/80">Happening now.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div className="rounded-2xl bg-white/10 px-2 py-3">
        <p className="text-2xl font-semibold text-white">{state.days}</p>
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/70">Days</p>
      </div>
      <div className="rounded-2xl bg-white/10 px-2 py-3">
        <p className="text-2xl font-semibold text-white">{pad(state.hours)}</p>
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/70">Hours</p>
      </div>
      <div className="rounded-2xl bg-white/10 px-2 py-3">
        <p className="text-2xl font-semibold text-white">{pad(state.minutes)}</p>
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/70">Mins</p>
      </div>
      <div className="rounded-2xl bg-white/10 px-2 py-3">
        <p className="text-2xl font-semibold text-white">{pad(state.seconds)}</p>
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/70">Secs</p>
      </div>
    </div>
  );
}

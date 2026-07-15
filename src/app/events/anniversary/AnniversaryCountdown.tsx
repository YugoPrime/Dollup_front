"use client";

import { useEffect, useState } from "react";

// Sale ends 2026-07-31 23:59:59 in Mauritius (UTC+4).
const SALE_END = new Date("2026-07-31T23:59:59+04:00").getTime();

type Remaining = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  ended: boolean;
};

function computeRemaining(): Remaining {
  const diff = SALE_END - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, mins: 0, secs: 0, ended: true };
  }
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
    ended: false,
  };
}

const UNITS: { key: keyof Omit<Remaining, "ended">; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "mins", label: "Mins" },
  { key: "secs", label: "Secs" },
];

export function AnniversaryCountdown() {
  // Start null so SSR and first client render match (avoids hydration drift
  // from a server-vs-client clock difference), then hydrate on mount.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setRemaining(computeRemaining());
    const id = setInterval(() => setRemaining(computeRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining?.ended) {
    return (
      <p className="font-display text-[28px] text-coral-700 md:text-[34px]">
        Sale ended
      </p>
    );
  }

  return (
    <div className="flex items-stretch justify-center gap-3 md:gap-4">
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className="flex min-w-[68px] flex-col items-center rounded-2xl border border-blush-400 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(26,18,18,0.08)] backdrop-blur md:min-w-[84px] md:px-5 md:py-4"
        >
          <span className="font-display text-[32px] leading-none text-ink tabular-nums md:text-[44px]">
            {remaining ? String(remaining[key]).padStart(2, "0") : "--"}
          </span>
          <span className="mt-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted md:text-[11px]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

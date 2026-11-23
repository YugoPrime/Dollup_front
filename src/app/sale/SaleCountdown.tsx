"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const t = setInterval(callback, 1000);
  return () => clearInterval(t);
}

// Whole seconds left, rounded up so 0 only ever means "ended". A number is a
// stable snapshot between ticks, so no object cache is needed.
function secondsLeft(endMs: number): number {
  const ms = endMs - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 1000);
}

const UNITS = [
  { label: "Days", of: (s: number) => Math.floor(s / 86_400) },
  { label: "Hrs", of: (s: number) => Math.floor((s % 86_400) / 3_600) },
  { label: "Min", of: (s: number) => Math.floor((s % 3_600) / 60) },
  { label: "Sec", of: (s: number) => s % 60 },
];

/**
 * Live countdown for the /sale hero. The server snapshot is -1 ("--"
 * placeholders), so SSR and hydration match whatever the clocks say; the
 * browser fills in the time once subscribed.
 */
export function SaleCountdown({
  endsAt,
  endedLabel,
  tone = "coral",
}: {
  endsAt: string;
  endedLabel: string;
  /** "mono": black on white, left-aligned (the Black Friday hero and popup). */
  tone?: "coral" | "mono";
}) {
  const endMs = Date.parse(endsAt);
  const left = useSyncExternalStore(
    subscribe,
    () => secondsLeft(endMs),
    () => -1,
  );
  const mono = tone === "mono";

  if (left === 0) {
    return (
      <p
        className={
          mono
            ? "font-display text-[22px] leading-tight text-ink md:text-[26px]"
            : "font-display text-[24px] leading-tight text-coral-300 md:text-[30px]"
        }
      >
        {endedLabel}
      </p>
    );
  }

  return (
    <div
      role="timer"
      aria-label="Time left in the sale"
      className={`flex gap-2 ${mono ? "justify-start" : "justify-center"}`}
    >
      {UNITS.map(({ label, of }) => (
        <div
          key={label}
          className={
            mono
              ? "min-w-[54px] rounded-md border border-ink bg-white px-2 py-1.5 text-center md:min-w-[62px]"
              : "min-w-[58px] rounded-lg bg-white px-2.5 py-1.5 md:min-w-[72px] md:py-2"
          }
        >
          <div
            className={
              mono
                ? "font-display text-[24px] leading-none text-ink tabular-nums md:text-[28px]"
                : "font-display text-[26px] leading-none text-coral-500 tabular-nums md:text-[34px]"
            }
          >
            {left < 0 ? "--" : String(of(left)).padStart(2, "0")}
          </div>
          <div
            className={`mt-1 font-sans font-bold uppercase tracking-wider text-ink-muted ${mono ? "text-[10px]" : "text-[11px]"}`}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

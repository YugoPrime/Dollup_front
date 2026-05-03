"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { salesOfMonthConfig } from "@/lib/sales-of-month";

type Remaining = { d: number; h: number; m: number; s: number; expired: boolean };

function diff(endsAt: string): Remaining {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s, expired: false };
}

const ZERO: Remaining = { d: 0, h: 0, m: 0, s: 0, expired: false };

// Cache the snapshot keyed by total seconds left so React's reference equality
// check sees the same object until the next 1s tick — required for useSyncExternalStore.
let cachedKey = -1;
let cachedSnapshot: Remaining = ZERO;
function getSnapshot(endsAt: string): Remaining {
  const r = diff(endsAt);
  const key = r.expired ? -2 : r.d * 86_400 + r.h * 3_600 + r.m * 60 + r.s;
  if (key !== cachedKey) {
    cachedKey = key;
    cachedSnapshot = r;
  }
  return cachedSnapshot;
}

function subscribe(callback: () => void) {
  const t = setInterval(callback, 1000);
  return () => clearInterval(t);
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <div className="min-w-[52px] rounded-lg bg-white px-2.5 py-1.5">
      <div className="font-display text-[24px] leading-none text-coral-500">{n.toString().padStart(2, "0")}</div>
      <div className="mt-0.5 font-sans text-[8px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}

export function SalesOfTheMonth() {
  const cfg = salesOfMonthConfig;
  // useSyncExternalStore returns ZERO during SSR + first client render (avoiding
  // the time-based hydration mismatch), then updates every 1s once subscribed.
  const r = useSyncExternalStore(
    subscribe,
    () => getSnapshot(cfg.endsAt),
    () => ZERO,
  );

  if (!cfg.enabled || r.expired) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink via-[#3a1a16] to-[#5e2418] py-10 text-white md:py-20">
      <div className="absolute -right-24 -top-16 h-[220px] w-[220px] rounded-full bg-coral-500/20" aria-hidden />
      <div className="absolute -bottom-12 -left-12 h-[140px] w-[140px] rounded-full bg-coral-300/15" aria-hidden />
      <div className="relative mx-auto max-w-[680px] px-6 text-center">
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-coral-300">
          — Limited time · ends {new Date(cfg.endsAt).toLocaleDateString("en-MU", { weekday: "long" })} —
        </p>
        <h2 className="font-display text-[36px] leading-[0.95] md:text-[60px]">
          {cfg.headline.split(" of ")[0]}{" "}
          {cfg.headline.includes(" of ") && (
            <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
              of {cfg.headline.split(" of ")[1]}
            </em>
          )}
        </h2>
        <div className="my-3 font-display text-[56px] font-bold leading-none tracking-tight text-coral-500 md:text-[96px]">
          <sup className="text-[24px] text-coral-300">up to</sup>
          {cfg.percentOff}
          <sup className="text-[24px] text-coral-300">%</sup>
        </div>
        <p
          className="mx-auto mb-5 max-w-[420px] font-sans text-[13px] leading-[1.5] text-[#E0CFCB] md:text-[16px]"
          dangerouslySetInnerHTML={{ __html: cfg.description }}
        />
        <div className="mb-6 flex justify-center gap-2">
          <Unit n={r.d} label="Days" />
          <Unit n={r.h} label="Hrs" />
          <Unit n={r.m} label="Min" />
          <Unit n={r.s} label="Sec" />
        </div>
        <Link
          href={cfg.ctaUrl}
          className="inline-block rounded-full bg-coral-500 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          {cfg.ctaLabel} →
        </Link>
      </div>
    </section>
  );
}

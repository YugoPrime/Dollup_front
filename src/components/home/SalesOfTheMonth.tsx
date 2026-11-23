"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SALE_CAMPAIGN, salePhase } from "@/lib/sale-campaign";
import { salesOfMonthConfig, splitHeadline } from "@/lib/sales-of-month";

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

function Unit({ n, label, numClass }: { n: number; label: string; numClass: string }) {
  return (
    <div className="min-w-[52px] rounded-lg bg-white px-2.5 py-1.5">
      <div className={`font-display text-[24px] leading-none ${numClass}`}>{n.toString().padStart(2, "0")}</div>
      <div className="mt-0.5 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}

/** Colours per SALE_CAMPAIGN.look: "mono" is the Black Friday black banner. */
const CORAL = {
  section: "bg-gradient-to-br from-ink via-[#3a1a16] to-[#5e2418]",
  circles: true,
  soft: "text-coral-300",
  accent: "text-coral-300",
  percent: "text-coral-500",
  body: "text-[#E0CFCB]",
  number: "text-coral-500",
  cta: "bg-coral-500 text-white",
};
const MONO: typeof CORAL = {
  section: "bg-ink",
  circles: false,
  soft: "text-white/70",
  accent: "text-white",
  percent: "text-white",
  body: "text-white/75",
  number: "text-ink",
  cta: "bg-white text-ink transition-colors hover:bg-blush-100",
};

export function SalesOfTheMonth({
  descriptionHtml,
  peakDescriptionHtml,
  initialActive,
  initialPeak,
}: {
  descriptionHtml: string;
  /** Copy for the peak day (cfg.peak), sanitised on the server like the other. */
  peakDescriptionHtml: string;
  /** Whether the sale window was open when the server rendered the page. */
  initialActive: boolean;
  /** Whether the peak day was on when the server rendered the page. */
  initialPeak: boolean;
}) {
  const cfg = salesOfMonthConfig;
  // Window check (start AND end). The server snapshot is the server's own
  // answer, so hydration matches the HTML; the browser re-checks every 1s,
  // which shows the banner at the start and hides it at the end even when
  // the ISR page is a few minutes stale.
  const active = useSyncExternalStore(
    subscribe,
    () => salePhase(Date.now(), cfg) === "active",
    () => initialActive,
  );
  // Same check for the peak day: its own copy, and the clock counts down to
  // the end of the day instead of the end of the sale.
  const peak = useSyncExternalStore(
    subscribe,
    () => salePhase(Date.now(), cfg.peak) === "active",
    () => initialPeak,
  );
  // useSyncExternalStore returns ZERO during SSR + first client render (avoiding
  // the time-based hydration mismatch), then updates every 1s once subscribed.
  const r = useSyncExternalStore(
    subscribe,
    () => getSnapshot(peak ? cfg.peak.endsAt : cfg.endsAt),
    () => ZERO,
  );

  if (!cfg.enabled || !active) return null;
  const [lead, accent] = splitHeadline(cfg.headline);
  const t = SALE_CAMPAIGN.look === "mono" ? MONO : CORAL;

  return (
    <section className={`relative overflow-hidden py-10 text-white md:py-20 ${t.section}`}>
      {t.circles && (
        <>
          <div className="absolute -right-24 -top-16 h-[220px] w-[220px] rounded-full bg-coral-500/20" aria-hidden />
          <div className="absolute -bottom-12 -left-12 h-[140px] w-[140px] rounded-full bg-coral-300/15" aria-hidden />
        </>
      )}
      <div className="relative mx-auto max-w-[680px] px-6 text-center">
        <p className={`mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.3em] ${t.soft}`}>
          {peak
            ? `— ${cfg.peak.label} —`
            : `— Limited time · ends ${new Date(cfg.endsAt).toLocaleDateString("en-MU", { weekday: "long" })} —`}
        </p>
        <h2 className="font-display text-[36px] leading-[0.95] md:text-[60px]">
          {lead}{" "}
          {accent && (
            <em className={`not-italic ${t.accent}`} style={{ fontStyle: "italic" }}>
              {accent}
            </em>
          )}
        </h2>
        <div className={`my-3 font-display text-[56px] font-bold leading-none tracking-tight md:text-[96px] ${t.percent}`}>
          <sup className={`text-[24px] ${t.soft}`}>up to</sup>
          {cfg.percentOff}
          <sup className={`text-[24px] ${t.soft}`}>%</sup>
        </div>
        <p
          className={`mx-auto mb-5 max-w-[420px] font-sans text-[13px] leading-[1.5] md:text-[16px] ${t.body}`}
          dangerouslySetInnerHTML={{ __html: peak ? peakDescriptionHtml : descriptionHtml }}
        />
        <div className="mb-6 flex justify-center gap-2">
          <Unit n={r.d} label="Days" numClass={t.number} />
          <Unit n={r.h} label="Hrs" numClass={t.number} />
          <Unit n={r.m} label="Min" numClass={t.number} />
          <Unit n={r.s} label="Sec" numClass={t.number} />
        </div>
        <Link
          href={cfg.ctaUrl}
          className={`inline-block rounded-full px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] ${t.cta}`}
        >
          {cfg.ctaLabel} →
        </Link>
      </div>
    </section>
  );
}

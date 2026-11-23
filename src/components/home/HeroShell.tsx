"use client";

import type { ReactNode } from "react";
import { useAdventNow } from "@/components/advent/useAdventNow";
import { SaleHeroCopy } from "@/components/sale/SaleHeroCopy";
import { spotlightCopy } from "@/lib/sale-spotlight";

/**
 * The homepage hero frame. While a "mono" sale runs (sale-spotlight.ts) it is
 * white with the sale copy; otherwise it is the blush hero with `defaultCopy`.
 * Decided with the same browser clock as the promo bar (useAdventNow), so a
 * cached page switches back by itself when the sale ends, and
 * ?advent_preview= previews it. The product tiles (children) are picked on
 * the server.
 */
export function HeroShell({
  initialNow,
  defaultCopy,
  children,
}: {
  initialNow: number;
  defaultCopy: ReactNode;
  children: ReactNode;
}) {
  const now = useAdventNow(initialNow);
  const spotlight = spotlightCopy(now);

  return (
    <section
      className={`relative overflow-hidden ${
        spotlight
          ? "border-b border-ink/10 bg-white"
          : "bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0]"
      }`}
    >
      {!spotlight && (
        <>
          <div className="absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full bg-white/45" aria-hidden />
          <div className="absolute -bottom-8 -left-8 h-[120px] w-[120px] rounded-full bg-coral-500/15" aria-hidden />
          <span
            className="absolute right-20 top-12 font-display text-[22px] text-coral-450"
            style={{ transform: "rotate(15deg)" }}
            aria-hidden
          >
            ✦
          </span>
        </>
      )}

      <div className="relative mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:px-10 md:py-16">
        {spotlight ? <SaleHeroCopy copy={spotlight} /> : defaultCopy}
        {children}
      </div>
    </section>
  );
}

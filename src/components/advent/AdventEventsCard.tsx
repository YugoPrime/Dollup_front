"use client";

import Link from "next/link";
import { adventPhase } from "@/lib/advent";
import { useAdventNow } from "./useAdventNow";

/** /events advent card. The page is static, so it switches itself off after 24 Dec in the browser. */
export function AdventEventsCard({ initialNow }: { initialNow: number }) {
  const now = useAdventNow(initialNow);
  if (adventPhase(now) === "ended") return null;
  return (
    <section className="px-6 py-12 md:px-10 md:py-16">
      <div className="relative mx-auto max-w-[900px] overflow-hidden rounded-2xl bg-blush-200 px-6 py-8 pr-24 md:px-10 md:py-10 md:pr-32">
        <span aria-hidden="true" className="absolute inset-y-0 right-10 w-3 bg-coral-500 md:right-16 md:w-4" />
        <p className="relative font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          ★ 24 Days of Doll Up
        </p>
        <h2 className="relative mt-2 font-display text-[28px] leading-[1.05] text-ink md:text-[38px]">
          Advent <em className="italic text-coral-700">calendar</em>
        </h2>
        <p className="relative mt-3 max-w-[440px] font-sans text-[14px] leading-[1.55] text-ink-soft">
          1–24 December · a new treat behind every door, website orders only
        </p>
        <Link
          href="/advent"
          className="relative mt-5 inline-flex min-h-11 items-center rounded-full bg-coral-500 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
        >
          Open the calendar →
        </Link>
      </div>
    </section>
  );
}

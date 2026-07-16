import type { Metadata } from "next";
import Link from "next/link";

import { fetchDrawEntries } from "@/lib/draw-wall";
import { AnniversaryCountdown } from "../AnniversaryCountdown";
import { BubbleWall } from "./BubbleWall";

export const metadata: Metadata = {
  title: "The Rs 2,000 Draw — 8 Years of Doll Up",
  description:
    "Every website order is an entry in the Rs 2,000 anniversary draw. Watch the wall fill up. Winner drawn Aug 1.",
  alternates: { canonical: "/events/anniversary/draw" },
  openGraph: {
    title: "The Rs 2,000 Draw — 8 Years of Doll Up",
    description: "Every website order is an entry. Winner drawn Aug 1.",
    url: "/events/anniversary/draw",
  },
};

// Entries and the draw date are time-sensitive; never serve a stale shell.
export const dynamic = "force-dynamic";

const DRAW_MOMENT = new Date("2026-08-01T00:00:00+04:00").getTime();

export default async function DrawPage() {
  const data = await fetchDrawEntries();
  const revealed = Boolean(data.winnerId);
  const winner = data.entries.find((e) => e.id === data.winnerId);

  return (
    <main className="bg-cream px-5 py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-700">
            8 Years of Doll Up
          </p>
          <h1 className="mt-3 font-display text-[38px] leading-tight text-ink md:text-[56px]">
            The Rs 2,000 Draw
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-sans text-[15px] text-ink-soft">
            Every website order is an entry. The more you order, the more chances you get.
          </p>
        </header>

        <section className="mt-10 flex flex-col items-center">
          {revealed && winner ? (
            <div className="text-center">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Winner
              </p>
              <p className="mt-2 font-display text-[40px] text-[#8A6410] md:text-[52px]">
                {winner.name}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Drawn in
              </p>
              <AnniversaryCountdown target={DRAW_MOMENT} endedLabel="Drawing now…" />
            </>
          )}
        </section>

        <section className="mt-14 rounded-3xl border border-blush-400 bg-white/60 p-6 md:p-10">
          <BubbleWall initial={data} />
        </section>

        <section className="mt-10 text-center">
          <Link
            href="/shop?on_sale=1"
            className="inline-block rounded-full bg-coral-500 px-8 py-3.5 font-sans text-[14px] font-bold text-white transition hover:bg-coral-700"
          >
            Shop the sale — get your entry
          </Link>
          <p className="mx-auto mt-6 max-w-lg font-sans text-[12px] leading-relaxed text-ink-muted">
            Free entry with any website purchase, Jul 17–31. One entry per order. The winner is
            drawn on Aug 1 with seed 8 across all website orders in that window, and announced
            here and on our stories.
          </p>
        </section>
      </div>
    </main>
  );
}

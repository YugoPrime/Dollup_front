"use client";

import Link from "next/link";
import { ADVENT, happyHourState, msUntilNextDoor, todaysDoor } from "@/lib/advent";
import type { HappyHourState } from "@/lib/advent";
import { useAdventNow } from "./useAdventNow";

const STATE_LINE: Record<HappyHourState, string> = {
  later: "Tonight 8–10pm",
  live: "Live until 10pm",
  over: "Over, see you at midnight",
};

function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

function Star({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`absolute z-[2] leading-none text-gold ${className}`}>
      ★
    </span>
  );
}

/** Gift-wrapped "today's door" card above the homepage hero, 1 to 24 Dec. */
export function AdventHero({ initialNow }: { initialNow: number }) {
  const now = useAdventNow(initialNow);
  const door = todaysDoor(now);
  if (!door) return null;

  const hh = happyHourState(door, now);
  const ms = msUntilNextDoor(now);
  const over = hh === "over";
  const cta = over
    ? { label: "See all 24 doors", href: ADVENT.path }
    : { label: "Shop now", href: door.href };

  return (
    <section aria-label={`${ADVENT.name}, day ${door.day}`} className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="relative overflow-hidden rounded-2xl bg-blush-200 py-5 pl-4 pr-20 sm:py-7 sm:pl-8 sm:pr-28">
        {/* ribbon, bow, stars */}
        <span aria-hidden="true" className="absolute inset-y-0 right-7 z-[1] w-3 bg-coral-500 sm:right-12 sm:w-4" />
        <span aria-hidden="true" className="absolute right-[18px] top-[7px] z-[3] h-[21px] w-9 sm:right-[38px]">
          <i className="absolute left-0 top-0 h-[17px] w-[17px] -rotate-[20deg] rounded-[50%_0_50%_50%] border-4 border-coral-500" />
          <i className="absolute right-0 top-0 h-[17px] w-[17px] rotate-[20deg] rounded-[0_50%_50%_50%] border-4 border-coral-500" />
          <b className="absolute left-[14px] top-[6px] h-2 w-2 rounded-[3px] bg-coral-700" />
        </span>
        <Star className="right-[52px] top-16 text-[11px] sm:right-24" />
        <Star className="right-2 top-[118px] text-[8px] sm:right-6" />

        <div className="relative z-[2] max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
            Advent calendar · Day {door.day} of 24
          </p>
          <h2 className="mt-2 font-display text-[1.65rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
            <em className="italic text-coral-700">{door.label}</em>
          </h2>
          {hh ? (
            <p className="mt-2 text-sm font-semibold leading-snug text-ink">
              {STATE_LINE[hh]}
              <span className="font-normal text-ink-soft"> · On website orders</span>
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{door.detail}</p>
              <p className="mt-1 text-sm leading-snug text-ink-soft">On website orders, until midnight</p>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center rounded-full bg-coral-500 px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
            >
              {cta.label}
            </Link>
            {!over && (
              <Link
                href={ADVENT.path}
                className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.1em] text-ink underline underline-offset-4"
              >
                See all 24 doors →
              </Link>
            )}
          </div>
        </div>
      </div>

      {ms !== null && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-blush-200 bg-white px-3 py-2.5">
          <span aria-hidden="true" className="relative h-8 w-[30px] flex-none overflow-hidden rounded-[7px] bg-blush-100">
            <span className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-coral-500" />
          </span>
          <p className="text-sm text-ink-soft">
            Door {door.day + 1} opens in <span className="font-semibold text-ink">{formatCountdown(ms)}</span>
          </p>
        </div>
      )}
    </section>
  );
}

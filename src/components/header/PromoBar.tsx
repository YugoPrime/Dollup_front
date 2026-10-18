"use client";

import { useSyncExternalStore } from "react";
import { FREE_POSTAGE_UNTIL_LABEL, freePostageActive } from "@/lib/checkout";

const noSubscribe = () => () => {};

/**
 * Coral bar above the header, carrying the free-postage offer until 1 Nov.
 *
 * Date-gated in the browser, not on the server: the bar renders inside the
 * root layout, and a server-side check would freeze at build time on
 * statically-rendered pages. The server snapshot is always "offer on" (every
 * build ships before the offer ends), so hydration matches, and from 2 Nov
 * the browser swaps in the evergreen copy by itself.
 *
 * Shown on mobile too: most customers arrive from Instagram on a phone. It
 * stays visible there after the offer (evergreen copy, no layout shift).
 * Cleanup on the next deploy after 1 Nov: put the static evergreen bar back
 * in Header.tsx with `hidden ... md:flex` and delete this file.
 */
export function PromoBar() {
  const offer = useSyncExternalStore(
    noSubscribe,
    () => freePostageActive(),
    () => true,
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-coral-500 px-4 py-1.5 text-center text-[12px] font-medium tracking-wider text-white md:px-6">
      {offer && (
        <>
          <span>Free postage on every order until {FREE_POSTAGE_UNTIL_LABEL}</span>
          <span className="hidden opacity-50 md:inline">✦</span>
        </>
      )}
      <span className={offer ? "hidden md:inline" : undefined}>
        Free delivery on orders Rs.1500+
      </span>
      <span className="hidden opacity-50 md:inline">✦</span>
      <span className="hidden md:inline">Cash on delivery available</span>
    </div>
  );
}

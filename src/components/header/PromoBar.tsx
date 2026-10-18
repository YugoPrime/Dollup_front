"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FREE_POSTAGE_UNTIL_LABEL } from "@/lib/checkout";
import {
  SALE_CAMPAIGN,
  SALE_ENDS_SHORT_LABEL,
  SALE_PATH,
  promoBarState,
  type PromoBarState,
} from "@/lib/sale-campaign";

const noSubscribe = () => () => {};

/**
 * Coral bar above the header. While the sale runs it leads with a link to
 * /sale; the free-postage offer runs until 1 Nov; then evergreen copy.
 *
 * Date-gated in the browser, not on the server: the bar renders inside the
 * root layout, and a server-side check would freeze at build time on
 * statically-rendered pages. The server snapshot is the sale state (builds in
 * this window ship before the sale ends), so hydration matches; the browser
 * shows the free-postage copy before the sale starts and, from 2 Nov, the
 * evergreen copy by itself.
 *
 * One line on mobile in every state, so the swap never moves the page. Shown
 * on mobile too: most customers arrive from Instagram on a phone. It stays
 * visible there after the offer (evergreen copy, no layout shift).
 * Cleanup on the next deploy after 1 Nov: put the static evergreen bar back
 * in Header.tsx with `hidden ... md:flex` and delete this file.
 */
export function PromoBar() {
  const state = useSyncExternalStore<PromoBarState>(
    noSubscribe,
    () => promoBarState(),
    () => "sale-free-postage",
  );
  const sale = state === "sale-free-postage" || state === "sale";
  const offer = state === "sale-free-postage" || state === "free-postage";
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-coral-500 px-4 py-1.5 text-center text-[12px] font-medium tracking-wider text-white md:px-6">
      {sale && (
        <>
          {/* -my/py stretch the tap target to the bar's full height. */}
          <Link
            href={SALE_PATH}
            className="-my-1.5 py-1.5 font-bold underline-offset-2 hover:underline"
          >
            SALE · up to {SALE_CAMPAIGN.maxPercent}% off
            {offer && <span className="md:hidden"> + free postage</span>}
            {" "}· ends {SALE_ENDS_SHORT_LABEL}
            <span aria-hidden> →</span>
          </Link>
          <span className="hidden opacity-50 md:inline">✦</span>
        </>
      )}
      {offer && (
        <>
          <span className={sale ? "hidden md:inline" : undefined}>
            Free postage on every order until {FREE_POSTAGE_UNTIL_LABEL}
          </span>
          <span className="hidden opacity-50 md:inline">✦</span>
        </>
      )}
      {!sale && (
        <>
          <span className={offer ? "hidden md:inline" : undefined}>
            Free delivery on orders Rs.1500+
          </span>
          <span className="hidden opacity-50 md:inline">✦</span>
        </>
      )}
      <span className="hidden md:inline">Cash on delivery available</span>
    </div>
  );
}

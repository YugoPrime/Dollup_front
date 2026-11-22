"use client";

import Link from "next/link";
import { useAdventNow } from "@/components/advent/useAdventNow";
import { AdventPreviewBadge } from "@/components/advent/AdventPreviewBadge";
import { SaleTickerBar } from "@/components/sale/SaleTickerBar";
import { adventBarCopy, adventBarKey } from "@/lib/advent";
import { saleBarCopy } from "@/lib/sale-campaign";
import { spotlightCopy } from "@/lib/sale-spotlight";

const ARROW = " →";

/** The trailing arrow is decoration: hide it from screen readers. */
function Lead({ text }: { text: string }) {
  if (!text.endsWith(ARROW)) return <>{text}</>;
  return (
    <>
      {text.slice(0, -ARROW.length)}
      <span aria-hidden="true">{ARROW}</span>
    </>
  );
}

/**
 * Coral bar above the header. A running sale (sale-campaign.ts) leads; outside
 * it the bar follows the advent calendar. Both in Mauritius time, decided in
 * the browser (useAdventNow) because the bar sits in the root layout and a
 * server-side check would freeze on statically cached pages.
 * One line on mobile in every state, so a swap never moves the page: below md
 * the lead is a single truncating line with normal letter-spacing.
 * A "mono" sale (SALE_CAMPAIGN.look) swaps the coral bar for the black
 * ticker, same height.
 */
export function PromoBar({ initialNow }: { initialNow: number }) {
  const now = useAdventNow(initialNow);
  const spotlight = spotlightCopy(now);
  if (spotlight) {
    return (
      <>
        <SaleTickerBar copy={spotlight} />
        <AdventPreviewBadge />
      </>
    );
  }
  const { lead, href, tail } = saleBarCopy(now) ?? adventBarCopy(adventBarKey(now));
  return (
    <>
      <div className="flex items-center justify-center gap-x-3 gap-y-0.5 bg-coral-500 px-4 py-1.5 text-center text-[12px] font-medium tracking-normal text-white md:flex-wrap md:px-6 md:tracking-wider">
        {href ? (
          // -my/py stretch the tap target to the bar's full height.
          <Link
            href={href}
            className="-my-1.5 min-w-0 truncate py-1.5 font-bold underline-offset-2 hover:underline md:overflow-visible md:text-clip md:whitespace-normal"
          >
            <Lead text={lead} />
          </Link>
        ) : (
          <span className="min-w-0 truncate md:overflow-visible md:text-clip md:whitespace-normal">
            <Lead text={lead} />
          </span>
        )}
        {tail && (
          <>
            <span className="hidden opacity-50 md:inline">✦</span>
            <span className="hidden md:inline">{tail}</span>
          </>
        )}
      </div>
      <AdventPreviewBadge />
    </>
  );
}

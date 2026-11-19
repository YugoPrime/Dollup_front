"use client";

import Link from "next/link";
import { useAdventNow } from "@/components/advent/useAdventNow";
import { adventBarCopy, adventBarKey } from "@/lib/advent";

/**
 * Coral bar above the header. Follows the advent calendar in Mauritius time,
 * decided in the browser (useAdventNow) because the bar sits in the root
 * layout and a server-side check would freeze on statically cached pages.
 * One line on mobile in every state, so a swap never moves the page.
 */
export function PromoBar({ initialNow }: { initialNow: number }) {
  const now = useAdventNow(initialNow);
  const { lead, href, tail } = adventBarCopy(adventBarKey(now));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-coral-500 px-4 py-1.5 text-center text-[12px] font-medium tracking-wider text-white md:px-6">
      {href ? (
        // -my/py stretch the tap target to the bar's full height.
        <Link href={href} className="-my-1.5 py-1.5 font-bold underline-offset-2 hover:underline">
          {lead}
        </Link>
      ) : (
        <span>{lead}</span>
      )}
      {tail && (
        <>
          <span className="hidden opacity-50 md:inline">✦</span>
          <span className="hidden md:inline">{tail}</span>
        </>
      )}
    </div>
  );
}

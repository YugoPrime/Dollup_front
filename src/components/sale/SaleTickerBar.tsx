import Link from "next/link";
import { SALE_PATH } from "@/lib/sale-campaign";
import type { SpotlightCopy } from "@/lib/sale-spotlight";

/** Copies of the item list per half of the track: wide enough for a 2,560px screen. */
const REPEAT = 3;

/**
 * Black ticker above the header while a "mono" sale runs (sale-spotlight.ts).
 * Exactly 30px, like the coral bar, so swapping between them never moves the
 * page. The track holds two identical halves and slides by half its width,
 * so the loop is seamless (globals.css, .sale-ticker-*). The whole bar is one
 * link whose label reads the items once; the moving text is hidden from
 * screen readers. Hover or keyboard focus pauses it, and with reduced motion
 * the track is replaced by a static line.
 */
export function SaleTickerBar({ copy }: { copy: SpotlightCopy }) {
  const half = (key: string) => (
    <span key={key} className="flex shrink-0 items-center">
      {Array.from({ length: REPEAT }, (_, r) =>
        copy.ticker.map((item, i) => (
          <span key={`${r}-${i}`} className="flex items-center">
            <span className="px-4">{item}</span>
            <span className="text-[10px] opacity-50">✦</span>
          </span>
        )),
      )}
    </span>
  );

  return (
    <Link
      href={SALE_PATH}
      aria-label={`${copy.ticker.join(", ")}. Shop the sale`}
      className="sale-ticker relative flex h-[30px] items-center overflow-hidden bg-ink font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
    >
      <span aria-hidden="true" className="sale-ticker-track flex w-max items-center whitespace-nowrap">
        {half("a")}
        {half("b")}
      </span>
      <span aria-hidden="true" className="sale-ticker-static w-full truncate px-4 text-center">
        {copy.ticker.slice(0, 2).join(" · ")}
      </span>
    </Link>
  );
}

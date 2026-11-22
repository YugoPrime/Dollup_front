import Link from "next/link";
import { SaleCountdown } from "@/app/sale/SaleCountdown";
import { SALE_CAMPAIGN, SALE_PATH } from "@/lib/sale-campaign";
import type { SpotlightCopy } from "@/lib/sale-spotlight";
import { splitHeadline } from "@/lib/sales-of-month";

/**
 * A short paragraph whose lines break between sentences when they can, so
 * "Sunday 29 Nov" never splits across two lines. A sentence longer than the
 * line still wraps normally.
 */
export function Sentences({ text }: { text: string }) {
  const parts = text.split(/(?<=\.)\s+/);
  return (
    <>
      {parts.map((s, i) => (
        <span key={i} className="inline-block">
          {s}
          {i < parts.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/**
 * Left column of the homepage hero while a "mono" sale runs: black on white,
 * the same serif title rhythm as "Doll up, babe.", the offer, a live
 * countdown and the way in. The thin rule under the title draws itself once
 * (globals.css, .sale-hero-rule).
 */
export function SaleHeroCopy({ copy }: { copy: SpotlightCopy }) {
  const [lead, accent] = splitHeadline(SALE_CAMPAIGN.name);
  return (
    <div>
      <p className="mb-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink">
        {copy.kicker}
      </p>
      <h1 className="font-display text-[56px] leading-[0.92] tracking-[-1.5px] text-ink md:text-[72px]">
        {lead}
        {accent && (
          <>
            <br />
            <em>{accent}</em>
          </>
        )}
      </h1>
      <span aria-hidden className="sale-hero-rule mt-5 block h-px w-28 origin-left bg-ink" />
      <p className="mt-4 font-display leading-none text-ink">
        <span className="text-[22px] md:text-[26px]">up to </span>
        <span className="text-[64px] font-bold tracking-tight md:text-[88px]">
          {SALE_CAMPAIGN.maxPercent}%
        </span>
        <span className="text-[22px] md:text-[26px]"> off</span>
      </p>
      <p className="mt-3 max-w-[380px] font-sans text-[14px] leading-[1.5] text-ink-soft">
        <Sentences text={copy.line} />
      </p>
      <div className="mt-5">
        <SaleCountdown
          endsAt={copy.countdownTo}
          endedLabel={`${SALE_CAMPAIGN.name} is over`}
          tone="mono"
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={SALE_PATH}
          className="rounded-full bg-ink px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-black"
        >
          Shop the sale <span aria-hidden="true">→</span>
        </Link>
        <Link
          href="/shop?sort=new"
          className="rounded-full border-2 border-ink bg-white px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
        >
          New arrivals
        </Link>
      </div>
    </div>
  );
}

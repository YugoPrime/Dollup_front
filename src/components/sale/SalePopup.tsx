"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SaleCountdown } from "@/app/sale/SaleCountdown";
import { FocusTrapLayer } from "@/components/a11y/FocusTrapLayer";
import { readPreviewNow } from "@/components/advent/advent-preview-client";
import { Sentences } from "@/components/sale/SaleHeroCopy";
import { isPreorderHost } from "@/lib/host";
import { SALE_CAMPAIGN, SALE_PATH } from "@/lib/sale-campaign";
import { lockBodyScroll } from "@/lib/scroll-lock";
import {
  POPUP_STORAGE_KEY,
  isPopupPath,
  spotlightCopy,
  type SpotlightCopy,
} from "@/lib/sale-spotlight";

/** Time on the page before the popup opens. */
const DELAY_MS = 3000;
/** Re-check interval while another window or the cookie card is open. */
const RETRY_MS = 1000;

/**
 * Another window is open, or the full cookie card is on screen (desktop, or
 * mobile after "Manage"). Windows are anything with aria-modal (bag, age
 * gate, advent door, feedback) or a FocusTrapLayer, which carries
 * data-focus-trap-fallback and is only mounted while open (mobile menu and
 * search, filter and quick-add sheets, image zoom). The mobile cookie pill
 * sits in the header and doesn't count.
 */
function blocked(): boolean {
  // Never over After Dark: /after-dark is left out by path (isPopupPath), and
  // toy pages carry the 18+ check's data-after-dark marker, which stays in
  // the DOM (hidden) after the check is confirmed.
  if (document.querySelector("[data-after-dark]")) return true;
  if (document.querySelector('[aria-modal="true"], [data-focus-trap-fallback]')) return true;
  const card = document.querySelector("[data-consent-card]");
  return card !== null && card.getClientRects().length > 0;
}

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(POPUP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeen(value: string): void {
  try {
    window.localStorage.setItem(POPUP_STORAGE_KEY, value);
  } catch {
    // Storage blocked (private mode): it may show again on the next visit.
  }
}

function spotlightNow(): SpotlightCopy | null {
  return spotlightCopy(readPreviewNow() ?? Date.now());
}

/**
 * Once-a-day Black Friday popup while a "mono" sale runs (sale-spotlight.ts):
 * ~3 s after landing on any page except /sale, checkout, account and sign-in
 * pages, never on top of another window or the cookie card. Marked seen when
 * it opens, keyed by the Mauritius date, so Friday's deeper prices get their
 * own showing. Closes with ✕, "Maybe later", Esc or a tap outside, and focus
 * goes back where it was (FocusTrapLayer).
 */
export function SalePopup() {
  const pathname = usePathname();
  const [copy, setCopy] = useState<SpotlightCopy | null>(null);

  useEffect(() => {
    if (isPreorderHost(window.location.host) || !isPopupPath(pathname)) return;
    const first = spotlightNow();
    if (!first || readSeen() === first.seenValue) return;

    let timer = window.setTimeout(function tryOpen() {
      if (blocked()) {
        timer = window.setTimeout(tryOpen, RETRY_MS);
        return;
      }
      const current = spotlightNow();
      if (!current || readSeen() === current.seenValue) return;
      writeSeen(current.seenValue);
      setCopy(current);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Lock the page behind the popup while it is open.
  useEffect(() => {
    if (!copy) return;
    return lockBodyScroll();
  }, [copy]);

  if (!copy) return null;
  const close = () => setCopy(null);

  // Same layout as CartDrawer: the trap covers the whole screen and the
  // backdrop is a button inside it, so a tap on the dimmed page closes the
  // popup and lands on that button, never on a link or Add to Bag beneath.
  return createPortal(
    <FocusTrapLayer
      ariaLabel={SALE_CAMPAIGN.name}
      onDeactivate={close}
      // Focus the card itself, so no button opens with a focus ring.
      initialFocus={() => document.querySelector<HTMLElement>(".sale-pop") ?? false}
      className="fixed inset-0 z-[120] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="sale-pop-backdrop fixed inset-0 cursor-default bg-ink/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-pop-title"
        tabIndex={-1}
        className="sale-pop relative w-full max-w-[380px] rounded-2xl bg-white px-7 pb-6 pt-9 text-center text-ink shadow-2xl focus:outline-none md:px-9"
      >
        {/* Thin black inner frame. */}
        <span aria-hidden className="pointer-events-none absolute inset-[10px] rounded-xl border border-ink" />
        {/* Close sits above the card, on the dimmed page, clear of the copy. */}
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[16px] leading-none text-ink shadow-lg transition-colors hover:bg-blush-100"
        >
          ✕
        </button>
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.22em]">
          {copy.kicker}
        </p>
        <h2 id="sale-pop-title" className="mt-3 font-display text-[40px] font-normal leading-none md:text-[46px]">
          Up to <span className="font-bold">{SALE_CAMPAIGN.maxPercent}%</span> off
        </h2>
        <span aria-hidden className="mx-auto mt-4 block h-px w-16 bg-ink" />
        <p className="mt-4 font-sans text-[14px] leading-[1.5] text-ink-soft">
          <Sentences text={copy.line} />
        </p>
        <div className="mt-5 flex justify-center">
          <SaleCountdown
            endsAt={copy.countdownTo}
            endedLabel={copy.endedLabel}
            tone="mono"
          />
        </div>
        <Link
          href={SALE_PATH}
          onClick={close}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-black"
        >
          Shop the sale <span aria-hidden="true">&nbsp;→</span>
        </Link>
        <button
          type="button"
          onClick={close}
          className="mt-2 min-h-11 px-3 font-sans text-[12px] font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Maybe later
        </button>
      </div>
    </FocusTrapLayer>,
    document.body,
  );
}

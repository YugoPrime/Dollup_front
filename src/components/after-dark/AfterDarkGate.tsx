"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import {
  AGE_OK_CLASS,
  hasAgeCookie,
  setAgeVerifiedCookie,
} from "@/lib/age-gate";
import { lockBodyScroll } from "@/lib/scroll-lock";

// Full-screen 18+ check. Rendered on the server so a first visit with JS off
// is covered; the `.dub-age-ok [data-age-gate]` rule (globals.css) hides it
// for returning visitors before paint. It stays in the DOM, hidden, once
// confirmed: its `data-after-dark` marker keeps SalePopup off After Dark
// pages. z-[130]: above Header/MobileBottomNav (100) and SalePopup (120),
// below CartDrawer (200).
export function AfterDarkGate() {
  const yesRef = useRef<HTMLButtonElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  // Releasing twice is a no-op (scroll-lock.ts); nulling the ref keeps the
  // Yes handler and the unmount cleanup from both trying.
  const release = () => {
    releaseRef.current?.();
    releaseRef.current = null;
  };

  // Returning visitor (or one who confirmed in AgeGateModal this session,
  // after the head script ran): put the class on <html> so the gate stays
  // hidden. Layout effect, so a client navigation never paints it first.
  // Otherwise focus Yes and lock the page until it is pressed.
  useLayoutEffect(() => {
    if (hasAgeCookie(document.cookie)) {
      document.documentElement.classList.add(AGE_OK_CLASS);
      return;
    }
    yesRef.current?.focus();
    releaseRef.current = lockBodyScroll();
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  return (
    <div
      data-age-gate
      data-after-dark
      role="dialog"
      aria-modal="true"
      aria-labelledby="after-dark-gate-title"
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_srgb,var(--color-champagne-gold)_22%,transparent),transparent_60%),linear-gradient(to_bottom,var(--color-wine-800),var(--color-wine-950))] px-7 text-center"
    >
      <div className="w-full max-w-sm">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.26em] text-champagne-gold">
          After Dark · 18+
        </p>
        <div
          aria-hidden="true"
          className="relative mx-auto my-3 h-px w-[120px] bg-champagne-gold after:absolute after:left-1/2 after:top-[-3px] after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rotate-45 after:bg-champagne-gold after:content-['']"
        />
        <h2
          id="after-dark-gate-title"
          className="font-display text-[32px] font-normal leading-[1.1] text-champagne-50"
        >
          Are you <em className="italic text-champagne-gold-soft">18 or older?</em>
        </h2>
        <p className="mt-3 font-sans text-[13px] leading-[1.55] text-champagne-200">
          After Dark sells adult toys and games. We&apos;ll remember your answer on
          this phone for 30 days.
        </p>
        <button
          ref={yesRef}
          type="button"
          onClick={() => {
            setAgeVerifiedCookie();
            // The class hides the gate (globals.css); no re-render needed.
            document.documentElement.classList.add(AGE_OK_CLASS);
            release();
          }}
          className="mt-6 w-full rounded-full bg-champagne-100 px-6 py-3.5 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-wine-900 transition hover:bg-champagne-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-gold"
        >
          Yes, I&apos;m 18+ · Enter
        </button>
        <Link
          href="/"
          className="mt-4 inline-block font-sans text-[12px] text-champagne-200 underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-gold"
        >
          No, take me back
        </Link>
      </div>
      <p className="absolute inset-x-0 bottom-6 font-sans text-[10px] uppercase tracking-[0.14em] text-champagne-200/70">
        Cash on delivery · Ask us privately
      </p>
    </div>
  );
}

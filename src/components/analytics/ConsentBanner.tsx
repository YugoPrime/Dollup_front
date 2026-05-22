"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  applyConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// Minimal Google Consent Mode v2 banner. Rendered in the SSR HTML so it's
// available at FCP; an inline <head> script in RootLayout reads the consent
// cookie before first paint and adds data-consent-known to <html> for
// returning visitors, which CSS uses to hide [data-consent-banner] before the
// browser paints it. That keeps the banner from being a late-paint LCP
// candidate. The `dismissed` state handles the in-session click.
//
// For fresh visitors, we hold the banner at opacity:0 for ~700ms after mount
// so the hero (image + headline) wins LCP. The banner still appears well within
// the first second — the user is still scanning the hero, not the bottom of
// the viewport.
//
// Defaults are denied (set in TagManager beforeInteractive script), so this
// banner only ever transitions from denied -> granted on Accept, or confirms
// the existing denied state on Reject.
export function ConsentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(t);
  }, []);

  if (!GTM_ID || dismissed) return null;

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    applyConsent(choice);
    setDismissed(true);
  };

  return (
    <div
      data-consent-banner
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
      className="fixed inset-x-0 bottom-0 z-[100] mx-auto w-full max-w-3xl rounded-t-2xl border border-blush-300 bg-white p-4 shadow-2xl md:bottom-4 md:rounded-2xl"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="font-sans text-[13px] leading-relaxed text-ink-soft md:max-w-md">
          We use cookies to make Doll Up Boutique work and to understand how
          you use it. You can change your choice anytime in our{" "}
          <Link href="/privacy" className="underline hover:text-coral-500">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-xs font-semibold text-ink hover:border-coral-500"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-md bg-coral-500 px-3 py-2 font-sans text-xs font-semibold text-white hover:bg-coral-700"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

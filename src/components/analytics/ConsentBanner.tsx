"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  applyConsent,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// Minimal Google Consent Mode v2 banner. Hidden when:
//   - GTM is not configured (no point asking for analytics consent if no
//     analytics is loaded).
//   - The user has already chosen.
// Defaults are denied (set in TagManager beforeInteractive script), so this
// banner only ever transitions from denied -> granted on Accept, or confirms
// the existing denied state on Reject.
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!GTM_ID) return;
    if (readConsent() !== null) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    applyConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
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

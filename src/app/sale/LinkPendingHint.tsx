"use client";

import { useLinkStatus } from "next/link";

/**
 * Tap feedback for the /sale filter chips. The page is dynamic with no
 * loading.js, so a chip tap waits on the server; this pulses an overlay on
 * the tapped chip meanwhile. Always rendered and absolutely positioned, so
 * it never shifts the layout. Must sit inside a `relative` <Link>.
 */
export function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-full bg-current transition-opacity ${
        pending ? "animate-pulse opacity-20" : "opacity-0"
      }`}
    />
  );
}

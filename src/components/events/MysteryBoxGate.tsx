"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isMysteryBoxPaused } from "@/lib/mystery-box";

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

/**
 * Hides a Mystery Box teaser while a sale runs (the box is off then). The
 * home page is ISR and /events is static, so the server's answer can be
 * stale: the browser re-checks the clock every minute.
 */
export function MysteryBoxGate({
  initialPaused,
  children,
}: {
  initialPaused: boolean;
  children: ReactNode;
}) {
  const paused = useSyncExternalStore(
    subscribe,
    () => isMysteryBoxPaused(),
    () => initialPaused,
  );
  return paused ? null : <>{children}</>;
}

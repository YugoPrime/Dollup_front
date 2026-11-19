"use client";

import { useSyncExternalStore } from "react";
import { adventNowMs } from "@/lib/advent";

function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/**
 * Mauritius-calendar clock for the browser. The server snapshot is the time
 * the HTML was rendered, so hydration matches; the client then snaps to the
 * real minute and re-checks every 30 s, so a cached page never shows a stale
 * door. Rounded to the minute so the snapshot stays stable between ticks.
 */
export function useAdventNow(initialNow: number): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(adventNowMs() / 60_000) * 60_000,
    () => initialNow,
  );
}

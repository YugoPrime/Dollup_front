"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook. Returns false on the server and during the first
 * client render, then updates to the real value once hydration attaches.
 * Use a stable, narrow query string — don't construct one inline.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP_QUERY = "(min-width: 768px)";

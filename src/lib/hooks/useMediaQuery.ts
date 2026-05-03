"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook. Returns false on the server and during the first
 * client render, then updates to the real value once the listener attaches.
 * Use a stable, narrow query string — don't construct one inline.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const DESKTOP_QUERY = "(min-width: 768px)";

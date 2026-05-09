"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pushPageView } from "@/lib/analytics";

// Next.js App Router does a client-side transition on link clicks, which means
// GTM's default "Page View" trigger only fires on first paint. We push a
// `page_view` event on every route change so GA4 + Pixel see SPA navigations.
// The very first push is skipped because GTM already fires its own page-load
// view tag on initial load.
export function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    const qs = searchParams?.toString();
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
    pushPageView(url);
  }, [pathname, searchParams]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontally scrolling chip row that keeps its active chip in view, so a
 * deep link from an ad (/sale?category=bottoms) shows the selection on a
 * phone instead of leaving it off the right edge. Scrolls the row only, never
 * the page.
 */
export function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !active) return;
    const start = active.offsetLeft;
    const end = start + active.offsetWidth;
    if (start < row.scrollLeft || end > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = start - (row.clientWidth - active.offsetWidth) / 2;
    }
  });

  return (
    <nav
      ref={ref}
      aria-label={label}
      className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
    >
      {children}
    </nav>
  );
}

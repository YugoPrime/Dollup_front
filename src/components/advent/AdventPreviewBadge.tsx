"use client";

import { useSyncExternalStore } from "react";
import { PREVIEW_PARAM, previewLabel } from "@/lib/advent-preview";
import { readPreviewNow } from "./advent-preview-client";

function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/**
 * Pill shown only while an advent preview is active. Nothing on the server
 * and nothing without preview, so there is no hydration mismatch. A plain
 * <a> so exiting reloads every surface on the real clock.
 */
export function AdventPreviewBadge() {
  const now = useSyncExternalStore(
    subscribe,
    () => {
      const n = readPreviewNow();
      return n == null ? null : Math.floor(n / 60_000) * 60_000;
    },
    () => null,
  );
  if (now == null) return null;
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 z-[95] flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 font-sans text-[11px] font-semibold text-white shadow-lg md:bottom-4">
      <span>Advent preview · {previewLabel(now)}</span>
      <a href={`/?${PREVIEW_PARAM}=off`} className="underline underline-offset-2">
        Exit
      </a>
    </div>
  );
}

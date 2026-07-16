"use client";

import { useEffect, useMemo, useState } from "react";

import type { DrawEntry, DrawPayload } from "@/lib/draw-wall";

const POLL_MS = 60_000;
const MAX_BUBBLES = 120;

/** Deterministic 0..1 from the bubble id, so a bubble never moves between polls. */
function jitter(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function Bubble({ entry, isWinner, dimmed }: { entry: DrawEntry; isWinner: boolean; dimmed: boolean }) {
  const drift = 6 + jitter(entry.id, 1) * 4; // 6-10s
  const delay = jitter(entry.id, 2) * 5;
  const nudge = jitter(entry.id, 3) * 16 - 8; // -8..8px

  return (
    <div
      className={[
        "flex items-center justify-center rounded-full border px-3 py-2 text-center transition-all duration-700",
        "motion-safe:animate-[drawDrift_var(--drift)_ease-in-out_var(--delay)_infinite]",
        isWinner
          ? "scale-125 border-[#E8B03F] bg-[#FFF6E0] shadow-[0_0_40px_rgba(232,176,63,0.65)] z-10"
          : entry.isEntry
            ? "border-coral-300 bg-white shadow-[0_0_18px_rgba(244,114,102,0.25)]"
            : "border-blush-300 bg-blush-100/70",
        dimmed ? "opacity-30 blur-[1px]" : "",
      ].join(" ")}
      style={
        {
          "--drift": `${drift}s`,
          "--delay": `${delay}s`,
          marginTop: `${nudge}px`,
        } as React.CSSProperties
      }
      title={entry.isEntry ? "In the draw" : "Not an entry — ordered off the website"}
    >
      <span
        className={[
          "font-sans text-[11px] font-semibold leading-tight md:text-[13px]",
          isWinner ? "text-[#8A6410]" : entry.isEntry ? "text-ink" : "text-ink-muted",
        ].join(" ")}
      >
        {entry.name}
      </span>
    </div>
  );
}

export function BubbleWall({ initial }: { initial: DrawPayload }) {
  const [data, setData] = useState<DrawPayload>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/events/anniversary/draw/entries.json", { cache: "no-store" });
        if (!res.ok) return; // keep what we have, retry next tick, stay silent
        const next = (await res.json()) as DrawPayload;
        if (alive) setData(next);
      } catch {
        // Poll failures are silent by design.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const shown = useMemo(() => data.entries.slice(0, MAX_BUBBLES), [data.entries]);
  const overflow = data.count - shown.length;
  const revealed = Boolean(data.winnerId);

  if (!data.count) {
    return (
      <p className="text-center font-sans text-[14px] text-ink-muted">
        The wall fills up as orders come in. Yours could be first.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-sans text-[12px] text-ink-muted">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-coral-300 bg-white shadow-[0_0_10px_rgba(244,114,102,0.5)]" />
          In the draw ({data.entryCount})
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-blush-300 bg-blush-100" />
          Ordered off the website
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {shown.map((e) => (
          <Bubble
            key={e.id}
            entry={e}
            isWinner={e.id === data.winnerId}
            dimmed={revealed && e.id !== data.winnerId}
          />
        ))}
      </div>

      {overflow > 0 && (
        <p className="mt-5 text-center font-sans text-[12px] text-ink-muted">
          +{overflow} more
        </p>
      )}
    </div>
  );
}

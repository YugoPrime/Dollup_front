"use client";

import { useEffect, useMemo, useState } from "react";

import { validateDrawPayload, type DrawEntry, type DrawPayload } from "@/lib/draw-wall";

const POLL_MS = 60_000;
const POLL_TIMEOUT_MS = 8_000;
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
          // border-gold / bg-gold-15 are the --color-gold token (#D4A853); the glow
          // below is that same token as rgba(212,168,83,alpha) since Tailwind can't
          // express box-shadow alpha from a token directly.
          ? "scale-125 border-gold bg-gold/15 shadow-[0_0_40px_rgba(212,168,83,0.65)] z-10"
          : entry.isEntry
            // rgba(229,96,74,alpha) is --color-coral-500 (#E5604A) with alpha.
            ? "border-coral-300 bg-white shadow-[0_0_18px_rgba(229,96,74,0.25)]"
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
          // Winner text stays text-ink, not text-gold, deliberately: the gold
          // token (#D4A853) on the cream background fails contrast even at
          // display sizes. Signalling is carried by border/glow/tint; text
          // stays readable.
          isWinner ? "text-ink" : entry.isEntry ? "text-ink" : "text-ink-muted",
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
      try {
        const res = await fetch("/events/anniversary/draw/entries.json", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return; // keep what we have, retry next tick, stay silent
        // Same cross-service contract risk as the server fetch — validate
        // before it ever reaches state/render.
        const next = validateDrawPayload(await res.json());
        if (alive) setData(next);
      } catch {
        // Poll failures (including timeout) are silent by design.
      } finally {
        clearTimeout(timeout);
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // The backend sorts entries newest-first, but we render oldest-first so a
  // new arrival appends at the end instead of prepending and shifting every
  // existing bubble's position on every 60s poll. Do not "fix" this back to
  // newest-first — that reintroduces the whole-wall reflow. (Once past
  // MAX_BUBBLES, the oldest shown bubble gets evicted and the wall does
  // shift by one — that's acceptable and far rarer than every-poll reflow.)
  const shown = useMemo(() => {
    // .slice() already returns a fresh array without touching data.entries,
    // so this is safe to push() onto below without mutating source state.
    const windowed = data.entries.slice(0, MAX_BUBBLES);

    // The winner is drawn from ALL entries across the full two-week sale,
    // but this wall only windows the MAX_BUBBLES most-recent ones (see
    // above). On reveal day (Aug 1) it's entirely plausible the winning
    // order isn't among the 120 most recent — this is an ad-driven sale
    // running two weeks. If we don't special-case that, every bubble in
    // `windowed` dims (revealed && id !== winnerId) and none of them is
    // the winner, so the whole wall renders uniformly dark with nothing
    // lit — on the one day the reveal is the entire point of the page.
    // So: if the winner exists but fell outside the window, splice them
    // in from the full unsliced list. They're appended here, before the
    // reverse() below, which puts them FIRST in render order post-reverse.
    // That's a deliberate choice, not an accident — on reveal day they're
    // the only lit bubble, so leading the wall is harmless, and it avoids
    // silently evicting some other (now-irrelevant, since reveal already
    // happened) bubble to make room. Do not remove this: it's the only
    // thing standing between "reveal day" and "wall dims to nothing."
    if (data.winnerId && !windowed.some((e) => e.id === data.winnerId)) {
      const winner = data.entries.find((e) => e.id === data.winnerId);
      if (winner) windowed.push(winner);
    }

    return windowed.reverse();
  }, [data.entries, data.winnerId]);
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
          {/* rgba(229,96,74,alpha) is --color-coral-500 (#E5604A) with alpha. */}
          <span className="h-3 w-3 rounded-full border border-coral-300 bg-white shadow-[0_0_10px_rgba(229,96,74,0.5)]" />
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

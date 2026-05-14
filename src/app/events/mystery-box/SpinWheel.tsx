"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MysteryBoxSlot } from "@/lib/mystery-box";

type Props = {
  pool: MysteryBoxSlot[];
  selected: MysteryBoxSlot[] | null;
  spinning: boolean;
  onSpinEnd: () => void;
};

const COLUMN_COUNT = 5;
const TILES_DESKTOP = 24;
const TILES_MOBILE = 10;
const DURATION_DESKTOP_MS = 2200;
const DURATION_MOBILE_MS = 1500;
const STAGGER_DESKTOP_MS = 120;
const STAGGER_MOBILE_MS = 60;

export function SpinWheel({ pool, selected, spinning, onSpinEnd }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const tilesPerColumn = isMobile ? TILES_MOBILE : TILES_DESKTOP;
  const spinDurationMs = isMobile ? DURATION_MOBILE_MS : DURATION_DESKTOP_MS;
  const staggerMs = isMobile ? STAGGER_MOBILE_MS : STAGGER_DESKTOP_MS;
  const finalOffsetPct = ((tilesPerColumn - 1) / tilesPerColumn) * 100;

  const fallbackColumns = useMemo(
    () =>
      Array.from({ length: COLUMN_COUNT }, (_, col) => {
        const slot = pool[col % Math.max(pool.length, 1)];
        return slot ? [slot] : [];
      }),
    [pool],
  );
  const [columns, setColumns] = useState<MysteryBoxSlot[][]>(fallbackColumns);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!spinning || !selected || pool.length === 0) return;
    calledRef.current = false;

    // Prewarm landing thumbnails so the final tile is decoded by the time the
    // strip settles — kills the "pop in at the end" stutter on mobile.
    selected.forEach((slot) => {
      if (!slot.thumbnail) return;
      const img = new window.Image();
      img.decoding = "async";
      img.src = slot.thumbnail;
    });

    const next = selected.map((finalSlot, colIdx) => {
      const cycle: MysteryBoxSlot[] = [];
      for (let i = 0; i < tilesPerColumn - 1; i++) {
        cycle.push(pool[(colIdx * 7 + i * 3) % pool.length]);
      }
      cycle.push(finalSlot);
      return cycle;
    });
    setColumns(next);

    // Wait for the LAST column to finish (it has the biggest stagger).
    const totalMs = spinDurationMs + (selected.length - 1) * staggerMs + 100;
    const timeout = window.setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onSpinEnd();
      }
    }, totalMs);

    return () => window.clearTimeout(timeout);
  }, [spinning, selected, pool, onSpinEnd, tilesPerColumn, spinDurationMs, staggerMs]);

  useEffect(() => {
    if (!selected && !spinning) {
      setColumns(fallbackColumns);
    }
  }, [fallbackColumns, selected, spinning]);

  const landed = Boolean(selected) && !spinning;
  const transformValue =
    spinning || landed
      ? `translate3d(0, -${finalOffsetPct}%, 0)`
      : "translate3d(0, 0, 0)";

  if (!selected && !spinning) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:gap-3">
        {Array.from({ length: COLUMN_COUNT }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-blush-200 bg-white"
          >
            <div className="flex h-[140px] items-center justify-center bg-gradient-to-br from-cream-50 via-blush-300 to-coral-300/35 p-3 text-center sm:h-[220px] lg:h-[260px]">
              <div>
                <p className="font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-coral-700">
                  Mystery
                </p>
                <p className="mt-1 font-display text-[20px] leading-[0.95] text-ink">
                  Doll Up
                </p>
                <p className="mt-2 font-sans text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                  Reveal after spin
                </p>
              </div>
            </div>
            <div className="border-t border-blush-200 px-2 py-1.5 text-center">
              <p className="truncate font-sans text-[10px] font-medium text-ink-muted">
                —
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:gap-3">
      {columns.map((column, columnIndex) => {
        const landedSlot =
          landed && selected ? selected[columnIndex] : null;
        const lastIndex = column.length - 1;
        return (
          <div
            key={columnIndex}
            className="overflow-hidden rounded-lg border border-blush-200 bg-white"
            style={{ contain: "layout paint style" }}
          >
            <div className="relative h-[140px] overflow-hidden bg-blush-100 sm:h-[220px] lg:h-[260px]">
              <div
                style={{
                  transform: transformValue,
                  transition: spinning
                    ? `transform ${spinDurationMs + columnIndex * staggerMs}ms cubic-bezier(0.15, 0.8, 0.25, 1)`
                    : "none",
                  willChange: spinning ? "transform" : "auto",
                  backfaceVisibility: "hidden",
                }}
              >
                {column.map((slot, tileIndex) => {
                  const isLanding = tileIndex === lastIndex;
                  return (
                    <div
                      key={`${columnIndex}-${tileIndex}-${slot.variantId}`}
                      className="relative h-[140px] overflow-hidden sm:h-[220px] lg:h-[260px]"
                    >
                      {slot.thumbnail ? (
                        isLanding ? (
                          <Image
                            src={slot.thumbnail}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 210px, (min-width: 640px) 18vw, 32vw"
                            className="object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={slot.thumbnail}
                            alt=""
                            loading="eager"
                            decoding="async"
                            fetchPriority="low"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <div className="h-full w-full bg-blush-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-blush-200 px-2 py-1.5 text-center">
              <p className="truncate font-sans text-[10px] font-medium text-ink-soft">
                {landedSlot ? landedSlot.sku : "—"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

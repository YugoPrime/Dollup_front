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
const STRIP_TILES_PER_COLUMN = 24;
const SPIN_DURATION_MS = 2200;
// Percentage of the strip wrapper's own height that lands the LAST tile in view.
// (N-1)/N * 100 — works regardless of the per-breakpoint tile height in px.
const FINAL_OFFSET_PCT =
  ((STRIP_TILES_PER_COLUMN - 1) / STRIP_TILES_PER_COLUMN) * 100;

export function SpinWheel({ pool, selected, spinning, onSpinEnd }: Props) {
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

    const next = selected.map((finalSlot, colIdx) => {
      const cycle: MysteryBoxSlot[] = [];
      for (let i = 0; i < STRIP_TILES_PER_COLUMN - 1; i++) {
        cycle.push(pool[(colIdx * 7 + i * 3) % pool.length]);
      }
      cycle.push(finalSlot);
      return cycle;
    });
    setColumns(next);

    const timeout = window.setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onSpinEnd();
      }
    }, SPIN_DURATION_MS + 100);

    return () => window.clearTimeout(timeout);
  }, [spinning, selected, pool, onSpinEnd]);

  useEffect(() => {
    if (!selected && !spinning) {
      setColumns(fallbackColumns);
    }
  }, [fallbackColumns, selected, spinning]);

  const landed = Boolean(selected) && !spinning;
  const translateY =
    spinning || landed
      ? `translateY(-${FINAL_OFFSET_PCT}%)`
      : "translateY(0)";

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
        return (
          <div
            key={columnIndex}
            className="overflow-hidden rounded-lg border border-blush-200 bg-white"
          >
            <div className="relative h-[140px] overflow-hidden bg-blush-100 sm:h-[220px] lg:h-[260px]">
              <div
                className="will-change-transform"
                style={{
                  transform: translateY,
                  transition: spinning
                    ? `transform ${SPIN_DURATION_MS + columnIndex * 120}ms cubic-bezier(0.15, 0.8, 0.25, 1)`
                    : "none",
                }}
              >
                {column.map((slot, tileIndex) => (
                  <div
                    key={`${columnIndex}-${tileIndex}-${slot.variantId}`}
                    className="relative h-[140px] overflow-hidden sm:h-[220px] lg:h-[260px]"
                  >
                    {slot.thumbnail ? (
                      <Image
                        src={slot.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 210px, (min-width: 640px) 18vw, 32vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-blush-300" />
                    )}
                  </div>
                ))}
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

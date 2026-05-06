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
const STRIP_TILE_HEIGHT = 320;
const STRIP_TILES_PER_COLUMN = 24;
const SPIN_DURATION_MS = 2200;

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
      ? `translateY(-${(STRIP_TILES_PER_COLUMN - 1) * STRIP_TILE_HEIGHT}px)`
      : "translateY(0)";

  if (!selected && !spinning) {
    return (
      <div className="grid grid-cols-5 gap-2 overflow-hidden rounded-xl border border-blush-400 bg-white p-2 shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:gap-3 md:p-3">
        {Array.from({ length: COLUMN_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex h-[180px] items-center justify-center overflow-hidden rounded-lg border border-blush-200 bg-gradient-to-br from-cream-50 via-blush-300 to-coral-300/35 p-3 text-center sm:h-[260px] lg:h-[320px]"
          >
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
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 overflow-hidden rounded-xl border border-blush-400 bg-white p-2 shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:gap-3 md:p-3">
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="relative h-[180px] overflow-hidden rounded-lg bg-blush-100 sm:h-[260px] lg:h-[320px]"
        >
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
                className="relative h-[180px] overflow-hidden sm:h-[260px] lg:h-[320px]"
              >
                {slot.thumbnail ? (
                  <Image
                    src={slot.thumbnail}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 210px, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blush-300" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2">
                  <p className="truncate font-sans text-[10px] font-semibold text-white">
                    {slot.sku}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

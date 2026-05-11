"use client";

import { useEffect, useRef, useState } from "react";

export function NewArrivalsRailScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 240) + 16;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <>
      <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
        <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
          New <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>arrivals</em>
        </h2>
        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-blush-300 bg-white text-ink transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-coral-500 hover:text-coral-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Next"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-blush-300 bg-white text-ink transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-coral-500 hover:text-coral-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:gap-4 md:px-10 md:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingInline: "16px" }}
      >
        {children}
      </div>
    </>
  );
}

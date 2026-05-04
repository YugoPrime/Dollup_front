"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Lightbox } from "./Lightbox";

type Img = { url: string; alt?: string };

/**
 * Mobile gallery — full-width swipe carousel where ~10% of the next image
 * is always visible on the right edge, hinting at more content. Dots + counter
 * overlay at the bottom, heart at top-right.
 *
 * Implementation: horizontal scroll snap container, where each slide is 90% wide
 * and snaps to its left edge. The remaining 10% reveals the next slide.
 */
export function ProductGalleryMobile({ images, alt }: { images: Img[]; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const slideWidth = el.clientWidth * 0.9;
    const idx = Math.round(el.scrollLeft / slideWidth);
    if (idx !== active) setActive(Math.min(idx, images.length - 1));
  };

  if (!images.length) {
    return (
      <div className="aspect-[3/4] w-full bg-blush-100" aria-label="No images" />
    );
  }

  return (
    <>
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((img, i) => (
          <button
            type="button"
            key={img.url}
            onClick={() => {
              setActive(i);
              setLightboxOpen(true);
            }}
            aria-label={`View image ${i + 1} fullscreen`}
            className="relative aspect-[3/4] w-[90%] shrink-0 snap-start"
          >
            <Image
              src={img.url}
              alt={img.alt ?? alt ?? ""}
              fill
              sizes="90vw"
              className="object-cover object-top"
              priority={i === 0}
            />
          </button>
        ))}
      </div>

      {/* Counter (bottom-right) */}
      <div className="absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-1 font-sans text-[10px] font-semibold text-white">
        {active + 1} / {images.length}
      </div>

      {/* Dots (bottom-center) */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full bg-white transition-all ${
              i === active ? "w-4 opacity-100" : "w-1.5 opacity-60"
            }`}
          />
        ))}
      </div>

    </div>

    {lightboxOpen && (
      <Lightbox images={images} initialIndex={active} onClose={() => setLightboxOpen(false)} />
    )}
  </>
  );
}

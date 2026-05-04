"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox } from "./Lightbox";

type Img = { url: string; alt?: string };

/**
 * Desktop gallery — vertical column of 90px-wide 3:4 thumbs (sticky to viewport)
 * + a large 3:4 main image. Click a thumb to swap the main. Click the main to
 * open the fullscreen lightbox (Esc / arrow-keys / outside-click to close).
 */
export function ProductGalleryDesktop({ images, alt }: { images: Img[]; alt?: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images.length) {
    return (
      <div className="hidden aspect-[3/4] w-full rounded-2xl bg-blush-100 md:block" />
    );
  }

  const main = images[active] ?? images[0];

  return (
    <>
      <div className="hidden gap-4 md:flex">
        <div className="sticky top-6 flex h-fit w-[90px] shrink-0 flex-col gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-blush-100 transition ${
                i === active ? "outline outline-2 outline-coral-500" : "hover:opacity-80"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="90px" className="object-cover object-top" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open fullscreen viewer"
          className="relative aspect-[3/4] flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-blush-100"
        >
          <Image
            src={main.url}
            alt={main.alt ?? alt ?? ""}
            fill
            sizes="(max-width: 1280px) 50vw, 600px"
            className="object-cover object-top"
            priority
          />
          <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Click to expand
          </span>
        </button>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={active}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

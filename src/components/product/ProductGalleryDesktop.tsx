"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { url: string; alt?: string };

/**
 * Desktop gallery — vertical column of 90px-wide 3:4 thumbs (sticky to viewport)
 * + a large 3:4 main image. Click a thumb to swap the main. Click the main to
 * toggle a CSS-only zoom (cursor: zoom-in/out, no modal in v1).
 */
export function ProductGalleryDesktop({ images, alt }: { images: Img[]; alt?: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!images.length) {
    return (
      <div className="hidden aspect-[3/4] w-full rounded-2xl bg-blush-100 md:block" />
    );
  }

  const main = images[active] ?? images[0];

  return (
    <div className="hidden gap-4 md:flex">
      <div className="sticky top-6 flex h-fit w-[90px] shrink-0 flex-col gap-2.5">
        {images.map((img, i) => (
          <button
            key={img.url}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-blush-100 ${
              i === active ? "outline outline-2 outline-coral-500" : ""
            }`}
          >
            <Image src={img.url} alt="" fill sizes="90px" className="object-cover object-top" />
          </button>
        ))}
      </div>
      <div
        className={`relative aspect-[3/4] flex-1 overflow-hidden rounded-2xl bg-blush-100 ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        onClick={() => setZoomed((z) => !z)}
      >
        <Image
          src={main.url}
          alt={main.alt ?? alt ?? ""}
          fill
          sizes="(max-width: 1280px) 50vw, 600px"
          className={`object-cover object-top transition-transform duration-300 ${
            zoomed ? "scale-150" : "scale-100"
          }`}
          priority
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink">
          ⊕ Click to {zoomed ? "exit" : "zoom"}
        </span>
      </div>
    </div>
  );
}

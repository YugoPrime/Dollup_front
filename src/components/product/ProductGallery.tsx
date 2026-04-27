"use client";

import Image from "next/image";
import { useState } from "react";
import type { HttpTypes } from "@medusajs/types";

export function ProductGallery({ product }: { product: HttpTypes.StoreProduct }) {
  const images = product.images?.length
    ? product.images.map((i) => i.url)
    : product.thumbnail
      ? [product.thumbnail]
      : [];
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div className="flex gap-3">
      {images.length > 1 && (
        <div className="flex flex-col gap-2.5">
          {images.slice(0, 4).map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`relative h-[88px] w-[72px] overflow-hidden rounded-lg bg-blush-300 ${
                i === active ? "outline outline-2 outline-coral-500" : ""
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex h-[540px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-blush-300">
        {main ? (
          <Image
            src={main}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <Image
            src="/logo.png"
            alt={product.title}
            width={140}
            height={140}
            className="opacity-20"
          />
        )}
      </div>
    </div>
  );
}

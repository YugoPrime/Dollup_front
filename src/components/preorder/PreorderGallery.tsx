"use client";

import { useEffect, useState } from "react";
import { PDP_COLOR_CHANGE_EVENT } from "@/components/product/ProductGallery";

type Props = {
  colorImageMap: Record<string, string[]>;
  initialColor: string;
  productTitle: string;
};

export function PreorderGallery({
  colorImageMap,
  initialColor,
  productTitle,
}: Props) {
  const [activeColor, setActiveColor] = useState(initialColor);
  const images = colorImageMap[activeColor] ?? [];
  const [mainIdx, setMainIdx] = useState(0);

  useEffect(() => {
    setMainIdx(0);
  }, [activeColor]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      if (!detail?.value) return;
      if (colorImageMap[detail.value]) {
        setActiveColor(detail.value);
      }
    }
    window.addEventListener(PDP_COLOR_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PDP_COLOR_CHANGE_EVENT, handler);
  }, [colorImageMap]);

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] w-full rounded-lg border border-sage-100 bg-blush-50" />
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[mainIdx]}
        alt={`${productTitle} — ${activeColor}`}
        className="w-full rounded-lg border border-sage-100 bg-blush-50"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setMainIdx(i)}
              className={
                "h-16 w-16 flex-shrink-0 overflow-hidden rounded border transition " +
                (i === mainIdx
                  ? "border-sage-700"
                  : "border-sage-200 hover:border-sage-300")
              }
              aria-label={`Show image ${i + 1} of ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

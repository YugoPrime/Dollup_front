"use client";

import { useEffect, useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { ProductGalleryMobile } from "./ProductGalleryMobile";
import { ProductGalleryDesktop } from "./ProductGalleryDesktop";

// Fired by ProductBuy when the customer picks a different colour. Carries
// the raw value string ("Beige", "Green", …). ProductGallery listens and
// re-filters the image list so the hero matches the buy box.
export const PDP_COLOR_CHANGE_EVENT = "pdp:color-change";

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, "-");
}

function isVariantBuyable(v: HttpTypes.StoreProductVariant): boolean {
  return !v.manage_inventory || (v.inventory_quantity ?? 0) > 0;
}

function getColorOption(product: HttpTypes.StoreProduct) {
  return (product.options ?? []).find(
    (o) => (o.title ?? "").toLowerCase() === "color",
  );
}

function getInitialColor(product: HttpTypes.StoreProduct): string | null {
  const colorOpt = getColorOption(product);
  if (!colorOpt) return null;
  // Mirror ProductBuy: pick the colour of the first in-stock variant so the
  // gallery opens on imagery matching whatever the buy box defaulted to.
  const variant =
    (product.variants ?? []).find((v) => isVariantBuyable(v)) ??
    (product.variants ?? [])[0];
  if (!variant) return null;
  const opt = variant.options?.find((o) => o.option_id === colorOpt.id);
  return opt?.value ?? null;
}

// Variants carry their own per-color image URLs in metadata.image_urls.
// That's more authoritative than filename slug matching since admins can
// hand-curate them. We harvest urls from variants whose colour matches.
function imageUrlsForColor(
  product: HttpTypes.StoreProduct,
  color: string,
): string[] {
  const colorOpt = getColorOption(product);
  if (!colorOpt) return [];
  const urls = new Set<string>();
  for (const v of product.variants ?? []) {
    const hasColor = v.options?.some(
      (o) => o.option_id === colorOpt.id && o.value === color,
    );
    if (!hasColor) continue;
    const meta = (v.metadata ?? {}) as { image_urls?: unknown };
    if (Array.isArray(meta.image_urls)) {
      for (const u of meta.image_urls) {
        if (typeof u === "string" && u) urls.add(u);
      }
    }
  }
  return [...urls];
}

export function ProductGallery({ product }: { product: HttpTypes.StoreProduct }) {
  const allImages = useMemo(() => {
    const arr = (product.images ?? []).map((i) => ({ url: i.url, alt: product.title }));
    if (!arr.length && product.thumbnail) {
      arr.push({ url: product.thumbnail, alt: product.title });
    }
    return arr;
  }, [product.images, product.thumbnail, product.title]);

  const [color, setColor] = useState<string | null>(() => getInitialColor(product));

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ value?: string }>).detail;
      if (detail?.value) setColor(detail.value);
    };
    window.addEventListener(PDP_COLOR_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PDP_COLOR_CHANGE_EVENT, handler);
  }, []);

  const images = useMemo(() => {
    if (!color) return allImages;
    // Prefer variant metadata.image_urls (authoritative) — fall back to
    // filename-slug match on product.images so existing products without
    // per-variant image_urls still get filtered. If neither yields anything,
    // show everything (don't leave the customer with a blank gallery).
    const metaUrls = new Set(imageUrlsForColor(product, color));
    const fromMeta = allImages.filter((i) => metaUrls.has(i.url));
    if (fromMeta.length) return fromMeta;
    const slug = slugify(color);
    const fromSlug = allImages.filter((i) => i.url.toLowerCase().includes(slug));
    if (fromSlug.length) return fromSlug;
    return allImages;
  }, [allImages, color, product]);

  return (
    <>
      <div className="md:hidden">
        <ProductGalleryMobile images={images} alt={product.title} />
      </div>
      <div className="hidden md:block">
        <ProductGalleryDesktop images={images} alt={product.title} />
      </div>
    </>
  );
}

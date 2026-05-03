"use client";

import type { HttpTypes } from "@medusajs/types";
import { useMediaQuery, DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery";
import { ProductGalleryMobile } from "./ProductGalleryMobile";
import { ProductGalleryDesktop } from "./ProductGalleryDesktop";

export function ProductGallery({ product }: { product: HttpTypes.StoreProduct }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const images = (product.images ?? []).map((i) => ({ url: i.url, alt: product.title }));
  if (!images.length && product.thumbnail) images.push({ url: product.thumbnail, alt: product.title });

  // Render the matching layout. The non-matching layout returns null because each
  // child internally uses `hidden md:flex` / mobile-only classes — but to avoid
  // shipping both DOM trees we conditionally pick one once the JS hydrates.
  if (isDesktop) return <ProductGalleryDesktop images={images} alt={product.title} />;
  return <ProductGalleryMobile images={images} alt={product.title} />;
}

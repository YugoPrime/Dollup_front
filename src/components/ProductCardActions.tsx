"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";
import type { QuickAddProduct } from "@/components/ProductCardVariantSheet";

const ProductCardVariantSheet = dynamic(
  () =>
    import("@/components/ProductCardVariantSheet").then(
      (m) => m.ProductCardVariantSheet,
    ),
  { ssr: false, loading: () => null },
);

/**
 * Card-level add-to-bag. Single-variant products add straight away;
 * multi-variant products open an inline size/colour sheet instead of
 * navigating away to the PDP (which is what "Select size" used to do).
 *
 * Desktop: the control is hidden until the card is hovered or focused so it
 * never covers the hem of the product photo. Mobile has no hover, so it is a
 * compact pill in the bottom-right corner rather than a full-width block.
 */
export function ProductCardQuickAdd({
  isMultiVariant,
  variantId,
  label,
  quickAdd,
}: {
  isMultiVariant: boolean;
  variantId?: string | null;
  label: string;
  quickAdd: QuickAddProduct;
}) {
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onQuickAdd = async () => {
    if (isMultiVariant) {
      setSheetOpen(true);
      return;
    }
    if (!variantId) return;
    setBusy(true);
    try {
      await addItem(variantId, 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="absolute inset-x-2 bottom-2 z-[5] flex justify-end md:justify-stretch md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onQuickAdd}
          disabled={busy || loading || (!isMultiVariant && !variantId)}
          aria-haspopup={isMultiVariant ? "dialog" : undefined}
          aria-label={isMultiVariant ? `${label} for ${quickAdd.title}` : `Add ${quickAdd.title} to bag`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/95 px-4 font-sans text-[12px] font-bold uppercase tracking-wider text-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur transition-colors hover:bg-white disabled:opacity-60 md:w-full md:justify-center md:rounded-md"
        >
          {!isMultiVariant && !busy ? <Plus size={14} aria-hidden="true" /> : null}
          {busy ? "Adding…" : isMultiVariant ? label : "Quick add"}
        </button>
      </div>
      {sheetOpen ? (
        <ProductCardVariantSheet
          product={quickAdd}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ProductCardWishlistButton({ productId }: { productId: string }) {
  const wished = useIsInWishlist(productId);

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className="absolute right-2 top-2 z-[4] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={wished ? "#C64A36" : "none"}
        stroke={wished ? "#C64A36" : "#1c1010"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

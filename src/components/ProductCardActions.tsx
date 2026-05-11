"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";

export function ProductCardQuickAdd({
  productHandle,
  isMultiVariant,
  variantId,
  label,
}: {
  productHandle: string | null | undefined;
  isMultiVariant: boolean;
  variantId?: string | null;
  label: string;
}) {
  const router = useRouter();
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState(false);

  const onQuickAdd = async () => {
    if (isMultiVariant) {
      if (productHandle) router.push(`/products/${productHandle}`);
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
    <div className="absolute inset-x-2 bottom-2 z-[5]">
      <button
        type="button"
        onClick={onQuickAdd}
        disabled={busy || loading || (!isMultiVariant && !variantId)}
        className="min-h-11 w-full rounded-md bg-white py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm hover:bg-blush-100 disabled:opacity-60"
      >
        {busy ? "Adding..." : isMultiVariant ? label : "+ Quick Add"}
      </button>
    </div>
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
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={wished ? "#E5604A" : "none"}
        stroke={wished ? "#E5604A" : "#1c1010"}
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

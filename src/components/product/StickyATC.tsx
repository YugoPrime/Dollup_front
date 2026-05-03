"use client";

import { useEffect, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

/**
 * Mobile-only sticky Add-to-Bag bar that appears once the inline ATC scrolls
 * out of view. Watches an anchor element passed by id.
 *
 * Hides itself when the cart drawer is open to avoid double-stacking.
 */
export function StickyATC({
  product,
  watchElementId,
}: {
  product: Product;
  watchElementId: string;
}) {
  const [visible, setVisible] = useState(false);
  const { addItem, loading, open } = useCart();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = document.getElementById(watchElementId);
    if (!target) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, [watchElementId]);

  if (!visible || open) return null;

  const price = getDisplayPrice(product);

  const onAdd = async () => {
    const variant = product.variants?.find(
      (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
    );
    if (!variant) return;
    await addItem(variant.id, 1);
  };

  return (
    <div className="sticky bottom-[64px] z-[10] flex items-center gap-3 border-t border-blush-100 bg-white px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
      <div className="flex flex-col">
        <span className="font-sans text-[15px] font-bold leading-none text-coral-500">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="mt-0.5 font-sans text-[10px] text-ink-muted line-through">
            {formatPrice(price.original, price.currency)}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={loading}
        className="flex-1 rounded-full bg-ink py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add to Bag"}
      </button>
    </div>
  );
}

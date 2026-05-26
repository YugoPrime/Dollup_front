"use client";

import { useCart } from "@/components/cart/CartProvider";

export function PreorderHeaderCartButton() {
  const { itemCount, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      className="relative rounded-md p-2 text-ink-soft transition hover:bg-sage-100 hover:text-sage-700"
      aria-label="Cart"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute right-[6px] top-[6px] flex h-4 w-4 items-center justify-center rounded-full bg-sage-700 text-[9px] font-bold text-cream">
          {itemCount}
        </span>
      )}
    </button>
  );
}

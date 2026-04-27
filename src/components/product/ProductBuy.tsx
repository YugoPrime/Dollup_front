"use client";

import { useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

export function ProductBuy({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const options = useMemo(() => product.options ?? [], [product.options]);
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const initialOptions = useMemo(() => {
    const v = variants[0];
    const map: Record<string, string> = {};
    v?.options?.forEach((o) => {
      if (o.option_id) map[o.option_id] = o.value ?? "";
    });
    return map;
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(initialOptions);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const matchedVariant = useMemo(() => {
    if (!options.length) return variants[0] ?? null;
    return (
      variants.find((v) =>
        v.options?.every((o) =>
          o.option_id ? selected[o.option_id] === o.value : true,
        ),
      ) ?? null
    );
  }, [variants, options, selected]);

  const price = matchedVariant
    ? getDisplayPrice({ variants: [matchedVariant] })
    : getDisplayPrice(product);
  const inStock =
    matchedVariant &&
    (!matchedVariant.manage_inventory ||
      (matchedVariant.inventory_quantity ?? 0) > 0);

  const handleAdd = async () => {
    if (options.some((o) => !selected[o.id])) {
      setError("Please choose every option");
      return;
    }
    if (!matchedVariant) {
      setError("This combination is unavailable");
      return;
    }
    setError(null);
    try {
      await addItem(matchedVariant.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[26px] font-semibold text-ink">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="font-sans text-base text-coral-300 line-through">
            {formatPrice(price.original, price.currency)}
          </span>
        )}
        {price.onSale && price.original != null && price.amount != null && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 font-sans text-xs font-bold text-emerald-700">
            Save {formatPrice(price.original - price.amount, price.currency)}
          </span>
        )}
      </div>

      {options.map((opt) => (
        <div key={opt.id}>
          <div className="mb-2 font-sans text-xs font-semibold text-ink">
            {opt.title}
            {selected[opt.id] && (
              <span className="ml-1 font-semibold text-coral-500">
                — {selected[opt.id]}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {opt.values?.map((val) => {
              const value = val.value;
              if (!value) return null;
              const isActive = selected[opt.id] === value;
              return (
                <button
                  key={value}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [opt.id]: value }))
                  }
                  className={`rounded-md border-[1.5px] px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
                    isActive
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-blush-400 bg-white text-ink-soft hover:border-coral-500"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <p className="font-sans text-xs text-coral-700">{error}</p>
      )}

      <div className="flex gap-3">
        <div className="flex items-center overflow-hidden rounded-md border-[1.5px] border-blush-400">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-12 w-9 items-center justify-center text-lg text-ink-soft hover:bg-blush-100"
          >
            −
          </button>
          <span className="w-9 text-center font-sans text-sm font-semibold">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="flex h-12 w-9 items-center justify-center text-lg text-ink-soft hover:bg-blush-100"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={loading || !inStock}
          className={`flex-1 rounded-md font-sans text-sm font-semibold tracking-wide text-white transition-colors disabled:opacity-60 ${
            added ? "bg-emerald-600" : "bg-coral-500 hover:bg-coral-700"
          }`}
        >
          {!inStock
            ? "Sold Out"
            : added
              ? "✓ Added to Bag"
              : loading
                ? "Adding…"
                : "Add to Bag"}
        </button>
      </div>

      <button className="w-full rounded-md border-[1.5px] border-blush-400 px-4 py-2.5 font-sans text-[13px] font-medium text-coral-500 hover:bg-blush-100">
        ♡ Add to Wishlist
      </button>

      <div className="flex flex-wrap gap-4 border-b border-blush-100 pb-6">
        {[
          "Free shipping on Rs.999+",
          "7-day easy returns",
          "Secure checkout",
        ].map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 font-sans text-xs text-ink-soft"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E5604A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

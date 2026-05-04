"use client";

import { useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";

type Product = HttpTypes.StoreProduct;
const LOW_STOCK_THRESHOLD = 5;

export function ProductBuy({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const wished = useIsInWishlist(product.id);
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
  const [added, setAdded] = useState(false);

  const matchedVariant = useMemo(() => {
    if (!options.length) return variants[0] ?? null;
    return (
      variants.find((v) =>
        v.options?.every((o) => (o.option_id ? selected[o.option_id] === o.value : true)),
      ) ?? null
    );
  }, [variants, options, selected]);

  const price = matchedVariant ? getDisplayPrice({ variants: [matchedVariant] }) : getDisplayPrice(product);
  const inStock =
    matchedVariant && (!matchedVariant.manage_inventory || (matchedVariant.inventory_quantity ?? 0) > 0);
  const lowStockQty =
    matchedVariant?.manage_inventory &&
    matchedVariant.inventory_quantity != null &&
    matchedVariant.inventory_quantity > 0 &&
    matchedVariant.inventory_quantity < LOW_STOCK_THRESHOLD
      ? matchedVariant.inventory_quantity
      : null;
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const colorOption = options.find((o) => (o.title ?? "").toLowerCase() === "color");
  const sizeOption = options.find((o) => (o.title ?? "").toLowerCase() === "size");
  const otherOptions = options.filter((o) => o !== colorOption && o !== sizeOption);

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
      await addItem(matchedVariant.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-[28px] leading-tight text-ink md:text-[36px]">{product.title}</h1>
      </header>

      <div className="flex items-baseline gap-3">
        <span className="font-display text-[28px] leading-none text-coral-500 md:text-[36px]">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="font-sans text-[14px] text-ink-muted line-through md:text-[16px]">
            {formatPrice(price.original, price.currency)}
          </span>
        )}
        {discountPct && (
          <span className="rounded bg-blush-100 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-coral-500">
            Save {discountPct.replace("-", "")}
          </span>
        )}
      </div>

      <p className="-mt-3 font-sans text-[11px] font-bold uppercase tracking-wider text-emerald-700">
        {inStock ? (lowStockQty ? `⚠ Only ${lowStockQty} left` : "● In stock — Ships in 1-2 days") : "Sold out"}
      </p>

      {colorOption && (
        <OptionGroup
          title={`Color${selected[colorOption.id] ? `: ${selected[colorOption.id]}` : ""}`}
          values={(colorOption.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[colorOption.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [colorOption.id]: v }))}
          variant="color"
        />
      )}

      {sizeOption && (
        <OptionGroup
          title="Size"
          values={(sizeOption.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[sizeOption.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [sizeOption.id]: v }))}
          variant="size"
        />
      )}

      {otherOptions.map((opt) => (
        <OptionGroup
          key={opt.id}
          title={opt.title ?? ""}
          values={(opt.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[opt.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [opt.id]: v }))}
          variant="size"
        />
      ))}

      {error && <p className="font-sans text-xs text-coral-700">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={loading || !inStock}
          className={`flex-1 rounded-full py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors disabled:opacity-60 ${
            added ? "bg-emerald-600" : "bg-ink hover:bg-ink-soft"
          }`}
        >
          {!inStock ? "Sold Out" : added ? "✓ Added to Bag" : loading ? "Adding…" : "Add to Bag"}
        </button>
        <button
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`flex h-12 w-14 items-center justify-center rounded-full border transition-colors ${
            wished
              ? "border-coral-500 bg-coral-500 text-white"
              : "border-ink bg-white text-ink hover:border-coral-500 hover:text-coral-500"
          }`}
        >
          {wished ? "♥" : "♡"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-y border-blush-100 py-4 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink">
        {[
          { ico: "⌖", line1: "Free delivery", line2: "Rs 1500+" },
          { ico: "✦", line1: "Cash on", line2: "delivery" },
        ].map((t) => (
          <div key={t.line1} className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[18px] text-coral-500">{t.ico}</span>
            <span>{t.line1}</span>
            <span>{t.line2}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  values,
  selected,
  onSelect,
  variant,
  rightLink,
}: {
  title: string;
  values: string[];
  selected: string | undefined;
  onSelect: (v: string) => void;
  variant: "color" | "size";
  rightLink?: { href: string; label: string };
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-ink">{title}</span>
        {rightLink && (
          <a href={rightLink.href} className="font-sans text-[11px] font-semibold text-coral-500">
            {rightLink.label}
          </a>
        )}
      </div>
      {variant === "color" ? (
        <div className="flex flex-wrap gap-2.5">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              aria-label={v}
              className={`h-8 w-8 rounded-full border-2 border-white ${
                selected === v ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
              }`}
              style={{ background: colorNameToHex(v) }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-1.5">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={`rounded-md border py-2.5 font-sans text-[12px] font-semibold transition-colors ${
                selected === v
                  ? "border-ink bg-ink text-white"
                  : "border-blush-400 bg-white text-ink hover:border-coral-500 hover:text-coral-500"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    black: "#1c1010", white: "#ffffff", coral: "#E5604A", blush: "#F2DDD8",
    cream: "#FAF6F4", nude: "#F2DDD8", pink: "#F8D5CD", red: "#B8412C",
    green: "#3a5a40", blue: "#85C1E9", yellow: "#F4D03F", grey: "#8a7773",
    gray: "#8a7773", brown: "#5e4030",
  };
  return map[name.toLowerCase()] ?? "#8a7773";
}

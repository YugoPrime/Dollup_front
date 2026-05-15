"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
// import { SizeRecommender } from "@/components/product/SizeRecommender"; // paused — re-enable when ready
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";
import { trackViewItem } from "@/lib/analytics";
import { colorNameToHex } from "@/lib/colors";

type Product = HttpTypes.StoreProduct;
const LOW_STOCK_THRESHOLD = 5;

export function ProductBuy({
  product,
  freeShippingThreshold,
  sizeChartHtml,
}: {
  product: Product;
  freeShippingThreshold: number;
  sizeChartHtml?: string | null;
}) {
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
  const inStock = matchedVariant && isVariantBuyable(matchedVariant);
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
  const sizeValues = useMemo(
    () => ((sizeOption?.values ?? []).map((v) => v.value).filter(Boolean) as string[]),
    [sizeOption],
  );
  const candidateSizeValues = useMemo(() => {
    if (!sizeOption) return [];
    const sizeOptionId = sizeOption.id;
    const candidates = new Set<string>();

    for (const variant of variants) {
      let sizeValue: string | null = null;
      let matchesSelectedOptions = true;
      for (const option of variant.options ?? []) {
        if (!option.option_id) continue;
        if (option.option_id === sizeOptionId) {
          sizeValue = option.value ?? null;
          continue;
        }

        const selectedValue = selected[option.option_id];
        if (selectedValue && selectedValue !== option.value) {
          matchesSelectedOptions = false;
          break;
        }
      }

      if (matchesSelectedOptions && sizeValue) candidates.add(sizeValue);
    }

    return sizeValues.filter((size) => candidates.has(size));
  }, [selected, sizeOption, sizeValues, variants]);

  // Fire GA4 view_item once per (product, variant) pair. Re-runs on variant
  // change so analytics reflect what the customer is actually looking at.
  const lastViewedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${product.id}:${matchedVariant?.id ?? "no-variant"}`;
    if (lastViewedRef.current === key) return;
    lastViewedRef.current = key;
    trackViewItem({
      productId: product.id,
      productHandle: product.handle ?? "",
      productTitle: product.title ?? "",
      variantId: matchedVariant?.id,
      variantTitle: matchedVariant?.title ?? undefined,
      category: product.categories?.[0]?.name ?? undefined,
      price: price.amount ?? 0,
      currency: price.currency ?? "MUR",
    });
  }, [product, matchedVariant, price.amount, price.currency]);

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

      <p
        className="-mt-3 font-sans text-[11px] font-bold uppercase tracking-wider text-emerald-700"
        aria-live="polite"
      >
        {inStock ? (
          lowStockQty ? (
            <>
              <span aria-hidden="true">⚠ </span>
              {`Only ${lowStockQty} left`}
            </>
          ) : (
            <>
              <span aria-hidden="true">● </span>
              In stock — Ships in 1-2 days
            </>
          )
        ) : (
          "Sold out"
        )}
      </p>

      {matchedVariant?.sku && (
        <p className="-mt-2 font-sans text-[11px] uppercase tracking-[0.1em] text-ink-muted">
          SKU: <span className="text-ink">{matchedVariant.sku}</span>
        </p>
      )}

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
        <>
          <OptionGroup
            title="Size"
            values={sizeValues}
            selected={selected[sizeOption.id]}
            onSelect={(v) => setSelected((s) => ({ ...s, [sizeOption.id]: v }))}
            variant="size"
          />
          {/* SizeRecommender paused — re-enable when ready
          <SizeRecommender
            sizeChartHtml={sizeChartHtml ?? null}
            sizeValues={sizeValues}
            candidateSizes={candidateSizeValues}
            selectedSize={selected[sizeOption.id]}
            onSelectSize={(v) => setSelected((s) => ({ ...s, [sizeOption.id]: v }))}
          />
          */}
        </>
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
          { ico: "⌖", line1: "Free delivery", line2: freeShippingThreshold > 0 ? `${formatPrice(freeShippingThreshold, "MUR")}+` : "available" },
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
  const labelId = useId();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  // If no value is selected yet, the first option in the group is the tab stop.
  const focusableIndex = selected ? Math.max(0, values.indexOf(selected)) : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % values.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + values.length) % values.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = values.length - 1;
    onSelect(values[next]);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span id={labelId} className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-ink">{title}</span>
        {rightLink && (
          <a href={rightLink.href} className="font-sans text-[11px] font-semibold text-coral-500">
            {rightLink.label}
          </a>
        )}
      </div>
      {variant === "color" ? (
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2.5">
          {values.map((v, i) => (
            <button
              key={v}
              ref={(el) => { buttonsRef.current[i] = el; }}
              role="radio"
              aria-checked={selected === v}
              aria-label={v}
              tabIndex={i === focusableIndex ? 0 : -1}
              onClick={() => onSelect(v)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`h-8 w-8 rounded-full border-2 border-white ${
                selected === v ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
              }`}
              style={{ background: colorNameToHex(v) }}
            />
          ))}
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-6 gap-1.5">
          {values.map((v, i) => (
            <button
              key={v}
              ref={(el) => { buttonsRef.current[i] = el; }}
              role="radio"
              aria-checked={selected === v}
              tabIndex={i === focusableIndex ? 0 : -1}
              onClick={() => onSelect(v)}
              onKeyDown={(e) => handleKeyDown(e, i)}
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

function isVariantBuyable(variant: HttpTypes.StoreProductVariant): boolean {
  return !variant.manage_inventory || (variant.inventory_quantity ?? 0) > 0;
}

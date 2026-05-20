"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";
import { trackViewItem } from "@/lib/analytics";
import { extractProductCode } from "@/lib/product-meta";
import { PDP_FALLBACK_BLUR } from "@/lib/blur-data";

type Product = HttpTypes.StoreProduct;

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sortSizes<T extends { value: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.value.toUpperCase());
    const bi = SIZE_ORDER.indexOf(b.value.toUpperCase());
    if (ai === -1 && bi === -1) return a.value.localeCompare(b.value);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, "-");
}

function isVariantBuyable(v: HttpTypes.StoreProductVariant): boolean {
  return !v.manage_inventory || (v.inventory_quantity ?? 0) > 0;
}

/**
 * Mobile-only PDP layout that matches the in-app design reference: full-bleed
 * hero w/ overlay title and price, SKU pill + heart, color thumbnails picked
 * per-variant, frosted-glass size selector, page dots, and a bottom CTA that
 * shows price beside the Add-to-Bag button.
 *
 * Renders only on screens < md (768px). Desktop keeps the existing
 * ProductGallery + ProductBuy layout.
 */
export function MobilePdpHero({ product }: { product: Product }) {
  const { addItem, loading: cartLoading } = useCart();
  const wished = useIsInWishlist(product.id);

  const options = useMemo(() => product.options ?? [], [product.options]);
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const colorOption = options.find(
    (o) => (o.title ?? "").toLowerCase() === "color",
  );
  const sizeOption = options.find(
    (o) => (o.title ?? "").toLowerCase() === "size",
  );

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
  const [adding, setAdding] = useState(false);

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
  const inStock = !!(matchedVariant && isVariantBuyable(matchedVariant));

  // The full image list — same source the desktop gallery uses.
  const images = useMemo(() => {
    const arr = (product.images ?? [])
      .map((i) => i.url)
      .filter((u): u is string => !!u);
    if (arr.length === 0 && product.thumbnail) arr.push(product.thumbnail);
    return arr;
  }, [product.images, product.thumbnail]);

  // Per-color thumbnail and image-set: pick images whose URL contains the
  // color slug. Falls back to the global image list when nothing matches.
  type ColorOpt = {
    value: string;
    preview: string;
    images: string[];
    available: boolean;
  };
  const colorOptions: ColorOpt[] = useMemo(() => {
    if (!colorOption) return [];
    const values =
      (colorOption.values ?? [])
        .map((v) => v.value)
        .filter((v): v is string => !!v) ?? [];
    return values.map((value) => {
      const slug = slugify(value);
      const matches = images.filter((u) => u.toLowerCase().includes(slug));
      const preview = matches[0] ?? images[0] ?? product.thumbnail ?? "";
      const available = variants.some((v) => {
        const hasColor = v.options?.some(
          (o) => o.option_id === colorOption.id && o.value === value,
        );
        if (!hasColor) return false;
        return isVariantBuyable(v);
      });
      return { value, preview, images: matches, available };
    });
  }, [colorOption, images, variants, product.thumbnail]);

  // Visible hero images follow the selected color when possible; otherwise
  // show the full product image list.
  const heroImages = useMemo(() => {
    if (!colorOption) return images;
    const picked = selected[colorOption.id];
    const found = colorOptions.find((c) => c.value === picked);
    if (found && found.images.length > 0) return found.images;
    return images;
  }, [colorOption, selected, colorOptions, images]);

  // Sizes available for the current color selection (and other non-size opts).
  type SizeOpt = { value: string; variantId: string | null; available: boolean };
  const sizeOptions: SizeOpt[] = useMemo(() => {
    if (!sizeOption) return [];
    const allValues =
      (sizeOption.values ?? [])
        .map((v) => v.value)
        .filter((v): v is string => !!v) ?? [];
    const seen = new Map<string, SizeOpt>();
    for (const v of variants) {
      let sizeVal: string | null = null;
      let matchesOthers = true;
      for (const opt of v.options ?? []) {
        if (!opt.option_id) continue;
        if (opt.option_id === sizeOption.id) {
          sizeVal = opt.value ?? null;
          continue;
        }
        const sel = selected[opt.option_id];
        if (sel && sel !== opt.value) {
          matchesOthers = false;
          break;
        }
      }
      if (!matchesOthers || !sizeVal) continue;
      const cur = seen.get(sizeVal);
      const buyable = isVariantBuyable(v);
      if (!cur || (buyable && !cur.available)) {
        seen.set(sizeVal, {
          value: sizeVal,
          variantId: v.id,
          available: buyable,
        });
      }
    }
    // Show ALL declared sizes even when no variant matches the current color,
    // but mark them unavailable. Mirrors the screenshot's row.
    const list = allValues.map<SizeOpt>(
      (v) => seen.get(v) ?? { value: v, variantId: null, available: false },
    );
    return sortSizes(list);
  }, [sizeOption, variants, selected]);

  // Carousel scroll + paging
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeImg, setActiveImg] = useState(0);
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeImg)
      setActiveImg(Math.min(idx, Math.max(0, heroImages.length - 1)));
  };
  // Reset to first image when the visible image set changes (e.g. color swap).
  useEffect(() => {
    setActiveImg(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [heroImages.length, heroImages[0]]);

  // GA4 view_item per (product, variant).
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

  const productCode = extractProductCode(product);
  // Strip a single trailing variant token (e.g. "IS2364-S" -> "IS2364") for the
  // pill — the size lives in the size selector below.
  const sku = productCode ?? product.handle?.toUpperCase() ?? null;

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
    setAdding(true);
    try {
      await addItem(matchedVariant.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    } finally {
      setAdding(false);
    }
  };

  const currentColor = colorOption ? selected[colorOption.id] : null;

  return (
    <div className="md:hidden">
      {/* Full-bleed hero with overlay copy. Aspect 4:5 matches the reference. */}
      <div className="relative w-full overflow-hidden bg-blush-100" style={{ aspectRatio: "4 / 5" }}>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {heroImages.map((url, i) => (
            <div key={`${url}-${i}`} className="relative h-full w-full shrink-0 snap-start">
              <Image
                src={url}
                alt={product.title ?? ""}
                fill
                sizes="100vw"
                className="object-cover object-top"
                priority={i === 0}
                placeholder="blur"
                blurDataURL={PDP_FALLBACK_BLUR}
              />
            </div>
          ))}
        </div>

        {/* Top row: back/SKU pill + heart */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
          {sku ? (
            <Link
              href="/shop"
              className="pointer-events-auto rounded-full bg-white/95 px-3 py-1.5 font-sans text-[12px] font-semibold tracking-wide text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              {sku}
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          >
            <span className={`text-[18px] leading-none ${wished ? "text-coral-500" : "text-coral-500"}`}>
              {wished ? "♥" : "♡"}
            </span>
          </button>
        </div>

        {/* Overlay copy bottom-left */}
        <div className="pointer-events-none absolute inset-x-5 bottom-6">
          <h1
            className="font-display text-[28px] font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
          >
            {product.title}
          </h1>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-display text-[22px] font-semibold text-coral-500"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}
            >
              {formatPrice(price.amount, price.currency)}
            </span>
            {price.onSale ? (
              <span
                className="font-sans text-[13px] text-white/80 line-through"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
              >
                {formatPrice(price.original, price.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Color row — thumbnail swatches */}
      {colorOption && colorOptions.length > 0 ? (
        <div className="px-5 pt-5">
          <p className="font-sans text-[13px] text-ink">
            <span className="font-semibold">Color:</span>{" "}
            <span className="text-ink-muted">
              {currentColor ?? colorOptions[0]?.value}
            </span>
          </p>
          <div
            className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {colorOptions.map((c) => {
              const active = currentColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    colorOption &&
                    setSelected((s) => ({ ...s, [colorOption.id]: c.value }))
                  }
                  disabled={!c.available}
                  aria-label={c.value}
                  aria-pressed={active}
                  className={`relative h-[88px] w-[78px] shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${
                    active ? "border-coral-500" : "border-transparent"
                  }`}
                >
                  {c.preview ? (
                    <Image
                      src={c.preview}
                      alt={c.value}
                      fill
                      sizes="78px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <span className="block h-full w-full bg-blush-100" />
                  )}
                  {!c.available ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/60 font-sans text-[10px] font-bold uppercase tracking-wider text-ink">
                      Out
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Frosted-glass size selector */}
      {sizeOption && sizeOptions.length > 0 ? (
        <div className="px-5 pt-4">
          <div
            className="flex items-center justify-between rounded-3xl bg-white/85 px-4 py-3 backdrop-blur-sm"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <span className="font-sans text-[13px] text-ink">Select size</span>
            <div className="flex gap-2">
              {sizeOptions.map((s) => {
                const active = selected[sizeOption.id] === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setSelected((sel) => ({ ...sel, [sizeOption.id]: s.value }))
                    }
                    disabled={!s.available}
                    aria-pressed={active}
                    className={`flex h-10 min-w-[44px] items-center justify-center rounded-2xl px-3 font-sans text-[13px] font-semibold transition-colors ${
                      active
                        ? "bg-coral-500 text-white"
                        : s.available
                          ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                          : "bg-blush-100/60 text-ink-muted line-through"
                    }`}
                  >
                    {s.value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Carousel dots — between size pill and CTA, matches the reference */}
      {heroImages.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {heroImages.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeImg ? "w-4 bg-coral-500" : "w-1.5 bg-blush-400"
              }`}
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="px-5 pt-3 font-sans text-[12px] text-coral-700">{error}</p>
      ) : null}

      {/* Sticky bottom ATC — price LEFT, label RIGHT inside one pill.
          Sits above the global MobileBottomNav (sticky bottom-0, ~70px tall). */}
      <div className="fixed inset-x-0 bottom-[72px] z-[80] px-5 pb-2 pt-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || adding || cartLoading}
          className={`flex w-full items-center justify-between rounded-full px-6 py-4 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-colors disabled:opacity-70 ${
            !inStock
              ? "bg-blush-400"
              : added
                ? "bg-emerald-600"
                : "bg-coral-500"
          }`}
        >
          <span className="font-display text-[15px] font-semibold normal-case tracking-normal text-white">
            {formatPrice(price.amount, price.currency)}
          </span>
          <span>
            {!inStock
              ? "Sold Out"
              : adding || cartLoading
                ? "Adding…"
                : added
                  ? "Added ✓"
                  : "Add to Bag"}
          </span>
          <span aria-hidden className="w-[64px]" />
        </button>
      </div>

      {/* Spacer so size dots / tabs / accordion content above aren't covered
          by the floating CTA + bottom nav (72 + 64 ≈ 140px). */}
      <div aria-hidden className="h-36" />
    </div>
  );
}

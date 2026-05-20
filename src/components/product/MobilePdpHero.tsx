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
import { ProductAccordion } from "@/components/product/ProductAccordion";

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

const SIZE_CHART_ANCHOR_ID = "mobile-size-chart";

/**
 * Mobile-only PDP layout. Goal: everything a shopper needs (image, title,
 * color, size, ADD TO BAG) fits in the first viewport, no scrolling required,
 * so a customer can screenshot the page to chat and the full context comes
 * along.
 *
 * Floating overlays on the hero: SKU pill, heart, title, color thumbnails (only
 * when >1 color), frosted size selector, and a "Size chart" pill that scrolls
 * to the chart rendered in the accordion below.
 *
 * Renders only on screens < md (768px). Desktop keeps ProductGallery +
 * ProductBuy + ProductAccordion as before.
 */
export function MobilePdpHero({
  product,
  descriptionHtml,
  sizeChartHtml,
  preorderEtaCopy,
  freeShippingLabel,
}: {
  product: Product;
  descriptionHtml: string;
  sizeChartHtml: string | null;
  preorderEtaCopy: string | null;
  freeShippingLabel: string;
}) {
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

  const images = useMemo(() => {
    const arr = (product.images ?? [])
      .map((i) => i.url)
      .filter((u): u is string => !!u);
    if (arr.length === 0 && product.thumbnail) arr.push(product.thumbnail);
    return arr;
  }, [product.images, product.thumbnail]);

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

  // Hide the color row entirely when there's only one color (or none) — the
  // shopper has nothing to choose so it just adds noise.
  const showColorRow = colorOptions.length > 1;

  const heroImages = useMemo(() => {
    if (!colorOption) return images;
    const picked = selected[colorOption.id];
    const found = colorOptions.find((c) => c.value === picked);
    if (found && found.images.length > 0) return found.images;
    return images;
  }, [colorOption, selected, colorOptions, images]);

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
    const list = allValues.map<SizeOpt>(
      (v) => seen.get(v) ?? { value: v, variantId: null, available: false },
    );
    return sortSizes(list);
  }, [sizeOption, variants, selected]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeImg, setActiveImg] = useState(0);
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeImg)
      setActiveImg(Math.min(idx, Math.max(0, heroImages.length - 1)));
  };
  useEffect(() => {
    setActiveImg(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [heroImages.length, heroImages[0]]);

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
  const currentSize = sizeOption ? selected[sizeOption.id] : null;

  const scrollToSizeChart = () => {
    const el = document.getElementById(SIZE_CHART_ANCHOR_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="md:hidden">
      {/* Hero: 4:5 image with all selectors floated as overlays so the shopper
          (and screenshot recipients) see the whole story in one view. */}
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

        {/* Top row: SKU pill (links to shop) + heart */}
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
            <span className="text-[18px] leading-none text-coral-500">
              {wished ? "♥" : "♡"}
            </span>
          </button>
        </div>

        {/* Title overlay — small, bottom-left. No price here per request. */}
        <div className="pointer-events-none absolute inset-x-5 bottom-[140px]">
          <h1
            className="font-display text-[18px] font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}
          >
            {product.title}
          </h1>
        </div>

        {/* Size-chart anchor pill — bottom-right of hero */}
        {sizeChartHtml ? (
          <button
            type="button"
            onClick={scrollToSizeChart}
            className="absolute right-4 bottom-[120px] z-10 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          >
            <span aria-hidden>📏</span>
            <span>Size chart</span>
            <span aria-hidden className="ml-0.5">↓</span>
          </button>
        ) : null}

        {/* Color thumbnails floated on hero (only when >1 color) */}
        {showColorRow ? (
          <div className="absolute inset-x-4 bottom-[64px] flex items-center gap-2 overflow-x-auto"
               style={{ scrollbarWidth: "none" }}>
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
                  className={`relative h-[52px] w-[44px] shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    active ? "border-white" : "border-white/40"
                  }`}
                  style={
                    active
                      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }
                      : undefined
                  }
                >
                  {c.preview ? (
                    <Image
                      src={c.preview}
                      alt={c.value}
                      fill
                      sizes="44px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <span className="block h-full w-full bg-blush-100" />
                  )}
                  {!c.available ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/65 font-sans text-[9px] font-bold uppercase tracking-wider text-ink">
                      Out
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Frosted size selector on the hero, just above the CTA spot */}
        {sizeOption && sizeOptions.length > 0 ? (
          <div className="absolute inset-x-4 bottom-3">
            <div
              className="flex items-center justify-between rounded-3xl bg-white/90 px-3 py-2 backdrop-blur-md"
              style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}
            >
              <span className="pl-1 font-sans text-[12px] font-semibold text-ink">
                Select size
              </span>
              <div className="flex gap-1.5">
                {sizeOptions.map((s) => {
                  const active = currentSize === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() =>
                        setSelected((sel) => ({ ...sel, [sizeOption.id]: s.value }))
                      }
                      disabled={!s.available}
                      aria-pressed={active}
                      className={`flex h-9 min-w-[36px] items-center justify-center rounded-2xl px-2.5 font-sans text-[12px] font-semibold transition-colors ${
                        active
                          ? "bg-coral-500 text-white"
                          : s.available
                            ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                            : "bg-blush-100/70 text-ink-muted line-through"
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

        {/* Page-indicator dots — only when >1 image. Sit just below the
            top row so they overlap consistent image content rather than
            sitting on top of skin/background. */}
        {heroImages.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center gap-1.5">
            {heroImages.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeImg ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="px-5 pt-3 font-sans text-[12px] text-coral-700">{error}</p>
      ) : null}

      {/* Description + size chart anchor + support details, mobile-only.
          The accordion lives below the hero so screenshots of the first view
          show only the hero + CTA. */}
      <div className="px-4 pt-4">
        <ProductAccordion
          descriptionHtml={descriptionHtml}
          sizeChartHtml={sizeChartHtml}
          preorderEtaCopy={preorderEtaCopy ?? ""}
          freeShippingLabel={freeShippingLabel}
        />
        {/* Hidden anchor that the hero "Size chart" pill scrolls to. We can't
            target inside the closed accordion details element, so the anchor
            sits on the wrapper and the user expands the accordion themselves
            once they're in view of it. */}
        <span id={SIZE_CHART_ANCHOR_ID} className="block" aria-hidden />
      </div>

      {/* Sticky bottom CTA — soft-pink price chip on the left, ADD TO BAG label. */}
      <div className="fixed inset-x-0 bottom-[72px] z-[80] px-5 pb-2 pt-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || adding || cartLoading}
          className={`flex w-full items-center justify-between gap-2 rounded-full p-1.5 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-colors disabled:opacity-70 ${
            !inStock
              ? "bg-blush-400"
              : added
                ? "bg-emerald-600"
                : "bg-coral-500"
          }`}
        >
          <span className="flex items-center justify-center rounded-full bg-coral-300 px-4 py-2.5 font-display text-[14px] font-semibold normal-case tracking-normal text-white">
            {formatPrice(price.amount, price.currency)}
          </span>
          <span className="flex-1 pr-3 text-center">
            {!inStock
              ? "Sold Out"
              : adding || cartLoading
                ? "Adding…"
                : added
                  ? "Added ✓"
                  : "Add to Bag"}
          </span>
        </button>
      </div>

      {/* Spacer so the accordion above isn't covered by the floating CTA + nav. */}
      <div aria-hidden className="h-36" />
    </div>
  );
}

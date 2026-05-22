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

  // Default to the first IN-STOCK variant so a partially-sold-out product
  // doesn't open on a sold-out combination. Falls back to variants[0] if
  // every variant is out of stock, so the page still renders.
  const initialOptions = useMemo(() => {
    const firstInStock = variants.find((v) => isVariantBuyable(v));
    const v = firstInStock ?? variants[0];
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
    // Hide fully sold-out colors entirely — customer never sees a swatch
    // they can't buy.
    return values
      .map((value) => {
        // Prefer variant metadata.image_urls (admin-curated, authoritative).
        // Fall back to filename-slug match so older products without
        // per-variant image_urls still get a colour-specific gallery.
        const metaSet = new Set<string>();
        for (const v of variants) {
          const hasColor = v.options?.some(
            (o) => o.option_id === colorOption.id && o.value === value,
          );
          if (!hasColor) continue;
          const meta = (v.metadata ?? {}) as { image_urls?: unknown };
          if (Array.isArray(meta.image_urls)) {
            for (const u of meta.image_urls) {
              if (typeof u === "string" && u) metaSet.add(u);
            }
          }
        }
        const fromMeta = images.filter((u) => metaSet.has(u));
        const slug = slugify(value);
        const fromSlug = images.filter((u) => u.toLowerCase().includes(slug));
        const matches = fromMeta.length ? fromMeta : fromSlug;
        const preview = matches[0] ?? images[0] ?? product.thumbnail ?? "";
        const available = variants.some((v) => {
          const hasColor = v.options?.some(
            (o) => o.option_id === colorOption.id && o.value === value,
          );
          if (!hasColor) return false;
          return isVariantBuyable(v);
        });
        return { value, preview, images: matches, available };
      })
      .filter((c) => c.available);
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

    // Globally-available sizes: at least one in-stock variant carries this
    // size value, regardless of other option picks. Fully-OOS sizes get
    // hidden entirely; in-context unavailability (size OOS for current
    // color but available for another color) still renders as disabled.
    const globallyAvailable = new Set<string>();
    for (const v of variants) {
      if (!isVariantBuyable(v)) continue;
      for (const opt of v.options ?? []) {
        if (opt.option_id === sizeOption.id && opt.value) {
          globallyAvailable.add(opt.value);
        }
      }
    }

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
    const list = allValues
      .filter((v) => globallyAvailable.has(v))
      .map<SizeOpt>(
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
    // Offset for the sticky site header so the anchor doesn't end up tucked
    // under it. 96 ≈ delivery banner + logo bar.
    const HEADER_OFFSET = 96;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={wished ? "#E5604A" : "none"}
              stroke="#E5604A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Title overlay — sits just above the color/size-chart row, hugging
            the bottom so the model stays visible. */}
        <div className="pointer-events-none absolute inset-x-5 bottom-[140px]">
          <h1
            className="font-display text-[18px] font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}
          >
            {product.title}
          </h1>
        </div>

        {/* Color thumbs (left) + SIZE CHART pill (right) sit on the SAME line
            just above the size selector. Color row is hidden when the product
            has 0/1 colors — the SIZE CHART pill still aligns to the right. */}
        <div className="absolute inset-x-4 bottom-[84px] flex items-center justify-between gap-3">
          {showColorRow ? (
            <div
              className="flex items-center gap-2 overflow-x-auto"
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
          ) : (
            <span />
          )}

          {sizeChartHtml ? (
            <button
              type="button"
              onClick={scrollToSizeChart}
              className="z-10 flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E5604A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 14h4l3-9 4 18 3-9h4" />
            </svg>
            <span>Size chart</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            </button>
          ) : null}
        </div>

        {/* Frosted size selector on the hero — lower opacity so the image
            still reads through clearly. */}
        {sizeOption && sizeOptions.length > 0 ? (
          <div className="absolute inset-x-4 bottom-3">
            <div
              className="flex items-center justify-between rounded-3xl bg-white/65 px-3 py-2 backdrop-blur-lg"
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
                            ? "bg-white/95 text-ink shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
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

      {/* Description + size chart + support details, mobile-only. Size Chart
          is the first section and opens by default in ProductAccordion, so
          anchoring before the accordion lands the chart heading at the top
          of the viewport after the smooth-scroll. */}
      <div className="px-4 pt-4">
        <span id={SIZE_CHART_ANCHOR_ID} className="block scroll-mt-24" aria-hidden />
        <ProductAccordion
          descriptionHtml={descriptionHtml}
          sizeChartHtml={sizeChartHtml}
          preorderEtaCopy={preorderEtaCopy ?? ""}
          freeShippingLabel={freeShippingLabel}
        />
      </div>

      {/* Sticky bottom CTA — matches the reference: cream price chip on a
          warm coral pill, with a small bag glyph next to the ADD TO BAG label. */}
      <div className="fixed inset-x-0 bottom-[72px] z-[80] px-5 pb-2 pt-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || adding || cartLoading}
          className={`flex w-full items-center gap-3 rounded-full p-1.5 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-colors disabled:opacity-70 ${
            !inStock
              ? "bg-blush-400"
              : added
                ? "bg-emerald-600"
                : "bg-coral-700"
          }`}
        >
          <span
            className="flex items-center justify-center rounded-full bg-blush-200 px-5 py-3 font-display text-[15px] font-semibold normal-case tracking-normal text-coral-700"
            style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)" }}
          >
            {formatPrice(price.amount, price.currency)}
          </span>
          <span className="flex flex-1 items-center justify-center gap-2 pr-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>
              {!inStock
                ? "Sold Out"
                : adding || cartLoading
                  ? "Adding…"
                  : added
                    ? "Added ✓"
                    : "Add to Bag"}
            </span>
          </span>
        </button>
      </div>

      {/* Spacer so the accordion above isn't covered by the floating CTA + nav. */}
      <div aria-hidden className="h-36" />
    </div>
  );
}

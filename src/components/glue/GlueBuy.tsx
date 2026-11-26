"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HttpTypes } from "@medusajs/types";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useAdventPdp } from "@/components/advent/AdventPrice";
import { useAdventNow } from "@/components/advent/useAdventNow";
import { useCart } from "@/components/cart/CartProvider";
import { trackViewItem } from "@/lib/analytics";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import { decemberPriceLabel } from "@/lib/glue-page";
import { restockWhatsAppUrl } from "@/lib/restock";
import { toggleWishlist, useIsInWishlist } from "@/lib/wishlist-client";

function isVariantBuyable(v: HttpTypes.StoreProductVariant): boolean {
  return !v.manage_inventory || (v.inventory_quantity ?? 0) > 0;
}

type PillProps = {
  className: string;
  priceLabel: string;
  label: string;
  tone: string;
  disabled: boolean;
  onClick: () => void;
};

// The site's Add to Bag pill: price chip on the left, label on the right.
function BagPill({ className, priceLabel, label, tone, disabled, onClick }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full items-center gap-3 rounded-full p-1.5 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-700 disabled:cursor-not-allowed disabled:opacity-70 ${tone} ${className}`}
    >
      <span
        className="flex items-center justify-center rounded-full bg-blush-200 px-5 py-3 font-display text-[15px] font-semibold normal-case tracking-normal text-coral-700"
        style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)" }}
      >
        {priceLabel}
      </span>
      <span className="flex flex-1 items-center justify-center gap-2 pr-3" aria-live="polite">
        <ShoppingBag size={16} strokeWidth={2} aria-hidden />
        <span>{label}</span>
      </span>
    </button>
  );
}

/**
 * Price, the December tag, and Add to Bag for the body glue page. The button
 * sits in the hero from md; on phones it is pinned above the bottom nav, the
 * same place as on every other product page. `children` (the lead sentence
 * and the delivery ticks) are drawn between the price and the desktop button.
 */
export function GlueBuy({
  product,
  initialNow,
  children,
}: {
  product: HttpTypes.StoreProduct;
  initialNow: number;
  children?: ReactNode;
}) {
  const { addItem, loading: cartLoading } = useCart();
  const variants = product.variants ?? [];
  // One size, one variant today. If more are ever added, sell the first one in stock.
  const variant = variants.find(isVariantBuyable) ?? variants[0] ?? null;
  const price = variant ? getDisplayPrice({ variants: [variant] }) : getDisplayPrice(product);
  const inStock = !!variant && isVariantBuyable(variant);

  const now = useAdventNow(initialNow);
  const doorHit = useAdventPdp({
    amount: price.amount,
    categoryHandles: (product.categories ?? []).map((c) => c.handle),
    productId: product.id,
    discountable: product.discountable,
    initialNow,
    soldOut: !inStock,
  });

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const variantId = variant?.id;
  const variantTitle = variant?.title ?? undefined;
  const category = product.categories?.[0]?.name ?? undefined;
  useEffect(() => {
    trackViewItem({
      productId: product.id,
      productHandle: product.handle ?? "",
      productTitle: product.title ?? "",
      variantId,
      variantTitle,
      category,
      price: price.amount ?? 0,
      currency: price.currency ?? "MUR",
    });
    // One view per page load: a door price or a re-render is not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, variantId]);

  const handleAdd = async () => {
    if (!variant) {
      setError("This product is unavailable");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await addItem(variant.id, 1);
      setAdded(true);
      if (addedTimer.current) clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    } finally {
      setAdding(false);
    }
  };

  const shown = doorHit ? doorHit.price : price.amount;
  const struck = doorHit ? price.amount : price.onSale ? price.original : null;
  const tag = doorHit ? null : decemberPriceLabel(now, price.onSale);
  const busy = adding || cartLoading;
  const label = !inStock ? "Sold Out" : busy ? "Adding…" : added ? "Added" : "Add to Bag";
  const tone = !inStock ? "bg-blush-400" : added ? "bg-emerald-600" : "bg-coral-700 hover:bg-coral-900";
  const pill = {
    priceLabel: formatPrice(shown, price.currency),
    label,
    tone,
    disabled: !inStock || busy,
    onClick: handleAdd,
  };

  return (
    <div className="flex flex-col items-center md:items-start">
      <p className="flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1.5 md:justify-start">
        <span className="font-display text-[32px] leading-none text-ink md:text-[40px]">
          {formatPrice(shown, price.currency)}
        </span>
        {struck != null ? (
          <span className="font-sans text-[15px] text-ink-muted line-through md:text-[16px]">
            <span className="sr-only">was </span>
            {formatPrice(struck, price.currency)}
          </span>
        ) : null}
        {tag ? (
          <span className="self-center rounded-full bg-blush-300 px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-coral-700">
            {tag}
          </span>
        ) : null}
      </p>
      {doorHit ? (
        <p className="mt-1.5 font-sans text-[13px] font-semibold text-coral-700">
          Door {doorHit.day} · {doorHit.tonight ? "tonight" : "today"} on the website
        </p>
      ) : null}

      {children}

      <BagPill {...pill} className="mt-6 hidden max-w-[400px] md:flex" />

      {error ? <p className="mt-3 font-sans text-[13px] text-coral-700">{error}</p> : null}

      {!inStock ? (
        <div className="mt-4 flex w-full max-w-[400px] items-center justify-between gap-3 rounded-xl border border-blush-200 bg-white px-3.5 py-2.5">
          <p className="font-sans text-[13px] text-ink-soft">This product is sold out.</p>
          <a
            href={restockWhatsAppUrl(product.title ?? "", "")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink bg-white px-3.5 font-sans text-[12px] font-semibold text-ink"
          >
            <MessageCircle size={14} aria-hidden />
            Notify me
          </a>
        </div>
      ) : null}

      {/* Pinned above the mobile bottom nav (72px + the iOS home-indicator
          inset), the same offset as MobilePdpHero's bar. */}
      <div
        className="fixed inset-x-0 z-[80] px-5 pb-2 pt-2 md:hidden"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      >
        <BagPill {...pill} className="flex shadow-[0_8px_20px_rgba(0,0,0,0.22)]" />
      </div>
    </div>
  );
}

export function GlueWishlistButton({ productId }: { productId: string }) {
  const wished = useIsInWishlist(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-700"
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
  );
}

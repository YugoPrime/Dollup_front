"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

const PLACEHOLDER_BGS = ["#FAE8E4", "#F2DDD8", "#F5EDEB", "#FAF1EE"];

function pickBg(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_BGS[h % PLACEHOLDER_BGS.length];
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState(false);

  const price = getDisplayPrice(product);
  const inStock = product.variants?.some(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const soldOut = product.variants?.length ? !inStock : false;

  const badge = price.onSale ? "Sale" : isNew(product) ? "New" : null;
  const category = product.categories?.[0]?.name ?? product.collection?.title ?? null;
  const thumb = product.thumbnail ?? product.images?.[0]?.url ?? null;
  const bg = pickBg(product.id);

  const onQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = product.variants?.find((v) => v.inventory_quantity !== 0);
    if (!variant) return;
    setBusy(true);
    try {
      await addItem(variant.id, 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group relative block overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(229,96,74,0.06),0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_6px_20px_rgba(229,96,74,0.13),0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <div
        className="relative flex h-[340px] items-center justify-center overflow-hidden md:h-[380px]"
        style={{ background: bg }}
      >
        {soldOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Sold Out
            </span>
          </div>
        )}
        {badge && !soldOut && (
          <span
            className={`absolute left-2.5 top-2.5 z-[2] rounded-full px-2.5 py-1 font-sans text-[9px] font-bold uppercase tracking-wider ${
              badge === "Sale"
                ? "bg-coral-500 text-white"
                : "bg-blush-300 text-coral-700"
            }`}
          >
            {badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Wishlist"
          className="absolute right-2.5 top-2.5 z-[4] flex h-7.5 w-7.5 h-[30px] w-[30px] items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A2F2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-[180px] w-[180px] rounded-full bg-white/25" />
        <div className="pointer-events-none absolute -left-5 -top-8 h-[100px] w-[100px] rounded-full bg-white/15" />
        {thumb ? (
          <Image
            src={thumb}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <Image
            src="/logo.png"
            alt=""
            width={68}
            height={68}
            className="relative z-[1] opacity-15 saturate-0"
          />
        )}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 z-[5] translate-y-full p-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={onQuickAdd}
              disabled={busy || loading}
              className="w-full rounded-md bg-ink py-2.5 font-sans text-xs font-semibold tracking-wider text-white hover:bg-ink-soft disabled:opacity-60"
            >
              {busy ? "Adding…" : "Quick Add"}
            </button>
          </div>
        )}
      </div>
      <div className="px-3.5 pb-4 pt-3">
        {category && (
          <div className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {category}
          </div>
        )}
        <div className="mb-1.5 font-display text-sm font-medium leading-tight text-ink">
          {product.title}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-sans text-sm font-semibold ${
              soldOut ? "text-coral-300" : "text-ink"
            }`}
          >
            {formatPrice(price.amount, price.currency)}
          </span>
          {price.onSale && (
            <span className="font-sans text-[11px] text-coral-300 line-through">
              {formatPrice(price.original, price.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function isNew(product: Product) {
  if (!product.created_at) return false;
  const createdMs = new Date(product.created_at).getTime();
  const days = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

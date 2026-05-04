"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist, clearWishlist } from "@/lib/wishlist-client";
import { clientSdk } from "@/lib/cart-client";
import type { HttpTypes } from "@medusajs/types";

// Mirrors the server-side PRODUCT_FIELDS in lib/products.ts so ProductCard's
// in-stock check has inventory_quantity / manage_inventory expanded.
const PRODUCT_FIELDS =
  "*variants,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,*options,*options.values,*images,*tags,*categories";

export function WishlistClient() {
  const ids = useWishlist();
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    clientSdk.store.product
      .list({ id: ids, fields: PRODUCT_FIELDS, limit: ids.length })
      .then((res) => {
        if (cancelled) return;
        const byId = new Map((res.products ?? []).map((p) => [p.id, p]));
        setProducts(
          ids
            .map((id) => byId.get(id))
            .filter((p): p is HttpTypes.StoreProduct => !!p),
        );
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        <Link href="/" className="hover:text-coral-500">Home</Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <span>Wishlist</span>
      </nav>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[32px] leading-none text-ink md:text-[44px]">
            Your <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>wishlist</em>
          </h1>
          <p className="mt-2 font-sans text-[12px] text-ink-muted">
            {ids.length} {ids.length === 1 ? "saved item" : "saved items"} · stored on this device
          </p>
        </div>
        {ids.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear your wishlist?")) clearWishlist();
            }}
            className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
          >
            Clear all
          </button>
        )}
      </header>

      {ids.length === 0 ? (
        <EmptyState />
      ) : loading ? (
        <LoadingGrid count={ids.length} />
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E5604A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <h2 className="mb-1 font-display text-[20px] text-ink">Your wishlist is empty</h2>
      <p className="mb-5 max-w-[340px] font-sans text-[13px] text-ink-muted">
        Tap the heart on any product to save it here for later.
      </p>
      <Link
        href="/shop"
        className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-coral-700"
      >
        Browse products →
      </Link>
    </div>
  );
}

function LoadingGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[3/4.5] animate-pulse rounded-xl bg-blush-100" />
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";

const FREE_SHIPPING_THRESHOLD = 1500;

export function CartDrawer() {
  const { cart, open, setOpen, updateItem, removeItem, loading } = useCart();
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const currency = cart?.currency_code ?? "MUR";

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[200] bg-ink/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Cart"
        className={`fixed top-0 right-0 bottom-0 z-[201] flex w-full max-w-[400px] flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-blush-400 px-6 py-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            My Bag{" "}
            <span className="font-sans text-[13px] font-normal text-ink-muted">
              ({items.length})
            </span>
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1.5 text-ink-soft hover:bg-blush-100"
            aria-label="Close cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <p className="font-display text-lg font-semibold text-ink mb-2">Your bag is empty</p>
            <p className="font-sans text-[13px] text-ink-muted mb-6">
              Add something beautiful to get started.
            </p>
            <Link
              href="/shop"
              onClick={() => setOpen(false)}
              className="rounded bg-coral-500 px-7 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-700"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="relative mb-5 flex gap-3 border-b border-blush-100 pb-5 last:border-b-0"
                >
                  <div className="flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blush-300">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.product_title ?? ""}
                        width={76}
                        height={92}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-[3px]">
                    <div className="font-display text-[13px] font-medium leading-tight text-ink">
                      {item.product_title}
                    </div>
                    <div className="font-sans text-[11px] text-ink-muted">
                      {item.variant_title}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden rounded border border-blush-400">
                        <button
                          onClick={() =>
                            updateItem(item.id, Math.max(1, item.quantity - 1))
                          }
                          disabled={loading}
                          className="flex h-7 w-7 items-center justify-center text-base text-ink-soft hover:bg-blush-100"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-[13px] font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          disabled={loading}
                          className="flex h-7 w-7 items-center justify-center text-base text-ink-soft hover:bg-blush-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-sans text-[13px] font-semibold">
                        {formatPrice((item.unit_price ?? 0) * item.quantity, currency)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove"
                    className="absolute right-0 top-0 p-1 text-coral-300 hover:text-coral-500"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="border-y border-blush-100 bg-cream px-6 py-3">
              {remaining > 0 ? (
                <>
                  <p className="mb-2 text-center font-sans text-xs text-ink-soft">
                    Add <strong>{formatPrice(remaining, currency)}</strong> more for free delivery
                  </p>
                  <div className="h-1 overflow-hidden rounded-full bg-blush-400">
                    <div
                      className="h-full rounded-full bg-coral-500 transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-center font-sans text-xs font-medium text-emerald-700">
                  🎉 You&apos;ve unlocked free delivery!
                </p>
              )}
            </div>

            <footer className="border-t border-blush-400 px-6 py-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-sans text-sm font-medium text-ink-soft">
                  Subtotal
                </span>
                <span className="font-sans text-[17px] font-bold">
                  {formatPrice(subtotal, currency)}
                </span>
              </div>
              <p className="mb-3.5 font-sans text-[11px] text-ink-muted">
                Shipping &amp; taxes calculated at checkout
              </p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="mb-2 flex w-full items-center justify-center rounded bg-coral-500 px-4 py-3 font-sans text-sm font-semibold tracking-wide text-white hover:bg-coral-700"
              >
                Proceed to Checkout
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded border-[1.5px] border-coral-500 px-4 py-2.5 font-sans text-[13px] font-medium text-coral-500 hover:bg-blush-100"
              >
                Continue Shopping
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FocusTrapLayer } from "@/components/a11y/FocusTrapLayer";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";
import { trackViewCart } from "@/lib/analytics";
import { cartTypeOf } from "@/lib/cart-type";

const FREE_SHIPPING_THRESHOLD = 1500;

export function CartDrawer() {
  const { cart, open, setOpen, updateItem, removeItem, loading } = useCart();
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const currency = cart?.currency_code ?? "MUR";

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Pre-order carts (separate Medusa sales channel) must check out on the
  // pre-order storefront, which has its own deposit flow. In-stock carts use
  // the apex COD checkout. Routing the wrong one 404s or applies the wrong
  // payment model.
  const checkoutHref =
    cartTypeOf(cart) === "preorder" ? "/preorder/checkout" : "/checkout";

  const [liveMessage, setLiveMessage] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  // Track item count + total qty so we can describe what changed since the last
  // render. Skip the very first observation to avoid an "added" announcement on
  // drawer open.
  const prevSnapshotRef = useRef<{ count: number; totalQty: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    trackViewCart(cart);
    return () => {
      document.body.style.overflow = original;
    };
    // intentionally only re-runs when the drawer opens — `cart` is read at that
    // moment, we don't want a re-fire on every line update inside the drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const snap = { count: items.length, totalQty };
    const prev = prevSnapshotRef.current;
    prevSnapshotRef.current = snap;
    if (!prev) return;
    if (snap.count > prev.count) setLiveMessage("Item added to bag");
    else if (snap.count < prev.count) setLiveMessage("Item removed from bag");
    else if (snap.totalQty !== prev.totalQty) setLiveMessage("Quantity updated");
  }, [items]);

  const handleRemove = async (itemId: string) => {
    const idx = items.findIndex((i) => i.id === itemId);
    const nextItemId = items[idx + 1]?.id ?? items[idx - 1]?.id ?? null;
    await removeItem(itemId);
    requestAnimationFrame(() => {
      const target = nextItemId ? removeButtonRefs.current.get(nextItemId) : null;
      (target ?? closeButtonRef.current)?.focus();
    });
  };

  if (!open) return null;

  return (
    <FocusTrapLayer
      ariaLabel="Cart"
      className="fixed inset-0 z-[200]"
      onDeactivate={() => setOpen(false)}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="fixed bottom-0 right-0 top-0 z-[201] flex w-full max-w-[400px] flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)]"
      >
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>
        <header className="flex items-center justify-between border-b border-blush-400 px-6 py-5">
          <h2 id="cart-drawer-title" className="font-display text-lg font-semibold text-ink">
            My Bag{" "}
            <span className="font-sans text-[13px] font-normal text-ink-muted">
              ({items.length})
            </span>
          </h2>
          <button
            ref={closeButtonRef}
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded text-ink-soft hover:bg-blush-100"
            aria-label="Close cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          loading ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <div
                className="h-9 w-9 animate-spin rounded-full border-2 border-blush-300 border-t-coral-500"
                aria-hidden="true"
              />
              <p className="mt-4 font-sans text-[13px] text-ink-muted">
                Adding to your bag…
              </p>
            </div>
          ) : (
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
          )
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
                      // Plain <img>, not next/image: the custom image loader
                      // routes non-CDN hosts (e.g. preorder SHEIN thumbnails) to
                      // /_next/image, which is disabled under `loader: "custom"`
                      // and 404s. CDN/apex thumbnails render fine either way.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
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
                          className="flex h-11 w-11 items-center justify-center text-base text-ink-soft hover:bg-blush-100"
                          aria-label={`Decrease quantity of ${item.product_title}`}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-[13px] font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          disabled={loading}
                          className="flex h-11 w-11 items-center justify-center text-base text-ink-soft hover:bg-blush-100"
                          aria-label={`Increase quantity of ${item.product_title}`}
                        >
                          +
                        </button>
                      </div>
                      {/* Show what the customer actually pays. `unit_price *
                          quantity` ignores promotions, so a free GWP cuff or a
                          BOGO tape rendered at full price and looked like a
                          charge — while the subtotal below disagreed with it. */}
                      {(() => {
                        const listed = (item.unit_price ?? 0) * item.quantity;
                        const payable = item.total ?? listed;
                        if (payable >= listed) {
                          return (
                            <span className="font-sans text-[13px] font-semibold">
                              {formatPrice(listed, currency)}
                            </span>
                          );
                        }
                        return (
                          <span className="flex flex-col items-end leading-tight">
                            <span className="font-sans text-[11px] text-ink-muted line-through">
                              {formatPrice(listed, currency)}
                            </span>
                            <span className="font-sans text-[13px] font-bold text-coral-500">
                              {payable === 0 ? "FREE" : formatPrice(payable, currency)}
                            </span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    ref={(el) => { removeButtonRefs.current.set(item.id, el); }}
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove ${item.product_title}`}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-coral-300 hover:text-coral-500"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
              {/* `cart.subtotal` is pre-discount, so without this row a cart with
                  a free gift showed lines totalling 1,075 under a Subtotal of
                  1,450 and the customer couldn't reconcile the two. */}
              {discountTotal > 0 && (
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-sans text-sm font-medium text-coral-500">
                    Offers &amp; gifts
                  </span>
                  <span className="font-sans text-[15px] font-bold text-coral-500">
                    −{formatPrice(discountTotal, currency)}
                  </span>
                </div>
              )}
              <p className="mb-3.5 font-sans text-[11px] text-ink-muted">
                Shipping &amp; taxes calculated at checkout
              </p>
              <Link
                href={checkoutHref}
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
    </FocusTrapLayer>
  );
}

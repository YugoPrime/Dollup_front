"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { HttpTypes } from "@medusajs/types";
import {
  clientSdk,
  getCartSdk,
  getStoredCartId,
  setStoredCartId,
  clearStoredCartId,
  getStoredCartType,
  setStoredCartType,
} from "@/lib/cart-client";
import { trackAddToCart } from "@/lib/analytics";
import { canAddItem, cartTypeOf, type CartType } from "@/lib/cart-type";

const CartDrawer = dynamic(
  () => import("./CartDrawer").then((m) => m.CartDrawer),
  { ssr: false, loading: () => null },
);

type Cart = HttpTypes.StoreCart;

type AddItemOpts = { cartType?: CartType };

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (variantId: string, quantity?: number, opts?: AddItemOpts) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_FIELDS =
  "*items,*items.variant,*items.variant.product,*items.variant.options,*items.thumbnail,*region,*shipping_methods,*promotions,metadata,+subtotal,+total,+item_total,+shipping_total,+tax_total,+discount_total";

async function ensureCart(
  regionId: string | undefined,
  cartType?: CartType,
): Promise<Cart> {
  const existing = getStoredCartId();
  if (existing) {
    // Pick the right SDK based on the stored cart_type. A preorder cart fetched
    // with the apex SDK would 401 because the apex publishable key doesn't have
    // access to the Pre-Order sales channel (and vice-versa).
    const storedType = getStoredCartType();
    const sdk = getCartSdk(storedType);
    try {
      const { cart } = await sdk.store.cart.retrieve(existing, {
        fields: CART_FIELDS,
      });
      if (cart && !cart.completed_at) return cart;
    } catch {
      clearStoredCartId();
    }
  }

  // For the cart-create call, use the SDK matching the intended type. The
  // sales-channel binding flows from the publishable key on the SDK that
  // creates the cart. Idle pre-create (cartType=undefined) defaults to apex —
  // that's fine because the dominant path is in-stock; a preorder first add
  // will hit canAddItem rejection, the user clears, and the next create lands
  // in the preorder channel.
  const sdk = getCartSdk(cartType);
  const { regions } = await sdk.store.region.list();
  const region = regions?.find((r) => r.id === regionId) ?? regions?.[0];
  if (!region) throw new Error("No region available to create cart");

  // Only stamp cart_type when we know what type this cart is for (i.e. on first
  // actual add). Do NOT stamp it during idle pre-create (cartType=undefined) —
  // an idle cart with cart_type="instock" would block the first preorder add.
  const metadata = cartType ? { cart_type: cartType } : undefined;
  const { cart } = await sdk.store.cart.create(
    { region_id: region.id, ...(metadata ? { metadata } : {}) },
    { fields: CART_FIELDS },
  );
  setStoredCartId(cart.id);
  if (cartType) setStoredCartType(cartType);
  return cart;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Cart-resume from email: if the URL carries ?cart_id=..., adopt it as the
  // active cart in localStorage BEFORE the load effect runs, then strip the
  // param so it doesn't linger in the address bar. ?open_cart=1 opens the
  // drawer so the customer immediately sees what they left behind. Used by
  // abandoned-cart recovery emails from the admin.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlCartId = params.get("cart_id");
    const openCart = params.get("open_cart") === "1";
    if (!urlCartId && !openCart) return;
    if (urlCartId) {
      const existing = getStoredCartId();
      if (existing !== urlCartId) {
        setStoredCartId(urlCartId);
      }
    }
    params.delete("cart_id");
    params.delete("open_cart");
    const qs = params.toString();
    const newUrl =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", newUrl);
    if (openCart) setOpen(true);
  }, []);

  useEffect(() => {
    const id = getStoredCartId();
    if (id) {
      (async () => {
        try {
          const storedType = getStoredCartType();
          const sdk = getCartSdk(storedType);
          const { cart } = await sdk.store.cart.retrieve(id, {
            fields: CART_FIELDS,
          });
          if (cart && !cart.completed_at) setCart(cart);
          else clearStoredCartId();
        } catch {
          clearStoredCartId();
        }
      })();
      return;
    }
    // No cart yet — pre-create one during browser idle so the user's first
    // "Add to Bag" doesn't pay the region.list + cart.create round-trip cost.
    // Gated behind requestIdleCallback so brief bouncers don't pollute the DB.
    let cancelled = false;
    const idle = (cb: () => void): number =>
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(cb, { timeout: 2500 })
        : (window.setTimeout(cb, 1500) as unknown as number);
    const cancelIdle = (handle: number) => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
    const handle = idle(async () => {
      if (cancelled) return;
      try {
        const created = await ensureCart(undefined);
        if (!cancelled) setCart(created);
      } catch {
        // Best-effort: a failed pre-create just falls back to lazy
        // ensureCart() inside addItem on the user's first interaction.
      }
    });
    return () => {
      cancelled = true;
      cancelIdle(handle);
    };
  }, []);

  const refresh = useCallback(async () => {
    const id = getStoredCartId();
    if (!id) return;
    const sdk = getCartSdk(cartTypeOf(cart) ?? getStoredCartType());
    const { cart: refreshed } = await sdk.store.cart.retrieve(id, {
      fields: CART_FIELDS,
    });
    setCart(refreshed);
  }, [cart]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1, opts?: AddItemOpts) => {
      const intendedType: CartType = opts?.cartType ?? "instock";

      // Open the drawer before the network round-trip so the user sees instant
      // feedback. CartDrawer renders an "Adding to your bag..." state when
      // loading && no items yet (covers the brand-new-visitor case where
      // ensureCart() hasn't returned yet).
      setOpen(true);
      setLoading(true);
      try {
        const current = cart ?? (await ensureCart(undefined, intendedType));
        if (!cart) setCart(current);

        // Block mixing in-stock and pre-order items in the same cart.
        const typeCheck = canAddItem(current, intendedType);
        if (!typeCheck.ok) {
          setOpen(false);
          throw new Error(typeCheck.reason);
        }

        // Stamp the cart type if the cart has no type yet (idle pre-create or
        // legacy cart created before this feature shipped).
        const currentType = cartTypeOf(current) ?? intendedType;
        const sdk = getCartSdk(currentType);
        if (cartTypeOf(current) === null) {
          sdk.store.cart.update(current.id, {
            metadata: { ...(current.metadata ?? {}), cart_type: intendedType },
          }).catch(() => {/* best-effort */});
          setStoredCartType(intendedType);
        }

        const { cart: updated } = await sdk.store.cart.createLineItem(
          current.id,
          { variant_id: variantId, quantity },
          { fields: CART_FIELDS },
        );
        setCart(updated);
        const addedLine = updated.items?.find(
          (i) => i.variant_id === variantId,
        );
        if (addedLine) {
          trackAddToCart({
            variantId,
            productId: addedLine.product_id ?? undefined,
            productTitle: addedLine.product_title ?? addedLine.title ?? "",
            variantTitle: addedLine.variant_title ?? undefined,
            price: addedLine.unit_price ?? 0,
            quantity,
            currency: updated.currency_code ?? "MUR",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [cart],
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getCartSdk(cartTypeOf(cart) ?? getStoredCartType());
      setLoading(true);
      try {
        const { cart: updated } = await sdk.store.cart.updateLineItem(
          cart.id,
          lineId,
          { quantity },
          { fields: CART_FIELDS },
        );
        setCart(updated);
      } finally {
        setLoading(false);
      }
    },
    [cart],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return;
      const sdk = getCartSdk(cartTypeOf(cart) ?? getStoredCartType());
      // Optimistic local removal so the line disappears immediately, then
      // reconcile with the server. deleteLineItem's response includes the
      // updated parent cart (Medusa v2), so we avoid a second refresh round
      // trip in the happy path.
      const previousCart = cart;
      setCart({
        ...cart,
        items: cart.items?.filter((i) => i.id !== lineId) ?? [],
      });
      setLoading(true);
      try {
        const res = (await sdk.store.cart.deleteLineItem(
          cart.id,
          lineId,
        )) as { parent?: Cart };
        const serverCart = res.parent ?? null;
        if (serverCart) {
          // If the cart is now empty, clear cart_type so the customer can add
          // a different type next time (e.g. emptied a preorder cart, now
          // wants to add an in-stock item).
          if ((serverCart.items?.length ?? 0) === 0 && cartTypeOf(serverCart) !== null) {
            const cleared: Cart = {
              ...serverCart,
              metadata: { ...(serverCart.metadata ?? {}), cart_type: null },
            };
            setCart(cleared);
            sdk.store.cart
              .update(serverCart.id, {
                metadata: { ...(serverCart.metadata ?? {}), cart_type: null },
              })
              .catch(() => {/* best-effort */});
          } else {
            setCart(serverCart);
          }
        } else {
          await refresh();
        }
      } catch (e) {
        // Roll back the optimistic removal on failure so the user sees their
        // line again rather than a silent loss.
        setCart(previousCart);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [cart, refresh],
  );

  const clearCart = useCallback(() => {
    clearStoredCartId();
    setCart(null);
    setOpen(false);
  }, []);

  const itemCount = useMemo(
    () => cart?.items?.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0,
    [cart],
  );

  const value: CartContextValue = {
    cart,
    loading,
    itemCount,
    open,
    setOpen,
    addItem,
    updateItem,
    removeItem,
    refreshCart: refresh,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {open && <CartDrawer />}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

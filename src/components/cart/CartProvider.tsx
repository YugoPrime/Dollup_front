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
  getStoredCartId,
  setStoredCartId,
  clearStoredCartId,
} from "@/lib/cart-client";
import { trackAddToCart } from "@/lib/analytics";

const CartDrawer = dynamic(
  () => import("./CartDrawer").then((m) => m.CartDrawer),
  { ssr: false, loading: () => null },
);

type Cart = HttpTypes.StoreCart;

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_FIELDS =
  "*items,*items.variant,*items.variant.product,*items.variant.options,*items.thumbnail,*region,*shipping_methods,*promotions,metadata,+subtotal,+total,+item_total,+shipping_total,+tax_total,+discount_total";

async function ensureCart(regionId: string | undefined): Promise<Cart> {
  const existing = getStoredCartId();
  if (existing) {
    try {
      const { cart } = await clientSdk.store.cart.retrieve(existing, {
        fields: CART_FIELDS,
      });
      if (cart && !cart.completed_at) return cart;
    } catch {
      clearStoredCartId();
    }
  }
  const { regions } = await clientSdk.store.region.list();
  const region = regions?.find((r) => r.id === regionId) ?? regions?.[0];
  if (!region) throw new Error("No region available to create cart");

  const { cart } = await clientSdk.store.cart.create(
    { region_id: region.id },
    { fields: CART_FIELDS },
  );
  setStoredCartId(cart.id);
  return cart;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = getStoredCartId();
    if (id) {
      (async () => {
        try {
          const { cart } = await clientSdk.store.cart.retrieve(id, {
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
    const { cart } = await clientSdk.store.cart.retrieve(id, {
      fields: CART_FIELDS,
    });
    setCart(cart);
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      // Open the drawer before the network round-trip so the user sees instant
      // feedback. CartDrawer renders an "Adding to your bag..." state when
      // loading && no items yet (covers the brand-new-visitor case where
      // ensureCart() hasn't returned yet).
      setOpen(true);
      setLoading(true);
      try {
        const current = cart ?? (await ensureCart(undefined));
        if (!cart) setCart(current);
        const { cart: updated } = await clientSdk.store.cart.createLineItem(
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
      setLoading(true);
      try {
        const { cart: updated } = await clientSdk.store.cart.updateLineItem(
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
        const res = (await clientSdk.store.cart.deleteLineItem(
          cart.id,
          lineId,
        )) as { parent?: Cart };
        if (res.parent) setCart(res.parent);
        else await refresh();
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

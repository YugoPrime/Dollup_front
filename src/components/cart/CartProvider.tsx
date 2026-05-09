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
    if (!id) return;
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
        setOpen(true);
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
      setLoading(true);
      try {
        await clientSdk.store.cart.deleteLineItem(cart.id, lineId);
        await refresh();
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

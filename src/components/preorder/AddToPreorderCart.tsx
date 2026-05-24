"use client";

import { useState, useTransition } from "react";
import { clientSdk, getStoredCartId, setStoredCartId } from "@/lib/cart-client";
import { canAddItem, cartTypeOf } from "@/lib/cart-type";
import { useCart } from "@/components/cart/CartProvider";

type Option = { id: string; title: string; values: Array<{ value: string }> };
type Variant = {
  id: string;
  title: string;
  options?: Array<{ option_id: string; value: string }>;
};

type Product = {
  id: string;
  handle: string;
  title: string;
  variants: Variant[];
  options?: Option[];
};

const REGION_ID_MU = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_MU;

const CART_FIELDS =
  "*items,*items.variant,metadata,+subtotal,+total,+item_total";

export function AddToPreorderCart({ product }: { product: Product }) {
  const { refreshCart } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const options = product.options ?? [];
  const allSelected = options.every((o) => selected[o.title]);

  const pickedVariant: Variant | undefined = product.variants.find((v) => {
    const opts = v.options ?? [];
    return options.every((o) => {
      const opt = opts.find((vo) => vo.option_id === o.id);
      return opt && opt.value === selected[o.title];
    });
  });

  const onAdd = () => {
    if (!pickedVariant) return;
    setError(null);
    startTx(async () => {
      try {
        const existingId = getStoredCartId();
        let cart: { id: string; metadata?: Record<string, unknown> | null } | null = null;

        if (existingId) {
          try {
            const r = await clientSdk.store.cart.retrieve(existingId, {
              fields: "metadata",
            });
            cart = r.cart as unknown as typeof cart;
            // If the cart was already completed, treat it as gone.
            if ((r.cart as { completed_at?: string | null }).completed_at) {
              cart = null;
            }
          } catch {
            /* cart expired or not found — create fresh */
          }
        }

        const check = canAddItem(cart, "preorder");
        if (!check.ok) {
          setError(check.reason);
          return;
        }

        if (!cart) {
          // Create a new cart tagged as preorder.
          const created = await clientSdk.store.cart.create(
            {
              region_id: REGION_ID_MU,
              metadata: { cart_type: "preorder" },
            },
            { fields: CART_FIELDS },
          );
          cart = created.cart as unknown as typeof cart;
          if (cart) setStoredCartId(cart.id);
        } else if (cartTypeOf(cart) === null) {
          // Existing cart with no type yet — stamp it.
          await clientSdk.store.cart.update(cart.id, {
            metadata: { ...(cart.metadata ?? {}), cart_type: "preorder" },
          });
        }

        if (!cart) {
          setError("Could not create cart.");
          return;
        }

        await clientSdk.store.cart.createLineItem(
          cart.id,
          { variant_id: pickedVariant.id, quantity: 1 },
          { fields: CART_FIELDS },
        );

        // Sync CartProvider so the header badge updates.
        await refreshCart();

        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add to cart.");
      }
    });
  };

  return (
    <div className="mt-6 space-y-3">
      {options.map((o) => (
        <fieldset key={o.id}>
          <legend className="text-[12px] font-medium text-ink">{o.title}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {o.values.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() =>
                  setSelected((s) => ({ ...s, [o.title]: v.value }))
                }
                className={
                  "rounded border px-3 py-1 text-sm transition-colors " +
                  (selected[o.title] === v.value
                    ? "border-ink bg-ink text-cream"
                    : "border-blush-400 text-ink hover:border-ink")
                }
              >
                {v.value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {added && (
        <p className="text-sm text-emerald-600">Added to cart. Checkout to pay your 75% deposit.</p>
      )}

      <button
        type="button"
        disabled={!allSelected || !pickedVariant || pending}
        onClick={onAdd}
        className="w-full rounded bg-ink px-4 py-3 text-sm font-semibold text-cream disabled:opacity-50"
      >
        {pending ? "Adding…" : added ? "Added!" : "Add to cart (75% deposit)"}
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
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

export function AddToPreorderCart({ product }: { product: Product }) {
  const { addItem } = useCart();
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
        // Route through CartProvider.addItem so region discovery, cart_type
        // enforcement, and stamping all happen in one place.
        await addItem(pickedVariant.id, 1, { cartType: "preorder" });
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

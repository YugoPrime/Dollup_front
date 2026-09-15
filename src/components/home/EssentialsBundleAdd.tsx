"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { essentialsBundle } from "@/lib/essentials-bundle";
import { formatPrice } from "@/lib/format";

export function EssentialsBundleAdd() {
  const { addItem } = useCart();
  const [tapeId, setTapeId] = useState<string>(essentialsBundle.tapeVariants[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addBundle() {
    setBusy(true);
    setError(null);
    try {
      // Sequential: each addItem reads the cart the previous one returned.
      await addItem(essentialsBundle.glueVariantId, 1);
      await addItem(tapeId, 1);
      await addItem(essentialsBundle.pantyVariantId, 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the bundle. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <fieldset className="flex items-center gap-3">
        <legend className="sr-only">Boob tape colour</legend>
        <span className="whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Tape colour
        </span>
        {essentialsBundle.tapeVariants.map((v) => {
          const active = v.id === tapeId;
          return (
            <label
              key={v.id}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 font-sans text-[13px] font-semibold transition-colors ${
                active
                  ? "border-coral-500 bg-white text-ink"
                  : "border-blush-400 bg-transparent text-ink-soft hover:border-coral-300"
              }`}
            >
              <input
                type="radio"
                name="essentials-tape"
                value={v.id}
                checked={active}
                onChange={() => setTapeId(v.id)}
                className="sr-only"
              />
              <span
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: v.swatch }}
                aria-hidden
              />
              {v.label}
            </label>
          );
        })}
      </fieldset>

      <button
        type="button"
        onClick={addBundle}
        disabled={busy}
        className="min-h-[52px] w-full whitespace-nowrap rounded-full bg-coral-500 px-8 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-60 md:w-auto"
      >
        {busy ? "Adding…" : `Add bundle to bag · ${formatPrice(essentialsBundle.price, "mur")}`}
      </button>

      {error && (
        <p role="alert" className="font-sans text-[13px] text-coral-700">
          {error}
        </p>
      )}
    </div>
  );
}

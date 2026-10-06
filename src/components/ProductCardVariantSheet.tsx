"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FocusTrapLayer } from "@/components/a11y/FocusTrapLayer";
import { useCart } from "@/components/cart/CartProvider";
import { colorNameToHex } from "@/lib/colors";

// Serialisable slice of a product that the grid card hands to the quick-add
// sheet. Built server-side in ProductCard so the client bundle never needs
// the full Medusa product object.
export type QuickAddOption = { id: string; title: string; values: string[] };
export type QuickAddVariant = {
  id: string;
  // option_id -> value
  values: Record<string, string>;
  buyable: boolean;
};
export type QuickAddProduct = {
  title: string;
  handle: string | null | undefined;
  thumbnail: string | null;
  priceLabel: string;
  options: QuickAddOption[];
  variants: QuickAddVariant[];
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL"];

function sortSizeValues(values: string[]): string[] {
  const rank = (v: string) => {
    const i = SIZE_ORDER.indexOf(v.trim().toUpperCase());
    return i === -1 ? 100 : i;
  };
  return [...values].sort((a, b) => rank(a) - rank(b));
}

function isColor(opt: QuickAddOption) {
  const t = opt.title.toLowerCase();
  return t === "color" || t === "colour";
}
function isSize(opt: QuickAddOption) {
  return opt.title.toLowerCase() === "size";
}

/**
 * Bottom-sheet variant picker for product cards. One tap on a size adds the
 * matching variant to the bag (the cart drawer opens on its own via
 * CartProvider.addItem). Sold-out combinations render disabled + struck so
 * the shopper sees what exists, not just what is left.
 */
export function ProductCardVariantSheet({
  product,
  onClose,
}: {
  product: QuickAddProduct;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Colour first, then size, then anything else. The LAST option is the
  // "trigger": choosing a value there adds to bag immediately.
  const orderedOptions = useMemo(() => {
    const colors = product.options.filter(isColor);
    const sizes = product.options.filter(isSize);
    const rest = product.options.filter((o) => !isColor(o) && !isSize(o));
    return [...colors, ...rest, ...sizes];
  }, [product.options]);
  const triggerOption = orderedOptions[orderedOptions.length - 1] ?? null;

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    // Preselect every non-trigger option with its first buyable value so a
    // single-colour product is one tap away from the bag.
    const init: Record<string, string> = {};
    for (const opt of orderedOptions) {
      if (opt === triggerOption) continue;
      const firstBuyable = opt.values.find((v) =>
        product.variants.some((va) => va.buyable && va.values[opt.id] === v),
      );
      if (firstBuyable) init[opt.id] = firstBuyable;
    }
    return init;
  });

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // A value is available when at least one buyable variant carries it AND
  // matches every OTHER currently-selected option.
  const isAvailable = (opt: QuickAddOption, value: string) =>
    product.variants.some((va) => {
      if (!va.buyable) return false;
      if (va.values[opt.id] !== value) return false;
      for (const other of orderedOptions) {
        if (other.id === opt.id) continue;
        const sel = selected[other.id];
        if (sel && va.values[other.id] !== sel) return false;
      }
      return true;
    });

  const findVariant = (sel: Record<string, string>) =>
    product.variants.find(
      (va) =>
        va.buyable &&
        orderedOptions.every((opt) => va.values[opt.id] === sel[opt.id]),
    ) ?? null;

  const add = async (sel: Record<string, string>) => {
    const variant = findVariant(sel);
    if (!variant) {
      setError("That combination is sold out.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addItem(variant.id, 1);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
      setBusy(false);
    }
  };

  const choose = (opt: QuickAddOption, value: string) => {
    const next = { ...selected, [opt.id]: value };
    setSelected(next);
    setError(null);
    if (opt === triggerOption) void add(next);
  };

  // Only-colour products (no size) still get an explicit button so the
  // swatch tap stays a selection, not a surprise add.
  const triggerIsColor = triggerOption ? isColor(triggerOption) : false;

  return (
    <FocusTrapLayer
      ariaLabel={`Choose options for ${product.title}`}
      className="fixed inset-0 z-[210]"
      onDeactivate={onClose}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        className="fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pt-4 shadow-[0_-8px_40px_rgba(0,0,0,0.18)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-blush-400 md:hidden" aria-hidden />

        <div className="flex items-start gap-3">
          <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-lg bg-blush-100">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt=""
                fill
                sizes="56px"
                className="object-cover object-top"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-sans text-[14px] font-medium leading-snug text-ink">
              {product.title}
            </p>
            <p className="mt-1 font-sans text-[16px] font-semibold text-ink">
              {product.priceLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-blush-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {orderedOptions.map((opt) => {
          const values = isSize(opt) ? sortSizeValues(opt.values) : opt.values;
          const color = isColor(opt);
          return (
            <div key={opt.id} className="mt-5">
              <p className="mb-2 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                {color ? "Colour" : opt.title}
                {selected[opt.id] ? (
                  <span className="ml-1 font-medium normal-case tracking-normal text-ink-muted">
                    : {selected[opt.id]}
                  </span>
                ) : opt === triggerOption && !color ? (
                  <span className="ml-1 font-medium normal-case tracking-normal text-ink-muted">
                    — tap to add
                  </span>
                ) : null}
              </p>
              <div
                role="radiogroup"
                aria-label={opt.title}
                className={color ? "flex flex-wrap gap-2" : "grid grid-cols-4 gap-2"}
              >
                {values.map((v) => {
                  const available = isAvailable(opt, v);
                  const active = selected[opt.id] === v;
                  if (color) {
                    return (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={available ? v : `${v} — sold out`}
                        title={v}
                        disabled={!available || busy}
                        onClick={() => choose(opt, v)}
                        className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white ${
                          active ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
                        } ${!available ? "opacity-40" : ""}`}
                        style={{ background: colorNameToHex(v) }}
                      >
                        {!available ? (
                          <span
                            aria-hidden="true"
                            className="block h-[1.5px] w-[120%] rotate-45 bg-ink/70"
                          />
                        ) : null}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={available ? v : `${v} — sold out`}
                      disabled={!available || busy}
                      onClick={() => choose(opt, v)}
                      className={`min-h-11 rounded-md border px-2 font-sans text-[14px] font-semibold transition-colors ${
                        active
                          ? "border-ink bg-ink text-white"
                          : available
                            ? "border-blush-400 bg-white text-ink hover:border-coral-500 hover:text-coral-500"
                            : "cursor-not-allowed border-blush-100 bg-blush-100/40 text-ink-muted line-through"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {triggerIsColor || orderedOptions.length === 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void add(selected)}
            className="mt-5 min-h-12 w-full rounded-full bg-coral-500 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add to bag"}
          </button>
        ) : null}

        <p
          role="status"
          aria-live="polite"
          className="mt-3 min-h-[18px] font-sans text-[13px] text-coral-700"
        >
          {busy ? "Adding to your bag…" : error ?? ""}
        </p>

        {product.handle ? (
          <Link
            href={`/products/${product.handle}`}
            onClick={onClose}
            className="mt-1 inline-flex min-h-11 items-center font-sans text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            View full details
          </Link>
        ) : null}
      </div>
    </FocusTrapLayer>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Ruler, ShoppingBag, Smartphone, Zap } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductCardWishlistButton } from "@/components/ProductCardActions";
import { toyNotifyMeUrl, type ToyOptionView } from "@/lib/after-dark";
import { formatPrice } from "@/lib/format";
import { hasFactsContent, resolveToyFacts, type ToyFacts } from "@/lib/toy-facts";

export type ToyVariantView = {
  id: string;
  // Keyed by ToyOptionView.id (option id, else the lowercased option title).
  values: Record<string, string>;
  buyable: boolean;
  amount: number | null;
};

type Props = {
  productId: string;
  title: string;
  code: string;
  images: string[];
  options: ToyOptionView[];
  variants: ToyVariantView[];
  currency: string;
  facts: ToyFacts | null;
  // Already sanitized on the server by splitProductDescription
  // (sanitizeRichText), the same path the dress PDP renders.
  descriptionHtml: string;
  // Server-rendered extras for the bottom of the details column
  // (Delivery & payment, Ask us privately).
  children?: ReactNode;
};

const ICON = { size: 18, strokeWidth: 1.4, "aria-hidden": true } as const;

// One plain row: line icon, bold title, grey sub. Shared with ToyProductPage.
export function ToyInfoRow({
  icon,
  title,
  sub,
}: {
  icon: ReactNode;
  title: string;
  sub?: string | null;
}) {
  return (
    <li className="flex items-start gap-3 border-b border-blush-200 py-3 last:border-b-0">
      <span className="mt-0.5 shrink-0 text-wine-800">{icon}</span>
      <span className="min-w-0">
        <span className="block font-sans text-[14px] font-bold leading-snug text-ink">{title}</span>
        {sub ? (
          <span className="mt-0.5 block font-sans text-[13px] leading-snug text-ink-soft">{sub}</span>
        ) : null}
      </span>
    </li>
  );
}

export function ToySectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-champagne-bronze"
    >
      {children}
    </h2>
  );
}

const matchesSelection = (
  v: ToyVariantView,
  options: ToyOptionView[],
  sel: Record<string, string>,
) => options.every((o) => v.values[o.id] === sel[o.id]);

export function ToyBuyPanel({
  productId,
  title,
  code,
  images,
  options,
  variants,
  currency,
  facts,
  descriptionHtml,
  children,
}: Props) {
  const { addItem, loading: cartLoading } = useCart();

  // Start on the first buyable variant so a part-sold-out toy doesn't open on
  // a sold-out choice; fall back to the first variant.
  const [selected, setSelected] = useState<Record<string, string>>(
    () => ({ ...((variants.find((v) => v.buyable) ?? variants[0])?.values ?? {}) }),
  );
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const matched = useMemo(() => {
    const hits = variants.filter((v) => matchesSelection(v, options, selected));
    return hits.find((v) => v.buyable) ?? hits[0] ?? null;
  }, [variants, options, selected]);

  const soldOut = !matched?.buyable;
  const fallbackAmount = useMemo(() => {
    const priced = (pool: ToyVariantView[]) =>
      pool.map((v) => v.amount).filter((a): a is number => typeof a === "number");
    const amounts = priced(variants.filter((v) => v.buyable));
    const pool = amounts.length ? amounts : priced(variants);
    return pool.length ? Math.min(...pool) : null;
  }, [variants]);
  const priceLabel = formatPrice(matched?.amount ?? fallbackAmount, currency);

  const core = facts ? resolveToyFacts(facts, Object.values(selected)) : null;
  const showFacts = !!core && hasFactsContent(core);
  const selection = options
    .map((o) => selected[o.id])
    .filter(Boolean)
    .join(" / ");

  // A value is unavailable when every variant carrying it is sold out.
  const isValueAvailable = (optionId: string, value: string) =>
    variants.some((v) => v.buyable && v.values[optionId] === value);

  const choose = (optionId: string, value: string) => {
    setError(null);
    setSelected((prev) => {
      const next = { ...prev, [optionId]: value };
      if (variants.some((v) => v.buyable && matchesSelection(v, options, next))) return next;
      // That combination is sold out: move to a buyable variant with this value.
      const alt = variants.find((v) => v.buyable && v.values[optionId] === value);
      return alt ? { ...alt.values } : next;
    });
  };

  const handleAdd = async () => {
    if (!matched || !matched.buyable || adding) return;
    setError(null);
    setAdding(true);
    try {
      await addItem(matched.id, 1);
      setAdded(true);
      if (addedTimer.current) clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    } finally {
      setAdding(false);
    }
  };

  const ctaLabel = soldOut ? "Sold out" : adding ? "Adding…" : added ? "Added" : "Add to bag";

  return (
    <div className="mx-auto max-w-[1280px] md:grid md:grid-cols-[minmax(0,500px)_minmax(0,460px)] md:justify-center md:gap-12 md:px-8 md:pt-8 lg:gap-16">
      <div className="md:sticky md:top-[140px] md:self-start">
        <ToyGallery images={images} productId={productId} />
      </div>

      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <h1 className="font-display text-[22px] font-normal leading-[1.15] text-ink md:text-[32px]">
          {title}
        </h1>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="font-display text-[19px] font-semibold text-wine-800 md:text-[22px]">
            {priceLabel}
          </p>
          {code ? (
            <p className="font-sans text-[11px] tracking-[0.12em] text-ink-muted">{code}</p>
          ) : null}
        </div>

        {options.map((o) => (
          <div key={o.id} className="mt-4">
            <p
              id={`toy-opt-${o.id}`}
              className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-champagne-bronze"
            >
              {o.label}
            </p>
            <div
              role="radiogroup"
              aria-labelledby={`toy-opt-${o.id}`}
              className="mt-2 flex flex-wrap gap-2"
            >
              {o.values.map((value) => {
                const active = selected[o.id] === value;
                const available = isValueAvailable(o.id, value);
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!available}
                    aria-label={available ? value : `${value}, sold out`}
                    onClick={() => choose(o.id, value)}
                    className={`min-h-11 rounded-full border px-4 font-sans text-[13px] font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 ${
                      active
                        ? "border-wine-800 bg-wine-800 text-champagne-100"
                        : available
                          ? "border-blush-400 bg-white text-ink hover:border-wine-700"
                          : "cursor-not-allowed border-blush-200 bg-white text-ink-muted line-through"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {core && core.stats.length > 0 ? (
          <dl
            className="mt-5 grid divide-x divide-champagne-200 border-y border-champagne-200 py-3"
            style={{ gridTemplateColumns: `repeat(${core.stats.length}, minmax(0, 1fr))` }}
          >
            {core.stats.map(([value, caption], i) => (
              <div key={`${value}-${caption}-${i}`} className="flex flex-col-reverse justify-end px-2 text-center">
                <dt className="mt-1.5 font-sans text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-champagne-bronze">
                  {caption}
                </dt>
                <dd className="font-display text-[24px] font-normal leading-none text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {core && core.extras.length > 0 ? (
          <p className="mt-2.5 text-center font-sans text-[13px] text-ink-soft">
            {core.extras.join(" · ")}
          </p>
        ) : null}

        {/* Fixed above the mobile bottom nav (z-100) and under the 18+ check
            (z-130); inline in the right column from md. */}
        <div
          className="fixed inset-x-0 z-[80] px-5 pb-2 pt-2 md:static md:z-auto md:mt-6 md:p-0"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut || adding || cartLoading}
            className={`flex w-full items-center gap-3 rounded-full bg-wine-800 p-1.5 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-champagne-100 shadow-[0_8px_20px_rgb(0_0_0/0.25)] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:cursor-not-allowed md:shadow-none ${
              soldOut ? "opacity-70" : "hover:bg-wine-700"
            }`}
          >
            <span className="rounded-full bg-champagne-100 px-5 py-3 font-display text-[15px] font-semibold normal-case tracking-normal text-wine-800">
              {priceLabel}
            </span>
            <span className="flex flex-1 items-center justify-center gap-2 pr-3" aria-live="polite">
              {soldOut ? null : <ShoppingBag size={16} strokeWidth={1.8} aria-hidden />}
              {ctaLabel}
            </span>
          </button>
        </div>

        {soldOut ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-champagne-200 bg-white px-3.5 py-2.5">
            <p className="font-sans text-[13px] text-ink-soft">
              {options.length > 0 ? "This option is sold out." : "This piece is sold out."}
            </p>
            <a
              href={toyNotifyMeUrl(code, selection || undefined)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-wine-800 px-4 font-sans text-[12px] font-bold text-wine-800 transition-colors duration-300 hover:bg-wine-800 hover:text-champagne-100"
            >
              Notify me
            </a>
          </div>
        ) : null}
        {error ? <p className="mt-3 font-sans text-[13px] text-coral-700">{error}</p> : null}

        {showFacts && core ? (
          core.size || core.power || core.app ? (
            <section aria-labelledby="toy-details-title" className="mt-7">
              <ToySectionHeading id="toy-details-title">Details</ToySectionHeading>
              <ul className="mt-1">
                {core.size ? <ToyInfoRow icon={<Ruler {...ICON} />} title="Size" sub={core.size} /> : null}
                {core.power ? (
                  <ToyInfoRow icon={<Zap {...ICON} />} title={core.power.title} sub={core.power.sub} />
                ) : null}
                {core.app ? (
                  <ToyInfoRow icon={<Smartphone {...ICON} />} title="App control" sub={core.app} />
                ) : null}
              </ul>
            </section>
          ) : null
        ) : descriptionHtml ? (
          <div
            className="mt-6 font-sans text-[14px] leading-[1.65] text-ink-soft [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_p:empty]:hidden [&_strong]:text-ink"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : null}

        {children}
      </div>
    </div>
  );
}

function ToyGallery({ images, productId }: { images: string[]; productId: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(Math.max(idx, 0), images.length - 1));
  };
  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative aspect-[3/4] max-h-[62dvh] w-full overflow-hidden bg-blush-100 md:max-h-none md:rounded-2xl">
      {images.length > 0 ? (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 snap-start">
              <Image
                src={src}
                alt={`After Dark piece, photo ${i + 1}`}
                fill
                sizes="(min-width: 768px) 500px, 100vw"
                preload={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <ProductCardWishlistButton productId={productId} />

      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === active ? "true" : undefined}
              className="flex h-6 items-center px-1"
            >
              <span
                className={`block h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-500 ${
                  i === active ? "w-4 bg-wine-800" : "w-1.5 bg-wine-800/25"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

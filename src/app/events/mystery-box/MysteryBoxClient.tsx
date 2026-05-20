"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ChevronRight, Ruler, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { clientSdk, setStoredCartId } from "@/lib/cart-client";
import {
  countSelectableSlots,
  generateBoxId,
  MYSTERY_BOX_FLAT_PRICE_MUR,
  MYSTERY_BOX_SLOT_COUNT,
  selectRandomBox,
  sumBoxValue,
  type CanonicalSize,
  type MysteryBox,
  type MysteryBoxSlot,
} from "@/lib/mystery-box";
import {
  MYSTERY_BOX_DAILY_LIMIT,
  useSpinCounter,
} from "@/lib/mystery-box-client";
import { SpinWheel } from "./SpinWheel";

type Props = {
  poolsBySize: Partial<Record<CanonicalSize, MysteryBoxSlot[]>>;
  regionId: string;
};

type LockError =
  | { kind: "out_of_stock"; ids: string[] }
  | { kind: "generic"; message: string };

const SIZE_OPTIONS: CanonicalSize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
];

export function MysteryBoxClient({ poolsBySize, regionId }: Props) {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { spinsUsed, spinsRemaining, canSpin, recordSpin, refundSpin } =
    useSpinCounter();
  const [size, setSize] = useState<CanonicalSize | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [box, setBox] = useState<MysteryBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<LockError | null>(null);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const pool = size ? poolsBySize[size] ?? [] : [];
  const selectableCount = countSelectableSlots(pool);
  const poolReady = selectableCount >= MYSTERY_BOX_SLOT_COUNT;
  const savings = box
    ? Math.max(0, box.total_value_mur - box.flat_price_mur)
    : 0;

  const cartHasOtherItems = useMemo(
    () => (cart?.items?.length ?? 0) > 0,
    [cart],
  );

  const handleSpinEnd = useCallback(() => {
    setSpinning(false);
  }, []);

  const startSpin = () => {
    if (!size || !poolReady || !canSpin || spinning) return;

    setError(null);
    setLockError(null);

    try {
      const slots = selectRandomBox(pool, MYSTERY_BOX_SLOT_COUNT);
      setBox({
        id: generateBoxId(),
        size,
        slots,
        total_value_mur: sumBoxValue(slots),
        flat_price_mur: MYSTERY_BOX_FLAT_PRICE_MUR,
      });
      setSpinning(true);
      recordSpin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pick a box");
    }
  };

  const handleLock = async () => {
    if (!box || !size || locking) return;

    if (cartHasOtherItems) {
      const ok = window.confirm(
        "This will replace your current cart with the Mystery Box. Continue?",
      );
      if (!ok) return;
    }

    setLocking(true);
    setLockError(null);

    try {
      const res = await clientSdk.client.fetch<{
        cart_id: string;
        mystery_box: {
          id: string;
          size: string;
          flat_price_mur: number;
          original_subtotal_mur: number;
        };
      }>("/store/mystery-box/create-cart", {
        method: "POST",
        body: {
          region_id: regionId,
          size,
          slots: box.slots.map((slot) => ({ variant_id: slot.variantId })),
        },
      });

      setStoredCartId(res.cart_id);
      await refreshCart();
      router.push("/checkout");
    } catch (err) {
      const fetchError = err as {
        message?: string;
        body?: {
          message?: string;
          out_of_stock_variant_ids?: string[];
        };
      };
      const outOfStockIds = fetchError.body?.out_of_stock_variant_ids;
      if (Array.isArray(outOfStockIds) && outOfStockIds.length > 0) {
        refundSpin();
        setLockError({ kind: "out_of_stock", ids: outOfStockIds });
      } else {
        const rawMessage =
          fetchError.body?.message ??
          fetchError.message ??
          "Could not lock this box";
        setLockError({
          kind: "generic",
          message: /failed to fetch/i.test(rawMessage)
            ? "Could not reach the Mystery Box backend. On localhost, make sure the Medusa backend with this new route is running or deployed."
            : rawMessage,
        });
      }
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-blush-400 bg-white p-5 shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              Step 1
            </p>
            <h2 className="font-display text-[24px] leading-tight text-ink md:text-[32px]">
              Pick your size
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSizeChartOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blush-400 bg-cream-50 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.13em] text-ink-soft transition-colors hover:border-coral-300 hover:text-coral-500"
          >
            <Ruler className="h-4 w-4" aria-hidden="true" />
            View size chart
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((option) => {
            const available =
              countSelectableSlots(poolsBySize[option] ?? []) >=
              MYSTERY_BOX_SLOT_COUNT;
            const disabled = !available || spinning;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSize(option);
                  setBox(null);
                  setError(null);
                  setLockError(null);
                }}
                className={[
                  "min-h-11 rounded-full border px-5 py-2.5 font-sans text-[12px] font-bold uppercase tracking-[0.12em] transition-colors",
                  size === option
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-blush-400 text-ink-soft hover:border-coral-300 hover:text-coral-500",
                  !available && "cursor-not-allowed opacity-30",
                  spinning && available && "cursor-wait",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>
        {size && !poolReady ? (
          <p className="mt-3 font-sans text-[12px] text-coral-500">
            Not enough stock in size {size} right now. Try another size.
          </p>
        ) : null}
      </section>

      {size && poolReady ? (
        <section className="rounded-xl border border-blush-400 bg-white p-4 shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
                Step 2
              </p>
              <h2 className="font-display text-[24px] leading-tight text-ink md:text-[32px]">
                Spin the wheel
              </h2>
            </div>
            <p className="font-sans text-[12px] text-ink-muted">
              {selectableCount} eligible pieces
            </p>
          </div>

          <SpinWheel
            pool={pool}
            selected={box?.slots ?? null}
            spinKey={box?.id ?? null}
            spinning={spinning}
            onSpinEnd={handleSpinEnd}
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-[12px] text-ink-muted">
              {spinsRemaining} of {MYSTERY_BOX_DAILY_LIMIT} spins left today
              {spinsUsed > 0 ? ` (${spinsUsed} used)` : ""}
            </p>
            <button
              type="button"
              aria-busy={spinning}
              disabled={spinning || !canSpin}
              onClick={startSpin}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-coral-500 px-8 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(214,103,78,0.28)] transition-all hover:bg-coral-700 hover:shadow-[0_14px_30px_rgba(214,103,78,0.34)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-coral-500 disabled:hover:shadow-[0_10px_24px_rgba(214,103,78,0.28)] disabled:active:translate-y-0 disabled:active:scale-100"
            >
              {spinning ? "Spinning..." : box ? "Spin again" : "Spin"}
              {!spinning ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </button>
          </div>

          {!canSpin ? (
            <p className="mt-2 font-sans text-[12px] text-coral-500">
              You have used all {MYSTERY_BOX_DAILY_LIMIT} spins today. Come back
              tomorrow.
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 font-sans text-[12px] text-coral-500">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {box && !spinning ? (
        <section className="relative overflow-hidden rounded-2xl border border-blush-200 bg-gradient-to-br from-cream-50 via-white to-blush-100/40 p-5 pt-7 shadow-[0_20px_50px_rgba(26,18,18,0.08)] md:p-8 md:pt-16">
          {/* Gift ribbon band — top edge (desktop only) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-5 hidden h-7 md:block"
          >
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-coral-500 via-coral-300 to-coral-500 shadow-[0_2px_8px_rgba(214,103,78,0.25)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-coral-700/30" />
          </div>

          {/* SVG bow — sits on the ribbon, top-left */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-6 top-0 hidden md:block"
          >
            <svg
              width="96"
              height="64"
              viewBox="0 0 96 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="bow-loop-grad"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f59478" />
                  <stop offset="55%" stopColor="#d6674e" />
                  <stop offset="100%" stopColor="#a83b25" />
                </linearGradient>
                <linearGradient
                  id="bow-tail-grad"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#c4502f" />
                  <stop offset="100%" stopColor="#7a2a18" />
                </linearGradient>
                <radialGradient id="bow-knot-grad" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#f59478" />
                  <stop offset="100%" stopColor="#6e2614" />
                </radialGradient>
              </defs>
              {/* Tails (behind loops) */}
              <path
                d="M44 36 C 42 46, 36 54, 28 62 L 38 58 C 44 50, 46 42, 46 38 Z"
                fill="url(#bow-tail-grad)"
              />
              <path
                d="M52 36 C 54 46, 60 54, 68 62 L 58 58 C 52 50, 50 42, 50 38 Z"
                fill="url(#bow-tail-grad)"
              />
              {/* Left loop */}
              <path
                d="M48 32 C 26 8, 6 16, 8 30 C 10 44, 32 42, 48 34 Z"
                fill="url(#bow-loop-grad)"
              />
              {/* Right loop */}
              <path
                d="M48 32 C 70 8, 90 16, 88 30 C 86 44, 64 42, 48 34 Z"
                fill="url(#bow-loop-grad)"
              />
              {/* Loop highlights */}
              <path
                d="M40 18 C 28 16, 18 20, 14 26"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M56 18 C 68 16, 78 20, 82 26"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Center knot */}
              <ellipse
                cx="48"
                cy="32"
                rx="6.5"
                ry="9"
                fill="url(#bow-knot-grad)"
              />
              <ellipse
                cx="46.5"
                cy="29"
                rx="1.5"
                ry="2.5"
                fill="rgba(255,255,255,0.35)"
              />
            </svg>
          </div>

          <div className="relative">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                  Your box · {box.slots.length} pieces
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[36px] leading-none text-ink md:text-[44px]">
                    Rs {box.flat_price_mur.toLocaleString("en-MU")}
                  </span>
                  <span className="font-sans text-[13px] text-ink-muted line-through">
                    Rs {box.total_value_mur.toLocaleString("en-MU")}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1.5 md:items-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-700/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Save Rs {savings.toLocaleString("en-MU")}
                </span>
                {box.total_value_mur > 0 ? (
                  <p className="font-sans text-[11px] text-ink-muted">
                    {Math.round((savings / box.total_value_mur) * 100)}% off retail
                  </p>
                ) : null}
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
              {box.slots.map((slot, index) => {
                const isLastOdd =
                  box.slots.length % 2 === 1 &&
                  index === box.slots.length - 1;
                return (
                  <li
                    key={`${slot.variantId}-${index}`}
                    className={[
                      "group overflow-hidden rounded-xl border border-blush-200 bg-white shadow-[0_4px_12px_rgba(26,18,18,0.04)] transition-shadow hover:shadow-[0_12px_28px_rgba(26,18,18,0.1)]",
                      isLastOdd ? "col-span-2 lg:col-span-1" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={[
                        "relative overflow-hidden bg-blush-100 lg:h-[260px]",
                        isLastOdd
                          ? "h-[220px] sm:h-[240px]"
                          : "h-[200px] sm:h-[240px]",
                      ].join(" ")}
                    >
                      {slot.thumbnail ? (
                        <Image
                          src={slot.thumbnail}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 180px, (min-width: 640px) 45vw, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : null}
                      <span className="absolute left-2.5 top-2.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white/95 px-2 font-sans text-[11px] font-bold tracking-wider text-coral-500 shadow-[0_2px_6px_rgba(26,18,18,0.12)] backdrop-blur">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="border-t border-blush-100 p-3">
                      <p className="line-clamp-2 font-sans text-[13px] font-semibold leading-snug text-ink">
                        {slot.title}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.08em] text-ink-muted md:text-[11px]">
                        {slot.sku} · size {slot.size}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              disabled={locking}
              onClick={handleLock}
              className="group mt-6 inline-flex w-full min-h-14 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-coral-500 to-coral-700 px-8 py-3.5 font-sans text-[13px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_30px_rgba(214,103,78,0.35)] transition-all hover:shadow-[0_18px_40px_rgba(214,103,78,0.45)] hover:brightness-105 disabled:opacity-40 disabled:hover:brightness-100"
            >
              {locking
                ? "Locking your box…"
                : `Lock it in — Save Rs ${savings.toLocaleString("en-MU")}`}
              {!locking ? (
                <ChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              ) : null}
            </button>

            {lockError?.kind === "out_of_stock" ? (
              <p className="mt-3 font-sans text-[12px] text-coral-500">
                Sorry, one or more of those pieces just sold. Spin again to get
                a fresh box.
              </p>
            ) : null}
            {lockError?.kind === "generic" ? (
              <p className="mt-3 font-sans text-[12px] text-coral-500">
                {lockError.message}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {sizeChartOpen ? (
        <SizeChartModal onClose={() => setSizeChartOpen(false)} />
      ) : null}
    </div>
  );
}

function SizeChartModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Size chart"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[760px] overflow-auto rounded-xl bg-cream-50 p-4 shadow-2xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              Doll Up Boutique
            </p>
            <h3 className="font-display text-[28px] leading-tight text-ink">
              General size chart
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-blush-400 bg-white text-ink-soft transition-colors hover:border-coral-300 hover:text-coral-500"
            aria-label="Close size chart"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-blush-400 bg-white">
          <table className="w-full min-w-[620px] border-collapse font-sans text-[12px] text-ink-soft">
            <thead className="bg-blush-300 text-ink">
              <tr>
                <th className="p-3 text-left">Size</th>
                <th className="p-3 text-left">Bust</th>
                <th className="p-3 text-left">Waist</th>
                <th className="p-3 text-left">Hips</th>
                <th className="p-3 text-left">Guide</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["XS", "78-82 cm", "60-64 cm", "84-88 cm", "Petite fit"],
                ["S", "83-87 cm", "65-69 cm", "89-93 cm", "Usually UK 6-8"],
                ["M", "88-92 cm", "70-74 cm", "94-98 cm", "Usually UK 10"],
                ["L", "93-98 cm", "75-80 cm", "99-104 cm", "Usually UK 12"],
                ["XL", "99-104 cm", "81-86 cm", "105-110 cm", "Usually UK 14"],
                ["2XL", "105-112 cm", "87-94 cm", "111-118 cm", "Usually UK 16"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-blush-100">
                  {row.map((cell) => (
                    <td key={cell} className="p-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-sans text-[12px] leading-relaxed text-ink-muted">
          This is a general guide for the Mystery Box. If you are between sizes,
          choose the larger size for a safer surprise fit.
        </p>
      </div>
    </div>
  );
}

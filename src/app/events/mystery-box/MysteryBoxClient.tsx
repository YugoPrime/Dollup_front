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
            return (
              <button
                key={option}
                type="button"
                disabled={!available}
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
              disabled={spinning || !canSpin}
              onClick={startSpin}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-coral-500 px-8 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(214,103,78,0.28)] transition-colors hover:bg-coral-700 disabled:opacity-40"
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
        <section className="relative rounded-xl border border-blush-400 bg-white p-5 shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:p-6">
          {/* Decorative bow ribbon — top-left corner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-3 -top-4 hidden h-20 w-28 md:block"
          >
            <div className="absolute left-3 top-4 h-6 w-24 -rotate-[18deg] rounded-sm bg-gradient-to-r from-coral-300 to-coral-500 shadow-[0_4px_10px_rgba(214,103,78,0.25)]" />
            <div className="absolute -left-2 top-9 h-7 w-14 -rotate-[36deg] rounded-[50%] bg-gradient-to-br from-coral-300 to-coral-500 shadow-[0_4px_10px_rgba(214,103,78,0.18)]" />
            <div className="absolute left-10 top-3 h-7 w-12 rotate-[4deg] rounded-[50%] bg-gradient-to-bl from-coral-300 to-coral-500 shadow-[0_4px_10px_rgba(214,103,78,0.18)]" />
            <div className="absolute left-6 top-7 h-4 w-6 rounded-sm bg-coral-700/90" />
          </div>

          {/* Decorative hanging tag — right edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-3 top-[58%] hidden md:block"
          >
            <div className="absolute -top-12 left-1/2 h-12 w-px -translate-x-1/2 bg-ink/30" />
            <div className="relative h-[88px] w-[64px] rotate-[6deg]">
              <div className="absolute inset-0 rounded-md bg-cream-50 shadow-[0_8px_16px_rgba(26,18,18,0.12)] ring-1 ring-blush-200 [clip-path:polygon(50%_0,100%_18%,100%_100%,0_100%,0_18%)]" />
              <span className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 rounded-full bg-ink/30" />
              <p className="absolute inset-x-0 top-7 text-center font-sans text-[8px] font-bold uppercase tracking-[0.18em] text-coral-500">
                Open
                <br />
                your box.
              </p>
              <p className="absolute inset-x-0 bottom-3 text-center font-sans text-[7px] italic text-ink-muted">
                Love every
                <br />
                surprise.
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                Your box
              </p>
              <h2 className="font-display text-[28px] leading-tight text-ink md:text-[36px]">
                Rs {box.flat_price_mur.toLocaleString("en-MU")}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-sans text-[12px] text-ink-muted">
                Value Rs {box.total_value_mur.toLocaleString("en-MU")}
              </p>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 font-sans text-[11px] font-semibold text-emerald-700">
                You save Rs {savings.toLocaleString("en-MU")}
              </span>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-5">
            {box.slots.map((slot, index) => {
              const isLastOdd =
                box.slots.length % 2 === 1 &&
                index === box.slots.length - 1;
              return (
                <li
                  key={`${slot.variantId}-${index}`}
                  className={[
                    "overflow-hidden rounded-lg border border-blush-200 bg-white",
                    isLastOdd ? "col-span-2 lg:col-span-1" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div
                    className={[
                      "relative bg-blush-100 lg:h-[260px]",
                      isLastOdd
                        ? "h-[200px] sm:h-[220px]"
                        : "h-[180px] sm:h-[220px]",
                    ].join(" ")}
                  >
                    {slot.thumbnail ? (
                      <Image
                        src={slot.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 180px, (min-width: 640px) 45vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                    <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-coral-500 font-sans text-[10px] font-bold text-white shadow-sm">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="border-t border-blush-200 p-2.5 md:p-3">
                    <p className="line-clamp-2 font-sans text-[12px] font-semibold leading-snug text-ink">
                      {slot.title}
                    </p>
                    <p className="mt-1 font-sans text-[10px] text-ink-muted md:text-[11px]">
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
            className="mt-5 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-coral-500 px-8 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(214,103,78,0.32)] transition-colors hover:bg-coral-700 disabled:opacity-40"
          >
            {locking
              ? "Locking..."
              : `Buy now - save Rs ${savings.toLocaleString("en-MU")}`}
            {!locking ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : null}
          </button>

          {lockError?.kind === "out_of_stock" ? (
            <p className="mt-3 font-sans text-[12px] text-coral-500">
              Sorry, one or more of those pieces just sold. Spin again to get a
              fresh box.
            </p>
          ) : null}
          {lockError?.kind === "generic" ? (
            <p className="mt-3 font-sans text-[12px] text-coral-500">
              {lockError.message}
            </p>
          ) : null}
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

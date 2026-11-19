"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { isAgeVerified, setAgeVerified } from "@/components/product/AgeGateModal";
import { useCustomer } from "@/lib/auth-client";
import { adventPhase, doorCode, shippingDoorFree, todaysDoor } from "@/lib/advent";
import type { DoorGift } from "@/lib/advent";
import { doorGiftEligible, doorGiftLine, doorSavings, giftChoices, ownGiftHasDoor } from "@/lib/advent-cart";
import { getCartSdk } from "@/lib/cart-client";
import { cartTypeOf } from "@/lib/cart-type";
import { formatPrice } from "@/lib/format";
import { isAdventPreview } from "./advent-preview-client";
import { useAdventNow } from "./useAdventNow";

type Stock = { id: string; inventory_quantity?: number | null; manage_inventory?: boolean | null }[];
type Note = "not-free" | "failed" | null;

const ROW = "flex items-start gap-2 text-[12px] leading-snug text-ink";

function ClaimRow({ gift }: { gift: DoorGift }) {
  const { claimDoorGift, loading } = useCart();
  // null = still loading, "error" = the stock call failed.
  const [stock, setStock] = useState<Stock | "error" | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [note, setNote] = useState<Note>(null);
  // Mounts only once the cart has loaded in the browser, so reading the cookie here is hydration-safe.
  const [adult, setAdult] = useState(() => gift.adultOnly && isAgeVerified());

  useEffect(() => {
    let live = true;
    getCartSdk("instock")
      .store.product.list({
        id: [gift.productId],
        fields: "id,variants.id,variants.manage_inventory,+variants.inventory_quantity",
      })
      .then((res) => {
        if (!live) return;
        const product = res.products?.[0];
        setStock((product?.variants ?? []) as Stock);
      })
      .catch(() => {
        if (live) setStock("error");
      });
    // Stock is fetched once per gift, not on every cart change.
    return () => {
      live = false;
    };
  }, [gift.productId]);

  const choices = Array.isArray(stock) ? giftChoices(gift, stock) : [];
  const blocked = loading || claiming || (gift.adultOnly && !adult);

  async function claim(variantId: string) {
    if (blocked) return;
    setClaiming(true);
    setNote(null);
    try {
      if (gift.adultOnly) setAgeVerified();
      const result = await claimDoorGift(variantId);
      setNote(result === "added" ? null : result);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="text-[12px] leading-snug text-ink">
      <div className="flex items-center gap-2">
        {/* The adult-only gift row is text only: no image. */}
        {!gift.adultOnly && gift.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gift.thumbnail} alt="" width={32} height={32} className="h-8 w-8 flex-none rounded-md bg-blush-300 object-cover" />
        ) : null}
        <p className="font-semibold">
          Claim your free {gift.name}
        </p>
      </div>

      {gift.adultOnly && (
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-ink-soft">
          <input
            type="checkbox"
            checked={adult}
            onChange={(e) => setAdult(e.target.checked)}
            className="h-4 w-4 accent-coral-500"
          />
          I&apos;m 18 or older
        </label>
      )}

      {stock === "error" ? (
        <p className="mt-2 text-ink-soft">Couldn&apos;t check stock just now. Please try again in a moment.</p>
      ) : stock !== null && choices.length === 0 ? (
        <p className="mt-2 text-ink-soft">Today&apos;s gift has run out</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={blocked}
              onClick={() => claim(c.id)}
              className="min-h-11 rounded-full border-[1.5px] border-coral-500 bg-white px-4 text-[12px] font-semibold text-ink transition-colors hover:bg-blush-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-2 text-ink-soft empty:hidden">
        {note === "not-free"
          ? "Add another item to claim today's gift"
          : note === "failed"
            ? "That one just ran out, pick another"
            : null}
      </p>
    </div>
  );
}

/**
 * What today's advent door did to this bag: savings, gift (or claim row),
 * double-points nudge, free postage or delivery. Renders nothing outside the
 * calendar, or for pre-order bags.
 */
export function AdventBagLine({ initialNow, compact = false }: { initialNow: number; compact?: boolean }) {
  const now = useAdventNow(initialNow);
  const { cart } = useCart();
  const { status, customer } = useCustomer();

  if (adventPhase(now) !== "running") return null;
  if (!cart || cartTypeOf(cart) !== "instock") return null;
  const door = todaysDoor(now);
  if (!door) return null;

  const currency = cart.currency_code ?? "MUR";
  // While a preview is active the bag matches the owner's ADVENT-TEST-NN promotions.
  const code = doorCode(door.day, isAdventPreview());
  let row: React.ReactNode = null;

  if (door.kind === "category" || door.kind === "happy-hour") {
    const saved = doorSavings(cart, code);
    if (saved > 0) {
      row = (
        <p className={ROW}>
          <span className="font-semibold">
            Door {door.day} applied · {door.label} · −{formatPrice(saved, currency)}
          </span>
        </p>
      );
    }
  } else if (door.kind === "gift" && door.gift) {
    const line = doorGiftLine(cart, door.gift);
    if (line && (line.total ?? 0) === 0) {
      row = (
        <p className={ROW}>
          <span className="font-semibold">
            Door {door.day} gift · Free {door.gift.name} · Free
          </span>
        </p>
      );
    } else if (!line && ownGiftHasDoor(cart, door.gift, code)) {
      // She bought the gift product herself and Medusa put the free unit on her own line.
      row = (
        <p className={ROW}>
          <span className="font-semibold">
            Door {door.day} gift · one {door.gift.name} free
          </span>
        </p>
      );
    } else if (!line && doorGiftEligible(cart, door.gift)) {
      row = <ClaimRow gift={door.gift} />;
    }
  } else if (door.kind === "double-points") {
    if (customer) {
      row = <p className={ROW}>Door {door.day} · you&apos;ll earn double points on this order</p>;
    } else if (status === "ready") {
      row = (
        <p className={ROW}>
          <Link href="/login?redirect=%2Fcheckout" className="font-semibold underline underline-offset-2">
            Sign in to collect double points
          </Link>
        </p>
      );
    }
  } else if (!compact && (shippingDoorFree("Postage", now) || shippingDoorFree("Home Delivery", now))) {
    row = (
      <p className={ROW}>
        Door {door.day} · {door.label} today
      </p>
    );
  }

  if (!row) return null;
  return (
    <div className="mb-3 rounded-xl bg-blush-100 px-3 py-2.5" data-advent-bag-line>
      {row}
    </div>
  );
}

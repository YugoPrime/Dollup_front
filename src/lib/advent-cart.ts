// Pure readers over what Medusa applied to the cart for the advent doors.
// The promotion is the authority: nothing here decides prices, it only reads.
import type { DoorGift } from "./advent"
import { ADVENT_GIFT } from "./cart-gifts"

type Adj = { code?: string | null; amount?: number | null }
export type CartLike = {
  items?: {
    id: string
    product_id?: string | null
    quantity: number
    total?: number | null
    metadata?: Record<string, unknown> | null
    adjustments?: Adj[] | null
  }[] | null
  shipping_methods?: { adjustments?: Adj[] | null }[] | null
} | null

type Line = NonNullable<NonNullable<CartLike>["items"]>[number]

function autoTag(line: Line): string | null {
  const t = line.metadata?.auto_gift
  return typeof t === "string" ? t : null
}

/** Total MUR taken off by one door's promotion code, on items and shipping. */
export function doorSavings(cart: CartLike, code: string): number {
  if (!cart) return 0
  const sum = (adjs?: Adj[] | null) =>
    (adjs ?? []).reduce((n, a) => (a.code === code ? n + (a.amount ?? 0) : n), 0)
  const items = (cart.items ?? []).reduce((n, i) => n + sum(i.adjustments), 0)
  const shipping = (cart.shipping_methods ?? []).reduce((n, m) => n + sum(m.adjustments), 0)
  return items + shipping
}

/** The claimed gift line (our own tag, this door's product), if in the bag. */
export function doorGiftLine(cart: CartLike, gift: DoorGift): Line | undefined {
  return (cart?.items ?? []).find(
    (i) => i.product_id === gift.productId && autoTag(i) === ADVENT_GIFT,
  )
}

/** A gift needs at least one line that is neither the gift product nor an auto gift. */
export function doorGiftEligible(cart: CartLike, gift: DoorGift): boolean {
  return (cart?.items ?? []).some((i) => i.product_id !== gift.productId && !autoTag(i))
}

/** Gift variants still in stock, in lineup order. Unmanaged inventory counts as in stock. */
export function giftChoices(
  gift: DoorGift,
  stock: { id: string; inventory_quantity?: number | null; manage_inventory?: boolean | null }[],
): { id: string; label: string }[] {
  return gift.variants
    .filter((v) => {
      const s = stock.find((x) => x.id === v.id)
      if (!s) return false
      return s.manage_inventory === false || (s.inventory_quantity ?? 0) > 0
    })
    .map((v) => ({ id: v.id, label: v.label }))
}

/** A line we added as a claimed door gift. Its quantity is fixed at 1: qty 2 would no longer be free. */
export function isAdventGiftLine(line: { metadata?: Record<string, unknown> | null }): boolean {
  return line.metadata?.auto_gift === ADVENT_GIFT
}

export type SettleOutcome = "clean" | "removed-advent" | "removed-other" | "unresolved"

/**
 * Result of the pre-payment gift check. `pending` is what needed reverting
 * before, `remaining` what still needs reverting after the revert pass.
 * Only "clean" may go on to payment.
 */
export function settleOutcome(pending: { rule: string }[], remaining: { rule: string }[]): SettleOutcome {
  if (pending.length === 0) return "clean"
  if (remaining.length > 0) return "unresolved"
  return pending.every((p) => p.rule === ADVENT_GIFT) ? "removed-advent" : "removed-other"
}

type Method = {
  shipping_option_id?: string | null
  total?: number | null
  amount?: number | null
  adjustments?: Adj[] | null
}

/**
 * Is this shipping option free? When the cart already holds a method for it,
 * Medusa's figure decides (0 = free); `fallbackFree` (door / threshold flags)
 * only applies before a method is on the cart.
 */
export function shippingFreeFromCart(
  methods: Method[] | null | undefined,
  optionId: string | null | undefined,
  fallbackFree: boolean,
): boolean {
  const m = optionId ? (methods ?? []).find((x) => x.shipping_option_id === optionId) : undefined
  if (!m) return fallbackFree
  if (typeof m.total === "number") return m.total === 0
  if (typeof m.amount === "number") {
    const off = (m.adjustments ?? []).reduce((n, a) => n + (a.amount ?? 0), 0)
    return m.amount - off <= 0
  }
  return fallbackFree
}

/**
 * The grand total checkout shows. Once the cart holds a shipping method,
 * Medusa's `total` decides. Before that it is items plus the fallback
 * shipping. `item_total` is already after discounts, so `discount_total`
 * must not be taken off again.
 */
export function checkoutTotal(
  cart: {
    total?: number | null
    item_total?: number | null
    subtotal?: number | null
    shipping_methods?: readonly unknown[] | null
  },
  fallbackShipping: number,
): number {
  if ((cart.shipping_methods?.length ?? 0) > 0) return cart.total ?? 0
  return Math.max(0, (cart.item_total ?? cart.subtotal ?? 0) + fallbackShipping)
}

export type ShownTotals = { items: number; shipping: number }

/**
 * Did the bag get dearer between what she was shown and what Medusa now says?
 * Items are `item_total` (after item discounts), shipping is `shipping_total`.
 * Missing figures on the settled cart never block the order.
 */
export function totalWentUp(
  shown: ShownTotals,
  settled: { item_total?: number | null; shipping_total?: number | null } | null | undefined,
): boolean {
  if (!settled) return false
  const items = typeof settled.item_total === "number" && settled.item_total > shown.items
  const shipping = typeof settled.shipping_total === "number" && settled.shipping_total > shown.shipping
  return items || shipping
}

/**
 * She bought the gift product herself and Medusa put today's door on her own
 * (untagged) line, so that unit is already free and needs no claim.
 */
export function ownGiftHasDoor(cart: CartLike, gift: DoorGift, code: string): boolean {
  return (cart?.items ?? []).some(
    (i) =>
      i.product_id === gift.productId &&
      !autoTag(i) &&
      (i.adjustments ?? []).some((a) => a.code === code && (a.amount ?? 0) > 0),
  )
}

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

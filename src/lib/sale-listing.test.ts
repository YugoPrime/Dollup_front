// Covers the /sale grid helpers: % tiers from calculated/original amounts,
// the category chips and the default order. Same plain-script style as
// checkout-free-postage.test.ts — run with `npx tsx src/lib/sale-listing.test.ts`.
import { discountPercent, formatDiscountPercent } from "./format"
import {
  distinctTiers,
  orderSaleProducts,
  parseTierParam,
  productSalePercent,
  saleCategoryChips,
  type SaleCategory,
} from "./sale-listing"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// --- tiers from calculated/original amounts ---

// Real October prices. Sale prices are rounded down to a multiple of Rs 5, so
// plain Math.round gives 51% / 31% on the cheaper items; the tier must still
// read 50 / 30 / 15, the tiers the owner set.
const OCTOBER: [original: number, calculated: number, tier: number][] = [
  [1200, 600, 50],  // is2138
  [975, 485, 50],   // is2237: 487.50 rounds down to 485, 50.3%
  [550, 275, 50],   // is1361
  [425, 210, 50],   // is710: 50.6%, Math.round says 51
  [275, 135, 50],   // is1363: 50.9%, Math.round says 51
  [390, 270, 30],   // is1515: 30.8%, Math.round says 31
  [325, 225, 30],   // is1362: 30.8%, Math.round says 31
  [225, 155, 30],   // is1620: 31.1%, Math.round says 31
  [1100, 770, 30],
  [850, 720, 15],   // is1598
  [1100, 935, 15],  // is2044
  [600, 510, 15],   // is1011
  [990, 840, 15],   // is1865
  [790, 670, 15],   // is131
]
for (const [orig, calc, tier] of OCTOBER) {
  check(`tier ${orig} → ${calc}`, discountPercent(calc, orig), tier)
}
check("badge text", formatDiscountPercent(210, 425), "-50%")
check("not on sale", [discountPercent(500, 500), discountPercent(600, 500)], [null, null])
check("missing amounts", [discountPercent(null, 500), discountPercent(400, undefined)], [null, null])
check("zero original", discountPercent(0, 0), null)
check("tiny discount still shows", discountPercent(1990, 2000), 1)
check("under the step keeps the whole %", discountPercent(970, 1000), 3)

type V = {
  manage_inventory?: boolean
  inventory_quantity?: number
  calculated_price: { calculated_amount: number; original_amount: number; currency_code: string }
}
const v = (orig: number, calc: number, qty = 3): V => ({
  manage_inventory: true,
  inventory_quantity: qty,
  calculated_price: { calculated_amount: calc, original_amount: orig, currency_code: "mur" },
})
type P = {
  id: string
  created_at: string
  categories: { id: string }[]
  variants: V[]
}
const product = (id: string, created: string, cats: string[], variants: V[]): P => ({
  id,
  created_at: created,
  categories: cats.map((c) => ({ id: c })),
  variants,
})

// The tier follows the price the card shows: the cheapest in-stock variant.
check(
  "card price drives the tier",
  productSalePercent(product("a", "2026-01-01", [], [v(1300, 650), v(700, 595)])),
  15,
)
check(
  "sold-out variants are ignored",
  productSalePercent(product("b", "2026-01-01", [], [v(900, 450, 0), v(1200, 840)])),
  30,
)
check(
  "falls back to a reduced variant when the cheapest is full price",
  productSalePercent(product("c", "2026-01-01", [], [v(500, 500), v(1200, 600)])),
  50,
)
check("full price", productSalePercent(product("d", "2026-01-01", [], [v(500, 500)])), null)

check("distinct tiers, deepest first", distinctTiers([30, 50, 15, 50, null, 30]), [50, 30, 15])
check("no tiers", distinctTiers([]), [])
check("?off= valid", parseTierParam("50", [50, 30, 15]), 50)
check("?off= not a tier", parseTierParam("40", [50, 30, 15]), null)
check("?off= junk", [parseTierParam("abc", [50]), parseTierParam(undefined, [50]), parseTierParam("", [50])], [null, null, null])

// --- category chips ---

const CATS: SaleCategory[] = [
  { id: "women", handle: "women", name: "Women", parent_category_id: null },
  { id: "beach", handle: "beachwear", name: "Beachwear", parent_category_id: "women" },
  { id: "bikini", handle: "bikini-sets", name: "Bikini Sets", parent_category_id: "beach" },
  { id: "clothing", handle: "clothing", name: "Clothing", parent_category_id: "women" },
  { id: "dresses", handle: "dresses", name: "Dresses", parent_category_id: "clothing" },
  { id: "winter", handle: "winter", name: "Winter", parent_category_id: "clothing" },
  { id: "hoodies", handle: "hoodies", name: "Hoodies", parent_category_id: "winter" },
  { id: "plus", handle: "plus-size", name: "Plus Size", parent_category_id: "clothing" },
  { id: "dark", handle: "intimates", name: "After Dark", parent_category_id: "women" },
]
const CHIP_HANDLES = ["dresses", "winter", "beachwear", "intimates"]
const p1 = product("p1", "2026-09-01", ["dresses"], [v(1200, 600)])
const p2 = product("p2", "2026-10-10", ["bikini"], [v(850, 720)])
const p3 = product("p3", "2026-08-01", ["dresses", "plus"], [v(1100, 770)])
const p4 = product("p4", "2026-10-12", ["hoodies"], [v(1000, 500)])
const p5 = product("p5", "2026-10-15", ["plus"], [v(1000, 500)])
const p6 = product("p6", "2026-10-16", ["dark"], [v(1000, 500)])
const p7 = product("p7", "2026-07-01", ["bikini", "beach"], [v(700, 595)])

check(
  "chips roll up to menu level, biggest first",
  saleCategoryChips([p1, p2, p3, p4, p5, p6, p7], CATS, CHIP_HANDLES),
  [
    { handle: "beachwear", name: "Beachwear", count: 2 }, // p7 counted once
    { handle: "dresses", name: "Dresses", count: 2 },
    { handle: "intimates", name: "After Dark", count: 1 },
    { handle: "winter", name: "Winter", count: 1 },
  ],
)
check("no chips without products", saleCategoryChips([], CATS, CHIP_HANDLES), [])

// --- default order ---

const all = [p1, p2, p3, p4, p5, p6, p7]
const percents = new Map(all.map((p) => [p.id, productSalePercent(p) ?? 0]))
// Tiers: p1/p4/p5/p6 = 50, p3 = 30, p2/p7 = 15.
check(
  "deepest first, then newest, After Dark last within its tier",
  orderSaleProducts(all, percents, ["dark"]).map((p) => p.id),
  ["p5", "p4", "p1", "p6", "p3", "p2", "p7"],
)
check(
  "no After Dark rule when a category is picked",
  orderSaleProducts(all, percents, []).map((p) => p.id),
  ["p6", "p5", "p4", "p1", "p3", "p2", "p7"],
)
check("input left untouched", all.map((p) => p.id), ["p1", "p2", "p3", "p4", "p5", "p6", "p7"])

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

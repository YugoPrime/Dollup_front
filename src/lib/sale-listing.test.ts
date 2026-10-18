// Covers the /sale grid helpers: % tiers from calculated/original amounts,
// the category chips and the default order. Same plain-script style as
// checkout-free-postage.test.ts — run with `npx tsx src/lib/sale-listing.test.ts`.
import { discountPercent, formatDiscountPercent } from "./format"
import { SALE_CAMPAIGN } from "./sale-campaign"
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

// Same shape as the real tree: Bodysuits sits under Tops, Pajamas under
// Lingerie, Sports Leggings under Bottoms, Belts under Accessories.
const TREE: [handle: string, parent: string | null][] = [
  ["women", null],
  ["beachwear", "women"], ["bikini-sets", "beachwear"], ["one-pieces", "beachwear"], ["cover-ups", "beachwear"],
  ["clothing", "women"], ["dresses", "clothing"], ["two-piece-outfits", "clothing"], ["jumpsuits", "clothing"],
  ["plus-size", "clothing"], ["winter", "clothing"], ["hoodies", "winter"], ["sweaters-&-cardigans", "winter"],
  ["tops", "clothing"], ["bodysuits", "tops"], ["tank-tops-&-camis", "tops"],
  ["bottoms", "clothing"], ["skirts", "bottoms"], ["pants", "bottoms"], ["sports-leggings", "bottoms"],
  ["lingerie", "clothing"], ["pajamas", "lingerie"],
  ["accessories", "women"], ["essentials", "accessories"], ["jewelry", "accessories"], ["belts", "accessories"],
  ["intimates", "women"],
]
const ORDER_CATS: SaleCategory[] = TREE.map(([handle, parent]) => ({
  id: `pcat_${handle}`,
  handle,
  name: handle,
  parent_category_id: parent ? `pcat_${parent}` : null,
}))
// Snapshot shape: each product carries its own category's id and handle.
const item = (handle: string, category: string, tier: number, created = "2026-05-01") => ({
  id: handle,
  handle,
  created_at: created,
  categories: [{ id: `pcat_${category}`, handle: category }],
  variants: [v(1000, 1000 - tier * 10)],
})
const CATALOG = [
  // Not pinned, 50%.
  item("st7", "dresses", 50, "2026-05-01"),
  item("is1016", "dresses", 50),
  item("tr6", "skirts", 50),
  item("is900", "intimates", 50),
  item("is1361", "essentials", 50),
  item("ss700", "essentials", 50),
  item("is20", "plus-size", 50),
  item("nr1", "plus-size", 50),
  item("is710", "lingerie", 50),
  item("is722", "pajamas", 50),
  item("is1192", "bodysuits", 50),
  item("is1500", "belts", 50),
  item("is1760", "jewelry", 50),
  item("is1458", "sports-leggings", 50),
  item("is1774", "hoodies", 50),
  item("is2201", "sweaters-&-cardigans", 50),
  item("is2041", "bikini-sets", 50),
  item("is1621", "two-piece-outfits", 50),
  item("st508", "dresses", 50, "2026-05-03"),
  item("is2237", "dresses", 50),
  // Not pinned, 30% and 15%.
  item("is1515", "lingerie", 30),
  item("cb10023", "bikini-sets", 30),
  item("is2259", "dresses", 30),
  item("is2380", "lingerie", 15),
  item("is2341", "dresses", 15),
  // The carousel-ad handles, shuffled and across tiers.
  item("is2446", "bikini-sets", 15),
  item("is2364", "dresses", 30),
  item("is2138", "dresses", 50),
  item("is1906", "bikini-sets", 30),
  item("is2297", "two-piece-outfits", 30),
  item("is2358", "jumpsuits", 50),
  item("is2296", "dresses", 50),
  item("is2281", "dresses", 30),
  item("is2265", "dresses", 50),
  item("is2344", "dresses", 50),
]
const catalogPercents = new Map(CATALOG.map((p) => [p.id, productSalePercent(p) ?? 0]))
const ordered = orderSaleProducts(CATALOG, catalogPercents, ORDER_CATS, SALE_CAMPAIGN)
const ids = (list: { id: string }[]) => list.map((p) => p.id)

check("pinned config", SALE_CAMPAIGN.featuredHandles, [
  "is2138", "is2296", "is2344", "is2358", "is2265", "is2281", "is2297", "is2364", "is1906", "is2446",
])
check("fixture tiers", [catalogPercents.get("is2446"), catalogPercents.get("is2281"), catalogPercents.get("st7")], [15, 30, 50])
check("All: pinned first in config order, whatever their tier", ids(ordered.slice(0, 10)), [...SALE_CAMPAIGN.featuredHandles])
check("All: then deepest tier, category rank, IS number desc, non-IS last", ids(ordered.slice(10)), [
  // 50%: dresses (IS desc, then non-IS by newest created_at), two-piece,
  // swim, knits, tops/bottoms (Sports Leggings via Bottoms), accessories
  // (Belts via Accessories), lingerie/bodysuits (Bodysuits by its own
  // category, Pajamas via Lingerie), essentials, then unlisted (After Dark,
  // Plus Size).
  "is2237", "is1016", "st508", "st7",
  "is1621",
  "is2041",
  "is2201", "is1774",
  "is1458", "tr6",
  "is1760", "is1500",
  "is1192", "is722", "is710",
  "is1361", "ss700",
  "is900", "is20", "nr1",
  // 30%, then 15%.
  "is2259", "cb10023", "is1515",
  "is2341", "is2380",
])

// Chips filter the ordered list: rules 2–4 hold inside the subset and pinned
// products lead it when they match.
check(
  "30% chip",
  ids(ordered.filter((p) => catalogPercents.get(p.id) === 30)),
  ["is2281", "is2297", "is2364", "is1906", "is2259", "cb10023", "is1515"],
)
const swim = new Set(["pcat_beachwear", "pcat_bikini-sets", "pcat_one-pieces", "pcat_cover-ups"])
check(
  "Beachwear chip",
  ids(ordered.filter((p) => p.categories.some((c) => swim.has(c.id)))),
  ["is1906", "is2446", "is2041", "cb10023"],
)

check(
  "missing pinned handles are skipped",
  ids(orderSaleProducts([item("is1016", "dresses", 50), item("is2446", "bikini-sets", 15)], catalogPercents, ORDER_CATS, SALE_CAMPAIGN)),
  ["is2446", "is1016"],
)
check(
  "without the category tree, a product's own handle still ranks",
  ids(orderSaleProducts(
    [item("is5", "essentials", 50), item("is4", "pajamas", 50), item("is3", "dresses", 50)],
    catalogPercents,
    [],
    { featuredHandles: [], categoryOrder: SALE_CAMPAIGN.categoryOrder },
  )),
  ["is3", "is5", "is4"], // pajamas can't reach Lingerie without the tree: unlisted
)
check("input left untouched", ids(CATALOG.slice(0, 3)), ["st7", "is1016", "tr6"])

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

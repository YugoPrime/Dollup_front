// The body glue page's pure rules. Plain script: `npx tsx src/lib/glue-page.test.ts`.
import { HOLDS, PAIRS, decemberPriceLabel, featuredCards, isBuyable, isGluePage } from "./glue-page"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// Which product gets the page.
check("glue handle", isGluePage({ handle: "is2382" }), true)
check("glue handle, upper case", isGluePage({ handle: "IS2382" }), true)
check("a dress", isGluePage({ handle: "is2466" }), false)
check("no handle / no product", [isGluePage({}), isGluePage({ handle: null }), isGluePage(null)], [false, false, false])

// Featured cards: config order, and only products a shopper can buy and see.
const inStock = { thumbnail: "https://cdn/x.jpg", variants: [{ manage_inventory: true, inventory_quantity: 3 }] }
const soldOut = { thumbnail: "https://cdn/x.jpg", variants: [{ manage_inventory: true, inventory_quantity: 0 }] }
const untracked = { thumbnail: "https://cdn/x.jpg", variants: [{ manage_inventory: false, inventory_quantity: 0 }] }
const noPhoto = { thumbnail: null, variants: [{ manage_inventory: true, inventory_quantity: 3 }] }
const oneSizeLeft = { thumbnail: "https://cdn/x.jpg", variants: [
  { manage_inventory: true, inventory_quantity: 0 }, { manage_inventory: true, inventory_quantity: 1 }] }
const items = [{ handle: "a" }, { handle: "b" }, { handle: "c" }, { handle: "d" }, { handle: "e" }, { handle: "f" }]
const cards = featuredCards(items, { f: oneSizeLeft, e: untracked, d: noPhoto, c: soldOut, b: null, a: inStock })
check("keeps config order, drops missing / sold out / no photo", cards.map((c) => c.handle), ["a", "e", "f"])
check("carries the product", cards[0].product === inStock, true)
check("nothing to show", featuredCards(items, {}), [])
check("buyable", [isBuyable(inStock), isBuyable(soldOut), isBuyable(untracked), isBuyable({ variants: [] }), isBuyable({})],
  [true, false, true, false, false])

// The config itself.
check("four dresses, two pairs", [HOLDS.length, PAIRS.length], [4, 2])
check("handles are lower case and unique", new Set([...HOLDS, ...PAIRS].map((h) => h.handle)).size, 6)
check("no handle is the glue itself", [...HOLDS, ...PAIRS].some((h) => isGluePage(h)), false)

// "December price": only on a reduced price, only in December 2026, Mauritius time (UTC+4).
const at = (iso: string) => Date.parse(iso)
check("first second of December", decemberPriceLabel(at("2026-12-01T00:00:00+04:00"), true), "December price")
check("last second of December", decemberPriceLabel(at("2026-12-31T23:59:59+04:00"), true), "December price")
check("last second of November", decemberPriceLabel(at("2026-11-30T23:59:59+04:00"), true), null)
check("first second of January", decemberPriceLabel(at("2027-01-01T00:00:00+04:00"), true), null)
check("UTC evening of 30 Nov is already December in MU", decemberPriceLabel(at("2026-11-30T20:00:00Z"), true), "December price")
check("December at full price", decemberPriceLabel(at("2026-12-15T12:00:00+04:00"), false), null)

if (ok) console.log("ALL PASS")
else process.exit(1)

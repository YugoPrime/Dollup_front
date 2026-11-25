// Covers what may go in a Mystery Box, when the box is off, and that a box
// is never worth less than MYSTERY_BOX_MIN_VALUE_MUR. Plain script, same
// style as sale-campaign.test.ts: `npx tsx src/lib/mystery-box.test.ts`.
//
// Dates are written in UTC on purpose: the sale window is Mauritius time.
import {
  MYSTERY_BOX_FLAT_PRICE_MUR,
  MYSTERY_BOX_MIN_VALUE_MUR,
  canFillBox,
  isMysteryBoxPaused,
  isMysteryBoxProduct,
  isSalePriced,
  mysteryBoxReopensLabel,
  selectRandomBox,
  sumBoxValue,
  type MysteryBoxSlot,
} from "./mystery-box"

let failed = 0
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`)
  else {
    failed++
    console.log(`  FAIL ${name} ${detail}`)
  }
}

// --- eligibility ---------------------------------------------------------
const dress = { discountable: true, metadata: {}, tags: [{ value: "stock" }], categories: [{ handle: "dresses" }] }
check("plain dress is eligible", isMysteryBoxProduct(dress))
check("lingerie is eligible (unchanged)", isMysteryBoxProduct({ ...dress, categories: [{ handle: "lingerie" }] }))
check("Ali30 (collection30 tag) is out", !isMysteryBoxProduct({ ...dress, tags: [{ value: "stock" }, { value: "collection30" }] }))
check("tag match ignores case and spaces", !isMysteryBoxProduct({ ...dress, tags: [{ value: " Collection30 " }] }))
check("collection28 is still in", isMysteryBoxProduct({ ...dress, tags: [{ value: "collection28" }] }))
check("toys are out", !isMysteryBoxProduct({ ...dress, categories: [{ handle: "toys" }] }))
check("intimates (After Dark) are out", !isMysteryBoxProduct({ ...dress, categories: [{ handle: "dresses" }, { handle: "intimates" }] }))
check("unlisted is out", !isMysteryBoxProduct({ ...dress, metadata: { unlisted: true } }))
check("non-discountable is out", !isMysteryBoxProduct({ ...dress, discountable: false }))
check("missing tags/categories is fine", isMysteryBoxProduct({ discountable: true }))

check("sale price is detected", isSalePriced({ calculated_amount: 550, original_amount: 1100 }))
check("full price is not a sale", !isSalePriced({ calculated_amount: 1100, original_amount: 1100 }))
check("no original_amount is not a sale", !isSalePriced({ calculated_amount: 1100 }))
check("no price is not a sale", !isSalePriced(null))

// --- paused while the sale runs (SALE_CAMPAIGN: 23 Nov 00:00 → 29 Nov 23:59:59 MU)
check("open before the sale", !isMysteryBoxPaused(new Date("2026-11-22T19:59:59Z")))
check("paused when the sale opens", isMysteryBoxPaused(new Date("2026-11-22T20:00:00Z")))
check("paused mid-week", isMysteryBoxPaused(new Date("2026-11-25T08:00:00Z")))
check("paused on the last second", isMysteryBoxPaused(new Date("2026-11-29T19:59:59Z")))
check("open again Monday 00:00 MU", !isMysteryBoxPaused(new Date("2026-11-29T20:00:00Z")))
check("reopens label", mysteryBoxReopensLabel() === "Monday 30 November", mysteryBoxReopensLabel())

// --- box value -------------------------------------------------------------
check("min value is above the flat price", MYSTERY_BOX_MIN_VALUE_MUR > MYSTERY_BOX_FLAT_PRICE_MUR)

function slot(productId: string, price: number, variant = "a"): MysteryBoxSlot {
  return {
    productId,
    variantId: `${productId}-${variant}`,
    sku: productId,
    title: productId,
    size: "M",
    thumbnail: null,
    price_mur: price,
    available_quantity: 1,
  }
}

// A seeded random, so the fallback path below runs the same way every time.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const cheap = Array.from({ length: 5 }, (_, i) => slot(`c${i}`, 500))
check("5 cheap pieces can't fill a box", !canFillBox(cheap))
check("4 dear pieces can't fill a box", !canFillBox(Array.from({ length: 4 }, (_, i) => slot(`d${i}`, 2000))))
check(
  "one product's 5 variants count once",
  !canFillBox(Array.from({ length: 5 }, (_, i) => slot("same", 2000, String(i)))),
)
check(
  "sold-out variants don't count",
  !canFillBox([...Array.from({ length: 4 }, (_, i) => slot(`d${i}`, 2000)), { ...slot("gone", 2000), available_quantity: 0 }]),
)
check("5 pieces at Rs 800 fill a box", canFillBox(Array.from({ length: 5 }, (_, i) => slot(`p${i}`, 800))))

let threw = false
try {
  selectRandomBox(cheap)
} catch {
  threw = true
}
check("selectRandomBox refuses a pool that can't reach the minimum", threw)

// Normal pool: random picks, all must reach the minimum with distinct products.
const normal = [
  ...Array.from({ length: 40 }, (_, i) => slot(`n${i}`, 700 + (i % 8) * 100)),
  ...Array.from({ length: 10 }, (_, i) => slot(`n${i}`, 1200, "b")),
]
let normalOk = true
for (let i = 0; i < 500; i++) {
  const box = selectRandomBox(normal)
  const distinct = new Set(box.map((s) => s.productId)).size === 5
  if (box.length !== 5 || !distinct || sumBoxValue(box) < MYSTERY_BOX_MIN_VALUE_MUR) {
    normalOk = false
    console.log("   bad box", box.map((s) => `${s.productId}:${s.price_mur}`).join(" "))
    break
  }
}
check("500 random boxes all reach the minimum, 5 distinct products", normalOk)

// Thin pool: 50 cheap pieces + 5 dear ones. Random picks almost never reach
// Rs 4,000, so the fallback has to swap dear pieces in.
const thin = [
  ...Array.from({ length: 50 }, (_, i) => slot(`t${i}`, 500)),
  ...Array.from({ length: 5 }, (_, i) => slot(`x${i}`, 900)),
]
check("thin pool can still fill", canFillBox(thin))
let thinOk = true
for (let seed = 1; seed <= 200; seed++) {
  const box = selectRandomBox(thin, 5, MYSTERY_BOX_MIN_VALUE_MUR, seeded(seed))
  if (new Set(box.map((s) => s.productId)).size !== 5 || sumBoxValue(box) < MYSTERY_BOX_MIN_VALUE_MUR) {
    thinOk = false
    console.log("   bad thin box", seed, box.map((s) => `${s.productId}:${s.price_mur}`).join(" "))
    break
  }
}
check("thin pool: 200 seeded boxes all reach the minimum", thinOk)

if (failed > 0) {
  console.log(`\n${failed} FAILED`)
  process.exit(1)
}
console.log("\nALL PASS")

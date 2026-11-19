// Pure cart readers for the advent doors. Plain script: `npx tsx src/lib/advent-cart.test.ts`.
import { doorOfDay } from "./advent"
import { doorGiftEligible, doorGiftLine, doorSavings, giftChoices, isAdventGiftLine, ownGiftHasDoor, settleOutcome, shippingFreeFromCart, totalWentUp } from "./advent-cart"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

const tape = doorOfDay(1).gift!, cuffs = doorOfDay(12).gift!
const cart = { items: [
  { id: "l1", product_id: "prod_bikini", quantity: 2, total: 1800, adjustments: [{ code: "ADVENT-06", amount: 200 }] },
  { id: "l2", product_id: "prod_dress", quantity: 1, total: 1025, adjustments: [] } ],
  shipping_methods: [{ adjustments: [{ code: "FREE", amount: 150 }] }] }
check("item savings", doorSavings(cart, "ADVENT-06"), 200)
check("other code", doorSavings(cart, "ADVENT-07"), 0)
check("shipping savings", doorSavings({ items: [], shipping_methods: [{ adjustments: [{ code: "ADVENT-08", amount: 150 }] }] }, "ADVENT-08"), 150)
check("null cart", doorSavings(null, "ADVENT-06"), 0)
const giftOnly = { items: [{ id: "g", product_id: tape.productId, quantity: 1, total: 0, metadata: { auto_gift: "advent-gift" } }] }
check("eligible with paid item", doorGiftEligible(cart, tape), true)
check("not eligible empty / gift only", [doorGiftEligible({ items: [] }, tape), doorGiftEligible(giftOnly, tape)], [false, false])
check("gift line", doorGiftLine(giftOnly, tape)?.id, "g")
check("choices in stock, lineup order", giftChoices(cuffs, [
  { id: "variant_01KQPN97642XQH1X9SSF5T3GEN", inventory_quantity: 0, manage_inventory: true },
  { id: "variant_01M5F22MHPMVVE7PX1Q00PC349", inventory_quantity: 4, manage_inventory: true },
  { id: "variant_01M5F22XWCZ1KS7D0CXTWSYH03", inventory_quantity: 4, manage_inventory: true } ]).map((c) => c.label), ["Black", "Purple"])
check("none left", giftChoices(cuffs, cuffs.variants.map((v) => ({ id: v.id, inventory_quantity: 0, manage_inventory: true }))), [])
check("unmanaged counts as stock", giftChoices(tape, [{ id: tape.variants[0].id, inventory_quantity: 0, manage_inventory: false }]).length, 1)

check("gift line tag", [isAdventGiftLine({ metadata: { auto_gift: "advent-gift" } }), isAdventGiftLine({ metadata: { auto_gift: "gwp-cuff" } }), isAdventGiftLine({})], [true, false, false])

check("settle clean", settleOutcome([], []), "clean")
check("settle advent removed", settleOutcome([{ rule: "advent-gift" }], []), "removed-advent")
check("settle other removed", settleOutcome([{ rule: "advent-gift" }, { rule: "gwp-cuff" }], []), "removed-other")
check("settle unresolved", settleOutcome([{ rule: "advent-gift" }], [{ rule: "advent-gift" }]), "unresolved")
check("ship: method total 0 is free", shippingFreeFromCart([{ shipping_option_id: "o1", total: 0 }], "o1", false), true)
check("ship: method charged beats flag", shippingFreeFromCart([{ shipping_option_id: "o1", total: 150 }], "o1", true), false)
check("ship: amount less adjustments", shippingFreeFromCart([{ shipping_option_id: "o1", amount: 150, adjustments: [{ code: "X", amount: 150 }] }], "o1", false), true)
check("ship: no method uses flag", [shippingFreeFromCart([{ shipping_option_id: "o2", total: 0 }], "o1", true), shippingFreeFromCart([], "o1", false)], [true, false])

check("up: items dearer", totalWentUp({ items: 1000, shipping: 0 }, { item_total: 1200, shipping_total: 0 }), true)
check("up: shipping dearer", totalWentUp({ items: 1000, shipping: 0 }, { item_total: 1000, shipping_total: 150 }), true)
check("up: equal or lower", [totalWentUp({ items: 1000, shipping: 150 }, { item_total: 1000, shipping_total: 150 }), totalWentUp({ items: 1000, shipping: 150 }, { item_total: 900, shipping_total: 0 })], [false, false])
check("up: missing fields / null never block", [totalWentUp({ items: 1000, shipping: 0 }, {}), totalWentUp({ items: 1000, shipping: 0 }, null)], [false, false])
const own = { items: [{ id: "p", product_id: tape.productId, quantity: 1, total: 0, adjustments: [{ code: "ADVENT-01", amount: 150 }] }, { id: "d", product_id: "prod_dress", quantity: 1, adjustments: [] }] }
check("own gift: door on her untagged line", ownGiftHasDoor(own, tape, "ADVENT-01"), true)
check("own gift: other code / no adj", [ownGiftHasDoor(own, tape, "ADVENT-TEST-01"), ownGiftHasDoor({ items: [{ id: "p", product_id: tape.productId, quantity: 1, adjustments: [] }] }, tape, "ADVENT-01")], [false, false])
check("own gift: tagged claim line does not count", ownGiftHasDoor({ items: [{ id: "g", product_id: tape.productId, quantity: 1, metadata: { auto_gift: "advent-gift" }, adjustments: [{ code: "ADVENT-01", amount: 150 }] }] }, tape, "ADVENT-01"), false)
check("own gift: zero-amount adjustment does not count", ownGiftHasDoor({ items: [{ id: "p", product_id: tape.productId, quantity: 1, adjustments: [{ code: "ADVENT-01", amount: 0 }] }] }, tape, "ADVENT-01"), false)

if (ok) console.log("ALL PASS")
else process.exit(1)

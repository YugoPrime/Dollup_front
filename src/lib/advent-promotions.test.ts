// Covers the advent promotion payload builder in advent-promotions.ts.
// Plain script, run with `npx tsx src/lib/advent-promotions.test.ts`.
import { ADVENT, doorOfDay } from "./advent"
import { buildDoorPromotion, existingTestCopies, type DoorPromotion, type PromotionRule } from "./advent-promotions"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

const ids = { categoryIdByHandle: { dresses: "pcat_D", beachwear: "pcat_B", "bikini-sets": "pcat_BS", "cover-ups": "pcat_CU", "one-pieces": "pcat_OP", lingerie: "pcat_L", pajamas: "pcat_P", "two-piece-outfits": "pcat_T", jumpsuits: "pcat_J" } }
const am = (p: DoorPromotion | null) => p!.promotion.application_method as Record<string, unknown>
check("door 7 has no promotion", buildDoorPromotion(doorOfDay(7), ids), null)
check("21 promotions", ADVENT.doors.map((d) => buildDoorPromotion(d, ids)).filter(Boolean).length, 21)
const p6 = buildDoorPromotion(doorOfDay(6), ids)
check("door 6 campaign", p6!.campaign, { name: "Advent 2026 · Door 06", campaign_identifier: "advent-2026-door-06", starts_at: "2026-12-06T00:00:00+04:00", ends_at: "2026-12-06T23:59:59+04:00" })
check("door 6 code + rules", [p6!.promotion.code, p6!.promotion.rules], ["ADVENT-06", [{ attribute: "metadata.cart_type", operator: "eq", values: ["instock"] }]])
check("door 6 fixed each mur", [am(p6).type, am(p6).allocation, am(p6).value, am(p6).currency_code], ["fixed", "each", 100, "mur"])
check("door 6 targets children", (am(p6).target_rules as PromotionRule[])[0].values, ["pcat_B", "pcat_BS", "pcat_CU", "pcat_OP"])
const p11 = buildDoorPromotion(doorOfDay(11), ids)
check("hh window", [p11!.campaign.starts_at, p11!.campaign.ends_at], ["2026-12-11T20:00:00+04:00", "2026-12-11T21:59:59+04:00"])
check("hh 20% no targets", [am(p11).type, am(p11).value, am(p11).target_rules], ["percentage", 20, undefined])
check("delivery target", (am(buildDoorPromotion(doorOfDay(8), ids)).target_rules as PromotionRule[])[0].values, ["sotype_01KN7026VCRHTDZC73438FDJHQ"])
check("postage target", (am(buildDoorPromotion(doorOfDay(2), ids)).target_rules as PromotionRule[])[0].values, ["sotype_01KN7026VC6CYW8PEDG18X6TA9"])
const p12 = buildDoorPromotion(doorOfDay(12), ids)
check("gift buyget", [p12!.promotion.type, am(p12).buy_rules], ["buyget", [{ attribute: "items.product_id", operator: "ne", values: ["prod_01KQPN975A65QJVMVFX47DEXBQ"] }]])
const t6 = buildDoorPromotion(doorOfDay(6), ids, { testerGroupId: "cusgroup_T", startsAt: "2026-11-28T10:00:00+04:00", endsAt: "2026-11-28T11:30:00+04:00" })
check("test copy", [t6!.promotion.code, t6!.campaign.campaign_identifier, t6!.campaign.starts_at, t6!.promotion.rules.length], ["ADVENT-TEST-06", "advent-2026-test-door-06", "2026-11-28T10:00:00+04:00", 2])
let threw = false; try { buildDoorPromotion(doorOfDay(6), { categoryIdByHandle: {} }) } catch { threw = true }
check("unknown handle throws", threw, true)
// extras: exclusions, test naming, gift shape, shipping shape
const excl = buildDoorPromotion({ ...doorOfDay(5), excludeProductIds: ["prod_X"] }, ids)
check("exclusion rule", (am(excl).target_rules as PromotionRule[])[1], { attribute: "items.product_id", operator: "ne", values: ["prod_X"] })
check("no exclusion by default", (am(p6).target_rules as PromotionRule[]).length, 1)
const cheapLingerie = { attribute: "items.product_id", operator: "ne", values: ["prod_01KQPN2WDNABFQCAB38CGJCDNB", "prod_01KQPN2XHGX93C7TW51BV9673B"] }
check("lingerie doors 3 + 20 leave out is1619/is1620", [3, 20].map((d) => (am(buildDoorPromotion(doorOfDay(d), ids)).target_rules as PromotionRule[])[1]), [cheapLingerie, cheapLingerie])
check("lingerie doors still target lingerie + pajamas", (am(buildDoorPromotion(doorOfDay(3), ids)).target_rules as PromotionRule[])[0].values, ["pcat_L", "pcat_P"])
check("test campaign name", t6!.campaign.name, "Advent 2026 TEST · Door 06")
check("test group rule", t6!.promotion.rules[1], { attribute: "customer.groups.id", operator: "in", values: ["cusgroup_T"] })
check("gift shape", [am(p12).value, am(p12).max_quantity, am(p12).apply_to_quantity, am(p12).buy_rules_min_quantity, am(p12).target_rules], [100, 1, 1, 1, [{ attribute: "items.product_id", operator: "in", values: ["prod_01KQPN975A65QJVMVFX47DEXBQ"] }]])
check("postage shape", [am(buildDoorPromotion(doorOfDay(2), ids)).target_type, am(buildDoorPromotion(doorOfDay(2), ids)).value], ["shipping_methods", 100])
check("fixed max_quantity", am(p6).max_quantity, 99)

check("test copies: none", existingTestCopies(["ADVENT-06", null], ["advent-2026-door-06"]), [])
check("test copies: promo + campaign found", existingTestCopies(["ADVENT-TEST-06", "ADVENT-01"], ["advent-2026-test-door-06", "advent-2026-door-01"]), ["ADVENT-TEST-06", "advent-2026-test-door-06"])
check("test copies: campaign alone blocks", existingTestCopies([], ["advent-2026-test-door-11"]).length, 1)

if (ok) console.log("ALL PASS")
else process.exit(1)

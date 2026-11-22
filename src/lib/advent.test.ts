// Covers the advent lineup and its Mauritius-time door rules in advent.ts.
// Plain script, run with `npx tsx src/lib/advent.test.ts` (also under
// `TZ=America/Los_Angeles`: fixtures are UTC, the rules are MU time).
import {
  ADVENT,
  adventBarCopy,
  adventBarKey,
  adventPhase,
  doorCode,
  doorOfDay,
  doorPrice,
  doorState,
  doorWindow,
  happyHourState,
  msUntilNextDoor,
  muDayLabel,
  seasonalNavLink,
  shippingDoorFree,
  todaysDoor,
} from "./advent"
import { footerShopLinks, navLinks } from "./nav"

const D = Date.parse

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

check("teaser before start", adventPhase(D("2026-11-30T19:59:59Z")), "teaser")
check("running 1 Dec 00:00 MU", adventPhase(D("2026-11-30T20:00:00Z")), "running")
check("running 24 Dec 23:59:59 MU", adventPhase(D("2026-12-24T19:59:59Z")), "running")
check("ended 25 Dec 00:00 MU", adventPhase(D("2026-12-24T20:00:00Z")), "ended")
check("door 1 at start", todaysDoor(D("2026-11-30T20:00:00Z"))?.day, 1)
check("door 6 last second", todaysDoor(D("2026-12-06T19:59:59Z"))?.day, 6)
check("door 7 first second", todaysDoor(D("2026-12-06T20:00:00Z"))?.day, 7)
check("no door in teaser / after", [todaysDoor(D("2026-11-25T08:00:00Z")), todaysDoor(D("2026-12-25T08:00:00Z"))], [null, null])
check("states 7 Dec", [6, 7, 8].map((d) => doorState(d, D("2026-12-07T06:00:00Z"))), ["past", "today", "locked"])
check("teaser all locked / after all past", [doorState(1, D("2026-11-28T06:00:00Z")), doorState(24, D("2026-12-25T06:00:00Z"))], ["locked", "past"])
const hh = doorOfDay(4)
check("hh edges", ["15:59:59", "16:00:00", "17:59:59", "18:00:00"].map((t) => happyHourState(hh, D(`2026-12-04T${t}Z`))), ["later", "live", "live", "over"])
check("hh null on other kinds", happyHourState(doorOfDay(5), D("2026-12-05T16:30:00Z")), null)
check("window door 7", doorWindow(doorOfDay(7)), { startsAt: "2026-12-07T00:00:00+04:00", endsAt: "2026-12-07T23:59:59+04:00" })
check("window door 11", doorWindow(doorOfDay(11)), { startsAt: "2026-12-11T20:00:00+04:00", endsAt: "2026-12-11T21:59:59+04:00" })
check("codes", [doorCode(7), doorCode(7, true)], ["ADVENT-07", "ADVENT-TEST-07"])
check("days 1..24", ADVENT.doors.map((d) => d.day), Array.from({ length: 24 }, (_, i) => i + 1))
check("happy hours", ADVENT.doors.filter((d) => d.kind === "happy-hour").map((d) => d.day), [4, 11, 18])
// These dates must stay equal to DOUBLE_POINTS_MU_DATES in Backend/dollup-medusa/src/lib/loyalty-multiplier.ts
check("double points", ADVENT.doors.filter((d) => d.kind === "double-points").map((d) => d.day), [7, 14, 21])
check("never intimates", ADVENT.doors.some((d) => d.categoryHandles?.includes("intimates")), false)
check("bikini on door 6", doorPrice({ amount: 1000, categoryHandles: ["bikini-sets"] }, D("2026-12-06T08:00:00Z")), { price: 900, tag: "−Rs 100 today" })
check("dress on door 6", doorPrice({ amount: 1025, categoryHandles: ["dresses"] }, D("2026-12-06T08:00:00Z")), null)
check("dress on door 19", doorPrice({ amount: 1025, categoryHandles: ["dresses"] }, D("2026-12-19T08:00:00Z"))?.price, 875)
check("floor at 0", doorPrice({ amount: 50, categoryHandles: ["lingerie"] }, D("2026-12-03T08:00:00Z"))?.price, 0)
check("hh live price", doorPrice({ amount: 975, categoryHandles: ["dresses"] }, D("2026-12-04T16:30:00Z")), { price: 780, tag: "−20% tonight" })
check("hh not live yet", doorPrice({ amount: 975, categoryHandles: ["dresses"] }, D("2026-12-04T15:30:00Z")), null)
check("hh live, non-discountable: no price", doorPrice({ amount: 975, categoryHandles: ["dresses"], discountable: false }, D("2026-12-04T16:30:00Z")), null)
check("hh live, discountable true/unset still prices", [doorPrice({ amount: 975, categoryHandles: [], discountable: true }, D("2026-12-04T16:30:00Z"))?.price, doorPrice({ amount: 975, categoryHandles: [] }, D("2026-12-04T16:30:00Z"))?.price], [780, 780])
const CHEAP_LINGERIE = ["prod_01KQPN2WDNABFQCAB38CGJCDNB", "prod_01KQPN2XHGX93C7TW51BV9673B"]
check("door 3/20 exclusions set", [doorOfDay(3).excludeProductIds, doorOfDay(20).excludeProductIds], [CHEAP_LINGERIE, CHEAP_LINGERIE])
check("excluded lingerie: no door price on 3 and 20", CHEAP_LINGERIE.flatMap((id) => [
  doorPrice({ amount: 175, categoryHandles: ["lingerie"], productId: id }, D("2026-12-03T08:00:00Z")),
  doorPrice({ amount: 175, categoryHandles: ["lingerie"], productId: id }, D("2026-12-20T08:00:00Z")) ]), [null, null, null, null])
check("other lingerie still priced on 3 and 20", [
  doorPrice({ amount: 875, categoryHandles: ["lingerie"], productId: "prod_other" }, D("2026-12-03T08:00:00Z"))?.price,
  doorPrice({ amount: 875, categoryHandles: ["pajamas"], productId: "prod_other" }, D("2026-12-20T08:00:00Z"))?.price ], [800, 775])
check("category door, non-discountable: no price", doorPrice({ amount: 1000, categoryHandles: ["bikini-sets"], discountable: false }, D("2026-12-06T08:00:00Z")), null)
check("postage door", ["Registered Postage", "Home/Office Delivery", "Express Postage"].map((n) => shippingDoorFree(n, D("2026-12-02T08:00:00Z"))), [true, false, false])
check("delivery door", shippingDoorFree("Home/Office Delivery", D("2026-12-08T08:00:00Z")), true)
check("nav teaser / ended", [seasonalNavLink(D("2026-11-27T08:00:00Z")), seasonalNavLink(D("2026-12-25T08:00:00Z"))], [{ label: "Advent calendar", href: "/advent" }, null])
check("next door 7 Dec 09:38 MU", msUntilNextDoor(D("2026-12-07T05:38:00Z")), (14 * 60 + 22) * 60_000)
check("next door teaser", msUntilNextDoor(D("2026-11-30T19:00:00Z")), 3_600_000)
check("no next door on 24 Dec", msUntilNextDoor(D("2026-12-24T08:00:00Z")), null)
check("day label", muDayLabel(8), "Tuesday 8 December")
check("bar keys", ["2026-11-28T08:00:00Z", "2026-12-06T08:00:00Z", "2026-12-11T15:30:00Z", "2026-12-11T16:30:00Z", "2026-12-11T18:30:00Z", "2026-12-25T08:00:00Z"].map((t) => adventBarKey(D(t))), ["teaser", "door-06", "door-11-later", "door-11-live", "door-11-over", "evergreen"])
check("bar door 6", adventBarCopy("door-06"), { lead: "Door 6 · Rs 100 off all beachwear today →", href: "/shop?category=beachwear", tail: "Cash on delivery available" })
check("bar postage has no COD tail", adventBarCopy("door-02").tail, null)
check("bar door 7", adventBarCopy("door-07").lead, "Door 7 · Double points today · sign in to collect →")
check("bar door 12", adventBarCopy("door-12").lead, "Door 12 · Free handcuffs with any order (18+) today →")
check("bar hh", ["door-11-later", "door-11-live", "door-11-over"].map((k) => adventBarCopy(k).lead), ["Tonight 8–10pm · 20% off everything →", "Happy hour · 20% off everything until 10pm →", "Door 12 opens at midnight"])
check("bar teaser / evergreen", [adventBarCopy("teaser").lead, adventBarCopy("evergreen")], ["The advent calendar opens Tue 1 Dec →", { lead: "Free delivery on orders Rs.1500+", href: null, tail: "Cash on delivery available" }])

check("nav slot during", navLinks(D("2026-12-06T08:00:00Z")).find((l) => l.href === "/advent")?.label, "Advent calendar")
check("nav slot after", navLinks(D("2026-12-25T08:00:00Z")).some((l) => l.label === "Sale" && l.href === "/sale"), true)
// Teaser day after Black Friday (23–29 Nov keeps the Sale slot: sale-campaign.test.ts).
check("footer slot during", footerShopLinks(D("2026-11-30T08:00:00Z")).some((l) => l.href === "/advent"), true)
check("nav slot replaces Sale", navLinks(D("2026-12-06T08:00:00Z")).some((l) => l.label === "Sale"), false)
check("hh door 4 on 3 Dec", happyHourState(doorOfDay(4), D("2026-12-03T08:00:00Z")), "later")
check("hh door 4 on 5 Dec", happyHourState(doorOfDay(4), D("2026-12-05T08:00:00Z")), "over")
for (const bad of [0, 25]) {
  let threw = false
  try { doorOfDay(bad) } catch { threw = true }
  check(`doorOfDay(${bad}) throws`, threw, true)
}

if (ok) console.log("ALL PASS")
else process.exit(1)

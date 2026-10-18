// Covers the sale window in sale-campaign.ts and the states it drives: the
// /sale page phase, the promo bar and the homepage banner. Same plain-script
// style as checkout-free-postage.test.ts — run with
// `npx tsx src/lib/sale-campaign.test.ts`.
//
// The fixtures are written in UTC on purpose: the window is Mauritius time
// (UTC+4), and the labels must come out the same whatever the process TZ is
// (try `TZ=America/Los_Angeles npx tsx ...`).
import {
  SALE_CAMPAIGN,
  SALE_ENDS_LABEL,
  SALE_ENDS_SHORT_LABEL,
  SALE_PATH,
  SALE_STARTS_LABEL,
  hasSaleEnded,
  isSaleActive,
  muLongDate,
  muShortDate,
  promoBarState,
  salePhase,
} from "./sale-campaign"
import { salesOfMonthConfig, splitHeadline } from "./sales-of-month"
import { NAV_CATEGORY_HANDLES, NAV_LINKS, FOOTER_SHOP } from "./nav"

const today = new Date("2026-10-18T07:00:00Z")            // Sun 18 Oct, 11:00 MU
const lastPreSaleSecond = new Date("2026-10-18T19:59:59Z") // Sun 18 Oct, 23:59:59 MU
const saleOpens = new Date("2026-10-18T20:00:00Z")         // Mon 19 Oct, 00:00 MU
const midSale = new Date("2026-10-25T08:00:00Z")           // Sun 25 Oct, 12:00 MU
const lastSaleMinute = new Date("2026-11-01T19:59:00Z")    // Sun 1 Nov, 23:59 MU
const lastSaleSecond = new Date("2026-11-01T19:59:59Z")    // Sun 1 Nov, 23:59:59 MU
const justAfter = new Date("2026-11-01T19:59:59.001Z")     // 1 ms after the end
const nextDay = new Date("2026-11-01T20:00:00Z")           // Mon 2 Nov, 00:00 MU

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// Window gating at both boundaries, MU time.
check("upcoming today", salePhase(today), "upcoming")
check("upcoming at 23:59:59 MU on 18 Oct", salePhase(lastPreSaleSecond), "upcoming")
check("active at 00:00 MU on 19 Oct", salePhase(saleOpens), "active")
check("active mid-sale", salePhase(midSale), "active")
check("active at 23:59 MU on 1 Nov", salePhase(lastSaleMinute), "active")
check("active through 23:59:59 MU on 1 Nov", salePhase(lastSaleSecond), "active")
check("ended right after the last second", salePhase(justAfter), "ended")
check("ended 00:00 MU on 2 Nov", salePhase(nextDay), "ended")
check("accepts epoch ms", salePhase(saleOpens.getTime()), "active")
check("isSaleActive", [today, saleOpens, lastSaleSecond, nextDay].map((d) => isSaleActive(d)), [false, true, true, false])
check("hasSaleEnded", [today, saleOpens, lastSaleSecond, nextDay].map((d) => hasSaleEnded(d)), [false, false, false, true])

// Config shape: ISO strings with the MU offset.
check("startsAt offset", SALE_CAMPAIGN.startsAt.endsWith("+04:00"), true)
check("endsAt offset", SALE_CAMPAIGN.endsAt.endsWith("+04:00"), true)
check("max percent", SALE_CAMPAIGN.maxPercent, 50)

// Labels follow the MU calendar, not toISOString (which would say 31 Oct /
// 18 Oct for these instants in UTC).
check("starts label", SALE_STARTS_LABEL, "Monday 19 October")
check("ends label", SALE_ENDS_LABEL, "Sunday 1 November")
check("ends short label", SALE_ENDS_SHORT_LABEL, "1 Nov")
check("MU day of a UTC-evening instant", muLongDate("2026-10-18T21:30:00Z"), "Monday 19 October")
check("short date", muShortDate("2026-10-19T00:00:00+04:00"), "19 Oct")

// Promo bar: free-postage copy today, the sale on top from 19 Oct, evergreen
// copy again from 2 Nov with no deploy.
check("bar today", promoBarState(today), "free-postage")
check("bar at 23:59:59 MU on 18 Oct", promoBarState(lastPreSaleSecond), "free-postage")
check("bar when the sale opens", promoBarState(saleOpens), "sale-free-postage")
check("bar mid-sale", promoBarState(midSale), "sale-free-postage")
check("bar at 23:59 MU on 1 Nov", promoBarState(lastSaleMinute), "sale-free-postage")
check("bar reverts on 2 Nov", promoBarState(nextDay), "evergreen")

// Homepage banner: same window, so hidden before the start (the old code only
// checked the end) and after the end.
check("banner shares the campaign dates", [salesOfMonthConfig.startsAt, salesOfMonthConfig.endsAt], [SALE_CAMPAIGN.startsAt, SALE_CAMPAIGN.endsAt])
check("banner enabled", salesOfMonthConfig.enabled, true)
check("banner CTA", [salesOfMonthConfig.ctaUrl, salesOfMonthConfig.ctaLabel, salesOfMonthConfig.percentOff], ["/sale", "Shop the sale", 50])
check(
  "banner phases",
  [today, lastPreSaleSecond, saleOpens, lastSaleSecond, nextDay].map((d) => salePhase(d, salesOfMonthConfig)),
  ["upcoming", "upcoming", "active", "active", "ended"],
)

// Banner headline split: the new name gets an italic accent on its last word;
// the old " of " headlines render as before.
check("split new headline", splitHeadline(salesOfMonthConfig.headline), ["October", "Sale"])
check("split on of", splitHeadline("Sales of the Month"), ["Sales", "of the Month"])
check("split on first of only", splitHeadline("8 Years of Doll Up of Love"), ["8 Years", "of Doll Up of Love"])
check("single word", splitHeadline("Sale"), ["Sale", null])

// Nav: both Sale links go to the campaign page; chip-level category handles
// come from the leaf menu links.
check("sale path", SALE_PATH, "/sale")
check("nav Sale link", NAV_LINKS.find((l) => l.label === "Sale")?.href, "/sale")
check("footer Sale link", FOOTER_SHOP.find((l) => l.label === "Sale")?.href, "/sale")
check("nav chip handles", NAV_CATEGORY_HANDLES, [
  "dresses",
  "two-piece-outfits",
  "jumpsuits",
  "tops",
  "bottoms",
  "winter",
  "lingerie",
  "intimates",
  "beachwear",
  "accessories",
])

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

// Covers the sale window in sale-campaign.ts and the states it drives: the
// /sale page phase, the Friday peak day, the promo bar, the nav slot and the
// homepage banner. Same plain-script style as checkout-free-postage.test.ts —
// run with `npx tsx src/lib/sale-campaign.test.ts`.
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
  isSalePeak,
  muLongDate,
  muShortDate,
  promoBarState,
  saleBarCopy,
  salePeakPhase,
  salePhase,
} from "./sale-campaign"
import { salesOfMonthConfig, splitHeadline } from "./sales-of-month"
import { NAV_CATEGORY_HANDLES, NAV_LINKS, FOOTER_SHOP, footerShopLinks, navLinks } from "./nav"

const today = new Date("2026-11-21T07:00:00Z")             // Sat 21 Nov, 11:00 MU
const lastPreSaleSecond = new Date("2026-11-22T19:59:59Z") // Sun 22 Nov, 23:59:59 MU
const saleOpens = new Date("2026-11-22T20:00:00Z")         // Mon 23 Nov, 00:00 MU
const midWeek = new Date("2026-11-25T08:00:00Z")           // Wed 25 Nov, 12:00 MU
const lastPrePeakSecond = new Date("2026-11-26T19:59:59Z") // Thu 26 Nov, 23:59:59 MU
const peakOpens = new Date("2026-11-26T20:00:00Z")         // Fri 27 Nov, 00:00 MU
const peakLastSecond = new Date("2026-11-27T19:59:59Z")    // Fri 27 Nov, 23:59:59 MU
const afterPeak = new Date("2026-11-27T20:00:00Z")         // Sat 28 Nov, 00:00 MU
const lastSaleMinute = new Date("2026-11-29T19:59:00Z")    // Sun 29 Nov, 23:59 MU
const lastSaleSecond = new Date("2026-11-29T19:59:59Z")    // Sun 29 Nov, 23:59:59 MU
const justAfter = new Date("2026-11-29T19:59:59.001Z")     // 1 ms after the end
const nextDay = new Date("2026-11-29T20:00:00Z")           // Mon 30 Nov, 00:00 MU

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// Window gating at both boundaries, MU time.
check("upcoming today", salePhase(today), "upcoming")
check("upcoming at 23:59:59 MU on 22 Nov", salePhase(lastPreSaleSecond), "upcoming")
check("active at 00:00 MU on 23 Nov", salePhase(saleOpens), "active")
check("active mid-week", salePhase(midWeek), "active")
check("active at 23:59 MU on 29 Nov", salePhase(lastSaleMinute), "active")
check("active through 23:59:59 MU on 29 Nov", salePhase(lastSaleSecond), "active")
check("ended right after the last second", salePhase(justAfter), "ended")
check("ended 00:00 MU on 30 Nov", salePhase(nextDay), "ended")
check("accepts epoch ms", salePhase(saleOpens.getTime()), "active")
check("isSaleActive", [today, saleOpens, lastSaleSecond, nextDay].map((d) => isSaleActive(d)), [false, true, true, false])
check("hasSaleEnded", [today, saleOpens, lastSaleSecond, nextDay].map((d) => hasSaleEnded(d)), [false, false, false, true])

// The Friday peak: the whole MU day of 27 Nov, inside the sale window.
check(
  "peak phases",
  [saleOpens, lastPrePeakSecond, peakOpens, peakLastSecond, afterPeak, nextDay].map((d) => salePeakPhase(d)),
  ["upcoming", "upcoming", "active", "active", "ended", "ended"],
)
check("isSalePeak", [midWeek, peakOpens, peakLastSecond, afterPeak].map((d) => isSalePeak(d)), [false, true, true, false])
check("peak inside the sale", [
  Date.parse(SALE_CAMPAIGN.peak.startsAt) >= Date.parse(SALE_CAMPAIGN.startsAt),
  Date.parse(SALE_CAMPAIGN.peak.endsAt) <= Date.parse(SALE_CAMPAIGN.endsAt),
], [true, true])
check("peak is Friday", muLongDate(SALE_CAMPAIGN.peak.startsAt), "Friday 27 November")

// Config shape: ISO strings with the MU offset.
check("offsets", [SALE_CAMPAIGN.startsAt, SALE_CAMPAIGN.endsAt, SALE_CAMPAIGN.peak.startsAt, SALE_CAMPAIGN.peak.endsAt].every((s) => s.endsWith("+04:00")), true)
check("max percent", SALE_CAMPAIGN.maxPercent, 50)

// Labels follow the MU calendar, not toISOString (which would say 22 Nov /
// 28 Nov for these instants in UTC).
check("starts label", SALE_STARTS_LABEL, "Monday 23 November")
check("ends label", SALE_ENDS_LABEL, "Sunday 29 November")
check("ends short label", SALE_ENDS_SHORT_LABEL, "29 Nov")
check("MU day of a UTC-evening instant", muLongDate("2026-10-18T21:30:00Z"), "Monday 19 October")
check("short date", muShortDate("2026-10-19T00:00:00+04:00"), "19 Oct")

// Promo bar state: free postage ended on 1 Nov, so the sale alone.
check("bar state today", promoBarState(today), "evergreen")
check("bar state mid-week", promoBarState(midWeek), "sale")
check("bar state after", promoBarState(nextDay), "evergreen")

// Promo bar copy: the sale leads while it runs (the advent bar takes over
// outside it), with Friday's own line on the day.
const week = { lead: "Black Friday · up to 50% off →", href: "/sale" }
check("bar copy before the sale", saleBarCopy(lastPreSaleSecond), null)
// Friday's deeper prices are a surprise: nothing announces them before the day.
check("bar copy when the sale opens", saleBarCopy(saleOpens), { ...week, tail: "Ends Sunday 29 November" })
check("bar copy Thu 23:59:59", saleBarCopy(lastPrePeakSecond), { ...week, tail: "Ends Sunday 29 November" })
const FRIDAY_TEASE = /drop again|27 Nov|Fri(day)? 27/i
check("banner copy keeps Friday a surprise", FRIDAY_TEASE.test(SALE_CAMPAIGN.bannerDescription), false)
check("search description keeps Friday a surprise", FRIDAY_TEASE.test(SALE_CAMPAIGN.description), false)
check("no Friday teaser copy left", "teaser" in SALE_CAMPAIGN.peak, false)
check("bar copy on Friday", saleBarCopy(peakOpens), { lead: "Black Friday · today only, prices drop again →", href: "/sale", tail: "Payment on delivery: cash or Juice" })
check("bar copy Fri 23:59:59", saleBarCopy(peakLastSecond)?.lead, "Black Friday · today only, prices drop again →")
check("bar copy at the weekend", saleBarCopy(afterPeak), { ...week, tail: "Ends Sunday 29 November" })
check("bar copy last second", saleBarCopy(lastSaleSecond)?.lead, week.lead)
check("bar copy after the sale", saleBarCopy(nextDay), null)
check("bar leads fit one phone line", [week.lead, SALE_CAMPAIGN.peak.barLead].every((s) => s.length <= 50), true)

// Nav: the advent teaser takes the Sale slot before 1 Dec, except while the
// sale runs.
const hasSale = (links: { label: string; href: string }[]) => links.some((l) => l.label === "Sale" && l.href === "/sale")
const hasAdvent = (links: { label: string; href: string }[]) => links.some((l) => l.href === "/advent")
check("nav keeps Sale during the sale", [saleOpens, peakOpens, lastSaleSecond].map((d) => [hasSale(navLinks(d.getTime())), hasAdvent(navLinks(d.getTime()))]), [[true, false], [true, false], [true, false]])
check("footer keeps Sale during the sale", [hasSale(footerShopLinks(midWeek.getTime())), hasAdvent(footerShopLinks(midWeek.getTime()))], [true, false])
check("nav advent teaser before and after", [today, nextDay].map((d) => hasAdvent(navLinks(d.getTime()))), [true, true])

// Homepage banner: same window, so hidden before the start and after the end,
// with the peak day's copy on Friday.
check("banner shares the campaign dates", [salesOfMonthConfig.startsAt, salesOfMonthConfig.endsAt], [SALE_CAMPAIGN.startsAt, SALE_CAMPAIGN.endsAt])
check("banner peak dates", [salesOfMonthConfig.peak.startsAt, salesOfMonthConfig.peak.endsAt], [SALE_CAMPAIGN.peak.startsAt, SALE_CAMPAIGN.peak.endsAt])
check("banner enabled", salesOfMonthConfig.enabled, true)
check("banner CTA", [salesOfMonthConfig.ctaUrl, salesOfMonthConfig.ctaLabel, salesOfMonthConfig.percentOff], ["/sale", "Shop the sale", 50])
check(
  "banner phases",
  [today, lastPreSaleSecond, saleOpens, lastSaleSecond, nextDay].map((d) => salePhase(d, salesOfMonthConfig)),
  ["upcoming", "upcoming", "active", "active", "ended"],
)
check("banner peak phase", [midWeek, peakOpens, afterPeak].map((d) => salePhase(d, salesOfMonthConfig.peak)), ["upcoming", "active", "ended"])

// Banner headline split: the new name gets an italic accent on its last word;
// the old " of " headlines render as before.
check("split new headline", splitHeadline(salesOfMonthConfig.headline), ["Black", "Friday"])
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
  "beachwear",
  "accessories",
])

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

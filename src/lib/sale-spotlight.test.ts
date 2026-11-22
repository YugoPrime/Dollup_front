// Covers sale-spotlight.ts: the copy the Black Friday look puts on the promo
// ticker, the homepage hero and the popup, per day of the sale, and where the
// popup may open. Same plain-script style as sale-campaign.test.ts — run with
// `npx tsx src/lib/sale-spotlight.test.ts`.
//
// Fixtures are UTC instants; the sale runs on Mauritius time (UTC+4).
import { SALE_CAMPAIGN } from "./sale-campaign"
import { POPUP_STORAGE_KEY, isPopupPath, spotlightCopy } from "./sale-spotlight"

const lastPreSaleSecond = new Date("2026-11-22T19:59:59Z") // Sun 22 Nov, 23:59:59 MU
const saleOpens = new Date("2026-11-22T20:00:00Z")         // Mon 23 Nov, 00:00 MU
const lastPrePeakSecond = new Date("2026-11-26T19:59:59Z") // Thu 26 Nov, 23:59:59 MU
const peakOpens = new Date("2026-11-26T20:00:00Z")         // Fri 27 Nov, 00:00 MU
const peakLastSecond = new Date("2026-11-27T19:59:59Z")    // Fri 27 Nov, 23:59:59 MU
const afterPeak = new Date("2026-11-27T20:00:00Z")         // Sat 28 Nov, 00:00 MU
const lastDayOpens = new Date("2026-11-28T20:00:00Z")      // Sun 29 Nov, 00:00 MU
const lastSaleSecond = new Date("2026-11-29T19:59:59Z")    // Sun 29 Nov, 23:59:59 MU
const justAfter = new Date("2026-11-29T19:59:59.001Z")     // 1 ms after the end
const nextDay = new Date("2026-11-29T20:00:00Z")           // Mon 30 Nov, 00:00 MU

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// Off outside the window, at both edges.
check("off before the sale", spotlightCopy(lastPreSaleSecond), null)
check("off 1 ms after the end", spotlightCopy(justAfter), null)
check("off on Mon 30", spotlightCopy(nextDay), null)
check("campaign uses the mono look", SALE_CAMPAIGN.look, "mono")

// Mon 23 → Thu 26: the week, Friday still ahead.
const week = spotlightCopy(saleOpens)
check("week phase", week?.phase, "week")
check("week phase until Thu 23:59:59", spotlightCopy(lastPrePeakSecond)?.phase, "week")
check("week counts down to the sale end", week?.countdownTo, SALE_CAMPAIGN.endsAt)
check("week ticker", week?.ticker, [
  "Black Friday",
  "Up to 50% off",
  "300+ pieces",
  "Ends Sunday 29 Nov",
  "Cash on delivery",
])
check("week kicker", week?.kicker, "Black Friday · ends Sunday 29 Nov")
check("week line", week?.line, "300+ dresses, swimwear, lingerie & essentials. Ends Sunday 29 Nov.")
// Friday's deeper prices are a surprise: no copy hints at them before the day.
const FRIDAY_TEASE = /drop again|27 Nov|Fri(day)? 27|10%/i
for (const [label, t] of [["Mon 00:00", saleOpens], ["Thu 23:59:59", lastPrePeakSecond]] as const) {
  const c = spotlightCopy(t)
  check(`no Friday hint at ${label}`, [c?.kicker, c?.line, ...(c?.ticker ?? [])].some((x) => FRIDAY_TEASE.test(x ?? "")), false)
}
check("week seen value = MU date", week?.seenValue, "2026-11-23")
check("accepts epoch ms", spotlightCopy(saleOpens.getTime())?.phase, "week")

// Fri 27: the deeper day.
const peak = spotlightCopy(peakOpens)
check("peak phase at 00:00", peak?.phase, "peak")
check("peak phase at 23:59:59", spotlightCopy(peakLastSecond)?.phase, "peak")
check("peak counts down to midnight", peak?.countdownTo, SALE_CAMPAIGN.peak.endsAt)
check("peak ticker", peak?.ticker, [
  "Black Friday",
  "Today only: prices drop again",
  "Up to 50% off",
  "Ends at midnight",
  "Cash on delivery",
])
check("peak kicker", peak?.kicker, "Black Friday · today only")
check("peak line", peak?.line, "Today only, most pieces are another 10% lower. Ends at midnight.")
check("peak seen value", peak?.seenValue, "2026-11-27")

// Sat 28: after Friday, back to the week copy.
const sat = spotlightCopy(afterPeak)
check("Saturday is week copy", [sat?.phase, sat?.ticker, sat?.line], [week?.phase, week?.ticker, week?.line])
check("Saturday counts down to the sale end", sat?.countdownTo, SALE_CAMPAIGN.endsAt)

// Sun 29: the last day, to the last second.
for (const [label, t] of [["00:00", lastDayOpens], ["23:59:59", lastSaleSecond]] as const) {
  const last = spotlightCopy(t)
  check(`last-day phase at ${label}`, last?.phase, "last-day")
  check(`last-day ticker at ${label}`, last?.ticker.includes("Last day: ends at midnight"), true)
  check(`last-day line at ${label}`, last?.line, "Last day: 300+ pieces up to 50% off. Ends at midnight.")
  check(`last-day seen value at ${label}`, last?.seenValue, "2026-11-29")
}

// Where the popup may open: not on the sale itself, nor on checkout,
// account or sign-in pages. Segment-exact, so /saletest is not /sale.
const allowed = ["/", "/shop", "/products/is2364", "/advent", "/saletest"]
const blocked = [
  "/sale", "/sale/", "/checkout", "/checkout/success", "/account", "/account/orders",
  "/login", "/register", "/forgot-password", "/reset-password", "/auth/callback",
  "/track-order", "/private/x",
]
check("popup allowed paths", allowed.map(isPopupPath), allowed.map(() => true))
check("popup blocked paths", blocked.map(isPopupPath), blocked.map(() => false))
check("popup storage key", POPUP_STORAGE_KEY, "dub_sale_popup_seen_v1")

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

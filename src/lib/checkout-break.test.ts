// Covers the shop-break clamp in checkout.ts. Same plain-script style as
// preorder-checkout.test.ts — run with `npx tsx src/lib/checkout-break.test.ts`.
//
// The fixtures are written in UTC on purpose: the whole point of these helpers
// is that they normalise any clock to the Mauritius (UTC+4) calendar day.
import {
  earliestDeliveryDate,
  isValidDeliveryDate,
  nextValidDeliveryDates,
  pickupPaused,
  serviceBreakActive,
  shippingOptionToDeliveryMethod,
  SERVICE_RESUMES_YMD,
} from "./checkout"

const duringBreak = new Date("2026-09-21T06:00:00Z")   // Mon 21 Sept, MU morning
const lastMuMinute = new Date("2026-10-16T19:59:00Z")  // 23:59 MU on 16 Oct
const firstMuMinute = new Date("2026-10-16T20:00:00Z") // 00:00 MU on 17 Oct
const resumeDay = new Date("2026-10-17T06:00:00Z")     // Sat 17 Oct, MU morning
const afterBreak = new Date("2026-10-20T06:00:00Z")    // Tue 20 Oct, MU morning

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// The window is on until the resume date, and turns itself off at MU midnight.
check("break active during", serviceBreakActive(duringBreak), true)
check("break active 23:59 MU on 16 Oct", serviceBreakActive(lastMuMinute), true)
check("break over 00:00 MU on 17 Oct", serviceBreakActive(firstMuMinute), false)
check("break over on resume day", serviceBreakActive(resumeDay), false)
check("pickup paused during", pickupPaused(duringBreak), true)
check("pickup back on resume day", pickupPaused(resumeDay), false)

// Nothing can be scheduled before service resumes — delivery or pickup.
check("earliest delivery clamped", earliestDeliveryDate(duringBreak, false), SERVICE_RESUMES_YMD)
check("same-day pickup clamped too", earliestDeliveryDate(duringBreak, true), SERVICE_RESUMES_YMD)
check("tomorrow rejected", isValidDeliveryDate("2026-09-22", duringBreak, false), false)
check("day before resume rejected", isValidDeliveryDate("2026-10-16", duringBreak, false), false)
check("resume day accepted", isValidDeliveryDate(SERVICE_RESUMES_YMD, duringBreak, false), true)

// 17 Oct is a Saturday, so the chips must jump over Sunday the 18th.
check("quick-pick chips", nextValidDeliveryDates(3, duringBreak, false), [
  "2026-10-17",
  "2026-10-19",
  "2026-10-20",
])

// Once past the date the ordinary cutoff rules come back on their own.
check("cutoff rules return", earliestDeliveryDate(afterBreak, false, 12), "2026-10-21")
check("same-day pickup returns", earliestDeliveryDate(afterBreak, true, 12), "2026-10-20")

// The checkout hides pickup by matching on the Medusa option NAME, so pin the
// names actually configured in production. If one is renamed in Medusa admin
// and stops mapping to "Pick Up", the option silently comes back mid-break.
const LIVE_OPTION_NAMES = [
  "Home/Office Delivery",
  "Registered Postage",
  "Express Postage",
  "Pick Up Pereybere",
  "Rodrigues Postage",
]
check(
  "only Pereybere pickup is dropped during the break",
  LIVE_OPTION_NAMES.filter(
    (n) => shippingOptionToDeliveryMethod(n) !== "Pick Up",
  ),
  ["Home/Office Delivery", "Registered Postage", "Express Postage", "Rodrigues Postage"],
)

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

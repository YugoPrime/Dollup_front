// Covers the free-postage window and the post-break delivery dates in
// checkout.ts. Same plain-script style as preorder-checkout.test.ts — run with
// `npx tsx src/lib/checkout-free-postage.test.ts`.
//
// The fixtures are written in UTC on purpose: the whole point of these helpers
// is that they normalise any clock to the Mauritius (UTC+4) calendar day.
import {
  earliestDeliveryDate,
  freePostageActive,
  isValidDeliveryDate,
  nextValidDeliveryDates,
  qualifiesForFreePostage,
} from "./checkout"

const launchMorning = new Date("2026-10-18T07:00:00Z")  // Sun 18 Oct, 11:00 MU
const launchAfternoon = new Date("2026-10-18T09:00:00Z") // Sun 18 Oct, 13:00 MU
const lastMuMinute = new Date("2026-11-01T19:59:00Z")   // 23:59 MU on 1 Nov
const firstMuMinute = new Date("2026-11-01T20:00:00Z")  // 00:00 MU on 2 Nov
const tuesdayMorning = new Date("2026-10-20T06:00:00Z") // Tue 20 Oct, MU morning

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

// On through the whole of 1 Nov, off at MU midnight — same instant the
// FREEPOSTAGE campaign in Medusa ends (2026-11-01T19:59:59Z).
check("offer on at launch", freePostageActive(launchMorning), true)
check("offer on 23:59 MU on 1 Nov", freePostageActive(lastMuMinute), true)
check("offer off 00:00 MU on 2 Nov", freePostageActive(firstMuMinute), false)

// Matched on the Medusa option NAME, so pin the names configured in
// production. Only plain postage is free; Express and Rodrigues stay paid.
const FREE = ["Registered Postage", "Postage (Pre-Order)"]
const PAID = [
  "Express Postage",
  "Express Postage (Pre-Order)",
  "Rodrigues Postage",
  "Rodrigues Postage (Pre-Order)",
  "Home/Office Delivery",
  "Home delivery (Pre-Order)",
  "Pick Up Pereybere",
]
check(
  "free during the offer",
  FREE.map((n) => qualifiesForFreePostage(n, launchMorning)),
  FREE.map(() => true),
)
check(
  "paid during the offer",
  PAID.map((n) => qualifiesForFreePostage(n, launchMorning)),
  PAID.map(() => false),
)
check(
  "postage paid again after the offer",
  FREE.map((n) => qualifiesForFreePostage(n, firstMuMinute)),
  FREE.map(() => false),
)

// The break is over: the next available day is offered again. Before the
// noon cutoff on Sunday 18 Oct that is Monday 19 Oct.
check("next day before cutoff", earliestDeliveryDate(launchMorning, false, 12), "2026-10-19")
check("quick-pick chips", nextValidDeliveryDates(3, launchMorning, false, 12), [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
])
check("monday accepted", isValidDeliveryDate("2026-10-19", launchMorning, false, 12), true)
check("same day still rejected", isValidDeliveryDate("2026-10-18", launchMorning, false, 12), false)
check("after cutoff skips a day", earliestDeliveryDate(launchAfternoon, false, 12), "2026-10-20")
check("sunday pickup moves to monday", earliestDeliveryDate(launchMorning, true, 12), "2026-10-19")
check("weekday cutoff rule", earliestDeliveryDate(tuesdayMorning, false, 12), "2026-10-21")
check("same-day pickup on a weekday", earliestDeliveryDate(tuesdayMorning, true, 12), "2026-10-20")

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

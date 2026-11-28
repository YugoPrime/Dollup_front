// Covers the Doll Rewards rules helper. Run with `npx tsx src/lib/loyalty-rules.test.ts`.
import {
  balanceLine,
  FALLBACK_RULES,
  formatInt,
  getLoyaltyRules,
  pointsFor,
  unlockSpend,
} from "./loyalty-rules"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

async function main() {
  // pointsFor
  check("Rs 2,000 at 5 = 100", pointsFor(2000, FALLBACK_RULES), 100)
  check("Rs 1,715 at 5 = 85", pointsFor(1715, FALLBACK_RULES), 85)
  check("Rs 99 at 2 = 1", pointsFor(99, { ...FALLBACK_RULES, earnPer100: 2 }), 1)

  // formatInt
  check("1,830", formatInt(1830), "1,830")
  check("150", formatInt(150), "150")
  check("1,000,000", formatInt(1000000), "1,000,000")

  // unlockSpend: smallest Rs 100 step where welcome + points reach the minimum
  check("5/150/100 -> Rs 1,000", unlockSpend(FALLBACK_RULES), 1000)
  check("2/150/100 -> Rs 2,500", unlockSpend({ earnPer100: 2, minRedeem: 150, welcomeBonus: 100 }), 2500)
  check("welcome alone enough -> Rs 100", unlockSpend({ earnPer100: 5, minRedeem: 100, welcomeBonus: 150 }), 100)

  // balanceLine: never promise money off below the redeem minimum
  check("at the minimum", balanceLine(150, 150), "Worth Rs 150 off at checkout.")
  check("above", balanceLine(1830, 150), "Worth Rs 1,830 off at checkout.")
  check("new member", balanceLine(100, 150), "50 more points to unlock Rs 150 off.")
  check("empty", balanceLine(0, 150), "150 more points to unlock Rs 150 off.")
  check("below zero", balanceLine(-40, 150), "190 more points to unlock Rs 150 off.")

  // getLoyaltyRules
  check(
    "network error -> fallback",
    await getLoyaltyRules(async () => { throw new Error("down") }),
    FALLBACK_RULES,
  )
  check(
    "live settings are mapped",
    await getLoyaltyRules(async () =>
      jsonResponse(200, {
        settings: {
          earn_rate_per_100_mur: 2,
          min_redeem_points: 150,
          welcome_bonus_points: 100,
          redeem_rate_mur_per_100_pts: 100,
        },
      }),
    ),
    { earnPer100: 2, minRedeem: 150, welcomeBonus: 100 },
  )
  check("500 -> fallback", await getLoyaltyRules(async () => jsonResponse(500, {})), FALLBACK_RULES)
  check(
    "bad shape -> fallback",
    await getLoyaltyRules(async () => jsonResponse(200, { settings: { earn_rate_per_100_mur: "5" } })),
    FALLBACK_RULES,
  )

  if (!ok) process.exit(1)
  console.log("loyalty-rules: all checks passed")
}

main()

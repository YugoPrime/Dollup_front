// Doll Rewards rules as the shop has them right now, for server-rendered copy
// (/loyalty, home teaser). Read from GET /store/loyalty/settings so a rate
// change in the admin shows on the site within 5 minutes, no deploy needed.

export type LoyaltyRules = { earnPer100: number; minRedeem: number; welcomeBonus: number }

// Used only when the shop can't be reached. Matches the rules live from 1 Dec 2026.
export const FALLBACK_RULES: LoyaltyRules = { earnPer100: 5, minRedeem: 150, welcomeBonus: 100 }

type FetchLike = (input: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0

export async function getLoyaltyRules(fetchImpl: FetchLike = fetch): Promise<LoyaltyRules> {
  try {
    const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? ""
    const res = await fetchImpl(`${base}/store/loyalty/settings`, {
      headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return FALLBACK_RULES
    const body = (await res.json()) as { settings?: Record<string, unknown> }
    const s = body?.settings ?? {}
    const earn = s.earn_rate_per_100_mur
    const min = s.min_redeem_points
    const welcome = s.welcome_bonus_points
    if (!isCount(earn) || !isCount(min) || !isCount(welcome)) return FALLBACK_RULES
    return { earnPer100: earn, minRedeem: min, welcomeBonus: welcome }
  } catch {
    return FALLBACK_RULES
  }
}

/** Points earned on a spend: floor(spend * rate / 100). */
export function pointsFor(spendMur: number, rules: LoyaltyRules): number {
  return Math.floor((spendMur * rules.earnPer100) / 100)
}

/** Smallest Rs 100 step where the welcome bonus plus one order reaches the redeem minimum. */
export function unlockSpend(rules: LoyaltyRules): number {
  if (rules.earnPer100 <= 0) return 0
  for (let spend = 100; spend <= 100_000; spend += 100) {
    if (rules.welcomeBonus + pointsFor(spend, rules) >= rules.minRedeem) return spend
  }
  return 0
}

/** What a member's balance gets her: money off from the minimum, else how far she is from it. */
export function balanceLine(balance: number, minRedeem: number): string {
  if (balance >= minRedeem) return `Worth Rs ${formatInt(balance)} off at checkout.`;
  return `${formatInt(minRedeem - balance)} more points to unlock Rs ${formatInt(minRedeem)} off.`;
}

/** 1830 -> "1,830". Plain string maths: no locale data, same on server and browser. */
export function formatInt(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 24 Days of Doll Up: the single source of truth for the advent lineup and
// its Mauritius-time rules. Client-safe (checkout.ts imports only types).
import { muDateParts, shippingOptionToDeliveryMethod } from "./checkout"

export type DoorKind = "category" | "happy-hour" | "free-postage" | "free-delivery" | "gift" | "double-points"
export type DoorGift = {
  productId: string
  name: string
  thumbnail: string | null
  adultOnly: boolean
  variants: readonly { id: string; label: string }[]
}
export type Door = {
  day: number
  kind: DoorKind
  label: string
  detail: string
  href: string
  amountOff?: number
  categoryHandles?: readonly string[]
  percentOff?: number
  gift?: DoorGift
  excludeProductIds?: readonly string[]
}
export type AdventPhase = "teaser" | "running" | "ended"
export type DoorState = "locked" | "today" | "past"
export type HappyHourState = "later" | "live" | "over"
export type BarCopy = { lead: string; href: string | null; tail: string | null }

const MU_OFFSET_MS = 4 * 60 * 60 * 1000
const COD = "Cash on delivery available"
const ADVENT_YEAR = 2026
const ADVENT_MONTH = 11 // December, 0-based
const HAPPY_HOUR_START = 20
const HAPPY_HOUR_END = 22

const BOOB_TAPE: DoorGift = {
  productId: "prod_01KQPN0YQFEWSA0WXYAQX0N4YF",
  name: "boob tape",
  thumbnail: "https://cdn.dollupboutique.com/products/is1361/is1361-nude-main.jpg",
  adultOnly: false,
  variants: [
    { id: "variant_01KQPN0YQZ8J30EAEV0G0TNG10", label: "Nude" },
    { id: "variant_01KQPN0YQZBZETNGFKF0ANA3T0", label: "Black" },
  ],
}
const NIPPLE_COVERS: DoorGift = {
  productId: "prod_01KQPN0ZV4VXMTY4DVRFWSVZ34",
  name: "nipple covers",
  thumbnail: "https://cdn.dollupboutique.com/products/is1362/is1362-nude-front.png",
  adultOnly: false,
  variants: [
    { id: "variant_01KQPN0ZVQ2QM620BW443PK2SN", label: "Nude" },
    { id: "variant_01KQPN0ZVQS98MPZ78BBQEFG2T", label: "Brown" },
  ],
}
// Red is sold out and deliberately left out.
const HANDCUFFS: DoorGift = {
  productId: "prod_01KQPN975A65QJVMVFX47DEXBQ",
  name: "handcuffs",
  thumbnail: null,
  adultOnly: true,
  variants: [
    { id: "variant_01KQPN97642XQH1X9SSF5T3GEN", label: "Pink" },
    { id: "variant_01M5F22MHPMVVE7PX1Q00PC349", label: "Black" },
    { id: "variant_01M5F22XWCZ1KS7D0CXTWSYH03", label: "Purple" },
  ],
}

type Template = Omit<Door, "day">

const T = {
  boobTape: { kind: "gift", label: "Free boob tape with any order", detail: "Pick Nude or Black in your bag. Website orders only, while stocks last.", href: "/shop", gift: BOOB_TAPE },
  freePostage: { kind: "free-postage", label: "Free postage", detail: "Registered post anywhere in Mauritius, free on website orders today.", href: "/shop" },
  lingerie75: { kind: "category", label: "Rs 75 off every lingerie piece", detail: "Every lingerie piece, on website orders today.", href: "/shop?category=lingerie", amountOff: 75, categoryHandles: ["lingerie", "pajamas"] },
  happyHour: { kind: "happy-hour", label: "Happy hour: 20% off everything", detail: "Tonight 8–10pm only, on website orders.", href: "/shop", percentOff: 20 },
  dress100: { kind: "category", label: "Rs 100 off every dress", detail: "Every dress, on website orders today.", href: "/shop?category=dresses", amountOff: 100, categoryHandles: ["dresses"] },
  beachwear100: { kind: "category", label: "Rs 100 off all beachwear", detail: "Bikinis, one-pieces and cover-ups, on website orders today.", href: "/shop?category=beachwear", amountOff: 100, categoryHandles: ["beachwear", "bikini-sets", "cover-ups", "one-pieces"] },
  doublePoints: { kind: "double-points", label: "Double points", detail: "Double Doll Rewards points on website orders today. Sign in before you check out to collect.", href: "/shop" },
  freeDelivery: { kind: "free-delivery", label: "Free home delivery, any amount", detail: "No minimum spend today, on website orders.", href: "/shop" },
  twoPiece100: { kind: "category", label: "Rs 100 off two-pieces & jumpsuits", detail: "Two-piece sets and jumpsuits, on website orders today.", href: "/shop?category=two-piece-outfits", amountOff: 100, categoryHandles: ["two-piece-outfits", "jumpsuits"] },
  nippleCovers: { kind: "gift", label: "Free nipple covers with any order", detail: "Pick Nude or Brown in your bag. Website orders only, while stocks last.", href: "/shop", gift: NIPPLE_COVERS },
  handcuffs: { kind: "gift", label: "Free handcuffs with any order (18+)", detail: "Add them in your bag. 18+ only, website orders, while stocks last.", href: "/shop", gift: HANDCUFFS },
  dress150: { kind: "category", label: "Rs 150 off every dress", detail: "Bonus weekend: every dress, on website orders today.", href: "/shop?category=dresses", amountOff: 150, categoryHandles: ["dresses"] },
  lingerie100: { kind: "category", label: "Rs 100 off every lingerie piece", detail: "Bonus weekend: every lingerie piece, on website orders today.", href: "/shop?category=lingerie", amountOff: 100, categoryHandles: ["lingerie", "pajamas"] },
  beachDay: { kind: "category", label: "Rs 100 off all beachwear", detail: "Christmas Day is a beach day. On website orders today.", href: "/shop?category=beachwear", amountOff: 100, categoryHandles: ["beachwear", "bikini-sets", "cover-ups", "one-pieces"] },
} satisfies Record<string, Template>

const LINEUP: readonly Template[] = [
  T.boobTape, T.freePostage, T.lingerie75, T.happyHour, T.dress100, T.beachwear100,
  T.doublePoints, T.freeDelivery, T.twoPiece100, T.nippleCovers, T.happyHour, T.handcuffs,
  T.dress100, T.doublePoints, T.freeDelivery, T.freePostage, T.beachwear100, T.happyHour,
  T.dress150, T.lingerie100, T.doublePoints, T.boobTape, T.freeDelivery, T.beachDay,
]

export const ADVENT: {
  name: "24 Days of Doll Up"
  path: "/advent"
  startsAt: "2026-12-01T00:00:00+04:00"
  endsAt: "2026-12-24T23:59:59+04:00"
  doors: readonly Door[]
} = {
  name: "24 Days of Doll Up",
  path: "/advent",
  startsAt: "2026-12-01T00:00:00+04:00",
  endsAt: "2026-12-24T23:59:59+04:00",
  doors: LINEUP.map((t, i) => ({ day: i + 1, ...t })),
}

const START_MS = Date.parse(ADVENT.startsAt)
const END_MS = Date.parse(ADVENT.endsAt) + 1000

const LOADED_AT = Date.now()
/** Dev-only fake clock: NEXT_PUBLIC_ADVENT_FAKE_NOW, ignored in production. */
export function adventNowMs(): number {
  const fake = process.env.NODE_ENV === "production" ? undefined : process.env.NEXT_PUBLIC_ADVENT_FAKE_NOW
  return fake ? Date.parse(fake) + (Date.now() - LOADED_AT) : Date.now()
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Orderable key for a MU calendar day. */
function muDayKey(year: number, month: number, day: number): number {
  return (year * 12 + month) * 32 + day
}

export function adventPhase(now: number): AdventPhase {
  if (now < START_MS) return "teaser"
  return now < END_MS ? "running" : "ended"
}

export function doorOfDay(day: number): Door {
  const door = ADVENT.doors[day - 1]
  if (!Number.isInteger(day) || !door) throw new RangeError(`No advent door ${day}`)
  return door
}

export function todaysDoor(now: number): Door | null {
  if (adventPhase(now) !== "running") return null
  return doorOfDay(muDateParts(new Date(now)).day)
}

export function doorState(day: number, now: number): DoorState {
  const { year, month, day: today } = muDateParts(new Date(now))
  const nowKey = muDayKey(year, month, today)
  const doorKey = muDayKey(ADVENT_YEAR, ADVENT_MONTH, day)
  if (nowKey < doorKey) return "locked"
  return nowKey === doorKey ? "today" : "past"
}

export function happyHourState(door: Door, now: number): HappyHourState | null {
  if (door.kind !== "happy-hour") return null
  const state = doorState(door.day, now)
  if (state === "locked") return "later"
  if (state === "past") return "over"
  const { hour } = muDateParts(new Date(now))
  if (hour < HAPPY_HOUR_START) return "later"
  return hour < HAPPY_HOUR_END ? "live" : "over"
}

export function doorWindow(door: Door): { startsAt: string; endsAt: string } {
  const date = `${ADVENT_YEAR}-${pad2(ADVENT_MONTH + 1)}-${pad2(door.day)}`
  if (door.kind === "happy-hour") {
    return { startsAt: `${date}T${HAPPY_HOUR_START}:00:00+04:00`, endsAt: `${date}T${HAPPY_HOUR_END - 1}:59:59+04:00` }
  }
  return { startsAt: `${date}T00:00:00+04:00`, endsAt: `${date}T23:59:59+04:00` }
}

export function doorCode(day: number, test = false): string {
  return `ADVENT-${test ? "TEST-" : ""}${pad2(day)}`
}

/** Today's door discount on a product, in rupees. null when no door applies. */
export function doorPrice(
  p: { amount: number; categoryHandles: readonly string[]; productId?: string },
  now: number,
): { price: number; tag: string } | null {
  const door = todaysDoor(now)
  if (!door) return null
  if (door.kind === "happy-hour") {
    if (happyHourState(door, now) !== "live" || !door.percentOff) return null
    return { price: Math.round(p.amount * (1 - door.percentOff / 100)), tag: `−${door.percentOff}% tonight` }
  }
  if (door.kind !== "category" || !door.amountOff) return null
  if (p.productId && door.excludeProductIds?.includes(p.productId)) return null
  if (!p.categoryHandles.some((h) => door.categoryHandles?.includes(h))) return null
  return { price: Math.max(0, p.amount - door.amountOff), tag: `−Rs ${door.amountOff} today` }
}

export function shippingDoorFree(optionName: string, now: number): boolean {
  const door = todaysDoor(now)
  if (!door) return false
  const method = shippingOptionToDeliveryMethod(optionName)
  if (door.kind === "free-postage") return method === "Postage"
  if (door.kind === "free-delivery") return method === "Home Delivery"
  return false
}

export function seasonalNavLink(now: number): { label: string; href: string } | null {
  return adventPhase(now) === "ended" ? null : { label: "Advent calendar", href: ADVENT.path }
}

/** Ms until the next door opens (MU midnight), or until the calendar opens. */
export function msUntilNextDoor(now: number): number | null {
  const phase = adventPhase(now)
  if (phase === "teaser") return START_MS - now
  if (phase === "ended") return null
  const { year, month, day } = muDateParts(new Date(now))
  if (day >= ADVENT.doors.length) return null
  return Date.UTC(year, month, day + 1) - MU_OFFSET_MS - now
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function muDayLabel(day: number): string {
  const dow = new Date(Date.UTC(ADVENT_YEAR, ADVENT_MONTH, day)).getUTCDay()
  return `${WEEKDAYS[dow]} ${day} December`
}

export function adventBarKey(now: number): string {
  const phase = adventPhase(now)
  if (phase === "teaser") return "teaser"
  if (phase === "ended") return "evergreen"
  const door = todaysDoor(now)!
  const hh = happyHourState(door, now)
  return `door-${pad2(door.day)}${hh ? `-${hh}` : ""}`
}

export function adventBarCopy(key: string): BarCopy {
  const m = /^door-(\d{2})(?:-(later|live|over))?$/.exec(key)
  if (!m) {
    if (key === "teaser") return { lead: "The advent calendar opens Tue 1 Dec →", href: ADVENT.path, tail: COD }
    return { lead: "Free delivery on orders Rs.1500+", href: null, tail: COD }
  }
  const door = doorOfDay(Number(m[1]))
  const hh = m[2] as HappyHourState | undefined
  if (hh === "later") return { lead: "Tonight 8–10pm · 20% off everything →", href: door.href, tail: COD }
  if (hh === "live") return { lead: "Happy hour · 20% off everything until 10pm →", href: door.href, tail: COD }
  if (hh === "over") return { lead: `Door ${door.day + 1} opens at midnight`, href: ADVENT.path, tail: COD }
  const lead = door.kind === "double-points"
    ? `Door ${door.day} · Double points today · sign in to collect →`
    : `Door ${door.day} · ${door.label} today →`
  return { lead, href: door.href, tail: door.kind === "free-postage" ? null : COD }
}

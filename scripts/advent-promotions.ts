// Owner-run: creates the 24 Days of Doll Up promotions in Medusa.
//   npx tsx scripts/advent-promotions.ts                      dry run (read-only)
//   npx tsx scripts/advent-promotions.ts --verify             read-only check of live ADVENT-NN promotions
//   npx tsx scripts/advent-promotions.ts --apply              WRITES: create campaigns + promotions, then verify
//   npx tsx scripts/advent-promotions.ts --test --tester-email <email> [--minutes 90]
//                                                             WRITES: tester group + test copies of doors 1,2,6,8,11,12
//   npx tsx scripts/advent-promotions.ts --cleanup-test       WRITES: delete ADVENT-TEST-* + test campaigns
//   npx tsx scripts/advent-promotions.ts --delete             WRITES: delete ADVENT-NN + advent-2026-door-* campaigns
// Writes happen only when their flag is passed. Credentials are never printed.
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { ADVENT, doorCode, doorWindow, type Door } from "../src/lib/advent"
import { buildDoorPromotion, type DoorPromotion, type PromotionRule } from "../src/lib/advent-promotions"

type Json = Record<string, unknown>
type Mode = "dry" | "verify" | "apply" | "test" | "cleanup-test" | "delete"

const UA = "curl/8.5.0" // Cloudflare blocks default client user agents
const TEST_GROUP_NAME = "advent-testers"
const TEST_DAYS = [1, 2, 6, 8, 11, 12]
const PRICE_GRID = 5
const MAX_DISCOUNT_SHARE = 0.4

// ---------- env ----------
function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m) continue
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2")
  }
  return out
}

function loadEnv(): { base: string; publishableKey: string; email: string; password: string } {
  const local = parseEnvFile(resolve(process.cwd(), ".env.local"))
  let admin: Record<string, string> = {}
  if (!process.env.MEDUSA_ADMIN_EMAIL || !process.env.MEDUSA_ADMIN_PASSWORD) {
    let dir = resolve(process.cwd())
    for (;;) {
      const candidate = join(dir, "dollup-admin", ".env.local")
      if (existsSync(candidate)) { admin = parseEnvFile(candidate); break }
      const up = dirname(dir)
      if (up === dir) break
      dir = up
    }
  }
  const pick = (k: string, extra: Record<string, string> = {}): string | undefined => process.env[k] ?? local[k] ?? extra[k]
  const base = pick("NEXT_PUBLIC_MEDUSA_BACKEND_URL")
  const publishableKey = pick("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
  const email = pick("MEDUSA_ADMIN_EMAIL", admin)
  const password = pick("MEDUSA_ADMIN_PASSWORD", admin)
  if (!base || !publishableKey) throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
  if (!email || !password) throw new Error("Missing MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD (env or dollup-admin/.env.local)")
  return { base: base.replace(/\/+$/, ""), publishableKey, email, password }
}

// ---------- args ----------
const argv = process.argv.slice(2)
const flag = (n: string): boolean => argv.includes(`--${n}`)
const opt = (n: string): string | undefined => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const MODE_FLAGS = ["verify", "apply", "test", "cleanup-test", "delete"] as const
const requested = MODE_FLAGS.filter(flag)
if (requested.length > 1) {
  console.error(`Pick one mode, got: ${requested.map((m) => `--${m}`).join(" ")}`)
  process.exit(2)
}
const mode: Mode = requested[0] ?? "dry"
const WRITES_ENABLED = mode === "apply" || mode === "test" || mode === "cleanup-test" || mode === "delete"

const env = loadEnv()

// ---------- http ----------
const asObj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {})
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

async function http(method: string, path: string, opts: { token?: string; body?: unknown; store?: boolean } = {}): Promise<Json> {
  const isLogin = method === "POST" && path === "/auth/user/emailpass"
  if (method !== "GET" && !isLogin && !WRITES_ENABLED) throw new Error(`Refusing ${method} ${path}: this mode is read-only`)
  const headers: Record<string, string> = { "User-Agent": UA, "Content-Type": "application/json" }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.store) headers["x-publishable-api-key"] = env.publishableKey
  const res = await fetch(env.base + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${res.status} ${text.slice(0, 300)}`)
  return text ? (JSON.parse(text) as Json) : {}
}

async function login(): Promise<string> {
  const data = await http("POST", "/auth/user/emailpass", { body: { email: env.email, password: env.password } })
  if (typeof data.token !== "string") throw new Error("Login returned no token")
  return data.token
}

// ---------- admin reads ----------
const PROMO_FIELDS = [
  "id", "code", "type", "is_automatic", "status",
  "*campaign", "*rules", "*rules.values", "*application_method",
  "*application_method.target_rules", "*application_method.target_rules.values",
  "*application_method.buy_rules", "*application_method.buy_rules.values",
].join(",")

async function listAll(token: string, path: string, key: string, fields: string): Promise<Json[]> {
  const out: Json[] = []
  for (let offset = 0; ; offset += 100) {
    const d = await http("GET", `${path}?limit=100&offset=${offset}&fields=${encodeURIComponent(fields)}`, { token })
    const rows = asArr(d[key]).map(asObj)
    out.push(...rows)
    if (rows.length < 100) return out
  }
}

async function resolveCategories(token: string): Promise<Record<string, string>> {
  const handles = [...new Set(ADVENT.doors.flatMap((d) => d.categoryHandles ?? []))]
  const rows = await listAll(token, "/admin/product-categories", "product_categories", "id,handle")
  const map: Record<string, string> = {}
  for (const r of rows) {
    if (typeof r.handle === "string" && typeof r.id === "string" && handles.includes(r.handle)) map[r.handle] = r.id
  }
  const missing = handles.filter((h) => !map[h])
  if (missing.length) throw new Error(`Category handles not found in Medusa: ${missing.join(", ")}`)
  return map
}

const listPromotions = (token: string): Promise<Json[]> => listAll(token, "/admin/promotions", "promotions", PROMO_FIELDS)
const listCampaigns = (token: string): Promise<Json[]> => listAll(token, "/admin/campaigns", "campaigns", "id,name,campaign_identifier,starts_at,ends_at")

const isAdventPromo = (code: unknown): boolean => typeof code === "string" && code.startsWith("ADVENT-")
const isRealCode = (code: unknown): boolean => typeof code === "string" && /^ADVENT-\d{2}$/.test(code)
const isAdventCampaign = (id: unknown): boolean => typeof id === "string" && id.startsWith("advent-2026-")

// ---------- payloads ----------
function allPayloads(ids: Record<string, string>): { door: Door; p: DoorPromotion }[] {
  const out: { door: Door; p: DoorPromotion }[] = []
  for (const door of ADVENT.doors) {
    const p = buildDoorPromotion(door, { categoryIdByHandle: ids })
    if (p) out.push({ door, p })
  }
  return out
}

const utc = (iso: string): string => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z")

function describeTargets(p: DoorPromotion): string {
  const am = p.promotion.application_method
  const fmt = (label: string, r: unknown): string => {
    const o = asObj(r)
    return `${label}${String(o.attribute).replace(/^(items|shipping_methods)./, "")} ${String(o.operator)} ${asArr(o.values).join("|")}`
  }
  const bits = [...asArr(am.buy_rules).map((r) => fmt("buy:", r)), ...asArr(am.target_rules).map((r) => fmt("", r))]
  return bits.join("; ") || "-"
}

function printRows(rows: { door: Door; p: DoorPromotion }[]): void {
  for (const { door, p } of rows) {
    const am = p.promotion.application_method
    const value = am.type === "fixed" ? `Rs ${String(am.value)} off` : `${String(am.value)}%`
    const s = p.campaign.starts_at
    const e = p.campaign.ends_at
    const us = utc(s)
    const ue = utc(e)
    const ueShown = us.slice(0, 10) === ue.slice(0, 10) ? ue.slice(11) : ue
    console.log(`door ${String(door.day).padStart(2)}  ${p.promotion.code.padEnd(10)} ${door.kind.padEnd(13)} MU ${s.slice(0, 19)} -> ${e.slice(11, 19)}  UTC ${us} -> ${ueShown}  ${value}  [${describeTargets(p)}]`)
  }
}

// ---------- verify ----------
function ruleValues(r: Json): string[] {
  const v = r.values
  const list = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]
  return list.map((x) => (typeof x === "object" && x ? String(asObj(x).value) : String(x))).sort()
}
const normRules = (rules: unknown): string => JSON.stringify(asArr(rules).map(asObj).map((r) => [r.attribute, r.operator, ruleValues(r)]).sort())
const expRules = (rules: unknown): string => JSON.stringify((asArr(rules) as PromotionRule[]).map((r) => [r.attribute, r.operator, [...r.values].sort()]).sort())

function compare(exp: DoorPromotion, live: Json): string[] {
  const bad: string[] = []
  const ep = exp.promotion
  const eam = ep.application_method
  const am = asObj(live.application_method)
  const camp = asObj(live.campaign)
  if (live.type !== ep.type) bad.push(`type ${String(live.type)} != ${ep.type}`)
  if (live.is_automatic !== true) bad.push("not automatic")
  if (live.status !== "active") bad.push(`status ${String(live.status)}`)
  if (camp.campaign_identifier !== exp.campaign.campaign_identifier) bad.push(`campaign ${String(camp.campaign_identifier)}`)
  if (Date.parse(String(camp.starts_at)) !== Date.parse(exp.campaign.starts_at)) bad.push(`starts_at ${String(camp.starts_at)}`)
  if (Date.parse(String(camp.ends_at)) !== Date.parse(exp.campaign.ends_at)) bad.push(`ends_at ${String(camp.ends_at)}`)
  if (normRules(live.rules) !== expRules(ep.rules)) bad.push(`rules ${normRules(live.rules)} != ${expRules(ep.rules)}`)
  for (const k of ["type", "target_type", "allocation", "currency_code"]) {
    if (eam[k] !== undefined && am[k] !== eam[k]) bad.push(`${k} ${String(am[k])} != ${String(eam[k])}`)
  }
  for (const k of ["value", "max_quantity", "apply_to_quantity", "buy_rules_min_quantity"]) {
    if (eam[k] !== undefined && Number(am[k]) !== Number(eam[k])) bad.push(`${k} ${String(am[k])} != ${String(eam[k])}`)
  }
  for (const k of ["target_rules", "buy_rules"]) {
    if (normRules(am[k]) !== expRules(eam[k])) bad.push(`${k} ${normRules(am[k])} != ${expRules(eam[k])}`)
  }
  return bad
}

async function verify(token: string, ids: Record<string, string>): Promise<boolean> {
  const live = new Map((await listPromotions(token)).map((p) => [String(p.code), p]))
  let good = true
  for (const { p } of allPayloads(ids)) {
    const row = live.get(p.promotion.code)
    if (!row) { console.log(`MISSING   ${p.promotion.code}`); good = false; continue }
    const bad = compare(p, row)
    if (bad.length) { console.log(`MISMATCH  ${p.promotion.code}: ${bad.join("; ")}`); good = false } else console.log(`OK        ${p.promotion.code}`)
  }
  console.log(good ? "VERIFY: all 21 OK" : "VERIFY: problems found")
  return good
}

// ---------- price check (dry run) ----------
async function priceCheck(): Promise<void> {
  console.log("\n== Price check (store API, in-stock products) ==")
  const regions = asArr((await http("GET", "/store/regions", { store: true })).regions).map(asObj)
  const region =
    regions.find((r) => asArr(r.countries).some((c) => asObj(c).iso_2 === "mu")) ??
    regions.find((r) => String(r.currency_code).toLowerCase() === "mur")
  if (!region) { console.log("No Mauritius region found; skipping."); return }
  const products: Json[] = []
  const fields = "id,handle,*categories,*variants,+variants.inventory_quantity,*variants.calculated_price"
  for (let offset = 0; ; offset += 100) {
    const d = await http("GET", `/store/products?limit=100&offset=${offset}&region_id=${String(region.id)}&fields=${encodeURIComponent(fields)}`, { store: true })
    const rows = asArr(d.products).map(asObj)
    products.push(...rows)
    if (rows.length < 100) break
  }
  console.log(`${products.length} products fetched (region ${String(region.id)})`)
  const priced = products.map((p) => {
    const inStock = asArr(p.variants).map(asObj).filter((v) => v.manage_inventory === false || Number(v.inventory_quantity) > 0)
    const prices = inStock.map((v) => Number(asObj(v.calculated_price).calculated_amount)).filter((n) => Number.isFinite(n))
    return {
      id: String(p.id),
      handle: String(p.handle),
      price: prices.length ? Math.min(...prices) : null,
      handles: asArr(p.categories).map((c) => String(asObj(c).handle)),
    }
  })
  const off = priced.filter((x) => x.price !== null && x.price % PRICE_GRID !== 0)
  console.log(`\nOff the Rs ${PRICE_GRID} grid (in stock, any category): ${off.length}`)
  for (const x of off) console.log(`  ${x.handle}  ${x.id}  Rs ${String(x.price)}`)

  console.log(`\nDiscount > ${MAX_DISCOUNT_SHARE * 100}% of price (in-stock products in category doors):`)
  let total = 0
  for (const door of ADVENT.doors) {
    const off = door.amountOff
    if (door.kind !== "category" || !off) continue
    const hit = priced.filter(
      (x) =>
        x.price !== null &&
        !door.excludeProductIds?.includes(x.id) &&
        x.handles.some((h) => door.categoryHandles?.includes(h)) &&
        off / x.price > MAX_DISCOUNT_SHARE,
    )
    if (!hit.length) { console.log(`  door ${door.day} (Rs ${off} off): none`); continue }
    console.log(`  door ${door.day} (Rs ${off} off):`)
    for (const x of hit) {
      total++
      console.log(`    ${x.handle}  ${x.id}  Rs ${String(x.price)}  (${Math.round((off / (x.price as number)) * 100)}%)`)
    }
  }
  console.log(`  total ${total}`)
}

// ---------- modes ----------
async function reportExisting(token: string): Promise<void> {
  const promos = (await listPromotions(token)).filter((p) => isAdventPromo(p.code))
  const camps = (await listCampaigns(token)).filter((c) => isAdventCampaign(c.campaign_identifier))
  if (!promos.length && !camps.length) { console.log("No existing ADVENT codes or advent-2026-* campaigns."); return }
  for (const p of promos) console.log(`existing promotion ${String(p.code)} (${String(p.id)})`)
  for (const c of camps) console.log(`existing campaign ${String(c.campaign_identifier)} (${String(c.id)})`)
}

async function createOne(token: string, p: DoorPromotion, existing: Map<string, string>): Promise<void> {
  let campaignId = existing.get(p.campaign.campaign_identifier)
  if (campaignId) console.log(`  reusing campaign ${p.campaign.campaign_identifier}`)
  else {
    const c = asObj((await http("POST", "/admin/campaigns", { token, body: p.campaign })).campaign)
    campaignId = String(c.id)
    existing.set(p.campaign.campaign_identifier, campaignId)
  }
  const pr = asObj((await http("POST", "/admin/promotions", { token, body: { ...p.promotion, campaign_id: campaignId } })).promotion)
  console.log(`  CREATED ${p.promotion.code} promo=${String(pr.id)} campaign=${campaignId}`)
}

async function deleteMatching(token: string, promoTest: (code: string) => boolean, campTest: (id: string) => boolean): Promise<void> {
  for (const p of await listPromotions(token)) {
    if (typeof p.code === "string" && promoTest(p.code)) {
      await http("DELETE", `/admin/promotions/${String(p.id)}`, { token })
      console.log(`  deleted promotion ${p.code}`)
    }
  }
  for (const c of await listCampaigns(token)) {
    if (typeof c.campaign_identifier === "string" && campTest(c.campaign_identifier)) {
      await http("DELETE", `/admin/campaigns/${String(c.id)}`, { token })
      console.log(`  deleted campaign ${c.campaign_identifier}`)
    }
  }
}

async function main(): Promise<void> {
  const token = await login()

  if (mode === "cleanup-test") return deleteMatching(token, (c) => c.startsWith("ADVENT-TEST-"), (i) => i.startsWith("advent-2026-test-door-"))
  if (mode === "delete") return deleteMatching(token, (c) => isRealCode(c), (i) => /^advent-2026-door-\d{2}$/.test(i))

  const ids = await resolveCategories(token)

  if (mode === "verify") {
    if (!(await verify(token, ids))) process.exit(1)
    return
  }

  if (mode === "apply") {
    const clash = (await listPromotions(token)).filter((p) => isRealCode(p.code)).map((p) => String(p.code))
    if (clash.length) throw new Error(`Refusing --apply: ${clash.length} ADVENT-NN codes already exist (${clash.slice(0, 5).join(", ")}). Run --delete first.`)
    const existing = new Map((await listCampaigns(token)).map((c) => [String(c.campaign_identifier), String(c.id)]))
    for (const { p } of allPayloads(ids)) {
      try { await createOne(token, p, existing) } catch (e) { console.error(`  FAILED ${p.promotion.code}: ${(e as Error).message}`); process.exitCode = 1 }
    }
    console.log("\nVerifying...")
    if (!(await verify(token, ids))) process.exit(1)
    return
  }

  if (mode === "test") {
    const email = opt("tester-email")
    if (!email) throw new Error("--test needs --tester-email <email>")
    const minutes = Number(opt("minutes") ?? 90)
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("--minutes must be a positive number")
    const found = asArr((await http("GET", `/admin/customers?email=${encodeURIComponent(email)}&fields=id,email`, { token })).customers).map(asObj)
    const customer = found.find((c) => String(c.email).toLowerCase() === email.toLowerCase())
    if (!customer) throw new Error(`No customer with email ${email}`)
    const groups = asArr((await http("GET", `/admin/customer-groups?name=${TEST_GROUP_NAME}&fields=id,name`, { token })).customer_groups).map(asObj)
    let groupId = String(groups.find((g) => g.name === TEST_GROUP_NAME)?.id ?? "")
    if (!groupId) groupId = String(asObj((await http("POST", "/admin/customer-groups", { token, body: { name: TEST_GROUP_NAME } })).customer_group).id)
    await http("POST", `/admin/customer-groups/${groupId}/customers`, { token, body: { add: [String(customer.id)] } })
    console.log(`Tester group ${TEST_GROUP_NAME}=${groupId} now includes the tester customer.`)
    const now = Date.now()
    const mu = (ms: number): string => new Date(ms + 4 * 3600_000).toISOString().replace(/\.\d{3}Z$/, "+04:00")
    const window = { startsAt: mu(now), endsAt: mu(now + minutes * 60_000) }
    const existing = new Map((await listCampaigns(token)).map((c) => [String(c.campaign_identifier), String(c.id)]))
    for (const day of TEST_DAYS) {
      const p = buildDoorPromotion(ADVENT.doors[day - 1], { categoryIdByHandle: ids }, { testerGroupId: groupId, ...window })
      if (!p) continue
      try { await createOne(token, p, existing) } catch (e) { console.error(`  FAILED ${p.promotion.code}: ${(e as Error).message}`); process.exitCode = 1 }
    }
    console.log(`Test window ${window.startsAt} -> ${window.endsAt}. Clean up with --cleanup-test.`)
    return
  }

  // dry run (read-only)
  console.log("== Advent promotions: DRY RUN, nothing is written ==\n")
  const rows = allPayloads(ids)
  printRows(rows)
  console.log(`\n${rows.length} promotions (no promotion for double-points days: ${ADVENT.doors.filter((d) => d.kind === "double-points").map((d) => d.day).join(", ")}).`)
  const d11 = doorWindow(ADVENT.doors[10])
  console.log(`Window check door 11: ${utc(d11.startsAt)} -> ${utc(d11.endsAt)}  (expect 2026-12-11T16:00:00Z -> 2026-12-11T17:59:59Z)`)
  console.log(`Codes: ${doorCode(1)} .. ${doorCode(24)}\n`)
  await reportExisting(token)
  await priceCheck()
  console.log("\nDRY RUN - nothing written. Re-run with --apply to create.")
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1) })

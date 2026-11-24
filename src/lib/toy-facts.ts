// Parses `product.metadata.toy_facts` (spec §8). Never throws: broken data means "no facts".
// Client-safe: no server-only imports.
import { AFTER_DARK_GROUPS, type AfterDarkGroup } from "./after-dark"

export type ToyStat = [value: string, caption: string]
export type ToyPower = { title: string; sub: string | null }
export type ToyFactsCore = {
  stats: ToyStat[]
  extras: string[]
  size: string | null
  power: ToyPower | null
  app: string | null
}
export type ToyFacts = ToyFactsCore & {
  card: string
  groups: AfterDarkGroup[]
  byOption: Record<string, Partial<ToyFactsCore>>
}

const MAX_STATS = 3
const MAX_EXTRAS = 3
const MAX_GROUPS = 2

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function text(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t === "" ? null : t
}

function parseStats(v: unknown): ToyStat[] {
  if (!Array.isArray(v)) return []
  const out: ToyStat[] = []
  for (const e of v) {
    if (!Array.isArray(e) || e.length !== 2) continue
    if (typeof e[0] !== "string" || typeof e[1] !== "string") continue
    const value = e[0].trim()
    if (value === "") continue
    out.push([value, e[1].trim()])
  }
  return out.slice(0, MAX_STATS)
}

function parseExtras(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const e of v) {
    const t = text(e)
    if (t) out.push(t)
  }
  return out.slice(0, MAX_EXTRAS)
}

function parsePower(v: unknown): ToyPower | null {
  if (!isRecord(v)) return null
  const title = text(v.title)
  if (!title) return null
  return { title, sub: typeof v.sub === "string" ? v.sub : null }
}

function parseGroups(v: unknown): AfterDarkGroup[] {
  if (!Array.isArray(v)) return []
  const valid = AFTER_DARK_GROUPS.map((g) => g.key)
  const out: AfterDarkGroup[] = []
  for (const e of v) {
    if (typeof e !== "string") continue
    const key = e.trim().toLowerCase() as AfterDarkGroup
    if (valid.includes(key) && !out.includes(key)) out.push(key)
  }
  return out.slice(0, MAX_GROUPS)
}

function parseOverride(v: unknown): Partial<ToyFactsCore> | null {
  if (!isRecord(v)) return null
  const out: Partial<ToyFactsCore> = {}
  if ("stats" in v) out.stats = parseStats(v.stats)
  if ("extras" in v) out.extras = parseExtras(v.extras)
  if ("size" in v) out.size = text(v.size)
  if ("power" in v) out.power = parsePower(v.power)
  if ("app" in v) out.app = text(v.app)
  return out
}

export function parseToyFacts(metadata: unknown): ToyFacts | null {
  if (!isRecord(metadata)) return null
  let raw = metadata.toy_facts
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!isRecord(raw) || raw.v !== 1) return null

  const byOption: Record<string, Partial<ToyFactsCore>> = {}
  if (isRecord(raw.by_option)) {
    for (const [key, entry] of Object.entries(raw.by_option)) {
      const o = parseOverride(entry)
      if (o) byOption[key] = o
    }
  }

  return {
    stats: parseStats(raw.stats),
    extras: parseExtras(raw.extras),
    size: text(raw.size),
    power: parsePower(raw.power),
    app: text(raw.app),
    card: typeof raw.card === "string" ? raw.card.trim() : "",
    groups: parseGroups(raw.groups),
    byOption,
  }
}

export function resolveToyFacts(facts: ToyFacts, selectedValues: string[]): ToyFactsCore {
  const core: ToyFactsCore = {
    stats: [...facts.stats],
    extras: [...facts.extras],
    size: facts.size,
    power: facts.power ? { ...facts.power } : null,
    app: facts.app,
  }
  const hit = selectedValues.find((v) => Object.hasOwn(facts.byOption, v))
  if (hit === undefined) return core
  const o = facts.byOption[hit]
  if (o.stats !== undefined) core.stats = [...o.stats]
  if (o.extras !== undefined) core.extras = [...o.extras]
  if (o.size !== undefined) core.size = o.size
  if (o.power !== undefined) core.power = o.power ? { ...o.power } : null
  if (o.app !== undefined) core.app = o.app
  return core
}

export function hasFactsContent(core: ToyFactsCore): boolean {
  return core.stats.length > 0 || core.extras.length > 0 || !!core.size || !!core.power || !!core.app
}

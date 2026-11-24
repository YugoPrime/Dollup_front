// After Dark rules: what counts as After Dark, page titles and WhatsApp texts.
// Client-safe: used by client components, so no server-only imports.
import { isColorName } from "./colors"
import { AFTER_DARK_CATEGORY_HANDLES } from "./products-order"
import { WHATSAPP_BASE } from "./restock"

export const AFTER_DARK_PATH = "/after-dark"
export const AFTER_DARK_DESCRIPTION = "A piece from the After Dark collection at Doll Up Boutique."
export const AFTER_DARK_HERO = {
  src: "/after-dark/hero-is2526.png",
  handle: "is2526",
  width: 480,
  height: 640,
} as const

export type AfterDarkScope = "exclude" | "only" | "all"
export type AfterDarkGroup = "her" | "him" | "couples" | "games" | "bondage"

export const AFTER_DARK_GROUPS: ReadonlyArray<{ key: AfterDarkGroup; label: string }> = [
  { key: "her", label: "For her" },
  { key: "him", label: "For him" },
  { key: "couples", label: "For couples" },
  { key: "games", label: "Games" },
  { key: "bondage", label: "Bondage" },
]

type CategoryLike = { categories?: Array<{ handle?: string | null } | null> | null }
type LineLike = { variant?: { product?: CategoryLike | null } | null }

export function isAfterDark(product: CategoryLike | null | undefined): boolean {
  return !!product?.categories?.some(
    (c) => !!c?.handle && AFTER_DARK_CATEGORY_HANDLES.includes(c.handle),
  )
}

export function applyAfterDarkScope<T extends CategoryLike>(products: T[], scope: AfterDarkScope): T[] {
  if (scope === "all") return products
  return products.filter((p) => isAfterDark(p) === (scope === "only"))
}

export function isAfterDarkLine(line: LineLike | null | undefined): boolean {
  return isAfterDark(line?.variant?.product)
}

export function withoutAfterDarkLines<T extends LineLike>(lines: T[]): T[] {
  return lines.filter((l) => !isAfterDarkLine(l))
}

export function afterDarkCode(product: { handle?: string | null; metadata?: unknown }): string {
  const meta = product.metadata
  const ref = meta && typeof meta === "object" ? (meta as Record<string, unknown>).ref : undefined
  const fromRef = typeof ref === "string" ? ref.trim() : ""
  return (fromRef || product.handle?.trim() || "").toUpperCase()
}

export function afterDarkPageTitle(code: string): string {
  return code ? `After Dark · ${code}` : "After Dark"
}

export function parseGroupParam(v: string | null | undefined): AfterDarkGroup | null {
  const key = v?.trim().toLowerCase()
  return AFTER_DARK_GROUPS.find((g) => g.key === key)?.key ?? null
}

// Groups that at least one item carries, in AFTER_DARK_GROUPS order (the chip row).
export function availableGroups(items: Array<{ groups: AfterDarkGroup[] }>): AfterDarkGroup[] {
  const present = new Set(items.flatMap((i) => i.groups))
  return AFTER_DARK_GROUPS.filter((g) => present.has(g.key)).map((g) => g.key)
}

// Items in `group`; `null` (the "All" chip) keeps everything. Order is preserved.
export function filterByGroup<T extends { groups: AfterDarkGroup[] }>(
  items: T[],
  group: AfterDarkGroup | null,
): T[] {
  return group ? items.filter((i) => i.groups.includes(group)) : items
}

const waUrl = (text: string) => `${WHATSAPP_BASE}?text=${encodeURIComponent(text)}`

export function askPrivatelyUrl(code?: string): string {
  return waUrl(
    code
      ? `Hi Doll Up! I have a question about ${code} from After Dark.`
      : "Hi Doll Up! I have a question about After Dark.",
  )
}

export function toyNotifyMeUrl(code: string, selection?: string): string {
  return waUrl(
    `Hi Doll Up! Please let me know when ${code}${selection ? ` (${selection})` : ""} is back in stock.`,
  )
}

export function newPiecesCount(
  products: Array<{ created_at?: string | null }>,
  nowMs: number,
  days = 30,
): number {
  const cutoff = nowMs - days * 86_400_000
  return products.filter((p) => {
    const t = p.created_at ? Date.parse(p.created_at) : NaN
    return Number.isFinite(t) && t >= cutoff
  }).length
}

export function afterDarkRedirect(
  categoryHandle: string | null | undefined,
  q?: string | null,
): string | null {
  const handle = categoryHandle?.trim().toLowerCase().replace(/\/+$/, "")
  if (!handle || !AFTER_DARK_CATEGORY_HANDLES.includes(handle)) return null
  const query = q?.trim()
  return query ? `${AFTER_DARK_PATH}?q=${encodeURIComponent(query)}` : AFTER_DARK_PATH
}

export type ToyOptionView = { id: string; title: string; label: "Colour" | "Choose"; values: string[] }

export function visibleToyOptions(
  options: Array<{
    id?: string | null
    title?: string | null
    values?: Array<{ value?: string | null } | null> | null
  }>,
): ToyOptionView[] {
  const out: ToyOptionView[] = []
  for (const o of options) {
    const values = [
      ...new Set((o.values ?? []).map((v) => v?.value?.trim() ?? "").filter(Boolean)),
    ]
    if (values.length < 2) continue
    const title = o.title ?? ""
    out.push({
      id: o.id || title.toLowerCase(),
      title,
      label: values.every(isColorName) ? "Colour" : "Choose",
      values,
    })
  }
  return out
}

// Which sizes a product card lists. Pure logic, no React.
import { canonicalColor } from "./color-buckets"
import { SIZE_RANK } from "./feed-labels"

export type CardSizeVariant = {
  manage_inventory?: boolean | null
  inventory_quantity?: number | null
  options?: ReadonlyArray<{
    value?: string | null
    option?: { title?: string | null } | null
  }> | null
}

const ONE_SIZE = new Set(["os", "one size", "onesize", "free size", "freesize", "free-size"])

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

export function isOneSizeLabel(label: string): boolean {
  return ONE_SIZE.has(norm(label))
}

function optionValue(v: CardSizeVariant, title: string): string | null {
  const o = v.options?.find((x) => norm(x.option?.title) === title)
  const value = o?.value?.trim()
  return value ? value : null
}

const isBuyable = (v: CardSizeVariant) =>
  !v.manage_inventory || (v.inventory_quantity ?? 0) > 0

const NUMERIC = /^\d+(\.\d+)?$/

// Ranked sizes first, then numbers ascending, then everything else A to Z.
function sortKey(label: string): [number, number, string] {
  const key = norm(label)
  if (key in SIZE_RANK) return [0, SIZE_RANK[key], ""]
  if (NUMERIC.test(key)) return [1, Number(key), ""]
  return [2, 0, key]
}

function compareSizes(a: string, b: string): number {
  const [ag, an, as] = sortKey(a)
  const [bg, bn, bs] = sortKey(b)
  return ag - bg || an - bn || (as < bs ? -1 : as > bs ? 1 : 0)
}

/** Size labels to show on a card, in order. `[]` means hide the row. */
export function cardSizes(
  variants: ReadonlyArray<CardSizeVariant> | null | undefined,
  color?: string | null,
): string[] {
  const group = (c: string) => canonicalColor(c) ?? norm(c)
  const list = variants ?? []
  // A colour filter only means something if the product has a colour option.
  const wanted =
    color && list.some((v) => optionValue(v, "color") !== null) ? group(color) : null
  const seen = new Map<string, string>()
  for (const v of list) {
    if (!isBuyable(v)) continue
    if (wanted !== null) {
      const vc = optionValue(v, "color")
      if (vc === null || group(vc) !== wanted) continue
    }
    const size = optionValue(v, "size")
    if (!size || isOneSizeLabel(size)) continue
    const key = norm(size)
    if (!seen.has(key)) seen.set(key, size)
  }
  return [...seen.values()].sort(compareSizes)
}

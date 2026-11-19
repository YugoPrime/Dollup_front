// Client-only preview clock so the owner can try the door UI before 1 Dec.
// Pure logic only: reading the URL and sessionStorage lives in
// src/components/advent/advent-preview-client.ts. Preview never changes a
// price: Medusa decides every total.
import { muDateParts } from "./checkout"

export const PREVIEW_PARAM = "advent_preview"
export const PREVIEW_KEY = "dub_advent_preview_v1"

export type StoredPreview = { iso: string; setAt: number }
export type PreviewParam = { kind: "set"; iso: string } | { kind: "off" } | null

// An ISO date-time that carries an explicit offset, e.g. 2026-12-12T10:00:00+04:00.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

/** Read the ?advent_preview value. A "+" in a URL decodes to a space, so put it back. */
export function parsePreviewParam(raw: string | null | undefined): PreviewParam {
  if (raw == null) return null
  const v = raw.trim().replace(/ /g, "+")
  if (v === "off") return { kind: "off" }
  if (!ISO_WITH_OFFSET.test(v) || !Number.isFinite(Date.parse(v))) return null
  return { kind: "set", iso: v }
}

export function parseStored(json: string | null | undefined): StoredPreview | null {
  if (!json) return null
  try {
    const o = JSON.parse(json) as Partial<StoredPreview>
    if (typeof o.iso !== "string" || typeof o.setAt !== "number" || !Number.isFinite(o.setAt)) return null
    return parsePreviewParam(o.iso)?.kind === "set" ? { iso: o.iso, setAt: o.setAt } : null
  } catch {
    return null
  }
}

/** Preview clock: the chosen instant plus the real time elapsed since it was set. */
export function previewNowMs(p: StoredPreview, realNow: number): number {
  return Date.parse(p.iso) + (realNow - p.setAt)
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Tue 1 Dec 00:05", Mauritius time. */
export function previewLabel(ms: number): string {
  const { month, day, hour, dow } = muDateParts(new Date(ms))
  const minute = new Date(ms + 4 * 60 * 60 * 1000).getUTCMinutes()
  const p2 = (n: number) => String(n).padStart(2, "0")
  return `${DAYS[dow]} ${day} ${MONTHS[month]} ${p2(hour)}:${p2(minute)}`
}

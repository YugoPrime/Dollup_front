// Covers the After Dark rules. Run with `npx tsx src/lib/after-dark.test.ts`.
import {
  afterDarkCode,
  afterDarkPageTitle,
  afterDarkRedirect,
  applyAfterDarkScope,
  askPrivatelyUrl,
  availableGroups,
  filterByGroup,
  isAfterDark,
  isAfterDarkLine,
  newPiecesCount,
  parseGroupParam,
  rankRelatedToys,
  toyNotifyMeUrl,
  visibleToyOptions,
  withoutAfterDarkLines,
} from "./after-dark"
import type { AfterDarkGroup } from "./after-dark"
import { WHATSAPP_BASE } from "./restock"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}
const cat = (...h: string[]) => ({ categories: h.map((handle) => ({ handle })) })

// isAfterDark
check("intimates", isAfterDark(cat("intimates")), true)
check("toys", isAfterDark(cat("toys")), true)
check("mixed", isAfterDark(cat("accessories", "intimates")), true)
check("lingerie", isAfterDark(cat("lingerie")), false)
check("null categories", isAfterDark({ categories: null }), false)
check("null product", isAfterDark(null), false)

// applyAfterDarkScope
const dress = { id: "dress", ...cat("dresses") }
const toy = { id: "toy", ...cat("toys") }
const bag = { id: "bag", ...cat("accessories") }
const toy2 = { id: "toy2", ...cat("accessories", "intimates") }
const all = [dress, toy, bag, toy2]
const ids = (l: { id: string }[]) => l.map((p) => p.id)
check("exclude", ids(applyAfterDarkScope(all, "exclude")), ["dress", "bag"])
check("only", ids(applyAfterDarkScope(all, "only")), ["toy", "toy2"])
check("all", applyAfterDarkScope(all, "all"), all)

// lines
const toyLine = { id: 1, variant: { product: cat("toys") } }
const dressLine = { id: 2, variant: { product: cat("dresses") } }
const bareLine = { id: 3, variant: null }
check("toy line", isAfterDarkLine(toyLine), true)
check("no variant", isAfterDarkLine(bareLine), false)
check("without lines", withoutAfterDarkLines([toyLine, dressLine, bareLine]).map((l) => l.id), [2, 3])

// mixed bag (cart-like): toys never reach tracking
const bagLines = [
  { id: "d", variant: { product: cat("dresses") } },
  { id: "t", variant: { product: cat("toys") } },
  { id: "b", variant: { product: cat("lingerie") } },
]
check("mixed bag keeps dress + bra", withoutAfterDarkLines(bagLines), [bagLines[0], bagLines[2]])
check("mixed bag ids", withoutAfterDarkLines(bagLines).map((l) => l.id), ["d", "b"])
check("toy-only bag is empty", withoutAfterDarkLines([bagLines[1]]), [])

// afterDarkCode / title
check("code handle", afterDarkCode({ handle: "is2526" }), "IS2526")
check("code ref", afterDarkCode({ handle: "x", metadata: { ref: " is2174 " } }), "IS2174")
check("code null", afterDarkCode({ handle: null }), "")
check("title", afterDarkPageTitle("IS2526"), "After Dark · IS2526")
check("title empty", afterDarkPageTitle(""), "After Dark")

// parseGroupParam
check("group her", parseGroupParam("her"), "her")
check("group HIM", parseGroupParam("HIM"), "him")
check("group x", parseGroupParam("x"), null)
check("group undefined", parseGroupParam(undefined), null)

// WhatsApp urls
const text = (u: string) => decodeURIComponent(u.slice((WHATSAPP_BASE + "?text=").length))
const a1 = askPrivatelyUrl("IS2526")
const a0 = askPrivatelyUrl()
check("ask prefix", [a1, a0].every((u) => u.startsWith(WHATSAPP_BASE + "?text=")), true)
check("ask code", text(a1), "Hi Doll Up! I have a question about IS2526 from After Dark.")
check("ask none", text(a0), "Hi Doll Up! I have a question about After Dark.")
check("notify sel", text(toyNotifyMeUrl("IS2555", "Licking")), "Hi Doll Up! Please let me know when IS2555 (Licking) is back in stock.")
check("notify none", text(toyNotifyMeUrl("IS2555")), "Hi Doll Up! Please let me know when IS2555 is back in stock.")

// newPiecesCount
const now = Date.parse("2026-12-01T00:00:00Z")
const ago = (d: number) => new Date(now - d * 86400000).toISOString()
check("new pieces", newPiecesCount([{ created_at: ago(29) }, { created_at: ago(31) }, { created_at: null }, {}], now), 1)
check("new pieces days", newPiecesCount([{ created_at: ago(5) }, { created_at: ago(9) }], now, 7), 1)

// afterDarkRedirect
check("redirect intimates", afterDarkRedirect("intimates"), "/after-dark")
check("redirect toys q", afterDarkRedirect("toys/", "rose"), "/after-dark?q=rose")
check("redirect case", afterDarkRedirect(" Toys "), "/after-dark")
check("redirect blank q", afterDarkRedirect("toys", "  "), "/after-dark")
check("redirect q encoded", afterDarkRedirect("toys", "a b"), "/after-dark?q=a%20b")
check("redirect lingerie", afterDarkRedirect("lingerie"), null)
check("redirect null", afterDarkRedirect(null), null)

// visibleToyOptions
const vals = (...v: (string | null)[]) => v.map((value) => ({ value }))
check("size OS", visibleToyOptions([{ title: "Size", values: vals("OS") }]), [])
check("default", visibleToyOptions([{ title: "Default", values: vals("Default") }]), [])
check("colour", visibleToyOptions([{ id: "o1", title: "Color", values: vals("Red", "Pink") }]),
  [{ id: "o1", title: "Color", label: "Colour", values: ["Red", "Pink"] }])
check("choose", visibleToyOptions([{ id: "o2", title: "Color", values: vals("Licking", "Sucking") }])[0]?.label, "Choose")
check("mixed is choose", visibleToyOptions([{ title: "X", values: vals("Red", "Licking") }])[0]?.label, "Choose")
check("dedupe + empty + id", visibleToyOptions([{ title: "Mode", values: vals("A", "A", "", null, "B") }]),
  [{ id: "mode", title: "Mode", label: "Choose", values: ["A", "B"] }])

// availableGroups / filterByGroup
const gi = [
  { id: "a", groups: ["her"] as AfterDarkGroup[] },
  { id: "b", groups: ["couples", "her"] as AfterDarkGroup[] },
  { id: "c", groups: [] as AfterDarkGroup[] },
]
check("available groups", availableGroups(gi), ["her", "couples"])
check("available groups empty", availableGroups([]), [])
check("filter her", ids(filterByGroup(gi, "her")), ["a", "b"])
check("filter couples", ids(filterByGroup(gi, "couples")), ["b"])
check("filter games", ids(filterByGroup(gi, "games")), [])
check("filter null", ids(filterByGroup(gi, null)), ["a", "b", "c"])

// rankRelatedToys
const rt = (id: string, ...groups: AfterDarkGroup[]) => ({ id, groups })
const pool = [rt("b", "him"), rt("a", "her"), rt("c", "her", "couples"), rt("d", "games"), rt("e", "her")]
check("related same group first", ids(rankRelatedToys("a", ["her"], pool, 3)), ["c", "e", "b"])
check("related default n", ids(rankRelatedToys("a", ["her"], pool)), ["c", "e", "b", "d"])
check("related no groups keeps order", ids(rankRelatedToys("a", [], pool, 4)), ["b", "c", "d", "e"])
check("related empty", rankRelatedToys("a", ["her"], []), [])
check("related only self", rankRelatedToys("a", ["her"], [rt("a", "her")]), [])
check("related input untouched", ids(pool), ["b", "a", "c", "d", "e"])

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

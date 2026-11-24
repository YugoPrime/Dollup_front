// Covers toy_facts parsing. Run with `npx tsx src/lib/toy-facts.test.ts`.
import { hasFactsContent, parseToyFacts, resolveToyFacts, type ToyFactsCore } from "./toy-facts"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) {
    ok = false
    console.error(`FAIL ${label}\n  got: ${JSON.stringify(got)}\n  exp: ${JSON.stringify(exp)}`)
  }
}

const raw = {
  v: 1,
  card: "10 modes · Waterproof · USB",
  stats: [["10", "Licking modes"], ["3", "Suction modes"], ["10", "Vibration modes"]],
  extras: ["Waterproof", "Body-safe silicone"],
  size: "7 × 10.4 cm",
  power: { title: "USB charging", sub: "Port on the white base" },
  app: null,
  groups: ["her"],
  by_option: {
    Licking: { stats: [["12", "Licking modes"]], size: "9 cm" },
    Sucking: { stats: [] },
  },
}
const expected = {
  stats: [["10", "Licking modes"], ["3", "Suction modes"], ["10", "Vibration modes"]],
  extras: ["Waterproof", "Body-safe silicone"],
  size: "7 × 10.4 cm",
  power: { title: "USB charging", sub: "Port on the white base" },
  app: null,
  card: "10 modes · Waterproof · USB",
  groups: ["her"],
  byOption: {
    Licking: { stats: [["12", "Licking modes"]], size: "9 cm" },
    Sucking: { stats: [] },
  },
}
check("spec example", parseToyFacts({ toy_facts: raw }), expected)
check("json string", parseToyFacts({ toy_facts: JSON.stringify(raw) }), expected)
check("bad json string", parseToyFacts({ toy_facts: "{nope" }), null)
check("missing v", parseToyFacts({ toy_facts: { ...raw, v: undefined } }), null)
check("v 2", parseToyFacts({ toy_facts: { ...raw, v: 2 } }), null)
check("absent", parseToyFacts({}), null)
check("null metadata", parseToyFacts(null), null)
check("array facts", parseToyFacts({ toy_facts: [] }), null)

const p = (o: object) => parseToyFacts({ toy_facts: { v: 1, ...o } })!
check("stats cap 3", p({ stats: [["1", "a"], ["2", "b"], ["3", "c"], ["4", "d"]] }).stats.length, 3)
check(
  "stats bad entries dropped",
  p({ stats: [["1", "a"], ["x"], [1, "b"], ["1", "b", "c"], "str", ["", "e"], ["2", "b"]] }).stats,
  [["1", "a"], ["2", "b"]],
)
check("stats not array", p({ stats: "x" }).stats, [])
check("extras cap 3", p({ extras: ["a", "b", "c", "d"] }).extras, ["a", "b", "c"])
check("extras strings only", p({ extras: ["a", 1, " ", " b "] }).extras, ["a", "b"])
check("groups filter+cap", p({ groups: ["him", "nope", "COUPLES", "her"] }).groups, ["him", "couples"])
check("groups dedupe", p({ groups: ["her", "her", "him"] }).groups, ["her", "him"])
check("card trimmed", p({ card: "  hi  " }).card, "hi")
check("card non-string", p({ card: 5 }).card, "")
check("size blank", p({ size: "  " }).size, null)
check("app string", p({ app: " From your phone " }).app, "From your phone")
check("power no title", p({ power: { title: "", sub: "x" } }).power, null)
check("power sub non-string", p({ power: { title: "USB", sub: 3 } }).power, { title: "USB", sub: null })
check("power not object", p({ power: "USB" }).power, null)
check("by_option junk", p({ by_option: { A: "x", B: null, C: { size: 4 } } }).byOption, { C: { size: null } })
check("by_option ignores card/groups", p({ by_option: { A: { card: "z", groups: ["her"] } } }).byOption, { A: {} })
check("by_option array", p({ by_option: [1] }).byOption, {})

const f = parseToyFacts({ toy_facts: raw })!
const snapshot = JSON.stringify(f)
const core = (r: ToyFactsCore) => r
check("Licking", core(resolveToyFacts(f, ["Licking"])), {
  stats: [["12", "Licking modes"]], extras: ["Waterproof", "Body-safe silicone"], size: "9 cm",
  power: { title: "USB charging", sub: "Port on the white base" }, app: null,
})
const s = resolveToyFacts(f, ["Sucking"])
check("Sucking stats", s.stats, [])
check("Sucking size base", s.size, "7 × 10.4 cm")
check("empty selection", resolveToyFacts(f, []).stats, expected.stats)
check("unknown selection", resolveToyFacts(f, ["Nope"]).size, "7 × 10.4 cm")
check("first matching value", resolveToyFacts(f, ["Red", "Sucking", "Licking"]).stats, [])
check("no mutation", JSON.stringify(f), snapshot)
check("no card in core", "card" in resolveToyFacts(f, []), false)

const empty: ToyFactsCore = { stats: [], extras: [], size: null, power: null, app: null }
check("empty", hasFactsContent(empty), false)
check("stats", hasFactsContent({ ...empty, stats: [["1", "a"]] }), true)
check("extras", hasFactsContent({ ...empty, extras: ["a"] }), true)
check("size", hasFactsContent({ ...empty, size: "a" }), true)
check("power", hasFactsContent({ ...empty, power: { title: "a", sub: null } }), true)
check("app", hasFactsContent({ ...empty, app: "a" }), true)

if (!ok) process.exit(1)
console.log("ALL PASS")

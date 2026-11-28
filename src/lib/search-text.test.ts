// Covers the /shop search text rules (search-text.ts).
// Plain script, run with `npx tsx src/lib/search-text.test.ts`.
import {
  extractSleevePhrases,
  haystackHasToken,
  normalizeSearchText,
  normalizeSearchToken,
} from "./search-text"

let ok = true
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    ok = false
    console.error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`)
  }
}

// A product's searchable fields, normalized the way products.ts builds them.
const fields = (...raw: string[]) => raw.map(normalizeSearchText)
const has = (raw: string[], token: string) => haystackHasToken(fields(...raw), token)

check("hyphens become spaces", normalizeSearchText("Velvet Long-Sleeve Ruched Mini"), "velvet long sleeve ruched mini")
check("query token hyphen", normalizeSearchToken("off-shoulder"), "off shoulder")

check("long sleeve phrase", extractSleevePhrases("long sleeve dress"), { phrases: ["long sleeve"], rest: "  dress" })
check("long-sleeved phrase", extractSleevePhrases("long-sleeved dress").phrases, ["long sleeve"])
check("short sleeves phrase", extractSleevePhrases("black short sleeves").phrases, ["short sleeve"])
check("plain long is not a sleeve phrase", extractSleevePhrases("long dress").phrases, [])

check("short finds Mini", has(["Plunge Halter Mini Dress"], "short"), true)
check("mini skips knee-length short", has(["Ivory Wrap Bodycon Dress", "short, knee length"], "mini"), false)
check("mini finds Mini", has(["Satin Ruched Mini Dress"], "mini"), true)
check("long finds Maxi", has(["Satin Halter Maxi Dress"], "long"), true)
check("long finds Gown", has(["Blossom Silk Gown"], "long"), true)
check("maxi finds Long", has(["Asymmetrical Backless Long Dress"], "maxi"), true)
check("long sleeve mini is not long", has(["Velvet Long-Sleeve Ruched Mini Dress"], "long"), false)
check("long sleeved title is not long", has(["Lace Long Sleeved Strapless Dress"], "long"), false)
check("short sleeve midi is not short", has(["Ruffles Short Sleeve Elegant Dress", "midi, midi dress"], "short"), false)
check("search term long still counts", has(["Long Sleeve Party Dress", "maxi, long dress"], "long"), true)
check("midi has no synonyms", has(["Satin Halter Maxi Dress"], "midi"), false)

check("long sleeve phrase finds Long-Sleeve", has(["Velvet Long-Sleeve Ruched Mini Dress"], "long sleeve"), true)
check("long sleeve phrase finds Long Sleeved", has(["Lace Long Sleeved Strapless Dress"], "long sleeve"), true)
check("long sleeve phrase skips sleeveless maxi", has(["Sleeveless Maxi Dress", "maxi, long, long dress"], "long sleeve"), false)
check("v neck finds V-Neck", has(["V-Neck Ruched Bodycon Mini Dress"], normalizeSearchToken("v-neck")), true)
check("other words stay substrings", has(["Satin Cowl-Neck Mini Dress"], "satin"), true)
check("missing word fails", has(["Satin Cowl-Neck Mini Dress"], "velvet"), false)

if (!ok) process.exit(1)
console.log("ALL PASS")

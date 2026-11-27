// Covers which options a product card's size sheet shows and the card button's label (card-options.ts).
// Plain script, run with `npx tsx src/lib/card-options.test.ts`.
import { sheetOptions, pickerLabel } from "./card-options"

let ok = true
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    ok = false
    console.error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`)
  }
}

const opt = (title: string, ...values: string[]) => ({ id: title.toLowerCase(), title, values })

check("one size with colours: the OS row goes", sheetOptions([opt("Color", "Red", "Black"), opt("Size", "OS")]).map((o) => o.title), ["Color"])
check("one size with colours says Select color", pickerLabel(sheetOptions([opt("Color", "Red", "Black"), opt("Size", "OS")])), "Select color")
check("one colour with sizes: the colour row goes", sheetOptions([opt("Color", "Red"), opt("Size", "S", "M")]).map((o) => o.title), ["Size"])
check("one colour with sizes says Select size", pickerLabel(sheetOptions([opt("Color", "Red"), opt("Size", "S", "M")])), "Select size")
check("colours and sizes keep both, Select size", pickerLabel(sheetOptions([opt("Color", "Red", "Black"), opt("Size", "S", "M")])), "Select size")
check("the same value twice counts once", sheetOptions([opt("Size", "OS", " OS ")]), [])
check("Colour spelling counts as colour", pickerLabel([opt("Colour", "Red", "Pink")]), "Select color")
check("any other option says Select options", pickerLabel([opt("Material", "Silk", "Lace")]), "Select options")
check("nothing left says Select options", pickerLabel([]), "Select options")
check("the option objects pass through unchanged", sheetOptions([opt("Size", "S", "M")]), [opt("Size", "S", "M")])

if (!ok) process.exit(1)
console.log("ALL PASS")

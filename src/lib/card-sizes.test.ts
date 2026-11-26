// Covers which sizes a product card shows (card-sizes.ts).
// Plain script, run with `npx tsx src/lib/card-sizes.test.ts`.
import { cardSizes, isOneSizeLabel, type CardSizeVariant } from "./card-sizes"

let ok = true
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    ok = false
    console.error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`)
  }
}

function v(size: string, qty: number, color?: string, managed = true): CardSizeVariant {
  const options = [{ value: size, option: { title: "Size" } }]
  if (color) options.push({ value: color, option: { title: "Color" } })
  return { manage_inventory: managed, inventory_quantity: qty, options }
}

check("sizes come in size order", cardSizes([v("M", 1), v("XL", 1), v("S", 1), v("L", 1)]), ["S", "M", "L", "XL"])
check("a sold-out size is hidden", cardSizes([v("S", 0), v("M", 2)]), ["M"])
check("a size counts if any colour has it", cardSizes([v("S", 0, "Black"), v("S", 1, "Red")]), ["S"])
check("a colour filter counts only that colour", cardSizes([v("S", 0, "Black"), v("S", 1, "Red"), v("M", 1, "Black")], "black"), ["M"])
check("OS hides the row", cardSizes([v("OS", 3)]), [])
check("Free Size hides the row, any case", cardSizes([v("free size", 3)]), [])
check("one-size labels drop out next to real sizes", cardSizes([v("OS", 1), v("M", 1)]), ["M"])
check("no size option hides the row", cardSizes([{ manage_inventory: true, inventory_quantity: 4, options: [{ value: "Red", option: { title: "Color" } }] }]), [])
check("nothing in stock hides the row", cardSizes([v("S", 0), v("M", 0)]), [])
check("a single real size shows", cardSizes([v("L", 1)]), ["L"])
check("untracked stock counts as in stock", cardSizes([v("S", 0, undefined, false)]), ["S"])
check("XXL and 2XL sit between XL and 3XL", cardSizes([v("3XL", 1), v("XXL", 1), v("XL", 1)]), ["XL", "XXL", "3XL"])
check("S/M and L/XL sit in size order", cardSizes([v("L/XL", 1), v("S/M", 1)]), ["S/M", "L/XL"])
check("numbers sort ascending", cardSizes([v("38", 1), v("37", 1)]), ["37", "38"])
check("other labels sort A to Z", cardSizes([v("C", 1), v("A", 1), v("B", 1)]), ["A", "B", "C"])
check("a size shared by two colours shows once", cardSizes([v("S", 1, "Black"), v("S", 2, "Red")]), ["S"])
check("the option title matches in any case", cardSizes([{ manage_inventory: true, inventory_quantity: 1, options: [{ value: "M", option: { title: "SIZE" } }] }]), ["M"])
check("no variants hides the row", cardSizes(undefined), [])
check("a misspelt colour counts under its shop group", cardSizes([v("L", 1, "Burgandy"), v("S", 1, "Black")], "burgundy"), ["L"])
check("Pink and Light Pink both count under pink", cardSizes([v("S", 1, "Pink"), v("M", 1, "Light Pink"), v("L", 1, "Black")], "pink"), ["S", "M"])
check("a colour with no colour option on any variant counts every size", cardSizes([v("S", 1), v("M", 1)], "burgundy"), ["S", "M"])
check("isOneSizeLabel knows the shop's one-size labels", ["OS", " os ", "One Size", "Free Size", "freesize", "free-size", "M"].map(isOneSizeLabel), [true, true, true, true, true, true, false])

if (!ok) process.exit(1)
console.log("ALL PASS")

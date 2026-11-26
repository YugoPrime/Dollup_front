// Covers the lookbook bento plan in lookbook-grid.ts.
// Plain script, run with `npx tsx src/lib/lookbook-grid.test.ts`.
import { planLookbookGrid, type LookSpan } from "./lookbook-grid"

let ok = true
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    ok = false
    console.error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`)
  }
}

// Places the spans the way CSS grid's default (sparse) auto-placement does,
// then counts the empty cells above the last occupied row.
function emptyCells(spans: LookSpan[], cols: number): number {
  const grid: boolean[][] = []
  const taken = (r: number, c: number) => grid[r]?.[c] === true
  const take = (r: number, c: number) => {
    grid[r] ??= Array<boolean>(cols).fill(false)
    grid[r][c] = true
  }
  let curRow = 0
  let curCol = 0
  for (const s of spans) {
    const w = s === "wide" ? 2 : 1
    const h = s === "tall" ? 2 : 1
    let r = curRow
    let c = curCol
    for (;;) {
      if (c + w > cols) {
        r++
        c = 0
        continue
      }
      let fits = true
      for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (taken(r + dr, c + dc)) fits = false
      if (fits) break
      c++
    }
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) take(r + dr, c + dc)
    curRow = r
    curCol = c + w
  }
  let empty = 0
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < cols; c++) if (!taken(r, c)) empty++
  return empty
}

// The cycle the page used before: on a 2-column phone it left a hole beside
// photo 11 (the yellow dress) because photo 12 was wide.
const OLD_CYCLE: LookSpan[] = ["tall", "sq", "sq", "wide", "sq", "tall", "sq", "sq"]
const old20 = Array.from({ length: 20 }, (_, i) => OLD_CYCLE[i % OLD_CYCLE.length])
check("old cycle leaves holes on a phone (regression fixture)", emptyCells(old20, 2) > 0, true)

for (let n = 0; n <= 40; n++) {
  const plan = planLookbookGrid(n)
  check(`n=${n} one cell per photo`, plan.length, n)
  check(`n=${n} phone grid has no holes`, emptyCells(plan.map((p) => p.mobile), 2), 0)
  if (n >= 2) check(`n=${n} desktop grid has no holes`, emptyCells(plan.map((p) => p.desktop), 4), 0)
}

// The first photo leads the page as a tall feature on both layouts.
check("first photo is tall on a phone", planLookbookGrid(20)[0].mobile, "tall")
check("first photo is tall on desktop", planLookbookGrid(20)[0].desktop, "tall")
check("a single photo still renders", planLookbookGrid(1).length, 1)

if (ok) console.log("ALL PASS")
else process.exit(1)

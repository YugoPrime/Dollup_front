// Bento layout for /lookbook. The grid uses CSS auto-placement with no gaps,
// so a wide photo that lands next to a single free cell leaves a hole. The
// plan is built from blocks that each fill whole rows, so there is never a
// hole, whatever the number of photos. Phones use 2 columns, md+ uses 4.

export type LookSpan = "sq" | "tall" | "wide"
export type LookCell = { mobile: LookSpan; desktop: LookSpan }

// 2 columns
const M_LEFT: LookSpan[] = ["tall", "sq", "sq"] // 2 rows
const M_RIGHT: LookSpan[] = ["sq", "tall", "sq"] // 2 rows
const M_WIDE: LookSpan[] = ["wide"] // 1 row
const M_PAIR: LookSpan[] = ["sq", "sq"] // 1 row
const M_CYCLE = [M_LEFT, M_WIDE, M_RIGHT, M_WIDE]

// 4 columns
const D_LEFT: LookSpan[] = ["tall", "sq", "wide", "sq", "sq", "sq"] // 2 rows
const D_RIGHT: LookSpan[] = ["sq", "wide", "tall", "sq", "sq", "sq"] // 2 rows
const D_FIVE: LookSpan[] = ["tall", "wide", "sq", "wide", "sq"] // 2 rows
const D_FOUR: LookSpan[] = ["sq", "sq", "sq", "sq"] // 1 row
const D_THREE: LookSpan[] = ["sq", "sq", "wide"] // 1 row
const D_TWO: LookSpan[] = ["wide", "wide"] // 1 row

function mobilePlan(n: number): LookSpan[] {
  const out: LookSpan[] = []
  for (let i = 0; out.length < n; i++) {
    const left = n - out.length
    let block = M_CYCLE[i % M_CYCLE.length]
    if (block.length > left) block = left === 2 ? M_PAIR : M_WIDE
    out.push(...block)
  }
  return out
}

function desktopPlan(n: number): LookSpan[] {
  const out: LookSpan[] = []
  let flip = false
  while (out.length < n) {
    const left = n - out.length
    if (left >= 8 || left === 6) {
      out.push(...(flip ? D_RIGHT : D_LEFT))
      flip = !flip
    } else if (left === 7 || left === 5) out.push(...D_FIVE)
    else if (left === 4) out.push(...D_FOUR)
    else if (left === 3) out.push(...D_THREE)
    else if (left === 2) out.push(...D_TWO)
    else out.push("wide") // only when there is a single photo
  }
  return out
}

export function planLookbookGrid(n: number): LookCell[] {
  const m = mobilePlan(n)
  const d = desktopPlan(n)
  return Array.from({ length: n }, (_, i) => ({ mobile: m[i], desktop: d[i] }))
}

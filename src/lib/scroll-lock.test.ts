// Covers scroll-lock.ts: one shared lock on page scroll for every overlay.
// Same plain-script style as sale-spotlight.test.ts — run with
// `npx tsx src/lib/scroll-lock.test.ts`.
//
// A plain object stands in for document.body.style, so this runs in Node.
import { createScrollLock } from "./scroll-lock"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

function setup(initial = "") {
  const style = { overflow: initial }
  return { style, lock: createScrollLock(() => style) }
}

// One overlay: locks, then gives the page back.
{
  const { style, lock } = setup()
  const release = lock()
  check("one lock hides overflow", style.overflow, "hidden")
  release()
  check("one release restores", style.overflow, "")
}

// The 23 Nov bug: quick-add sheet opens, Add to Bag opens the drawer on top,
// the sheet closes after the add, then the drawer closes (Proceed to Checkout).
// Each overlay used to restore the value it saw on open, so the drawer put back
// the sheet's "hidden" and checkout could not scroll.
{
  const { style, lock } = setup()
  const releaseSheet = lock()
  const releaseDrawer = lock()
  releaseSheet()
  check("drawer still open: page stays locked", style.overflow, "hidden")
  releaseDrawer()
  check("everything closed: page scrolls again", style.overflow, "")
}

// Nested and closed in reverse order (bag over the popup, then the popup).
{
  const { style, lock } = setup()
  const releasePopup = lock()
  const releaseDrawer = lock()
  releaseDrawer()
  check("inner closed, outer open: still locked", style.overflow, "hidden")
  releasePopup()
  check("outer closed: unlocked", style.overflow, "")
}

// A page's own inline value survives any number of overlays.
{
  const { style, lock } = setup("scroll")
  const a = lock()
  const b = lock()
  a()
  b()
  check("restores the page's own value", style.overflow, "scroll")
}

// Releasing twice (an effect cleanup run twice) must not unlock another overlay.
{
  const { style, lock } = setup()
  const releaseA = lock()
  const releaseB = lock()
  releaseA()
  releaseA()
  check("double release keeps the other lock", style.overflow, "hidden")
  releaseB()
  check("last real release unlocks", style.overflow, "")
}

// Strict Mode (dev) runs every effect as lock → release → lock.
{
  const { style, lock } = setup()
  lock()()
  const release = lock()
  check("re-lock after a full release", style.overflow, "hidden")
  release()
  check("and unlocks again", style.overflow, "")
}

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

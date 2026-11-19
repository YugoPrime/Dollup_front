// Advent preview clock. Plain script: `npx tsx src/lib/advent-preview.test.ts`.
import { parsePreviewParam, parseStored, previewLabel, previewNowMs } from "./advent-preview"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

check("param: valid offset", parsePreviewParam("2026-12-12T10:00:00+04:00"), { kind: "set", iso: "2026-12-12T10:00:00+04:00" })
check("param: '+' decoded to a space", parsePreviewParam("2026-12-12T10:00:00 04:00"), { kind: "set", iso: "2026-12-12T10:00:00+04:00" })
check("param: Z", parsePreviewParam("2026-12-12T06:00:00Z"), { kind: "set", iso: "2026-12-12T06:00:00Z" })
check("param: off", parsePreviewParam("off"), { kind: "off" })
check("param: invalid ignored", [parsePreviewParam("tomorrow"), parsePreviewParam("2026-12-12"), parsePreviewParam("2026-12-12T10:00:00"), parsePreviewParam("2026-13-45T10:00:00+04:00"), parsePreviewParam(""), parsePreviewParam(null)], [null, null, null, null, null, null])

const setAt = Date.UTC(2026, 10, 28, 9, 0, 0)
const stored = { iso: "2026-12-12T10:00:00+04:00", setAt }
check("now: at set time", previewNowMs(stored, setAt), Date.parse("2026-12-12T10:00:00+04:00"))
check("now: 90 s later", previewNowMs(stored, setAt + 90_000), Date.parse("2026-12-12T10:01:30+04:00"))

check("stored: round trip", parseStored(JSON.stringify(stored)), stored)
check("stored: junk", [parseStored("{"), parseStored(null), parseStored("{}"), parseStored(JSON.stringify({ iso: "nope", setAt: 1 }))], [null, null, null, null])

check("label: door 1 00:05", previewLabel(Date.parse("2026-12-01T00:05:00+04:00")), "Tue 1 Dec 00:05")
check("label: crosses UTC date", previewLabel(Date.parse("2026-12-12T23:59:00+04:00")), "Sat 12 Dec 23:59")

if (ok) console.log("ALL PASS")
else process.exit(1)

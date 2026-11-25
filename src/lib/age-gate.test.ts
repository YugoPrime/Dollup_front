// Covers the 18+ cookie check and the no-flash bootstrap script.
// Run with `npx tsx src/lib/age-gate.test.ts`.
import { AGE_BOOTSTRAP_SCRIPT, AGE_COOKIE, AGE_OK_CLASS, hasAgeCookie } from "./age-gate"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

check("cookie present", hasAgeCookie("a=1; dub_age_verified_18=1"), true)
check("cookie zero", hasAgeCookie("dub_age_verified_18=0"), false)
check("cookie empty", hasAgeCookie(""), false)
check("cookie prefixed name", hasAgeCookie("xdub_age_verified_18=1"), false)

check("script embeds cookie check", AGE_BOOTSTRAP_SCRIPT.includes('"' + AGE_COOKIE + '=1"'), true)
check("script embeds ok class", AGE_BOOTSTRAP_SCRIPT.includes('"' + AGE_OK_CLASS + '"'), true)
check("no template interpolation left", AGE_BOOTSTRAP_SCRIPT.includes("${"), false)
check("no backtick left", AGE_BOOTSTRAP_SCRIPT.includes("`"), false)

function runBootstrap(doc: unknown): void {
  new Function("document", AGE_BOOTSTRAP_SCRIPT)(doc)
}

const calls: string[] = []
const mk = (cookie: string) => ({
  cookie,
  documentElement: { classList: { add: (c: string) => { calls.push(c) } } },
})
runBootstrap(mk("a=1; dub_age_verified_18=1"))
check("bootstrap adds class once", calls, [AGE_OK_CLASS])
calls.length = 0
runBootstrap(mk("a=1"))
runBootstrap(mk("xdub_age_verified_18=1"))
runBootstrap(mk("dub_age_verified_18=0"))
check("bootstrap silent when absent", calls, [])

let threw = false
try {
  runBootstrap({
    get cookie(): string { throw new Error("blocked") },
    documentElement: { classList: { add: () => { calls.push("bad") } } },
  })
} catch { threw = true }
check("throwing cookie getter swallowed", threw, false)
check("no class on throw", calls, [])
check("script is ES5-safe", /=>|\blet\b|\bconst\b/.test(AGE_BOOTSTRAP_SCRIPT), false)

if (!ok) process.exit(1)
console.log("ALL PASS")

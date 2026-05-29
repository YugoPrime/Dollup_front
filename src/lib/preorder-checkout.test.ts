import { computeDeposit } from "./preorder-checkout"
const cases: [number, number, { total: number; deposit: number; balance: number }][] = [
  [1000, 150, { total: 1150, deposit: 900, balance: 250 }],   // 862.5 -> ceil/50 = 900
  [800, 0, { total: 800, deposit: 600, balance: 200 }],       // 600 exact
  [890, 70, { total: 960, deposit: 750, balance: 210 }],      // 720 raw -> ceil/50 = 750
  [0, 0, { total: 0, deposit: 0, balance: 0 }],
]
let ok = true
for (const [i, s, exp] of cases) {
  const got = computeDeposit(i, s)
  const pass = got.total === exp.total && got.deposit === exp.deposit && got.balance === exp.balance
  if (!pass) { ok = false; console.error("FAIL", { i, s, got, exp }) }
}
console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)

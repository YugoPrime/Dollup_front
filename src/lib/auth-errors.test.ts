// Covers authErrorKind in auth-errors.ts. Same plain-script style as
// checkout-free-postage.test.ts. Run with
// `node --import ./scripts/ts-resolve.mjs src/lib/auth-errors.test.ts`
// (Node 24 strips the types itself; the hook only adds the `.ts` extension).
//
// The messages below are what the live Medusa backend returns (checked with
// curl on 2026-11-16) and what @medusajs/js-sdk's FetchError carries as
// `err.message`.
import { authErrorKind } from "./auth-errors"

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) return
  failed++
  console.error(`FAIL ${name}: expected ${String(expected)}, got ${String(actual)}`)
}

// POST /auth/customer/emailpass/register with an email that already has a login.
check(
  "register, email already has a login",
  authErrorKind(new Error("Identity with email already exists")),
  "account-exists",
)
// POST /store/customers when a customer with an account already has this email.
check(
  "customer.create, email already registered",
  authErrorKind(
    new Error("Customer with email: a@b.mu, has_account: true, already exists."),
  ),
  "account-exists",
)
// POST /auth/customer/emailpass with a wrong password or an unknown email.
check(
  "login, wrong password or unknown email",
  authErrorKind(new Error("Invalid email or password")),
  "invalid-credentials",
)
check("network failure", authErrorKind(new TypeError("Failed to fetch")), "other")
check("not an Error", authErrorKind("Identity with email already exists"), "other")
check("undefined", authErrorKind(undefined), "other")

if (failed > 0) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log("ALL PASS")

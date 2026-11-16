// Sorts the errors Medusa returns from login/register into the few cases the
// forms answer differently. @medusajs/js-sdk throws a FetchError whose
// `message` is the backend's own text, e.g. "Identity with email already
// exists", which meant nothing to shoppers. Pure on purpose (no "use client"),
// so auth-errors.test.ts can run it in plain Node.

export type AuthErrorKind = "account-exists" | "invalid-credentials" | "other";

export function authErrorKind(err: unknown): AuthErrorKind {
  if (!(err instanceof Error)) return "other";
  const message = err.message.toLowerCase();
  // "Identity with email already exists" (register) and
  // "Customer with email: …, has_account: true, already exists." (customer.create)
  if (message.includes("already exists")) return "account-exists";
  if (message.includes("invalid email or password")) {
    return "invalid-credentials";
  }
  return "other";
}

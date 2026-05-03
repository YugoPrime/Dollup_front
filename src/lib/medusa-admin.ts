import "server-only";
import Medusa from "@medusajs/js-sdk";

let cached: Medusa | null = null;
let tokenExpiresAt = 0;
let inflight: Promise<Medusa> | null = null;

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

async function login(): Promise<Medusa> {
  const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  const email = process.env.MEDUSA_ADMIN_EMAIL;
  const password = process.env.MEDUSA_ADMIN_PASSWORD;
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL");
  if (!email || !password) {
    throw new Error("Missing MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD");
  }
  const sdk = new Medusa({
    baseUrl,
    auth: { type: "jwt", jwtTokenStorageMethod: "memory" },
  });
  await sdk.auth.login("user", "emailpass", { email, password });
  cached = sdk;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return sdk;
}

export async function getAdminSdk(): Promise<Medusa> {
  if (cached && Date.now() < tokenExpiresAt - 60_000) return cached;
  if (inflight) return inflight;
  inflight = login().finally(() => {
    inflight = null;
  });
  return inflight;
}

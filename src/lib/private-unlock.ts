import "server-only";

import { cookies } from "next/headers";
import { PRIVATE_UNLOCK_COOKIE } from "./visibility";

export const PRIVATE_UNLOCK_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Reads the unlock cookie set by /private/[token]. The cookie value is the
 * raw token, scoped to server-side reads only via httpOnly. Rotating the token
 * from /settings/store invalidates any previously issued cookies.
 */
export async function readPrivateUnlockToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(PRIVATE_UNLOCK_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

export async function isPrivateUnlocked(): Promise<boolean> {
  const token = await readPrivateUnlockToken();
  if (!token) return false;
  return verifyTokenAgainstBackend(token);
}

const verifyCache = new Map<string, { valid: boolean; expires: number }>();
const VERIFY_TTL_MS = 60 * 1000; // 60s — short enough that admin rotations propagate quickly

export async function verifyTokenAgainstBackend(token: string): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) return false;

  const cached = verifyCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.valid;

  try {
    const res = await fetch(`${baseUrl}/store/intimates-unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const valid = res.ok;
    verifyCache.set(token, { valid, expires: Date.now() + VERIFY_TTL_MS });
    return valid;
  } catch {
    return false;
  }
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { HttpTypes } from "@medusajs/types";
import {
  clearStoredCartId,
  clientSdk,
  getStoredCartId,
  MEDUSA_JWT_KEY,
} from "@/lib/cart-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { clearWishlist } from "@/lib/wishlist-client";

// Bind any guest/stale cart in localStorage to the just-authenticated customer.
// Without this, a cart whose customer_id was stamped in a prior session keeps
// that id forever, and routes that check ownership (e.g. loyalty redeem) 403.
async function attachStoredCartToCustomer(): Promise<void> {
  const cartId = getStoredCartId();
  if (!cartId) return;
  try {
    await clientSdk.store.cart.transferCart(cartId);
  } catch {
    clearStoredCartId();
  }
}

export type Customer = HttpTypes.StoreCustomer;
export type AuthState = {
  status: "loading" | "ready";
  customer: Customer | null;
};

const EVENT = "dub:auth-change";

let state: AuthState = { status: "loading", customer: null };
let initStarted = false;

function publish(next: AuthState) {
  state = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

async function fetchCustomer(): Promise<Customer | null> {
  try {
    const { customer } = await clientSdk.store.customer.retrieve();
    return customer ?? null;
  } catch {
    return null;
  }
}

async function init() {
  if (initStarted) return;
  initStarted = true;
  if (typeof window !== "undefined") {
    // One-time migration: pre-cookie sessions stored a JWT in localStorage.
    if (window.localStorage.getItem(MEDUSA_JWT_KEY)) {
      window.localStorage.removeItem(MEDUSA_JWT_KEY);
    }
  }
  const customer = await fetchCustomer();
  if (customer) {
    // Cart in localStorage may have been stamped by a prior session (different
    // account, or stale id). Re-bind on every restored session, not just at
    // login/register, otherwise loyalty redeem 403s with "cart does not belong
    // to you". transferCart is a no-op when cart already belongs to this user.
    await attachStoredCartToCustomer();
  }
  publish({ status: "ready", customer });
}

export async function login(email: string, password: string): Promise<Customer> {
  const result = await clientSdk.auth.login("customer", "emailpass", {
    email,
    password,
  });
  if (typeof result !== "string") {
    throw new Error("Multi-step authentication is not supported.");
  }
  const customer = await fetchCustomer();
  if (!customer) {
    throw new Error("Logged in, but customer profile could not be loaded.");
  }
  await attachStoredCartToCustomer();
  publish({ status: "ready", customer });
  return customer;
}

export async function register(args: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<Customer> {
  await clientSdk.auth.register("customer", "emailpass", {
    email: args.email,
    password: args.password,
  });
  // Medusa SDK bug (2.14.1): in session mode, `auth.register()` calls
  // `client.setToken()` directly — which writes the JWT to localStorage —
  // instead of the session-aware `setToken_()` that POSTs to `/auth/session`
  // to convert the JWT into the httpOnly cookie. Result: no cookie is set
  // and `getJwtHeader_()` returns `{}`, so the very next request 401s.
  // Workaround: log in immediately after register — `auth.login()` follows
  // the correct session path and the backend cookie gets set. Then clear
  // the stray localStorage JWT register() left behind.
  await clientSdk.auth.login("customer", "emailpass", {
    email: args.email,
    password: args.password,
  });
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MEDUSA_JWT_KEY);
  }
  const { customer } = await clientSdk.store.customer.create({
    email: args.email,
    first_name: args.firstName,
    last_name: args.lastName,
    phone: args.phone,
  });
  await attachStoredCartToCustomer();
  publish({ status: "ready", customer: customer ?? null });
  if (!customer) {
    throw new Error("Account created, but profile could not be loaded.");
  }
  return customer;
}

// Kicks off the Google OAuth flow. Asks the backend for a redirect URL, then
// sends the browser there. Google later redirects back to /auth/google/callback
// with `code` and `state` query params; that page calls completeGoogleCallback.
export async function startGoogleLogin(redirectAfter?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const redirect = safeRedirectPath(redirectAfter);
  sessionStorage.setItem("dub_auth_redirect", redirect);
  const result = await clientSdk.auth.login("customer", "google", {});
  if (typeof result === "string") {
    // Backend gave us a token directly (no redirect needed) — e.g. dev shortcut.
    await refreshCustomer();
    window.location.href = redirect;
    return;
  }
  window.location.href = result.location;
}

// Completes the Google OAuth callback. Returns the post-login redirect path.
export async function completeGoogleCallback(
  query: Record<string, string>,
): Promise<string> {
  const token = await clientSdk.auth.callback("customer", "google", query);

  // Try to load an existing customer first — most logins will succeed here.
  let customer = await fetchCustomer();
  if (!customer) {
    // First-time Google sign-in: pull email from the JWT and create a profile.
    const email = extractEmailFromJwt(token);
    if (!email) {
      throw new Error("Google sign-in succeeded but email was not provided.");
    }
    const { customer: created } = await clientSdk.store.customer.create({
      email,
    });
    customer = created ?? null;
  }

  await attachStoredCartToCustomer();
  publish({ status: "ready", customer });

  let redirect = "/account";
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("dub_auth_redirect");
    if (stored) {
      redirect = safeRedirectPath(stored);
      sessionStorage.removeItem("dub_auth_redirect");
    }
  }
  return redirect;
}

function extractEmailFromJwt(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const decoded = JSON.parse(
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded),
    );
    if (typeof decoded?.user_metadata?.email === "string") {
      return decoded.user_metadata.email;
    }
    if (typeof decoded?.email === "string") return decoded.email;
    if (typeof decoded?.app_metadata?.email === "string") {
      return decoded.app_metadata.email;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    // In session mode this hits `DELETE /auth/session`, which clears the
    // httpOnly cookie server-side — that's the source of truth.
    await clientSdk.auth.logout();
  } catch {
    // Server-side logout failed. We can't clear the httpOnly cookie from JS,
    // so the user may pop back into a logged-in state on next page load.
    // Acceptable for launch; revisit if reports come in.
  }
  clearStoredCartId();
  clearWishlist();
  publish({ status: "ready", customer: null });
}

export async function refreshCustomer(): Promise<Customer | null> {
  const customer = await fetchCustomer();
  publish({ status: "ready", customer });
  return customer;
}

export async function updateCustomer(
  patch: HttpTypes.StoreUpdateCustomer,
): Promise<Customer> {
  const { customer } = await clientSdk.store.customer.update(patch);
  publish({ status: "ready", customer: customer ?? null });
  if (!customer) throw new Error("Customer update returned no profile.");
  return customer;
}

function subscribe(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  // Cross-tab sync: localStorage events from wishlist/cart-id changes still
  // nudge consumers to re-read state. The auth JWT no longer lives in localStorage,
  // so logout in another tab won't sync until the next refreshCustomer() call.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

const SERVER_STATE: AuthState = { status: "loading", customer: null };
function getServerSnapshot(): AuthState {
  return SERVER_STATE;
}

export function useCustomer(): AuthState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    getServerSnapshot,
  );
  useEffect(() => {
    init();
  }, []);
  return snapshot;
}

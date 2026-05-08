"use client";

import Medusa from "@medusajs/js-sdk";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!;
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;

// Session-mode auth: SDK posts the JWT to `POST /auth/session` on login, and the
// backend converts it into an httpOnly cookie that JS can't read. Every request
// goes out with `credentials: "include"` so the cookie rides along. XSS-resistant.
// auth-client.ts wraps the customer login/register/logout flow on top of this.
export const clientSdk = new Medusa({
  baseUrl,
  publishableKey,
  auth: { type: "session" },
});

export const MEDUSA_JWT_KEY = "medusa_auth_token";

export const CART_ID_KEY = "dub_cart_id";

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_ID_KEY);
}

export function setStoredCartId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_ID_KEY, id);
}

export function clearStoredCartId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_ID_KEY);
}

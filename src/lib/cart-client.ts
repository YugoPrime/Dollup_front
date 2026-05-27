"use client";

import Medusa from "@medusajs/js-sdk";
import type { CartType } from "@/lib/cart-type";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!;
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;
const preorderPublishableKey =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER!;

// Session-mode auth: SDK posts the JWT to `POST /auth/session` on login, and the
// backend converts it into an httpOnly cookie that JS can't read. Every request
// goes out with `credentials: "include"` so the cookie rides along. XSS-resistant.
// auth-client.ts wraps the customer login/register/logout flow on top of this.
export const clientSdk = new Medusa({
  baseUrl,
  publishableKey,
  auth: { type: "session" },
});

/**
 * Pre-order SDK — uses a different publishable key whose only sales channel is
 * "Pre-Order". Carts created through this SDK land in the Pre-Order channel,
 * which is what makes the preorder shipping options surface at checkout (the
 * options live under a stock location linked only to that channel).
 *
 * Use getCartSdk(cartType) to pick the right SDK for whatever cart you're
 * about to operate on. Mixing them mid-flow (e.g. creating with preorderClientSdk
 * then retrieving with clientSdk) will 401 because the publishable key won't
 * have access to the cart's sales channel.
 */
export const preorderClientSdk = new Medusa({
  baseUrl,
  publishableKey: preorderPublishableKey,
  auth: { type: "session" },
});

export function getCartSdk(cartType?: CartType | null) {
  return cartType === "preorder" ? preorderClientSdk : clientSdk;
}

export const MEDUSA_JWT_KEY = "medusa_auth_token";

export const CART_ID_KEY = "dub_cart_id";
// Persist cart_type alongside cart_id so we can pick the right SDK on next load
// without first retrieving the cart (which would 401 on a preorder cart fetched
// with the apex SDK).
export const CART_TYPE_KEY = "dub_cart_type";

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
  window.localStorage.removeItem(CART_TYPE_KEY);
}

export function getStoredCartType(): CartType | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CART_TYPE_KEY);
  return v === "preorder" || v === "instock" ? v : null;
}

export function setStoredCartType(cartType: CartType) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_TYPE_KEY, cartType);
}

"use client";

import Medusa from "@medusajs/js-sdk";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!;
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;

export const clientSdk = new Medusa({ baseUrl, publishableKey });

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

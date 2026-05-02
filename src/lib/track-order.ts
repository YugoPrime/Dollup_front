// src/lib/track-order.ts
import type { HttpTypes } from "@medusajs/types";

export const MAURITIUS_POST_TRACK_URL =
  "https://www.mauritiuspost.mu/track-trace/?tracking_code=";

export type TrackOrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "canceled";

export type TrackOrderResponse = {
  displayId: string;
  status: TrackOrderStatus;
  placedAt: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  items: Array<{
    title: string;
    variantTitle?: string;
    quantity: number;
    unitPrice: number;
    thumbnail?: string;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
  };
  trackingCode: string | null;
  trackingUrl: string | null;
  canceledAt: string | null;
  steps: {
    placedAt: string;
    confirmedAt: string | null;
    packedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
};

export type OrderRef =
  | { kind: "id"; value: string }       // order_01HXYZ...
  | { kind: "displayId"; value: number } // 1042
  | { kind: "invalid" };

export function parseOrderRef(input: string): OrderRef {
  const cleaned = input.trim().replace(/^#/, "").toUpperCase();
  if (cleaned.startsWith("ORDER_")) {
    return { kind: "id", value: cleaned.toLowerCase() };
  }
  const stripped = cleaned.replace(/^DUB/, "");
  const n = Number.parseInt(stripped, 10);
  if (Number.isFinite(n) && n > 0 && String(n) === stripped) {
    return { kind: "displayId", value: n };
  }
  return { kind: "invalid" };
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("230")) return digits.slice(3);
  return digits;
}

export function buildTrackingUrl(code: string | null): string | null {
  if (!code) return null;
  return `${MAURITIUS_POST_TRACK_URL}${encodeURIComponent(code)}`;
}

export function readTrackingCode(
  order: HttpTypes.StoreOrder,
): string | null {
  const fromOrder = order.metadata?.["tracking_code"];
  if (typeof fromOrder === "string" && fromOrder.trim()) return fromOrder.trim();
  const firstFulfillment = order.fulfillments?.[0];
  const fromFulfillment = firstFulfillment?.metadata?.["tracking_code"];
  if (typeof fromFulfillment === "string" && fromFulfillment.trim()) {
    return fromFulfillment.trim();
  }
  return null;
}

export function readConfirmedAt(
  order: HttpTypes.StoreOrder,
): string | null {
  const v = order.metadata?.["confirmed_at"];
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function deriveStatus(
  order: HttpTypes.StoreOrder,
): TrackOrderStatus {
  if (order.status === "canceled") return "canceled";
  const fs = order.fulfillment_status;
  if (fs === "delivered") return "delivered";
  if (
    fs === "shipped" ||
    fs === "partially_shipped" ||
    fs === "partially_delivered"
  )
    return "shipped";
  if (fs === "fulfilled" || fs === "partially_fulfilled") return "packed";
  if (readConfirmedAt(order)) return "confirmed";
  return "placed";
}

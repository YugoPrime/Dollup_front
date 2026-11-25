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

// Staff save the Mauritius Post number as metadata.tracking_number
// (dollup-admin order drawer, and the shipped email reads it too).
// tracking_code is an older key nothing writes; reading only it hid every
// number from this page until 26 Nov 2026.
const TRACKING_KEYS = ["tracking_number", "tracking_code"] as const;

export function readTrackingCode(
  order: HttpTypes.StoreOrder,
): string | null {
  const sources = [order.metadata, order.fulfillments?.[0]?.metadata];
  for (const meta of sources) {
    for (const key of TRACKING_KEYS) {
      const value = meta?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

/** Postage, Express Postage, Rodrigues Postage: parcels go by Mauritius Post. */
export function isPostageOrder(order: HttpTypes.StoreOrder): boolean {
  const method = order.metadata?.["delivery_method"];
  return typeof method === "string" && /post/i.test(method);
}

/**
 * When the parcel left. Admin's "Mark shipped" creates a fulfilment without
 * a shipped date and stamps metadata.shipped_at instead.
 */
export function readShippedAt(order: HttpTypes.StoreOrder): string | null {
  const fromFulfillment = order.fulfillments?.[0]?.shipped_at;
  if (fromFulfillment) {
    return fromFulfillment instanceof Date
      ? fromFulfillment.toISOString()
      : String(fromFulfillment);
  }
  const fromMeta = order.metadata?.["shipped_at"];
  return typeof fromMeta === "string" && fromMeta.trim() ? fromMeta.trim() : null;
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
  // A postage order is with Mauritius Post once it has a tracking number,
  // or once admin's "Mark shipped" fulfilled it (that never sets
  // fulfillment_status "shipped"). The tracking link shows on that step.
  if (isPostageOrder(order) && readTrackingCode(order)) return "shipped";
  if (fs === "fulfilled" || fs === "partially_fulfilled") {
    return isPostageOrder(order) ? "shipped" : "packed";
  }
  if (readConfirmedAt(order)) return "confirmed";
  return "placed";
}

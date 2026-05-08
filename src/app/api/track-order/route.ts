// src/app/api/track-order/route.ts
import { NextResponse } from "next/server";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import {
  buildTrackingUrl,
  deriveStatus,
  normalizePhone,
  parseOrderRef,
  readConfirmedAt,
  readTrackingCode,
  type TrackOrderResponse,
} from "@/lib/track-order";

function notFound() {
  return NextResponse.json({ error: "not_found" as const }, { status: 404 });
}

function toIso(v: string | Date | null | undefined): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return v;
  return "";
}

const ORDER_FIELDS = [
  "*items",
  "*items.variant",
  "*shipping_address",
  "*shipping_methods",
  "*fulfillments",
  "+subtotal",
  "+total",
  "+shipping_total",
  "+status",
  "+metadata",
  "+display_id",
  "+created_at",
  "+updated_at",
  "+currency_code",
  "+fulfillment_status",
].join(",");

const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REFILL_PER_MS = RATE_LIMIT_CAPACITY / RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_RETRY_AFTER_SECONDS = Math.ceil(
  RATE_LIMIT_WINDOW_MS / RATE_LIMIT_CAPACITY / 1000,
);

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
let lastPrunedAt = 0;

function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedFor ||
    "unknown"
  );
}

function consumeRateLimitToken(ip: string, now = Date.now()): boolean {
  if (now - lastPrunedAt > RATE_LIMIT_WINDOW_MS) {
    lastPrunedAt = now;
    for (const [key, bucket] of buckets) {
      if (now - bucket.updatedAt > RATE_LIMIT_WINDOW_MS * 2) {
        buckets.delete(key);
      }
    }
  }

  const current = buckets.get(ip) ?? {
    tokens: RATE_LIMIT_CAPACITY,
    updatedAt: now,
  };
  const elapsed = Math.max(0, now - current.updatedAt);
  const tokens = Math.min(
    RATE_LIMIT_CAPACITY,
    current.tokens + elapsed * RATE_LIMIT_REFILL_PER_MS,
  );

  if (tokens < 1) {
    buckets.set(ip, { tokens, updatedAt: now });
    return false;
  }

  buckets.set(ip, { tokens: tokens - 1, updatedAt: now });
  return true;
}

export async function POST(request: Request) {
  if (!consumeRateLimitToken(clientIp(request))) {
    return NextResponse.json(
      { error: "rate_limited" as const },
      {
        status: 429,
        headers: {
          "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const orderRefRaw =
    typeof (body as { orderRef?: unknown })?.orderRef === "string"
      ? (body as { orderRef: string }).orderRef
      : "";
  const phoneRaw =
    typeof (body as { phone?: unknown })?.phone === "string"
      ? (body as { phone: string }).phone
      : "";

  const ref = parseOrderRef(orderRefRaw);
  const normalizedPhone = normalizePhone(phoneRaw);
  if (ref.kind === "invalid" || !normalizedPhone) {
    return notFound();
  }

  let order: HttpTypes.StoreOrder | null = null;
  try {
    if (ref.kind === "id") {
      const res = await sdk.store.order.retrieve(ref.value, {
        fields: ORDER_FIELDS,
      });
      order = res.order ?? null;
    } else {
      // Custom backend route — Medusa's built-in /store/orders list requires
      // customer auth, which guests don't have. /store/orders/lookup also
      // performs the phone check server-side; the redundant check below is
      // kept as defense in depth.
      const res = await sdk.client.fetch<{ order: HttpTypes.StoreOrder }>(
        "/store/orders/lookup",
        {
          method: "POST",
          body: { display_id: ref.value, phone: normalizedPhone },
        },
      );
      order = res.order ?? null;
    }
  } catch {
    return notFound();
  }

  if (!order) return notFound();

  const storedPhone = normalizePhone(order.shipping_address?.phone ?? "");
  if (!storedPhone || storedPhone !== normalizedPhone) {
    return notFound();
  }

  const trackingCode = readTrackingCode(order);
  const ship = order.shipping_address;
  const ful = order.fulfillments?.[0];

  const response: TrackOrderResponse = {
    displayId: `DUB${order.display_id}`,
    status: deriveStatus(order),
    placedAt: toIso(order.created_at),
    shippingAddress: {
      firstName: ship?.first_name ?? "",
      lastName: ship?.last_name ?? "",
      address1: ship?.address_1 ?? "",
      address2: ship?.address_2 ?? undefined,
      city: ship?.city ?? "",
      province: ship?.province ?? "",
      postalCode: ship?.postal_code ?? undefined,
    },
    items: (order.items ?? []).map((it) => ({
      title: it.product_title ?? "",
      variantTitle: it.variant_title ?? undefined,
      quantity: it.quantity,
      unitPrice: it.unit_price ?? 0,
      thumbnail: it.thumbnail ?? undefined,
    })),
    totals: {
      subtotal: order.subtotal ?? 0,
      shipping: order.shipping_total ?? 0,
      total: order.total ?? 0,
      currency: order.currency_code ?? "MUR",
    },
    trackingCode,
    trackingUrl: buildTrackingUrl(trackingCode),
    // Medusa Store API does not expose order.canceled_at; updated_at is the
    // closest available proxy and may drift if the order is mutated after cancel.
    canceledAt: order.status === "canceled" ? toIso(order.updated_at) : null,
    steps: {
      placedAt: toIso(order.created_at),
      confirmedAt: readConfirmedAt(order),
      packedAt: ful?.packed_at ? toIso(ful.packed_at) : null,
      shippedAt: ful?.shipped_at ? toIso(ful.shipped_at) : null,
      deliveredAt: ful?.delivered_at ? toIso(ful.delivered_at) : null,
    },
  };

  return NextResponse.json(response);
}

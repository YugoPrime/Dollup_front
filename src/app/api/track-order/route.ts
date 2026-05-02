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

const NOT_FOUND = NextResponse.json(
  { error: "not_found" as const },
  { status: 404 },
);

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

// TODO: rate-limit per IP if abuse appears (deferred — out of scope for v1).
export async function POST(request: Request) {
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
    return NOT_FOUND;
  }

  let order: HttpTypes.StoreOrder | null = null;
  try {
    if (ref.kind === "id") {
      const res = await sdk.store.order.retrieve(ref.value, {
        fields: ORDER_FIELDS,
      });
      order = res.order ?? null;
    } else {
      const res = await sdk.store.order.list({
        display_id: ref.value,
        fields: ORDER_FIELDS,
        limit: 1,
      } as HttpTypes.StoreOrderFilters);
      order = res.orders?.[0] ?? null;
    }
  } catch {
    return NOT_FOUND;
  }

  if (!order) return NOT_FOUND;

  const storedPhone = normalizePhone(order.shipping_address?.phone ?? "");
  if (!storedPhone || storedPhone !== normalizedPhone) {
    return NOT_FOUND;
  }

  const trackingCode = readTrackingCode(order);
  const ship = order.shipping_address;
  const ful = order.fulfillments?.[0];

  const response: TrackOrderResponse = {
    displayId: `DUB${order.display_id}`,
    status: deriveStatus(order),
    placedAt: String(order.created_at),
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
    canceledAt: order.status === "canceled" ? String(order.updated_at) : null,
    steps: {
      placedAt: String(order.created_at),
      confirmedAt: readConfirmedAt(order),
      packedAt: ful?.packed_at ? String(ful.packed_at) : null,
      shippedAt: ful?.shipped_at ? String(ful.shipped_at) : null,
      deliveredAt: ful?.delivered_at ? String(ful.delivered_at) : null,
    },
  };

  return NextResponse.json(response);
}

import "server-only";
import type { HttpTypes } from "@medusajs/types";
import { getAdminSdk } from "./medusa-admin";
import {
  type DmDeliveryMethod,
  computeDeliveryCost,
} from "./checkout";

export const REGION_ID = "reg_01KN0AAX4FA592Q3HAY93W1AHV";
export const SALES_CHANNEL_ID = "sc_01KN07JKHRN9DP25TM5S664C5W";
export const STOCK_LOCATION_ID = "sloc_01KN48PYHQ0DTXXN2N0JWZSAYV";
export const CURRENCY_CODE = "mur";

export type VariantHit = {
  variantId: string;
  productId: string;
  sku: string | null;
  variantTitle: string | null;
  productTitle: string;
  productThumbnail: string | null;
  manageInventory: boolean;
  inventoryQuantity: number | null;
  priceMur: number | null;
};

type VariantWithRefs = HttpTypes.AdminProductVariant & {
  inventory_quantity?: number | null;
  prices?: { amount: number; currency_code: string }[] | null;
  product?: {
    id: string;
    title: string;
    thumbnail: string | null;
  } | null;
};

function pickMurPrice(v: VariantWithRefs): number | null {
  const prices = v.prices ?? [];
  const mur = prices.find((p) => (p.currency_code ?? "").toLowerCase() === CURRENCY_CODE);
  return mur ? Math.round(Number(mur.amount)) : null;
}

export async function searchVariants(
  query: string,
  opts: { availableOnly?: boolean; limit?: number } = {},
): Promise<VariantHit[]> {
  const q = query.trim();
  if (!q) return [];
  const sdk = await getAdminSdk();
  const limit = opts.limit ?? 25;
  // Variant-level search: q hits sku and variant title. Product list's q does NOT
  // search variant SKUs in this Medusa version, so we go through the variant API
  // and enrich with product fields via dot-notation.
  const res = await sdk.admin.productVariant.list({
    q,
    limit,
    fields:
      "id,sku,title,inventory_quantity,manage_inventory,*prices,product.id,product.title,product.thumbnail",
  });
  const variants = (res.variants ?? []) as unknown as VariantWithRefs[];
  const hits: VariantHit[] = [];
  for (const v of variants) {
    const product = v.product;
    if (!product) continue;
    const manage = v.manage_inventory ?? true;
    const qty = manage ? (v.inventory_quantity ?? 0) : null;
    const isAvailable = !manage || (qty ?? 0) > 0;
    if (opts.availableOnly && !isAvailable) continue;
    hits.push({
      variantId: v.id,
      productId: product.id,
      sku: v.sku ?? null,
      variantTitle: v.title ?? null,
      productTitle: product.title ?? "",
      productThumbnail: product.thumbnail ?? null,
      manageInventory: manage,
      inventoryQuantity: qty,
      priceMur: pickMurPrice(v),
    });
  }
  // Stable order: by product, then by sku
  hits.sort((a, b) => {
    const t = a.productTitle.localeCompare(b.productTitle);
    if (t !== 0) return t;
    return (a.sku ?? "").localeCompare(b.sku ?? "");
  });
  return hits;
}

export type OrderRow = {
  id: string;
  displayId: number;
  createdAt: string;
  email: string | null;
  buyerName: string;
  phone: string | null;
  totalMur: number;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  status: string | null;
  paymentMethod: string | null;
  pointOfSale: string | null;
  saleType: string | null;
  deliveryMethod: string | null;
  notes: string | null;
  items: { id: string; title: string; quantity: number; unitPriceMur: number }[];
};

function mapOrder(o: HttpTypes.AdminOrder): OrderRow {
  const meta = (o.metadata ?? {}) as Record<string, unknown>;
  const ship = o.shipping_address;
  const buyerName = ship
    ? [ship.first_name, ship.last_name].filter(Boolean).join(" ").trim()
    : "";
  return {
    id: o.id,
    displayId: o.display_id ?? 0,
    createdAt: String(o.created_at ?? ""),
    email: o.email ?? null,
    buyerName,
    phone: ship?.phone ?? null,
    totalMur: Math.round(Number(o.total ?? 0)),
    paymentStatus: o.payment_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    status: o.status ?? null,
    paymentMethod: typeof meta.payment_method === "string" ? meta.payment_method : null,
    pointOfSale: typeof meta.point_of_sale === "string" ? meta.point_of_sale : null,
    saleType: typeof meta.sale_type === "string" ? meta.sale_type : null,
    deliveryMethod: typeof meta.delivery_method === "string" ? meta.delivery_method : null,
    notes: typeof meta.notes === "string" ? meta.notes : null,
    items: (o.items ?? []).map((it) => ({
      id: it.id,
      title: it.product_title ?? it.title ?? "Item",
      quantity: it.quantity,
      unitPriceMur: Math.round(Number(it.unit_price ?? 0)),
    })),
  };
}

export async function getRecentOrders(limit = 20): Promise<OrderRow[]> {
  const sdk = await getAdminSdk();
  const res = await sdk.admin.order.list({
    limit,
    order: "-created_at",
    fields:
      "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,*shipping_address",
  });
  return (res.orders as HttpTypes.AdminOrder[]).map(mapOrder);
}

export type CreateOrderItemInput =
  | { kind: "variant"; variantId: string; quantity: number; unitPriceMur: number; title?: string }
  | { kind: "manual"; title: string; quantity: number; unitPriceMur: number };

export type CreateDmOrderInput = {
  buyerFirstName: string;
  buyerLastName?: string;
  phone: string;
  address1: string;
  address2?: string;
  city?: string;
  district?: string;
  email?: string;
  items: CreateOrderItemInput[];
  deliveryMethod: DmDeliveryMethod;
  deliveryDate?: string;
  discountMur?: number;
  totalOverrideMur?: number | null;
  paymentMethod: string;
  pointOfSale: string;
  saleType: "paid" | "unpaid" | "deposit";
  notes?: string;
};

function synthesizeEmail(input: CreateDmOrderInput): string {
  if (input.email && input.email.includes("@")) return input.email;
  const cleanedPhone = input.phone.replace(/\D/g, "") || "anon";
  return `dm-${cleanedPhone}@dollupboutique.local`;
}

export async function createDmOrder(
  input: CreateDmOrderInput,
): Promise<{ id: string; displayId: number }> {
  const sdk = await getAdminSdk();

  const subtotal = input.items.reduce(
    (sum, it) => sum + it.unitPriceMur * it.quantity,
    0,
  );
  const discount = Math.max(0, Math.round(input.discountMur ?? 0));
  const subtotalAfterDiscount = subtotal - discount;
  const deliveryCost = computeDeliveryCost(
    input.deliveryMethod,
    subtotalAfterDiscount,
  );

  const computedTotal = subtotalAfterDiscount + deliveryCost;
  const overrideTotal =
    input.totalOverrideMur != null && Number.isFinite(input.totalOverrideMur)
      ? Math.round(input.totalOverrideMur)
      : null;
  const adjustment =
    overrideTotal != null ? overrideTotal - computedTotal : 0;

  type DraftItem = {
    title?: string;
    variant_id?: string;
    quantity: number;
    unit_price?: number;
  };
  const draftItems: DraftItem[] = [];
  for (const it of input.items) {
    if (it.kind === "variant") {
      draftItems.push({
        variant_id: it.variantId,
        quantity: it.quantity,
        unit_price: it.unitPriceMur,
        ...(it.title ? { title: it.title } : {}),
      });
    } else {
      draftItems.push({
        title: it.title,
        quantity: it.quantity,
        unit_price: it.unitPriceMur,
      });
    }
  }
  if (discount > 0) {
    draftItems.push({
      title: "Discount",
      quantity: 1,
      unit_price: -discount,
    });
  }
  draftItems.push({
    title: `Delivery — ${input.deliveryMethod}${
      deliveryCost === 0 ? " (Free)" : ""
    }`,
    quantity: 1,
    unit_price: deliveryCost,
  });
  if (adjustment !== 0) {
    draftItems.push({
      title: "Adjustment",
      quantity: 1,
      unit_price: adjustment,
    });
  }

  const address: HttpTypes.OrderAddress = {
    first_name: input.buyerFirstName,
    last_name: input.buyerLastName ?? "",
    phone: input.phone,
    address_1: input.address1,
    address_2: input.address2 || null,
    city: input.city || null,
    province: input.district || null,
    country_code: "mu",
  };

  const metadata: Record<string, unknown> = {
    payment_method: input.paymentMethod,
    point_of_sale: input.pointOfSale,
    sale_type: input.saleType,
    delivery_method: input.deliveryMethod,
    source: "dm_admin",
  };
  if (input.deliveryDate) metadata.delivery_date = input.deliveryDate;
  if (input.notes) metadata.notes = input.notes;
  if (overrideTotal != null) metadata.total_override_mur = overrideTotal;

  const draftPayload: HttpTypes.AdminCreateDraftOrder = {
    email: synthesizeEmail(input),
    region_id: REGION_ID,
    sales_channel_id: SALES_CHANNEL_ID,
    currency_code: CURRENCY_CODE,
    shipping_address: address,
    billing_address: address,
    items: draftItems,
    metadata,
    no_notification_order: true,
  };

  const { draft_order } = await sdk.admin.draftOrder.create(draftPayload);
  const draftId = draft_order.id;

  let convertedOrder: HttpTypes.AdminOrder;
  try {
    const resp = await sdk.admin.draftOrder.convertToOrder(draftId);
    convertedOrder = resp.order;
  } catch (err) {
    // Best-effort cleanup; ignore secondary failure.
    try {
      await sdk.admin.draftOrder.delete(draftId);
    } catch {
      /* noop */
    }
    throw err;
  }

  if (input.saleType === "paid") {
    try {
      await markOrderPaid(convertedOrder.id);
    } catch (err) {
      console.warn("[createDmOrder] markOrderPaid failed:", err);
    }
  }

  return { id: convertedOrder.id, displayId: convertedOrder.display_id ?? 0 };
}

async function getOrderWithPayments(orderId: string): Promise<HttpTypes.AdminOrder> {
  const sdk = await getAdminSdk();
  const { order } = await sdk.admin.order.retrieve(orderId, {
    fields:
      "id,display_id,total,*items,*payment_collections,*payment_collections.payments",
  });
  return order;
}

export async function markOrderPaid(orderId: string): Promise<void> {
  const sdk = await getAdminSdk();
  const order = await getOrderWithPayments(orderId);
  const collections = (order as unknown as {
    payment_collections?: {
      payments?: { id: string; captured_at?: string | null; amount?: number }[];
    }[];
  }).payment_collections ?? [];
  for (const pc of collections) {
    for (const p of pc.payments ?? []) {
      if (!p.captured_at) {
        await sdk.admin.payment.capture(p.id, {});
      }
    }
  }
}

export async function markOrderFulfilled(orderId: string): Promise<void> {
  const sdk = await getAdminSdk();
  const { order } = await sdk.admin.order.retrieve(orderId, {
    fields: "id,*items,*fulfillments",
  });
  const fulfillments = (order as unknown as { fulfillments?: unknown[] }).fulfillments ?? [];
  if (fulfillments.length > 0) return;
  const items = (order.items ?? [])
    .filter((it) => Number(it.quantity ?? 0) > 0 && it.variant_id)
    .map((it) => ({ id: it.id, quantity: it.quantity }));
  if (items.length === 0) return;
  await sdk.admin.order.createFulfillment(orderId, {
    items,
    location_id: STOCK_LOCATION_ID,
    no_notification: true,
  });
}

export async function cancelOrder(orderId: string): Promise<void> {
  const sdk = await getAdminSdk();
  await sdk.admin.order.cancel(orderId);
}

import "server-only";
import type { HttpTypes } from "@medusajs/types";
import { getAdminSdk } from "./medusa-admin";
import {
  type DmDeliveryMethod,
  computeDeliveryCost,
  computeVatAmount,
} from "./checkout";
import {
  ADJUSTMENT_TITLE,
  DELIVERY_LINE_RE,
  DISCOUNT_TITLE,
  isAutoLine,
} from "./admin-order-lines";

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
  city: string | null;
  addressDetails: string | null;
  totalMur: number;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  status: string | null;
  paymentMethod: string | null;
  pointOfSale: string | null;
  saleType: string | null;
  deliveryMethod: string | null;
  deliveryDate: string | null;
  notes: string | null;
  customNotes: string | null;
  pseudo: string | null;
  trackingNumber: string | null;
  vatAmount: number | null;
  replacedByOrderId: string | null;
  replacesOrderId: string | null;
  replacesDisplayId: number | null;
  items: {
    id: string;
    variantId: string | null;
    title: string;
    quantity: number;
    unitPriceMur: number;
  }[];
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
    city: ship?.city ?? null,
    addressDetails: ship?.address_1 ?? null,
    totalMur: Math.round(Number(o.total ?? 0)),
    paymentStatus: o.payment_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    status: o.status ?? null,
    paymentMethod: typeof meta.payment_method === "string" ? meta.payment_method : null,
    pointOfSale: typeof meta.point_of_sale === "string" ? meta.point_of_sale : null,
    saleType: typeof meta.sale_type === "string" ? meta.sale_type : null,
    deliveryMethod: typeof meta.delivery_method === "string" ? meta.delivery_method : null,
    deliveryDate: typeof meta.delivery_date === "string" ? meta.delivery_date : null,
    notes: typeof meta.notes === "string" ? meta.notes : null,
    customNotes: typeof meta.custom_notes === "string" ? meta.custom_notes : null,
    pseudo: typeof meta.pseudo === "string" ? meta.pseudo : null,
    trackingNumber:
      typeof meta.tracking_number === "string" ? meta.tracking_number : null,
    vatAmount: typeof meta.vat_amount === "number" ? meta.vat_amount : null,
    replacedByOrderId:
      typeof meta.replaced_by_order_id === "string"
        ? meta.replaced_by_order_id
        : null,
    replacesOrderId:
      typeof meta.replaces_order_id === "string" ? meta.replaces_order_id : null,
    replacesDisplayId:
      typeof meta.replaces_display_id === "number"
        ? meta.replaces_display_id
        : null,
    items: (o.items ?? []).map((it) => ({
      id: it.id,
      variantId: it.variant_id ?? null,
      title: it.product_title ?? it.title ?? "Item",
      quantity: it.quantity,
      unitPriceMur: Math.round(Number(it.unit_price ?? 0)),
    })),
  };
}

export async function getRecentOrders(limit = 20): Promise<OrderRow[]> {
  const sdk = await getAdminSdk();
  // Over-fetch so we can drop replaced predecessors without thinning the
  // visible count.
  const fetchLimit = Math.max(limit * 2, 50);
  const res = await sdk.admin.order.list({
    limit: fetchLimit,
    order: "-created_at",
    fields:
      "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,*shipping_address",
  });
  const all = (res.orders as HttpTypes.AdminOrder[]).map(mapOrder);
  // Drop orders that have been superseded by a heavy edit.
  const visible = all.filter((o) => o.replacedByOrderId == null);
  return visible.slice(0, limit);
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
  email?: string;
  items: CreateOrderItemInput[];
  deliveryMethod: DmDeliveryMethod;
  deliveryDate?: string;
  deliveryFeeMur?: number;
  discountMur?: number;
  totalOverrideMur?: number | null;
  paymentMethod: string;
  pointOfSale: string;
  saleType: "paid" | "unpaid" | "deposit";
  // Legacy compatibility — old form had a generic "notes" field. New form
  // uses customNotes instead, but we keep this so any older callers compile.
  notes?: string;
  customNotes?: string;
  pseudo?: string;
  trackingNumber?: string;
  status?: "delivered" | "cancelled";
};

function synthesizeEmail(input: CreateDmOrderInput): string {
  if (input.email && input.email.includes("@")) return input.email;
  const cleanedPhone = input.phone.replace(/\D/g, "") || "anon";
  return `dm-${cleanedPhone}@dollupboutique.local`;
}

export type CreateDmOrderResult = {
  id: string;
  displayId: number;
  warnings: string[];
};

export async function createDmOrder(
  input: CreateDmOrderInput,
): Promise<CreateDmOrderResult> {
  const sdk = await getAdminSdk();

  const subtotal = input.items.reduce(
    (sum, it) => sum + it.unitPriceMur * it.quantity,
    0,
  );
  const discount = Math.max(0, Math.round(input.discountMur ?? 0));
  const subtotalAfterDiscount = subtotal - discount;
  const autoDelivery = computeDeliveryCost(
    input.deliveryMethod,
    subtotalAfterDiscount,
  );
  const deliveryCost =
    typeof input.deliveryFeeMur === "number"
      ? Math.max(0, Math.round(input.deliveryFeeMur))
      : autoDelivery;

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
      title: DISCOUNT_TITLE,
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
      title: ADJUSTMENT_TITLE,
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
    province: null,
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
  if (input.customNotes) metadata.custom_notes = input.customNotes;
  if (input.pseudo) metadata.pseudo = input.pseudo;
  if (input.trackingNumber) metadata.tracking_number = input.trackingNumber;
  if (overrideTotal != null) metadata.total_override_mur = overrideTotal;
  // VAT extraction when payment is MCB Juice (rate included in total)
  const finalTotalForVat =
    overrideTotal != null ? overrideTotal : computedTotal;
  if (input.paymentMethod === "MCB Juice") {
    metadata.vat_amount = computeVatAmount(finalTotalForVat);
  }

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

  const warnings: string[] = [];

  if (input.saleType === "paid") {
    try {
      await markOrderPaid(convertedOrder.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.warn("[createDmOrder] markOrderPaid failed:", err);
      warnings.push(`Could not mark paid: ${msg}`);
    }
  }

  if (input.status === "cancelled") {
    try {
      await sdk.admin.order.cancel(convertedOrder.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.warn("[createDmOrder] cancel failed:", err);
      warnings.push(`Could not cancel: ${msg}`);
    }
  } else if (input.status === "delivered") {
    try {
      await markOrderFulfilled(convertedOrder.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.warn("[createDmOrder] markOrderFulfilled failed:", err);
      warnings.push(`Could not mark delivered: ${msg}`);
    }
  }

  return {
    id: convertedOrder.id,
    displayId: convertedOrder.display_id ?? 0,
    warnings,
  };
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

// ---------------------------------------------------------------------------
// Light edit support — Slice 3
// ---------------------------------------------------------------------------

export type OrderLightPatch = {
  // shipping_address fields
  buyerName?: string;
  phone?: string;
  city?: string;
  addressDetails?: string; // -> address_1
  // top-level / metadata fields
  email?: string;
  deliveryMethod?: DmDeliveryMethod;
  deliveryDate?: string | null;
  pseudo?: string | null;
  customNotes?: string | null;
  trackingNumber?: string | null;
  paymentMethod?: string;
  pointOfSale?: string;
  saleType?: "paid" | "unpaid" | "deposit";
  // status changes
  status?: "delivered" | "cancelled" | "pending";
};

export type OrderEditDiff =
  | { kind: "light"; patch: OrderLightPatch }
  | { kind: "heavy"; reason: string }
  | { kind: "noop" };

export async function updateOrderLight(
  orderId: string,
  patch: OrderLightPatch,
): Promise<void> {
  const sdk = await getAdminSdk();

  // 1. Address patch
  const hasAddressChange =
    patch.buyerName !== undefined ||
    patch.phone !== undefined ||
    patch.city !== undefined ||
    patch.addressDetails !== undefined;
  if (hasAddressChange) {
    const { order } = await sdk.admin.order.retrieve(orderId, {
      fields: "id,*shipping_address,*billing_address",
    });
    const ship = order.shipping_address;
    const newAddress: HttpTypes.OrderAddress = {
      first_name: patch.buyerName ?? ship?.first_name ?? "",
      last_name: ship?.last_name ?? "",
      phone: patch.phone ?? ship?.phone ?? "",
      address_1: patch.addressDetails ?? ship?.address_1 ?? "",
      address_2: ship?.address_2 ?? null,
      city: patch.city ?? ship?.city ?? "",
      province: null,
      country_code: ship?.country_code ?? "mu",
    };
    await sdk.admin.order.update(orderId, {
      shipping_address: newAddress,
      billing_address: newAddress,
    });
  }

  // 2. Top-level email change
  if (patch.email !== undefined) {
    await sdk.admin.order.update(orderId, { email: patch.email });
  }

  // 3. Metadata patch (merge — Medusa replaces metadata object on update)
  const metaKeys: (keyof OrderLightPatch)[] = [
    "deliveryMethod",
    "deliveryDate",
    "pseudo",
    "customNotes",
    "trackingNumber",
    "paymentMethod",
    "pointOfSale",
    "saleType",
  ];
  const hasMetaChange = metaKeys.some((k) => patch[k] !== undefined);
  if (hasMetaChange) {
    const { order } = await sdk.admin.order.retrieve(orderId, {
      fields: "id,metadata",
    });
    const oldMeta = (order.metadata ?? {}) as Record<string, unknown>;
    const newMeta: Record<string, unknown> = { ...oldMeta };
    if (patch.deliveryMethod !== undefined) {
      newMeta.delivery_method = patch.deliveryMethod;
    }
    if (patch.deliveryDate !== undefined) {
      if (!patch.deliveryDate) delete newMeta.delivery_date;
      else newMeta.delivery_date = patch.deliveryDate;
    }
    if (patch.pseudo !== undefined) {
      if (!patch.pseudo) delete newMeta.pseudo;
      else newMeta.pseudo = patch.pseudo;
    }
    if (patch.customNotes !== undefined) {
      if (!patch.customNotes) delete newMeta.custom_notes;
      else newMeta.custom_notes = patch.customNotes;
    }
    if (patch.trackingNumber !== undefined) {
      if (!patch.trackingNumber) delete newMeta.tracking_number;
      else newMeta.tracking_number = patch.trackingNumber;
    }
    if (patch.paymentMethod !== undefined) {
      newMeta.payment_method = patch.paymentMethod;
    }
    if (patch.pointOfSale !== undefined) {
      newMeta.point_of_sale = patch.pointOfSale;
    }
    if (patch.saleType !== undefined) newMeta.sale_type = patch.saleType;
    await sdk.admin.order.update(orderId, { metadata: newMeta });
  }

  // 4. Status change
  if (patch.status === "cancelled") {
    await sdk.admin.order.cancel(orderId);
  } else if (patch.status === "delivered") {
    await markOrderFulfilled(orderId);
  }
  // "pending" is a no-op — we cannot un-cancel or un-fulfill from the admin UI.
}

export function classifyOrderEdit(
  before: OrderRow,
  next: CreateDmOrderInput,
): OrderEditDiff {
  // ----- Heavy detection -----

  // Filter the original line items down to the real product/manual lines (drop
  // auto-appended Delivery / Discount / Adjustment lines that createDmOrder adds).
  const realBeforeItems = before.items.filter((it) => !isAutoLine(it.title));
  const nextItems = next.items;

  if (realBeforeItems.length !== nextItems.length) {
    return { kind: "heavy", reason: "Item count changed" };
  }
  for (let i = 0; i < nextItems.length; i++) {
    const b = realBeforeItems[i];
    const n = nextItems[i];
    if (b.unitPriceMur !== n.unitPriceMur || b.quantity !== n.quantity) {
      return { kind: "heavy", reason: "Item qty or price changed" };
    }
  }

  // Money diff (Slice 4): hydrateOrderToForm now populates deliveryFee /
  // discountMur / totalOverride from the order's auto-appended lines, so a
  // before/after comparison is meaningful. Any change here means we need to
  // cancel + recreate so the order's invoice math is consistent.
  const deliveryLine = before.items.find((it) =>
    DELIVERY_LINE_RE.test(it.title),
  );
  const discountLine = before.items.find((it) => it.title === DISCOUNT_TITLE);
  const adjustmentLine = before.items.find(
    (it) => it.title === ADJUSTMENT_TITLE,
  );
  const oldDeliveryFee = deliveryLine?.unitPriceMur ?? 0;
  const oldDiscount = discountLine ? -discountLine.unitPriceMur : 0;
  const realLines = before.items.filter((it) => !isAutoLine(it.title));
  const realSubtotal = realLines.reduce(
    (s, it) => s + it.quantity * it.unitPriceMur,
    0,
  );
  const oldComputedTotal = realSubtotal - oldDiscount + oldDeliveryFee;
  // Detect override by line *existence*, not by adjustment amount: a stored
  // adjustment line is the signal that the operator overrode the total. Using
  // `!== 0` would misread a (theoretical) zero-rounded adjustment as "no
  // override" and mark a noop edit as heavy.
  const oldTotalOverride = adjustmentLine
    ? oldComputedTotal + adjustmentLine.unitPriceMur
    : null;

  const nextDeliveryFee =
    typeof next.deliveryFeeMur === "number" ? next.deliveryFeeMur : 0;
  const nextDiscount =
    typeof next.discountMur === "number" ? next.discountMur : 0;
  const nextTotalOverride =
    next.totalOverrideMur != null && Number.isFinite(next.totalOverrideMur)
      ? next.totalOverrideMur
      : null;

  if (
    nextDeliveryFee !== oldDeliveryFee ||
    nextDiscount !== oldDiscount ||
    nextTotalOverride !== oldTotalOverride
  ) {
    return { kind: "heavy", reason: "Delivery/discount/total changed" };
  }

  // ----- Light patch building -----
  const patch: OrderLightPatch = {};

  const beforeFirstName = before.buyerName.split(" ")[0] ?? "";
  if (next.buyerFirstName !== beforeFirstName) {
    patch.buyerName = next.buyerFirstName;
  }
  if (next.phone !== (before.phone ?? "")) patch.phone = next.phone;
  if ((next.city ?? "") !== (before.city ?? "")) {
    patch.city = next.city ?? "";
  }
  // useOrderForm.toCreateInput() falls back address1 -> city when no address
  // details are present. Compare against before.addressDetails directly.
  if ((next.address1 ?? "") !== (before.addressDetails ?? "")) {
    patch.addressDetails = next.address1;
  }
  if ((next.email ?? "") !== (before.email ?? "")) {
    patch.email = next.email ?? "";
  }
  if (next.deliveryMethod !== before.deliveryMethod) {
    patch.deliveryMethod = next.deliveryMethod;
  }
  if ((next.deliveryDate ?? "") !== (before.deliveryDate ?? "")) {
    patch.deliveryDate = next.deliveryDate ?? null;
  }
  if ((next.pseudo ?? "") !== (before.pseudo ?? "")) {
    patch.pseudo = next.pseudo ?? null;
  }
  if ((next.customNotes ?? "") !== (before.customNotes ?? "")) {
    patch.customNotes = next.customNotes ?? null;
  }
  if ((next.trackingNumber ?? "") !== (before.trackingNumber ?? "")) {
    patch.trackingNumber = next.trackingNumber ?? null;
  }
  if (next.paymentMethod !== (before.paymentMethod ?? "")) {
    patch.paymentMethod = next.paymentMethod;
  }
  if (next.pointOfSale !== (before.pointOfSale ?? "")) {
    patch.pointOfSale = next.pointOfSale;
  }
  if (next.saleType !== (before.saleType ?? "")) {
    patch.saleType = next.saleType;
  }

  // Status: form emits "delivered" | "cancelled" | undefined. Map back vs the
  // current row state. We can move forward (-> cancelled / delivered) but
  // never un-cancel or un-fulfill (those become no-ops).
  if (next.status === "cancelled" && before.status !== "canceled") {
    patch.status = "cancelled";
  } else if (
    next.status === "delivered" &&
    before.fulfillmentStatus !== "fulfilled"
  ) {
    patch.status = "delivered";
  }
  // If next.status is empty and the order is currently cancelled/fulfilled,
  // do not flag a patch — there is no reverse path in light edits.

  if (Object.keys(patch).length === 0) return { kind: "noop" };
  return { kind: "light", patch };
}

// ---------------------------------------------------------------------------
// Heavy edit support — Slice 4
// ---------------------------------------------------------------------------

export type HeavyEditResult =
  | { ok: true; newOrderId: string; newDisplayId: number }
  | { ok: false; error: string };

type VariantStockShape = {
  id: string;
  sku?: string | null;
  title?: string | null;
  inventory_quantity?: number | null;
  manage_inventory?: boolean | null;
  product?: { title?: string | null } | null;
};

/**
 * Cancel + recreate path for "heavy" edits — line item / qty / price / money
 * changes. Pre-flights stock so we never cancel an order if the recreate
 * would fail at decrement; stamps bidirectional `replaces_*` /
 * `replaced_by_*` metadata so the UI can hide predecessors and surface a
 * "↻ replaces #N" caption.
 */
export async function editOrderHeavy(
  oldOrderId: string,
  input: CreateDmOrderInput,
): Promise<HeavyEditResult> {
  const sdk = await getAdminSdk();

  // 1. Fetch old order's line items to compute net delta.
  const { order: oldOrder } = await sdk.admin.order.retrieve(oldOrderId, {
    fields: "id,*items,metadata,display_id",
  });
  const oldDisplayId = oldOrder.display_id ?? null;

  const oldByVariant = new Map<string, number>();
  for (const it of oldOrder.items ?? []) {
    if (!it.variant_id) continue;
    oldByVariant.set(
      it.variant_id,
      (oldByVariant.get(it.variant_id) ?? 0) + Number(it.quantity ?? 0),
    );
  }
  const newByVariant = new Map<string, number>();
  for (const it of input.items) {
    if (it.kind === "variant") {
      newByVariant.set(
        it.variantId,
        (newByVariant.get(it.variantId) ?? 0) + it.quantity,
      );
    }
  }

  // 2. Pre-flight stock check — only variants where we need MORE units than
  // the old order already held (positive delta).
  const allVariantIds = new Set([
    ...oldByVariant.keys(),
    ...newByVariant.keys(),
  ]);
  for (const variantId of allVariantIds) {
    const oldQty = oldByVariant.get(variantId) ?? 0;
    const newQty = newByVariant.get(variantId) ?? 0;
    const delta = newQty - oldQty;
    if (delta <= 0) continue;
    // The admin SDK's productVariant module exposes `list` but not a direct
    // `retrieve`. Filter by id to fetch the single record we need.
    const resp = (await sdk.admin.productVariant.list({
      id: variantId,
      limit: 1,
      fields:
        "id,sku,title,inventory_quantity,manage_inventory,product.title",
    })) as unknown as { variants: VariantStockShape[] };
    const variant = resp.variants?.[0];
    if (!variant) {
      return {
        ok: false,
        error: `Variant ${variantId} not found — cannot verify stock.`,
      };
    }
    const manage = variant.manage_inventory ?? true;
    if (!manage) continue;
    const available = variant.inventory_quantity ?? 0;
    if (available < delta) {
      return {
        ok: false,
        error: `Not enough stock for ${variant.product?.title ?? "?"} / ${
          variant.title ?? "?"
        } — only ${available} available (need ${delta} more).`,
      };
    }
  }

  // 3. Cancel old order — Medusa returns inventory automatically.
  await sdk.admin.order.cancel(oldOrderId);

  // 4. Create new order via the existing draft-order pipeline.
  let created: { id: string; displayId: number };
  try {
    created = await createDmOrder(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      ok: false,
      error: `Recreate failed after cancel: ${msg}. Old order #${
        oldDisplayId ?? "?"
      } is canceled.`,
    };
  }

  // 5. Stamp bidirectional `replaces_*` / `replaced_by_*` metadata. Stamping
  // the canceled order is best-effort — some Medusa versions reject metadata
  // updates on canceled orders. The link is nice-to-have for traceability,
  // not load-bearing for the swap UX.
  try {
    const newRetrieve = await sdk.admin.order.retrieve(created.id, {
      fields: "id,metadata",
    });
    const newMeta = (newRetrieve.order.metadata ?? {}) as Record<
      string,
      unknown
    >;
    newMeta.replaces_order_id = oldOrderId;
    newMeta.replaces_display_id = oldDisplayId;
    await sdk.admin.order.update(created.id, { metadata: newMeta });
  } catch (err) {
    console.warn(
      "[editOrderHeavy] failed to stamp replaces metadata on new order:",
      err,
    );
  }
  try {
    const oldMeta = (oldOrder.metadata ?? {}) as Record<string, unknown>;
    oldMeta.replaced_by_order_id = created.id;
    oldMeta.replaced_by_display_id = created.displayId;
    await sdk.admin.order.update(oldOrderId, { metadata: oldMeta });
  } catch (err) {
    console.warn(
      "[editOrderHeavy] failed to stamp replaced_by metadata on old order:",
      err,
    );
  }

  return {
    ok: true,
    newOrderId: created.id,
    newDisplayId: created.displayId,
  };
}

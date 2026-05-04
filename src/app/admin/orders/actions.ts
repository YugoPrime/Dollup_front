"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  cancelOrder,
  classifyOrderEdit,
  createDmOrder,
  getRecentOrders,
  markOrderFulfilled,
  markOrderPaid,
  searchVariants,
  updateOrderLight,
  type CreateDmOrderInput,
  type OrderRow,
  type VariantHit,
} from "@/lib/admin-orders";

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}

export async function searchVariantsAction(
  query: string,
  opts: { availableOnly?: boolean } = {},
): Promise<VariantHit[]> {
  await requireAdmin();
  if (!query || query.trim().length < 2) return [];
  return searchVariants(query, { availableOnly: !!opts.availableOnly, limit: 25 });
}

export type CreateDmOrderActionResult =
  | { ok: true; id: string; displayId: number; warnings: string[] }
  | { ok: false; error: string };

export async function createDmOrderAction(
  input: CreateDmOrderInput,
): Promise<CreateDmOrderActionResult> {
  await requireAdmin();
  try {
    const { id, displayId, warnings } = await createDmOrder(input);
    revalidatePath("/admin/orders");
    return { ok: true, id, displayId, warnings };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create order";
    console.error("[createDmOrderAction]", err);
    return { ok: false, error: message };
  }
}

export async function markPaidAction(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await markOrderPaid(orderId);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function markFulfilledAction(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await markOrderFulfilled(orderId);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function cancelOrderAction(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await cancelOrder(orderId);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export type UpdateOrderResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function fetchOrderRow(orderId: string): Promise<OrderRow | null> {
  const orders = await getRecentOrders(200);
  return orders.find((o) => o.id === orderId) ?? null;
}

export async function updateOrderAction(
  orderId: string,
  input: CreateDmOrderInput,
): Promise<UpdateOrderResult> {
  await requireAdmin();
  try {
    const before = await fetchOrderRow(orderId);
    if (!before) return { ok: false, error: "Order not found" };
    const diff = classifyOrderEdit(before, input);
    if (diff.kind === "noop") return { ok: true, id: orderId };
    if (diff.kind === "heavy") {
      return {
        ok: false,
        error: `Heavy edit not yet supported: ${diff.reason}`,
      };
    }
    await updateOrderLight(orderId, diff.patch);
    revalidatePath("/admin/orders");
    return { ok: true, id: orderId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update order";
    console.error("[updateOrderAction]", err);
    return { ok: false, error: message };
  }
}

export async function getRecentOrdersAction(
  limit = 50,
): Promise<OrderRow[]> {
  await requireAdmin();
  return getRecentOrders(limit);
}

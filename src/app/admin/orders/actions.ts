"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  cancelOrder,
  createDmOrder,
  markOrderFulfilled,
  markOrderPaid,
  searchVariants,
  type CreateDmOrderInput,
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

export type CreateDmOrderResult =
  | { ok: true; id: string; displayId: number }
  | { ok: false; error: string };

export async function createDmOrderAction(
  input: CreateDmOrderInput,
): Promise<CreateDmOrderResult> {
  await requireAdmin();
  try {
    const { id, displayId } = await createDmOrder(input);
    revalidatePath("/admin/orders");
    return { ok: true, id, displayId };
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

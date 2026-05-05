"use server";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  getPrepOrders,
  markOrderReady,
  markOrderShipped,
  updateOrderLight,
  type OrderRow,
} from "@/lib/admin-orders";

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}

export async function reloadPrepOrdersAction(date: string): Promise<OrderRow[]> {
  await requireAdmin();
  return getPrepOrders(date);
}

export async function markReadyAction(orderId: string): Promise<void> {
  await requireAdmin();
  await markOrderReady(orderId);
}

export async function markShippedAction(orderId: string): Promise<void> {
  await requireAdmin();
  await markOrderShipped(orderId);
}

export async function setTrackingAction(
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  await requireAdmin();
  await updateOrderLight(orderId, {
    trackingNumber: trackingNumber.trim() || null,
  });
}

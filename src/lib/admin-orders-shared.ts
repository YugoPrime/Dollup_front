/**
 * Client-safe types and pure functions extracted from admin-orders.ts.
 * No server-only imports — safe to use in both server and client components.
 */

export type DmStatus = "preparation" | "ready";
export type EffectiveStatus = "preparation" | "ready" | "delivered" | "cancelled";

export type OrderRowBase = {
  status: string | null;
  fulfillmentStatus: string | null;
  dmStatus: DmStatus;
};

export function getEffectiveStatus(row: OrderRowBase): EffectiveStatus {
  if (row.status === "canceled") return "cancelled";
  if (row.fulfillmentStatus === "fulfilled") return "delivered";
  if (row.dmStatus === "ready") return "ready";
  return "preparation";
}

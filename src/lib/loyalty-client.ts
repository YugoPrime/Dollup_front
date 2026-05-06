"use client";

import { clientSdk } from "@/lib/cart-client";

export type LoyaltyAccount = {
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
};

export type LoyaltyTransaction = {
  id: string;
  type: "earn" | "redeem" | "adjust" | "expire" | string;
  points: number;
  reason: string | null;
  order_id: string | null;
  created_at: string;
};

export type LoyaltyTransactionsPage = {
  transactions: LoyaltyTransaction[];
  count: number;
  limit: number;
  offset: number;
};

export type LoyaltyRedeemPreview = {
  points_balance: number;
  max_redeemable: number;
  requested_points: number;
  discount_mur: number;
  balance_after: number;
  min_redeem_points: number;
  redeem_rate_mur_per_100_pts: number;
};

export type LoyaltyRedeemApplied = {
  cart_id: string;
  points_redeemed: number;
  discount_mur: number;
  balance_after: number;
};

export type LoyaltyRedeemMetadata = {
  points: number;
  discount_mur: number;
  applied_at?: string;
  customer_id?: string;
  redeem_rate_mur_per_100_pts?: number;
};

export function readLoyaltyRedeemMetadata(
  metadata: Record<string, unknown> | null | undefined,
): LoyaltyRedeemMetadata | null {
  const raw = metadata?.loyalty_redeem;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const points = Number(value.points);
  const discount = Number(value.discount_mur);
  if (!Number.isFinite(points) || !Number.isFinite(discount)) return null;
  return {
    points,
    discount_mur: discount,
    applied_at:
      typeof value.applied_at === "string" ? value.applied_at : undefined,
    customer_id:
      typeof value.customer_id === "string" ? value.customer_id : undefined,
    redeem_rate_mur_per_100_pts:
      typeof value.redeem_rate_mur_per_100_pts === "number"
        ? value.redeem_rate_mur_per_100_pts
        : undefined,
  };
}

export async function getMyLoyalty(): Promise<LoyaltyAccount | null> {
  try {
    const res = await clientSdk.client.fetch<{ loyalty: LoyaltyAccount }>(
      "/store/loyalty/me",
      { method: "GET" },
    );
    return res.loyalty;
  } catch (err) {
    if (err instanceof Error && err.message.includes("401")) return null;
    throw err;
  }
}

export async function listLoyaltyTransactions(
  limit = 50,
  offset = 0,
): Promise<LoyaltyTransactionsPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return clientSdk.client.fetch<LoyaltyTransactionsPage>(
    `/store/loyalty/transactions?${params.toString()}`,
    { method: "GET" },
  );
}

export async function previewLoyaltyRedemption(
  cartId: string,
  points: number,
): Promise<LoyaltyRedeemPreview> {
  const res = await clientSdk.client.fetch<{ loyalty: LoyaltyRedeemPreview }>(
    "/store/loyalty/redeem-preview",
    { method: "POST", body: { cart_id: cartId, points } },
  );
  return res.loyalty;
}

export async function applyLoyaltyRedemption(
  cartId: string,
  points: number,
): Promise<LoyaltyRedeemApplied> {
  const res = await clientSdk.client.fetch<{ loyalty: LoyaltyRedeemApplied }>(
    "/store/loyalty/redeem-apply",
    { method: "POST", body: { cart_id: cartId, points } },
  );
  return res.loyalty;
}

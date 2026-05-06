"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

export function LoyaltyCard() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loyalty = await getMyLoyalty();
        if (!cancelled) setAccount(loyalty);
      } catch {
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-blush-300 bg-white p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-blush-100" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-blush-100" />
      </section>
    );
  }

  if (!account) return null;

  return (
    <section className="rounded-xl border border-blush-300 bg-gradient-to-br from-[#FCE9E4] to-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            Doll Rewards
          </p>
          <p className="mt-2 font-display text-[36px] leading-none text-ink">
            {account.points_balance.toLocaleString("en-MU")}
            <span className="ml-2 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              points
            </span>
          </p>
          <p className="mt-2 font-sans text-[12px] text-ink-muted">
            Lifetime earned: {account.lifetime_earned.toLocaleString("en-MU")}{" "}
            | redeemed: {account.lifetime_redeemed.toLocaleString("en-MU")}
          </p>
        </div>
        <Link
          href="/account/loyalty"
          className="shrink-0 rounded-full border border-coral-500 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
        >
          History
        </Link>
      </div>
    </section>
  );
}

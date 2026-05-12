"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

export function LoyaltyTeaserStatus() {
  const { status, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);

  useEffect(() => {
    if (status !== "ready" || !customer) return;

    let cancelled = false;
    getMyLoyalty()
      .then((loyalty) => {
        if (!cancelled) setAccount(loyalty);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status, customer]);

  const isMember = !!customer && !!account;

  return (
    <div className="text-center md:text-left">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
        Doll Rewards
      </p>
      {isMember ? (
        <>
          <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
            You have{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              {account.points_balance.toLocaleString("en-MU")} pts
            </em>
          </h2>
          <div className="mt-5 md:text-left">
            <Link
              href="/account/loyalty"
              className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
            >
              See history
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
            Earn perks
            <br className="hidden md:block" />
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              {" "}
              every drop.
            </em>
          </h2>
          <div className="mt-5 md:text-left">
            <Link
              href="/loyalty"
              className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
            >
              Join Doll Rewards
            </Link>
            <p className="mt-2 font-sans text-[10px] tracking-wider text-ink-muted">
              Already 1,200+ members | Free to join
            </p>
          </div>
        </>
      )}
    </div>
  );
}

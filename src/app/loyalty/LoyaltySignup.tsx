"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";
import { formatInt } from "@/lib/loyalty-rules";

// Doll Rewards runs on customer accounts: points are earned on orders placed
// while signed in. Signed out, this card sends people to create an account;
// signed in, it shows their balance.
export function LoyaltyJoinCard({ welcomeBonus }: { welcomeBonus: number }) {
  const { status: authStatus, customer } = useCustomer();
  // The balance is tied to the customer it was loaded for, so "loading" is
  // derived (no setState inside the effect body).
  const [loaded, setLoaded] = useState<{ forId: string; account: LoyaltyAccount | null } | null>(null);

  useEffect(() => {
    if (authStatus !== "ready" || !customer) return;
    let cancelled = false;
    const forId = customer.id;
    getMyLoyalty()
      .then((loyalty) => {
        if (!cancelled) setLoaded({ forId, account: loyalty });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ forId, account: null });
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, customer]);

  const accountLoaded = !!customer && loaded?.forId === customer.id;
  const account = accountLoaded ? loaded.account : null;

  if (customer && !accountLoaded) {
    return (
      <div className="rounded-2xl border border-blush-300 bg-white p-7 md:p-8">
        <div className="h-4 w-28 animate-pulse rounded bg-blush-100" />
        <div className="mt-4 h-10 w-40 animate-pulse rounded bg-blush-100" />
      </div>
    );
  }

  if (customer) {
    return (
      <div className="rounded-2xl border border-coral-500 bg-gradient-to-br from-[#FCE9E4] to-white p-7 md:p-10">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          You&apos;re a member
        </p>
        {account ? (
          <>
            <p className="font-display text-[40px] leading-none text-ink">
              {formatInt(account.points_balance)}
              <span className="ml-2 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                points
              </span>
            </p>
            <p className="mt-3 font-sans text-[14px] font-semibold text-coral-700">
              Worth Rs {formatInt(account.points_balance)} off at checkout.
            </p>
            <p className="mt-2 font-sans text-[13px] leading-[1.55] text-ink-soft">
              Lifetime earned: {formatInt(account.lifetime_earned)} | redeemed:{" "}
              {formatInt(account.lifetime_redeemed)}
            </p>
          </>
        ) : (
          <p className="font-sans text-[14px] leading-[1.55] text-ink-soft">
            Your points are in your account.
          </p>
        )}
        <Link
          href="/account/loyalty"
          className="mt-5 inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          See history
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blush-300 bg-white p-7 md:p-8">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
        ★ Start with {formatInt(welcomeBonus)} points
      </p>
      <h3 className="font-display text-[26px] leading-[1.1] text-ink">
        Your account is your card.
      </h3>
      <p className="mt-3 font-sans text-[14px] leading-[1.6] text-ink-soft">
        Create an account and {formatInt(welcomeBonus)} points land straight away. Every
        order you place signed in adds more.
      </p>
      <Link
        href="/register"
        className="mt-6 block w-full rounded-full bg-ink py-3.5 text-center font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-500"
      >
        Create your account →
      </Link>
      <p className="mt-4 text-center font-sans text-[13px] text-ink-soft">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-coral-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

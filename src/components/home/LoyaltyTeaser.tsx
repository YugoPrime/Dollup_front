"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

const PERKS = [
  { icon: "*", body: "Earn **2 points** per Rs 100 - redeem from **150 pts**." },
  { icon: "H", body: "**Birthday surprise** every year on us." },
  { icon: "+", body: "**Priority support** - your DMs jump the queue." },
];

function renderPerk(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-bold text-coral-500">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function LoyaltyTeaser() {
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
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FCE9E4] to-cream py-10 md:py-14">
      <div
        className="absolute right-[-90px] top-12 h-[220px] w-[220px] rounded-full bg-coral-300/20"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1080px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="text-center md:text-left">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
              Doll Rewards
            </p>
            {isMember ? (
              <>
                <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
                  You have{" "}
                  <em
                    className="not-italic text-coral-500"
                    style={{ fontStyle: "italic" }}
                  >
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
                  <em
                    className="not-italic text-coral-500"
                    style={{ fontStyle: "italic" }}
                  >
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
          <div className="grid gap-3">
            {PERKS.map((perk) => (
              <div
                key={perk.icon}
                className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-[0_2px_6px_rgba(229,96,74,0.06)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[18px] text-white">
                  {perk.icon}
                </span>
                <p className="font-sans text-[12px] leading-[1.4] text-ink md:text-[13px]">
                  {renderPerk(perk.body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

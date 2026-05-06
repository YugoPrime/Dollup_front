import type { Metadata } from "next";
import { LoyaltyHistoryClient } from "./LoyaltyHistoryClient";

export const metadata: Metadata = {
  title: "Doll Rewards History",
  description: "Your points earned and redeemed.",
  robots: { index: false, follow: false },
};

export default function LoyaltyHistoryPage() {
  return (
    <div className="bg-cream py-12 md:py-16">
      <div className="mx-auto max-w-[800px] px-6 md:px-10">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          Doll Rewards
        </p>
        <h1 className="font-display text-[32px] leading-tight text-ink md:text-[44px]">
          Your points history
        </h1>
        <p className="mt-2 font-sans text-[14px] text-ink-soft">
          Every earn, redeem and adjustment, newest first.
        </p>

        <div className="mt-8">
          <LoyaltyHistoryClient />
        </div>
      </div>
    </div>
  );
}

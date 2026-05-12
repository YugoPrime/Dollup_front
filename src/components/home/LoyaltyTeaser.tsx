import { LoyaltyTeaserStatus } from "@/components/home/LoyaltyTeaserStatus";

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
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FCE9E4] to-cream py-10 md:py-14">
      <div
        className="absolute right-[-90px] top-12 h-[220px] w-[220px] rounded-full bg-coral-300/20"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1080px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
          <LoyaltyTeaserStatus />
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

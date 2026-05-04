import Link from "next/link";

const PERKS = [
  { icon: "★", body: "Earn **1 point** per Rs 10 spent — redeem on any order." },
  { icon: "♥", body: "**Birthday surprise** every year on us." },
  { icon: "✦", body: "**Priority support** — your DMs jump the queue." },
];

function renderPerk(body: string) {
  // Simple **bold** parser — turns *(.*)* into a coral bold span
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-coral-500">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function LoyaltyTeaser() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FCE9E4] to-cream py-10 md:py-14">
      <div className="absolute right-[-90px] top-12 h-[220px] w-[220px] rounded-full bg-coral-300/20" aria-hidden />
      <div className="relative mx-auto max-w-[1080px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="text-center md:text-left">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">★ Doll Rewards</p>
            <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
              Earn perks
              <br className="hidden md:block" />
              <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                {" "}every drop.
              </em>
            </h2>
            <div className="mt-5 md:text-left">
              <Link
                href="/loyalty"
                className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
              >
                Join Doll Rewards →
              </Link>
              <p className="mt-2 font-sans text-[10px] tracking-wider text-ink-muted">
                Already 1,200+ members · Free to join
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {PERKS.map((p) => (
              <div key={p.icon} className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-[0_2px_6px_rgba(229,96,74,0.06)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[18px] text-white">
                  {p.icon}
                </span>
                <p className="font-sans text-[12px] leading-[1.4] text-ink md:text-[13px]">{renderPerk(p.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

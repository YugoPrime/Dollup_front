import Link from "next/link";

const PERKS = [
  { icon: "★", title: "Earn Points", desc: "1 point for every Rs.1 spent on your orders." },
  { icon: "♡", title: "Exclusive Perks", desc: "Birthday treats, early access & member-only sales." },
  { icon: "↑", title: "Level Up", desc: "Silver, Gold & Platinum tiers unlock bigger rewards." },
];

export function LoyaltyTeaser() {
  return (
    <section className="bg-blush-300 px-6 py-16 md:px-10">
      <div className="mx-auto grid max-w-[900px] gap-6 md:grid-cols-3">
        {PERKS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl bg-white p-7 text-center shadow-[0_2px_12px_rgba(229,96,74,0.07)]"
          >
            <div className="mb-3 text-3xl text-coral-500">{p.icon}</div>
            <div className="mb-2 font-display text-[17px] font-semibold text-ink">
              {p.title}
            </div>
            <p className="font-sans text-[13px] leading-relaxed text-ink-soft">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <p className="mb-4 font-sans text-sm text-ink">
          Join <strong>Doll Rewards</strong> — it&apos;s free &amp; fabulous.
        </p>
        <Link
          href="/loyalty"
          className="inline-block rounded bg-coral-500 px-7 py-3 font-sans text-[13px] font-semibold text-white hover:bg-coral-700"
        >
          Join Now →
        </Link>
      </div>
    </section>
  );
}

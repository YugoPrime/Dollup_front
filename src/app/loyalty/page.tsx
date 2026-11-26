import type { Metadata } from "next";
import { formatInt, getLoyaltyRules, pointsFor, unlockSpend, type LoyaltyRules } from "@/lib/loyalty-rules";
import { LoyaltyJoinCard } from "./LoyaltySignup";

// Rules come from the shop (5-minute cache), so a rate change in the admin
// reaches this page without a deploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Doll Rewards · Loyalty Programme",
  description:
    "Earn points on every order and spend them as money off. Doll Rewards is our way of saying thank you.",
  alternates: { canonical: "/loyalty" },
  openGraph: {
    title: "Doll Rewards",
    description: "Earn points on every order and get early access with Doll Rewards.",
    url: "/loyalty",
  },
};

function perks(r: LoyaltyRules) {
  return [
    {
      icon: "★",
      title: `${r.earnPer100} points per Rs 100`,
      body: `That's ${r.earnPer100}% back on every order. Redeem from ${formatInt(r.minRedeem)} points: 1 point = Rs 1 off.`,
    },
    {
      icon: "♥",
      title: `${formatInt(r.welcomeBonus)} points to start`,
      body: `Create your account and ${formatInt(r.welcomeBonus)} points land straight away.`,
    },
    {
      icon: "✿",
      title: "Early access drops",
      body: "Members shop new drops 24 hours before everyone else. First in, first picks.",
    },
    {
      icon: "♕",
      title: "Member-only sales",
      body: "Flash sales we don't advertise publicly. Only our list hears about them.",
    },
  ];
}

function howItWorks(r: LoyaltyRules) {
  return [
    {
      step: "01",
      title: "Create your account",
      body: `Sign up with your email. ${formatInt(r.welcomeBonus)} points are yours straight away.`,
    },
    {
      step: "02",
      title: "Earn on every order",
      body: `Every Rs 100 = ${r.earnPer100} points on website orders placed while signed in. Points show the moment you order.`,
    },
    {
      step: "03",
      title: "Redeem at checkout",
      body: `From ${formatInt(r.minRedeem)} points. 1 point = Rs 1 off, up to half your bag.`,
    },
    {
      step: "04",
      title: "Enjoy the perks",
      body: "Early access and member-only sales: we email you when each one drops.",
    },
  ];
}

export default async function LoyaltyPage() {
  const rules = await getLoyaltyRules();
  const spend = unlockSpend(rules);
  const orderPoints = pointsFor(spend, rules);
  const total = rules.welcomeBonus + orderPoints;

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-16 md:px-10 md:py-24">
        <div className="absolute right-[-100px] top-12 h-[260px] w-[260px] rounded-full bg-white/25 blur-3xl" aria-hidden />
        <div className="absolute bottom-[-80px] left-[-60px] h-[200px] w-[200px] rounded-full bg-coral-300/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Doll Rewards
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[72px]">
            Earn perks{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              every drop.
            </em>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] font-sans text-[15px] leading-[1.55] text-ink-soft md:text-[16px]">
            Our way of saying thank you to the women who keep coming back. Free to join, points on every order, and perks only members get.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#join"
              className="rounded-full bg-ink px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-500"
            >
              Join Doll Rewards →
            </a>
            <a
              href="#how"
              className="rounded-full border border-ink bg-white/40 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink backdrop-blur-sm transition-colors hover:bg-white"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Perks grid */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ The perks
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
              What you get for being a member
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {perks(rules).map((p) => (
              <div
                key={p.title}
                className="group rounded-2xl border border-blush-300 bg-white p-7 transition-shadow hover:shadow-[0_4px_16px_rgba(229,96,74,0.10)]"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 font-display text-[22px] text-white transition-transform group-hover:scale-110">
                  {p.icon}
                </span>
                <h3 className="mb-2 font-display text-[20px] leading-tight text-ink">
                  {p.title}
                </h3>
                <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worked example */}
      {spend > 0 && (
        <section className="px-6 pb-14 md:px-10 md:pb-20">
          <div className="mx-auto max-w-[900px] rounded-2xl border border-blush-300 bg-white p-6 md:p-8">
            <p className="mb-4 text-center font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ What it looks like
            </p>
            <div className="grid items-center gap-3 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <div>
                <p className="font-display text-[28px] leading-none text-ink">{formatInt(rules.welcomeBonus)} pts</p>
                <p className="mt-1 font-sans text-[12px] text-ink-soft">for signing up</p>
              </div>
              <p className="font-display text-[24px] text-coral-500" aria-hidden>+</p>
              <div>
                <p className="font-display text-[28px] leading-none text-ink">{formatInt(orderPoints)} pts</p>
                <p className="mt-1 font-sans text-[12px] text-ink-soft">on a Rs {formatInt(spend)} order</p>
              </div>
              <p className="font-display text-[24px] text-coral-500" aria-hidden>=</p>
              <div className="rounded-xl bg-coral-500 px-4 py-3 text-white">
                <p className="font-display text-[28px] leading-none">Rs {formatInt(total)} off</p>
                <p className="mt-1 font-sans text-[12px] text-white/85">your next order</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="bg-ink px-6 py-14 text-white md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
              ✦ How it works
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] md:text-[42px]">
              Simple, like it should be.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks(rules).map((s) => (
              <div key={s.step} className="rounded-2xl bg-white/5 p-6">
                <p className="mb-3 font-display text-[28px] text-coral-300">{s.step}</p>
                <h3 className="mb-1 font-display text-[20px] leading-tight">{s.title}</h3>
                <p className="font-sans text-[13px] leading-[1.6] text-white/75">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join form */}
      <section id="join" className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ Join Doll Rewards
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
              Free to join.{" "}
              <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                Always.
              </em>
            </h2>
            <p className="mt-4 font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[15px]">
              Create an account and you&apos;re in. No separate signup.
            </p>
          </div>
          <LoyaltyJoinCard welcomeBonus={rules.welcomeBonus} />
        </div>
      </section>

    </div>
  );
}

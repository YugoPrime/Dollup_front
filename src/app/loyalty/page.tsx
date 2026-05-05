import type { Metadata } from "next";
import Link from "next/link";
import { LoyaltySignup } from "./LoyaltySignup";

export const metadata: Metadata = {
  title: "Doll Rewards · Loyalty Programme",
  description:
    "Earn points on every order, unlock perks for your birthday, and get priority support — Doll Rewards is our way of saying thank you.",
};

const PERKS = [
  {
    icon: "★",
    title: "1 point per Rs 10",
    body: "Every order earns you points automatically. Redeem on any future purchase — no minimum.",
  },
  {
    icon: "♥",
    title: "Birthday surprise",
    body: "Tell us your birth month at signup. We send a private code in your birthday week, every year.",
  },
  {
    icon: "✦",
    title: "Priority DMs",
    body: "Members jump to the front of our WhatsApp and Instagram queue — sizing, restocks, all of it.",
  },
  {
    icon: "✿",
    title: "Early access drops",
    body: "Members shop new drops 24 hours before everyone else. First in, first picks.",
  },
  {
    icon: "♕",
    title: "Member-only sales",
    body: "Periodic flash sales we don't advertise publicly — only sent to our list.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Sign up free",
    body: "Drop your email and birthday below. That's it — you're a member.",
  },
  {
    step: "02",
    title: "Earn on every order",
    body: "Every Rs 10 you spend = 1 point. Points appear in your account within 48h of delivery.",
  },
  {
    step: "03",
    title: "Redeem at checkout",
    body: "Use points as discount on any future order. 100 points = Rs 100 off.",
  },
  {
    step: "04",
    title: "Unlock the perks",
    body: "Birthday treat, early access, member-only sales — we'll email you when each one drops.",
  },
];

export default function LoyaltyPage() {
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
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
            {HOW_IT_WORKS.map((s) => (
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
              ✦ Join the list
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
              Free to join.{" "}
              <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                Always.
              </em>
            </h2>
            <p className="mt-4 font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[15px]">
              Drop your email and birthday below. We&apos;ll add you to the members list, send your welcome perks, and notify you when point-earning launches in your account.
            </p>
            <div className="mt-5 rounded-xl border border-blush-300 bg-white/60 p-4 font-sans text-[13px] leading-[1.55] text-ink-soft">
              <strong className="text-ink">Already have an account?</strong> You&apos;re automatically enrolled in Doll Rewards — no separate signup needed. <Link href="/register" className="text-coral-500 hover:underline">Create an account →</Link> or <Link href="/login" className="text-coral-500 hover:underline">sign in</Link>.
            </div>
            <p className="mt-3 font-sans text-[12px] text-ink-muted">
              No spam — about one email a week, max. Unsubscribe anytime.
            </p>
          </div>
          <LoyaltySignup />
        </div>
      </section>

      {/* Status note */}
      <section className="bg-white px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px] rounded-2xl border border-blush-300 bg-cream p-7 md:p-10">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            Heads up
          </p>
          <h2 className="mb-2 font-display text-[20px] leading-[1.2] text-ink md:text-[24px]">
            We&apos;re relaunching the rewards system
          </h2>
          <p className="font-sans text-[13px] leading-[1.65] text-ink-soft md:text-[14px]">
            Doll Rewards is being rebuilt from scratch with our new shop. Sign up now to lock in your spot — we&apos;ll email you the moment your account starts earning points, plus a welcome bonus to thank you for being early.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[700px] text-center">
          <h2 className="font-display text-[24px] leading-[1.2] text-ink md:text-[32px]">
            In the meantime — go shopping.
          </h2>
          <div className="mt-6">
            <Link
              href="/shop"
              className="rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Browse the shop →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

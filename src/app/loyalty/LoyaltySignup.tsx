"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

type Status = "idle" | "submitting" | "ok" | "err";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Lightweight client-side capture. Stores intent in localStorage so we can
// migrate to a backend table once the loyalty engine is wired. No PII leaves
// the browser yet — this is a pre-launch holding form.
export function LoyaltySignup() {
  const { status: authStatus, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "ready" || !customer) return;
    let cancelled = false;
    setAccountLoaded(false);
    getMyLoyalty()
      .then((loyalty) => {
        if (!cancelled) setAccount(loyalty);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      })
      .finally(() => {
        if (!cancelled) setAccountLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, customer]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setStatus("err");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    try {
      const key = "dub_loyalty_signups";
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as Array<{
        email: string;
        firstName: string;
        birthMonth: string;
        at: number;
      }>;
      const next = [
        ...existing.filter((s) => s.email !== cleanEmail),
        { email: cleanEmail, firstName: firstName.trim(), birthMonth, at: Date.now() },
      ];
      localStorage.setItem(key, JSON.stringify(next));
      setStatus("ok");
    } catch {
      setStatus("err");
      setErrorMsg("Something went wrong. Try again or DM us on WhatsApp.");
    }
  };

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-coral-300 bg-coral-500 p-8 text-white md:p-10">
        <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
          ★ You&apos;re in
        </p>
        <h3 className="mb-3 font-display text-[26px] leading-[1.1]">
          Welcome to Doll Rewards.
        </h3>
        <p className="font-sans text-[14px] leading-[1.6] text-white/90">
          We&apos;ve saved your details. Watch your inbox — we&apos;ll email you the moment point-earning goes live in your account, with a welcome bonus to thank you for being early.
        </p>
      </div>
    );
  }

  if (customer && !accountLoaded) {
    return (
      <div className="rounded-2xl border border-blush-300 bg-white p-7 md:p-8">
        <div className="h-4 w-28 animate-pulse rounded bg-blush-100" />
        <div className="mt-4 h-10 w-40 animate-pulse rounded bg-blush-100" />
      </div>
    );
  }

  if (customer && account) {
    return (
      <div className="rounded-2xl border border-coral-500 bg-gradient-to-br from-[#FCE9E4] to-white p-7 md:p-10">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          You&apos;re a member
        </p>
        <p className="font-display text-[40px] leading-none text-ink">
          {account.points_balance.toLocaleString("en-MU")}
          <span className="ml-2 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            points
          </span>
        </p>
        <p className="mt-4 font-sans text-[14px] leading-[1.55] text-ink-soft">
          Lifetime earned: {account.lifetime_earned.toLocaleString("en-MU")} |
          redeemed: {account.lifetime_redeemed.toLocaleString("en-MU")}
        </p>
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
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-blush-300 bg-white p-7 md:p-8"
    >
      <label className="block">
        <span className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
          First name
        </span>
        <input
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Your first name"
          className="w-full rounded-lg border border-blush-300 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-lg border border-blush-300 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
          Birthday month
        </span>
        <select
          required
          value={birthMonth}
          onChange={(e) => setBirthMonth(e.target.value)}
          className="w-full rounded-lg border border-blush-300 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none"
        >
          <option value="" disabled>Select month</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="mt-1 block font-sans text-[11px] text-ink-muted">
          So we know when to send your birthday treat.
        </span>
      </label>

      {errorMsg && (
        <p className="mt-3 font-sans text-[12px] text-coral-700">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-full bg-ink py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-500 disabled:opacity-60"
      >
        {status === "submitting" ? "Joining…" : "Join Doll Rewards"}
      </button>

      <p className="mt-3 text-center font-sans text-[11px] text-ink-muted">
        Free forever · Unsubscribe anytime
      </p>
    </form>
  );
}

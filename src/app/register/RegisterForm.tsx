"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/account";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
      });
      router.replace(redirect);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't create your account. The email may already be registered.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
      <h1 className="font-display text-3xl text-ink">
        Create your <em className="not-italic text-coral-500">account</em>
      </h1>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Track orders, save favourites, and check out faster next time.
      </p>

      {error && (
        <div className="mt-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
              First name<span className="ml-1 text-coral-500">*</span>
            </span>
            <input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
              Last name<span className="ml-1 text-coral-500">*</span>
            </span>
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
            Email<span className="ml-1 text-coral-500">*</span>
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
            Phone (optional)
          </span>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
            Password<span className="ml-1 text-coral-500">*</span>
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
          <span className="mt-1 block font-sans text-[11px] text-ink-muted">
            Minimum 8 characters.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
            Confirm password<span className="ml-1 text-coral-500">*</span>
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center font-sans text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href={`/login${
            redirect !== "/account"
              ? `?redirect=${encodeURIComponent(redirect)}`
              : ""
          }`}
          className="font-semibold text-coral-500 hover:text-coral-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

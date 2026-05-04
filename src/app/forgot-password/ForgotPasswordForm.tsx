"use client";

import Link from "next/link";
import { useState } from "react";
import { clientSdk } from "@/lib/cart-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await clientSdk.auth.resetPassword("customer", "emailpass", {
        identifier: email.trim(),
      });
      setSent(true);
    } catch (err) {
      // The backend returns success regardless of whether the email exists, but
      // network/CORS/server errors can still bubble up. Show a friendly message
      // and still flip to the "sent" view so we don't leak account existence.
      console.warn("resetPassword error:", err);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
        <h1 className="font-display text-3xl text-ink">
          Check your <em className="not-italic text-coral-500">inbox</em>
        </h1>
        <p className="mt-3 font-sans text-sm text-ink-muted">
          If an account exists for <strong>{email}</strong>, you&apos;ll get a
          reset link shortly. Be sure to check your spam folder.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-coral-500 px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-coral-700"
          >
            Back to sign in
          </Link>
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="rounded-md border border-blush-400 px-4 py-2.5 font-sans text-sm font-medium text-ink hover:bg-blush-100"
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
      <h1 className="font-display text-3xl text-ink">
        Forgot your <em className="not-italic text-coral-500">password</em>?
      </h1>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <div className="mt-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-5 text-center font-sans text-[13px] text-ink-muted">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-coral-500 hover:text-coral-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { clientSdk } from "@/lib/cart-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Reset link is missing or invalid. Please request a new one.");
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
      await clientSdk.auth.updateProvider(
        "customer",
        "emailpass",
        { password, ...(email ? { email } : {}) },
        token,
      );
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't reset your password. The link may have expired.";
      setError(msg);
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
        <h1 className="font-display text-3xl text-ink">Invalid link</h1>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block rounded-md bg-coral-500 px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
        <h1 className="font-display text-3xl text-ink">
          Password <em className="not-italic text-coral-500">updated</em>
        </h1>
        <p className="mt-3 font-sans text-sm text-ink-muted">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
      <h1 className="font-display text-3xl text-ink">
        Set a new <em className="not-italic text-coral-500">password</em>
      </h1>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Choose a password you don&apos;t use anywhere else.
      </p>

      {error && (
        <div className="mt-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
            New password<span className="ml-1 text-coral-500">*</span>
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
            Confirm new password<span className="ml-1 text-coral-500">*</span>
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
          className="flex w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

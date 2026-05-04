"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/auth-client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace(redirect);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't sign you in. Check your email and password.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-7 shadow-[0_8px_24px_rgba(229,96,74,0.05)]">
      <h1 className="font-display text-3xl text-ink">
        Welcome <em className="not-italic text-coral-500">back</em>
      </h1>
      <p className="mt-1 font-sans text-sm text-ink-muted">
        Sign in to track orders and access your wishlist.
      </p>

      {error && (
        <div className="mt-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <GoogleSignInButton redirectAfter={redirect} />
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <div className="my-5 flex items-center gap-3 font-sans text-[11px] uppercase tracking-wider text-ink-muted">
          <span className="h-px flex-1 bg-blush-300" />
          or
          <span className="h-px flex-1 bg-blush-300" />
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
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
            Password<span className="ml-1 text-coral-500">*</span>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
        </label>

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="font-sans text-[12px] font-medium text-coral-500 hover:text-coral-700"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center font-sans text-[13px] text-ink-muted">
        New to Doll Up?{" "}
        <Link
          href={`/register${
            redirect !== "/account"
              ? `?redirect=${encodeURIComponent(redirect)}`
              : ""
          }`}
          className="font-semibold text-coral-500 hover:text-coral-700"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

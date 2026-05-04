"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { completeGoogleCallback } from "@/lib/auth-client";

export function GoogleCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const query: Record<string, string> = {};
      params.forEach((value, key) => {
        query[key] = value;
      });
      if (!query.code) {
        if (!cancelled) {
          setError("Google didn't return an authorization code.");
        }
        return;
      }
      try {
        const redirect = await completeGoogleCallback(query);
        if (!cancelled) router.replace(redirect);
      } catch (err) {
        console.error("Google callback failed:", err);
        if (!cancelled) {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : "Couldn't complete Google sign-in.";
          setError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (error) {
    return (
      <div className="rounded-xl border border-blush-300 bg-white p-7 text-center">
        <p className="font-display text-xl text-ink">Sign-in failed</p>
        <p className="mt-2 font-sans text-sm text-ink-muted">{error}</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-md bg-coral-500 px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
      <p className="mt-4 font-sans text-sm text-ink-muted">
        Signing you in with Google…
      </p>
    </div>
  );
}

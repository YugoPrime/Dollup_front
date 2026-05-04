"use client";

import { useState } from "react";
import { startGoogleLogin } from "@/lib/auth-client";

const ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function GoogleSignInButton({
  redirectAfter,
  label = "Continue with Google",
}: {
  redirectAfter?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ENABLED) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await startGoogleLogin(redirectAfter);
          } catch (err) {
            console.error(err);
            setError("Google sign-in is temporarily unavailable.");
            setLoading(false);
          }
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border-[1.5px] border-blush-400 bg-white px-4 py-2.5 font-sans text-sm font-semibold text-ink transition-colors hover:bg-blush-100 disabled:opacity-60"
      >
        <GoogleGlyph />
        {loading ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="text-center font-sans text-[12px] text-coral-700">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-10.3 7.2-6 0-10.8-4.8-10.8-10.8S19 13.2 25 13.2c3 0 5.6 1.1 7.7 3l5.1-5.1C34.4 7.6 29.5 5.6 24 5.6 13.5 5.6 5 14.1 5 24.6s8.5 19 19 19c10.5 0 19-8.5 19-19 0-1.4-.1-2.7-.4-4.1z"
      />
      <path
        fill="#FF3D00"
        d="M7 14.7l6 4.4c1.6-3.9 5.4-6.9 9.9-6.9 3 0 5.6 1.1 7.7 3l5.1-5.1C32 7 27.7 5 23 5 16 5 9.9 9 7 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.6c5 0 9.7-1.9 13-5l-6-4.9c-1.7 1.2-4 2-7 2-4.7 0-8.7-3-10.2-7l-6 4.6C10 39.7 16.4 43.6 24 43.6z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 1.9-1.9 3.5-3.4 4.7l6 4.9c4.1-3.7 6.7-9.2 6.7-15.7 0-1.4-.1-2.7-.6-4z"
      />
    </svg>
  );
}

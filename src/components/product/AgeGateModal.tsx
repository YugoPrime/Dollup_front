"use client";

import { useEffect, useState } from "react";

const COOKIE = "dub_age_verified_18";
const TTL_DAYS = 30;

function isVerified(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE}=1`);
}

function setVerified() {
  if (typeof document === "undefined") return;
  const ttl = TTL_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE}=1; path=/; max-age=${ttl}; SameSite=Lax`;
}

export function AgeGateModal() {
  // Open by default. SSR renders the modal (blocks the page); effect closes
  // it client-side if the cookie says the visitor already confirmed.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (isVerified()) setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl bg-cream p-6 text-center shadow-2xl sm:p-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-coral-500">
          18+ only
        </p>
        <h2
          id="age-gate-title"
          className="mt-3 font-display text-[28px] leading-tight text-ink sm:text-[34px]"
        >
          A quick check first
        </h2>
        <p className="mt-3 font-sans text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
          This product is for adults only. You must be 18 or older to view it.
          We&apos;ll remember your answer on this device for 30 days.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              setVerified();
              setOpen(false);
            }}
            className="rounded-md bg-coral-500 px-6 py-3 font-sans text-[13px] font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700"
          >
            I am 18 or older
          </button>
          <a
            href="/"
            className="rounded-md border border-blush-400 px-6 py-3 font-sans text-[13px] font-semibold uppercase tracking-wider text-ink hover:bg-blush-100"
          >
            Take me back
          </a>
        </div>

        <p className="mt-5 font-sans text-[11px] text-ink-muted">
          By continuing you confirm you&apos;re of legal age in your country.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  applyConsent,
  clearConsent,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics";

type Status = "accepted" | "rejected" | "none";

export function CookieManager() {
  const [status, setStatus] = useState<Status>("none");
  const [hydrated, setHydrated] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    setStatus((readConsent() as Status | null) ?? "none");
    setHydrated(true);
  }, []);

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    applyConsent(choice);
    setStatus(choice);
    setConfirmation(
      choice === "accepted"
        ? "All cookies enabled. Thanks — analytics will help us improve the site for you."
        : "Non-essential cookies turned off. Only the cookies needed for cart, checkout and login will be used.",
    );
  };

  const reset = () => {
    clearConsent();
    setStatus("none");
    setConfirmation(
      "Your choice has been cleared. The cookie banner will reappear on your next page load so you can choose again.",
    );
  };

  const StatusPill = () => {
    if (!hydrated) {
      return (
        <span className="inline-flex items-center rounded-full bg-blush-100 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Loading…
        </span>
      );
    }
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          Accepted
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center rounded-full bg-coral-50 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-coral-700">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-blush-100 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        No choice yet
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-blush-300 bg-white p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">
          Your current choice
        </h2>
        <StatusPill />
      </div>

      <p className="font-sans text-[13px] leading-relaxed text-ink-soft">
        Use the buttons below to change how we use cookies on your device. Your
        choice is stored locally on this browser only — clear it if you want
        to be asked again, or use a different choice on a different device.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="rounded-md bg-coral-500 px-4 py-2.5 font-sans text-[12px] font-semibold text-white transition-colors hover:bg-coral-700"
        >
          Accept all cookies
        </button>
        <button
          type="button"
          onClick={() => choose("rejected")}
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-4 py-2.5 font-sans text-[12px] font-semibold text-ink transition-colors hover:border-coral-500"
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border-[1.5px] border-transparent bg-blush-100 px-4 py-2.5 font-sans text-[12px] font-semibold text-ink-soft transition-colors hover:bg-blush-300 hover:text-ink"
        >
          Reset choice
        </button>
      </div>

      {confirmation ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-md bg-cream px-3 py-2 font-sans text-[12px] text-ink-soft"
        >
          {confirmation}
        </p>
      ) : null}
    </div>
  );
}

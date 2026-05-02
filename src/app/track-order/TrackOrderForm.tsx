// src/app/track-order/TrackOrderForm.tsx
"use client";

import { useState } from "react";

export type TrackSubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "network_error" };

type Props = {
  initialOrderRef?: string;
  initialPhone?: string;
  state: TrackSubmitState;
  onSubmit: (orderRef: string, phone: string) => void;
};

export function TrackOrderForm({
  initialOrderRef = "",
  initialPhone = "",
  state,
  onSubmit,
}: Props) {
  const [orderRef, setOrderRef] = useState(initialOrderRef);
  const [phone, setPhone] = useState(initialPhone);
  const [touched, setTouched] = useState(false);

  const orderRefError =
    touched && !orderRef.trim() ? "Order number is required" : null;
  const phoneError =
    touched && phone.replace(/\D/g, "").length < 7
      ? "Enter the phone you used at checkout"
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!orderRef.trim() || phone.replace(/\D/g, "").length < 7) return;
    onSubmit(orderRef.trim(), phone.trim());
  };

  const isLoading = state.kind === "loading";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-blush-400 bg-white p-6 lg:p-8"
      noValidate
    >
      <h1 className="font-display text-2xl font-semibold text-ink">
        Track your order
      </h1>
      <p className="mt-2 font-sans text-sm text-ink-muted">
        Enter your order number and the phone number you used at checkout.
      </p>

      {state.kind === "not_found" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700"
        >
          We couldn&apos;t find an order matching those details. Double-check
          your order number and phone number.
        </div>
      )}
      {state.kind === "network_error" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700"
        >
          Couldn&apos;t reach the server. Please try again.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-ink">
            Order number
          </span>
          <input
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="DUB1042"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-blush-400 px-3 py-2 font-sans text-sm text-ink focus:border-coral-500 focus:outline-none"
          />
          {orderRefError && (
            <span className="mt-1 block font-sans text-[12px] text-red-600">
              {orderRefError}
            </span>
          )}
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-ink">
            Phone number
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5712 3456"
            autoComplete="tel"
            className="mt-1 w-full rounded-md border border-blush-400 px-3 py-2 font-sans text-sm text-ink focus:border-coral-500 focus:outline-none"
          />
          {phoneError && (
            <span className="mt-1 block font-sans text-[12px] text-red-600">
              {phoneError}
            </span>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full rounded-md bg-coral-500 px-6 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60 sm:w-auto"
      >
        {isLoading ? "Tracking…" : "Track"}
      </button>
    </form>
  );
}

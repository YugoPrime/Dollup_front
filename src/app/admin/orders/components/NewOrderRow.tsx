"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import { createDmOrderAction } from "../actions";
import { useOrderForm } from "./useOrderForm";
import { OrderFormLayout } from "./OrderRowFields";
import type { SelectedVariant } from "./StockChecker";

export type NewOrderRowRef = {
  addVariant: (v: SelectedVariant) => void;
};

export const NewOrderRow = forwardRef<
  NewOrderRowRef,
  { onSaved?: () => void }
>(function NewOrderRow({ onSaved }, ref) {
  const form = useOrderForm();
  const {
    markTouched,
    errorBanner,
    setErrorBanner,
    successBanner,
    setSuccessBanner,
    fieldErrors,
    addVariant,
    reset,
    toCreateInput,
  } = form;

  const [submitting, startTransition] = useTransition();
  const [showPseudo, setShowPseudo] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useImperativeHandle(ref, () => ({
    addVariant,
  }));

  async function handleSubmit() {
    setErrorBanner(null);
    setSuccessBanner(null);
    markTouched("buyerName", "phone", "city", "items");
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = toCreateInput();

    startTransition(async () => {
      const res = await createDmOrderAction(payload);
      if (res.ok) {
        const banner =
          res.warnings.length > 0
            ? `Order #${res.displayId} saved. ${res.warnings.join(" ")}`
            : `Order #${res.displayId} saved.`;
        setSuccessBanner(banner);
        if (res.warnings.length > 0) setErrorBanner(res.warnings.join(" "));
        reset();
        setShowPseudo(false);
        setShowEmail(false);
        setShowManual(false);
        onSaved?.();
      } else {
        setErrorBanner(res.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">New order</h2>
      </div>
      {successBanner && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-blush-300 bg-blush-100/60 px-3 py-1.5 text-sm text-ink"
        >
          {successBanner}
        </p>
      )}
      {errorBanner && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          {errorBanner}
        </p>
      )}

      <OrderFormLayout
        form={form}
        showPseudo={showPseudo}
        setShowPseudo={setShowPseudo}
        showEmail={showEmail}
        setShowEmail={setShowEmail}
        showManual={showManual}
        setShowManual={setShowManual}
      />

      {/* Save */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-coral-500 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save order"}
        </button>
      </div>
    </section>
  );
});

// Renders the payment-method-specific instructions on the checkout success
// page. Branches on the customer's stated payment_method (stored as cart
// metadata at checkout, propagated to order metadata by Medusa's
// completeCartWorkflow). Cash on delivery shows COD copy; non-cash methods
// show MCB account details + a WhatsApp screenshot CTA, and add a
// "processed only after funds received" callout for courier deliveries.
"use client";

import { useState } from "react";
import { PAYMENT_INFO } from "@/lib/payment-info";
import {
  paymentClearedBeforeShipApplies,
  type DmDeliveryMethod,
  type PaymentMethod,
} from "@/lib/checkout";

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-blush-300 bg-cream/40 px-3 py-2">
      <div className="min-w-0">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </p>
        <p className="truncate font-sans text-sm font-semibold text-ink">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked — silent */
          }
        }}
        className="shrink-0 rounded-md border border-coral-500 px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-coral-700 transition hover:bg-coral-500 hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function PaymentInstructions({
  paymentMethod,
  deliveryMethod,
  displayId,
  totalLabel,
}: {
  paymentMethod: PaymentMethod;
  deliveryMethod: DmDeliveryMethod | null;
  displayId: string | number;
  totalLabel: string;
}) {
  if (paymentMethod === "Cash") {
    return (
      <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="font-display text-base font-semibold text-emerald-900">
          Cash on Delivery
        </h2>
        <p className="mt-2 font-sans text-sm text-emerald-900/80">
          You&apos;ll pay <span className="font-semibold">{totalLabel}</span> in
          cash when your order arrives. Please have the exact amount ready if
          possible.
        </p>
      </div>
    );
  }

  const heading =
    paymentMethod === "MCB Juice" ? "Pay via MCB Juice" : "Pay via Bank Transfer";
  const subhead =
    paymentMethod === "MCB Juice"
      ? "Open your MCB Juice app and send the total to the account below."
      : "Transfer the total to our MCB business account.";

  const reference = `DUB${displayId}`;
  const waMessage = encodeURIComponent(
    `Hi! Sending payment screenshot for order ${reference}.`,
  );
  const waLink = `https://wa.me/${PAYMENT_INFO.whatsapp_digits}?text=${waMessage}`;
  const showFundsCallout = paymentClearedBeforeShipApplies(
    paymentMethod,
    deliveryMethod,
  );

  return (
    <div className="mb-8 rounded-xl border border-coral-500 bg-blush-100/60 p-5">
      <h2 className="font-display text-base font-semibold text-ink">
        {heading}
      </h2>
      <p className="mt-1 font-sans text-sm text-ink-soft">{subhead}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CopyableField label="Account name" value={PAYMENT_INFO.account_name} />
        <CopyableField label="Bank" value={PAYMENT_INFO.bank} />
        <CopyableField
          label="Account number"
          value={PAYMENT_INFO.account_number}
        />
        <CopyableField label="Amount" value={totalLabel} />
        <CopyableField label="Reference" value={reference} />
      </div>

      <div className="mt-4 rounded-md border border-blush-300 bg-white p-3">
        <p className="font-sans text-sm text-ink">
          After you&apos;ve sent the payment, please send us a screenshot on
          WhatsApp so we can confirm and process your order.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          Send screenshot on WhatsApp
        </a>
        <p className="mt-2 font-sans text-[11px] text-ink-muted">
          {PAYMENT_INFO.whatsapp}
        </p>
      </div>

      {showFundsCallout && (
        <div className="mt-4 rounded-md border-[1.5px] border-coral-500 bg-coral-300/30 p-3">
          <p className="font-sans text-sm font-semibold text-coral-700">
            Your order will be processed only when funds are received.
          </p>
          <p className="mt-1 font-sans text-[12px] text-coral-700/90">
            Since this order ships by courier, we wait for the transfer to
            land before dispatching.
          </p>
        </div>
      )}
    </div>
  );
}

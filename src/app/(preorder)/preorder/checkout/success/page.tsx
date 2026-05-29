import Link from "next/link";
import type { Metadata } from "next";
import { PAYMENT_INFO } from "@/lib/payment-info";

export const metadata: Metadata = {
  title: "Reservation placed",
  robots: { index: false, follow: false },
};

export default async function PreorderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; deposit?: string }>;
}) {
  const { order, deposit } = await searchParams;
  const depositNum = Number(deposit ?? 0);

  const waText = encodeURIComponent(
    `Hi Doll Up! I've just placed pre-order ${order ?? ""} and am sending my deposit payment screenshot.`,
  );
  const waLink = `https://wa.me/${PAYMENT_INFO.whatsapp_digits}?text=${waText}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 pb-28 md:py-16">
      {/* Eyebrow */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
        Reservation placed
      </p>

      {/* Headline */}
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
        Thank you — you&apos;re almost set.
      </h1>

      {/* Order + 24h instruction */}
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        Order{" "}
        <span className="font-semibold text-ink">#{order ?? "—"}</span> is
        reserved. To confirm it, please pay your 75% deposit within{" "}
        <span className="font-semibold text-ink">24 hours</span>. Your slot
        will be released if no payment is received.
      </p>

      {/* Payment card */}
      <div className="mt-8 rounded-xl border border-sage-200 bg-sage-50 p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-700">
          Pay your deposit
        </p>

        <dl className="mt-5 space-y-4">
          {/* Deposit amount */}
          <div className="flex items-baseline justify-between gap-4 border-b border-sage-200 pb-4">
            <dt className="text-[13px] text-ink-muted">Deposit due now</dt>
            <dd className="font-display text-2xl font-semibold text-sage-900">
              Rs{" "}
              {depositNum > 0
                ? depositNum.toLocaleString("en-MU")
                : "—"}
            </dd>
          </div>

          {/* Bank */}
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-ink-muted">Bank</dt>
            <dd className="text-[14px] font-semibold text-ink">
              {PAYMENT_INFO.bank}
            </dd>
          </div>

          {/* Account name */}
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-ink-muted">Account name</dt>
            <dd className="text-[14px] font-semibold text-ink">
              {PAYMENT_INFO.account_name}
            </dd>
          </div>

          {/* Account number */}
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-ink-muted">Account number</dt>
            <dd className="font-mono text-[14px] font-semibold tracking-wide text-ink">
              {PAYMENT_INFO.account_number}
            </dd>
          </div>
        </dl>
      </div>

      {/* WhatsApp + email note */}
      <p className="mt-6 text-[14px] leading-relaxed text-ink-soft">
        Once you&apos;ve made the transfer, send us the screenshot on WhatsApp{" "}
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-sage-700 hover:underline"
        >
          {PAYMENT_INFO.whatsapp}
        </a>{" "}
        so we can confirm your reservation. A copy of these payment details was
        also emailed to you.
      </p>

      {/* CTA */}
      <div className="mt-10">
        <Link
          href="/preorder/products"
          className="inline-flex items-center gap-2 rounded-full bg-sage-700 px-7 py-3 text-[14px] font-semibold tracking-wide text-cream transition hover:bg-sage-900"
        >
          Keep browsing pre-order
        </Link>
      </div>
    </main>
  );
}

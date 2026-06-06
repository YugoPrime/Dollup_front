"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { PAYMENT_INFO } from "@/lib/payment-info";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, "") ?? "";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER ??
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
  "";

type PreviewResponse = {
  finalPriceMur: number;
  fxRateUsed: number;
};

const DEPOSIT_PERCENT = 75;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.32-1.65a11.93 11.93 0 0 0 5.74 1.46h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.43zM12.07 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.46 4.45-9.9 9.91-9.9 2.65 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9zm5.43-7.4c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.48 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.3.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

// Quote is an estimate from live settings, not a binding price — kept honest in copy.
export function PreorderQuoteBox() {
  const [usd, setUsd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<PreviewResponse | null>(null);
  // The USD value the current quote was computed for — lets us flag a stale quote
  // when the customer edits the input afterwards.
  const [quotedUsd, setQuotedUsd] = useState<string | null>(null);

  const usdNum = Number(usd);
  const usdValid = Number.isFinite(usdNum) && usdNum > 0 && usdNum <= 10000;
  const stale = quote !== null && quotedUsd !== null && usd !== quotedUsd;

  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!usdValid) {
      setError("Enter the SHEIN price in US dollars (e.g. 22.50).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/preorder/price-preview?usd=${encodeURIComponent(usdNum)}`,
        {
          headers: PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : undefined,
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Couldn't fetch a quote right now.");
      }
      const data = (await res.json()) as PreviewResponse;
      setQuote(data);
      setQuotedUsd(usd);
    } catch (err) {
      setQuote(null);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't fetch a quote right now. Try WhatsApp below.",
      );
    } finally {
      setLoading(false);
    }
  }

  const deposit = quote
    ? Math.round((quote.finalPriceMur * DEPOSIT_PERCENT) / 100)
    : 0;
  const balance = quote ? quote.finalPriceMur - deposit : 0;

  const waText = encodeURIComponent(
    "Hi Doll Up! I'd like to pre-order a SHEIN item:\n\n" +
      "Link: \n" +
      `SHEIN price: $${quotedUsd || usd || "___"}\n` +
      (quote ? `Your quote showed me: Rs ${quote.finalPriceMur}\n` : "") +
      "Size (if applicable): \n" +
      "Notes: ",
  );
  const waLink = `https://wa.me/${PAYMENT_INFO.whatsapp_digits}?text=${waText}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-[0_1px_0_rgba(79,95,73,0.04),0_12px_32px_-18px_rgba(46,58,42,0.25)]">
      {/* Header band */}
      <div className="border-b border-sage-100 bg-gradient-to-br from-sage-50 to-white px-6 py-6 md:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-700">
          Instant price check
        </p>
        <h2 className="mt-2 font-display text-[26px] leading-tight text-ink md:text-3xl">
          See your delivered price before you send
        </h2>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-muted">
          Open your item on SHEIN, read its price in{" "}
          <span className="font-semibold text-ink">US dollars</span>, and type it
          below. We&rsquo;ll show your final Mauritius price — shipping, customs
          and handling already included.
        </p>
      </div>

      <div className="px-6 py-6 md:px-8">
        <form onSubmit={getQuote}>
          <label
            htmlFor="shein-usd"
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-sage-700"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-100 text-[11px] font-bold text-sage-700">
              1
            </span>
            SHEIN price (USD)
          </label>
          <div className="mt-2.5 flex flex-wrap items-stretch gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-medium text-sage-700">
                $
              </span>
              <input
                id="shein-usd"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="10000"
                autoComplete="off"
                value={usd}
                onChange={(e) => {
                  setUsd(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="22.50"
                aria-describedby="usd-hint"
                className="w-full rounded-xl border border-sage-200 bg-cream py-3.5 pl-9 pr-4 text-[18px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink-muted/50 focus:border-sage-400 focus:bg-white focus:ring-4 focus:ring-sage-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !usdValid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage-700 px-7 py-3.5 text-[14px] font-semibold tracking-wide text-cream transition hover:bg-sage-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                  Checking
                </>
              ) : (
                <>
                  See my price
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
          <p id="usd-hint" className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">
            Tip: SHEIN usually shows prices in USD by default. Enter the item
            price only — not bundle or cart totals.
          </p>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-coral-300/15 px-3.5 py-2.5 text-[13px] text-coral-700"
          >
            <span aria-hidden className="mt-0.5">⚠</span>
            <span>{error}</span>
          </p>
        )}

        {quote && (
          <div
            key={quote.finalPriceMur}
            className="animate-fade-up mt-6 overflow-hidden rounded-xl border border-sage-200 bg-gradient-to-b from-sage-50 to-cream"
          >
            <div className="px-5 py-5 md:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-700 text-[11px] font-bold text-cream">
                  2
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-700">
                  Your all-in pre-order price
                </p>
              </div>

              <p className="mt-3 font-display text-5xl leading-none text-ink">
                {formatPrice(quote.finalPriceMur, "MUR")}
              </p>

              {/* Deposit / balance split — the part customers actually want to know */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-sage-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sage-700">
                    Reserve now ({DEPOSIT_PERCENT}%)
                  </p>
                  <p className="mt-1 font-display text-xl text-ink">
                    {formatPrice(deposit, "MUR")}
                  </p>
                </div>
                <div className="rounded-lg border border-sage-100 bg-white/60 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    On arrival
                  </p>
                  <p className="mt-1 font-display text-xl text-ink-soft">
                    {formatPrice(balance, "MUR")}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-px text-sage-500">✓</span>
                  Shipping, customs &amp; handling included — no surprises at delivery.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-px text-sage-500">✓</span>
                  Arrives in Mauritius in about 15–20 days.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-px text-sage-500">✓</span>
                  Estimate at today&rsquo;s rate — we confirm the exact price when you send the link.
                </li>
              </ul>
            </div>

            {/* Step 3 — send the link */}
            <div className="border-t border-sage-200 bg-white px-5 py-5 md:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-700 text-[11px] font-bold text-cream">
                  3
                </span>
                <p className="text-[13px] font-semibold text-ink">
                  Happy with it? Send us the link to reserve.
                </p>
              </div>
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sage-700 px-6 py-3.5 text-[14px] font-semibold tracking-wide text-cream transition hover:bg-sage-900 sm:w-auto"
              >
                <WhatsAppIcon />
                Send the link on WhatsApp
              </a>
              {stale && (
                <p className="mt-2.5 text-[12px] text-coral-700">
                  You changed the price — tap &ldquo;See my price&rdquo; again for an
                  updated quote.
                </p>
              )}
            </div>
          </div>
        )}

        {!quote && (
          <p className="mt-5 border-t border-sage-100 pt-4 text-[12px] text-ink-muted">
            Prefer to just message us? WhatsApp{" "}
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sage-700 hover:underline"
            >
              {PAYMENT_INFO.whatsapp}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

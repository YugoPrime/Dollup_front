// src/app/track-order/OrderTimeline.tsx
"use client";

import type { TrackOrderResponse, TrackOrderStatus } from "@/lib/track-order";

const STEPS: {
  key: keyof TrackOrderResponse["steps"];
  label: string;
  reachedFor: TrackOrderStatus[];
}[] = [
  { key: "placedAt", label: "Placed", reachedFor: ["placed", "confirmed", "packed", "shipped", "delivered"] },
  { key: "confirmedAt", label: "Confirmed", reachedFor: ["confirmed", "packed", "shipped", "delivered"] },
  { key: "packedAt", label: "Packed", reachedFor: ["packed", "shipped", "delivered"] },
  { key: "shippedAt", label: "Out for delivery", reachedFor: ["shipped", "delivered"] },
  { key: "deliveredAt", label: "Delivered", reachedFor: ["delivered"] },
];

function formatStepDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-MU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  status: TrackOrderStatus;
  steps: TrackOrderResponse["steps"];
  trackingCode: string | null;
  trackingUrl: string | null;
};

export function OrderTimeline({ status, steps, trackingCode, trackingUrl }: Props) {
  const reachedIndex = STEPS.reduce(
    (acc, s, i) => (s.reachedFor.includes(status) ? i : acc),
    -1,
  );

  return (
    <ol className="grid gap-4 md:grid-cols-5 md:gap-0">
      {STEPS.map((s, i) => {
        const reached = i <= reachedIndex;
        const isCurrent = i === reachedIndex;
        const date = formatStepDate(steps[s.key]);
        const isShippedStep = s.key === "shippedAt";

        return (
          <li
            key={s.key}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex gap-3 md:flex-col md:items-center md:text-center"
          >
            <div className="flex flex-col items-center md:contents">
              <span
                className={[
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-sans text-[12px] font-bold",
                  reached
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-blush-300 bg-white text-blush-400",
                ].join(" ")}
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={[
                    "z-0 md:absolute md:left-1/2 md:top-3 md:h-0.5 md:w-full",
                    "h-full w-0.5 md:translate-x-0",
                    reached && i < reachedIndex ? "bg-coral-500" : "bg-blush-300",
                  ].join(" ")}
                  aria-hidden
                />
              )}
            </div>
            <div className="md:mt-3">
              <p
                className={[
                  "font-display text-sm",
                  reached ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {s.label}
              </p>
              {date && (
                <p className="mt-1 font-sans text-[11px] text-ink-muted">
                  {date}
                </p>
              )}
              {isShippedStep && reached && trackingCode && trackingUrl && (
                <p className="mt-2 font-sans text-[12px] text-ink-soft">
                  Tracking:{" "}
                  <span className="font-semibold text-ink">{trackingCode}</span>
                  <br />
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-coral-500 underline hover:text-coral-700"
                  >
                    Track on Mauritius Post →
                  </a>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

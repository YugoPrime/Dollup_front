import { serviceBreakActive, SERVICE_RESUMES_LABEL } from "@/lib/checkout";

/**
 * The shop-break notice, in one place so every surface says the same thing.
 *
 * It renders nothing once the break is over — gated on the live Mauritius day
 * like the rest of the break logic, so it clears itself on the resume date
 * without a deploy. Safe in both server and client components: the MU-day
 * check normalises any clock, so the server and the browser agree.
 *
 * A customer decides they're buying long before the delivery-date picker, so
 * this goes wherever money is about to change hands — the bag, the top of
 * checkout, every shipping option, and the confirmation — not only where a
 * date is chosen.
 */
export function BreakNotice({
  variant = "banner",
  className = "",
}: {
  variant?: "banner" | "compact";
  className?: string;
}) {
  if (!serviceBreakActive()) return null;

  if (variant === "compact") {
    return (
      <p
        className={`font-sans text-[11px] font-semibold text-coral-700 ${className}`}
      >
        We&apos;re on a break — orders go out from {SERVICE_RESUMES_LABEL}.
      </p>
    );
  }

  return (
    <div
      role="status"
      className={`flex gap-3 rounded-lg border-[1.5px] border-coral-500 bg-blush-100 px-4 py-3.5 ${className}`}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-500 text-white"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
      <div>
        <p className="font-sans text-sm font-bold text-ink">
          We&apos;re on a break — nothing goes out until{" "}
          {SERVICE_RESUMES_LABEL}
        </p>
        <p className="mt-1 font-sans text-[13px] leading-[1.5] text-ink-soft">
          Order now and we&apos;ll set your pieces aside. Delivery{" "}
          <strong className="font-semibold text-ink">and postage</strong> both
          restart on Saturday 17 October — nothing is posted before then.
        </p>
      </div>
    </div>
  );
}

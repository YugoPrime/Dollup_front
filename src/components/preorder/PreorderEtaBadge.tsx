import { computeEtaDates, formatEtaRange } from "@/lib/preorder";

export function PreorderEtaBadge({
  etaMinDays = 15,
  etaMaxDays = 20,
}: {
  etaMinDays?: number;
  etaMaxDays?: number;
}) {
  const { earliest, latest } = computeEtaDates(etaMinDays, etaMaxDays);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted"
      title="Estimated delivery window"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-sage-500"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        Arrives <span className="font-medium text-sage-700">{formatEtaRange(earliest, latest)}</span>
      </span>
    </span>
  );
}

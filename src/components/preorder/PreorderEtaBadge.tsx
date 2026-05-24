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
    <span className="text-[12px] text-ink-muted">
      Arrives {formatEtaRange(earliest, latest)}
    </span>
  );
}

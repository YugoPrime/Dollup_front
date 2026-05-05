import type { EffectiveStatus } from "@/lib/admin-orders-shared";

const TONE: Record<EffectiveStatus, string> = {
  preparation: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const LABEL: Record<EffectiveStatus, string> = {
  preparation: "Preparation",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusBadge({ eff }: { eff: EffectiveStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TONE[eff]}`}
    >
      {LABEL[eff]}
    </span>
  );
}

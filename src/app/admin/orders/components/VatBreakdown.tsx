"use client";
import { computeVatAmount, VAT_RATE_PERCENT } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

export function VatBreakdown({
  total,
  paymentMethod,
}: {
  total: number;
  paymentMethod: string;
}) {
  if (paymentMethod !== "MCB Juice") return null;
  return (
    <p className="text-[11px] italic text-ink-muted">
      Of which VAT ({VAT_RATE_PERCENT}%): {formatPrice(computeVatAmount(total), "mur")}
    </p>
  );
}

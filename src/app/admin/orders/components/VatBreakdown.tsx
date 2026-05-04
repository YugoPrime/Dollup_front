"use client";
import { formatPrice } from "@/lib/format";

export function VatBreakdown({
  total,
  paymentMethod,
}: {
  total: number;
  paymentMethod: string;
}) {
  if (paymentMethod !== "MCB Juice") return null;
  const vat = Math.round((total * 15) / 115);
  return (
    <p className="text-[11px] italic text-ink-muted">
      Of which VAT (15%): {formatPrice(vat, "mur")}
    </p>
  );
}

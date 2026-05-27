"use client";

import { useState } from "react";
import { computeDepositSplit } from "@/lib/preorder";

export function PreorderTerms({
  depositPercent,
  cartTotalMur,
  onChange,
}: {
  depositPercent: number;
  cartTotalMur: number;
  onChange: (accepted: boolean) => void;
}) {
  const [checked, setChecked] = useState(false);
  const { depositMur, balanceMur } = computeDepositSplit(
    cartTotalMur,
    depositPercent,
  );

  const toggle = () => {
    setChecked((c) => {
      const next = !c;
      onChange(next);
      return next;
    });
  };

  return (
    <div className="rounded border border-blush-400 bg-blush-50 p-4">
      <p className="text-[13px] font-semibold text-ink">Pre-Order terms</p>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[13px]">
        <dt className="text-ink-muted">Pay now (Juice deposit)</dt>
        <dd className="font-semibold text-ink">Rs {depositMur}</dd>
        <dt className="text-ink-muted">Pay on arrival</dt>
        <dd>Rs {balanceMur}</dd>
        <dt className="text-ink-muted">Total</dt>
        <dd>Rs {cartTotalMur}</dd>
      </dl>
      <label className="mt-3 flex items-start gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={toggle}
          className="mt-0.5"
          required
        />
        <span>
          I understand pre-orders are <strong>final</strong> — no refunds or cancellations once the deposit is paid.
        </span>
      </label>
    </div>
  );
}

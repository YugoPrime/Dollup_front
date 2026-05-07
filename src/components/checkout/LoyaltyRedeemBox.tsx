"use client";

import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  applyLoyaltyRedemption,
  getMyLoyalty,
  previewLoyaltyRedemption,
  type LoyaltyAccount,
  type LoyaltyRedeemMetadata,
  type LoyaltyRedeemPreview,
} from "@/lib/loyalty-client";

type Props = {
  cartId: string;
  onApplied: () => Promise<void> | void;
  alreadyApplied: boolean;
  applied?: LoyaltyRedeemMetadata | null;
};

export function LoyaltyRedeemBox({
  cartId,
  onApplied,
  alreadyApplied,
  applied,
}: Props) {
  const { status, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [points, setPoints] = useState("");
  const [preview, setPreview] = useState<LoyaltyRedeemPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready" || !customer) return;
    let cancelled = false;
    getMyLoyalty()
      .then((loyalty) => {
        if (!cancelled) setAccount(loyalty);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status, customer]);

  useEffect(() => {
    if (alreadyApplied) return;
    const requested = Number.parseInt(points, 10);
    if (!Number.isFinite(requested) || requested <= 0) {
      setPreview(null);
      setPreviewing(false);
      return;
    }

    let cancelled = false;
    setPreviewing(true);
    setError(null);
    const timeout = window.setTimeout(async () => {
      try {
        const nextPreview = await previewLoyaltyRedemption(cartId, requested);
        if (!cancelled) setPreview(nextPreview);
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setError(
            err instanceof Error ? err.message : "Could not preview rewards.",
          );
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [points, cartId, alreadyApplied]);

  if (status === "loading" || !customer || !account) return null;

  function explainNoRedemption(p: LoyaltyRedeemPreview): string {
    if (p.redeem_rate_mur_per_100_pts <= 0) {
      return "Doll Rewards is temporarily unavailable.";
    }
    if (p.points_balance < p.min_redeem_points) {
      const need = p.min_redeem_points - p.points_balance;
      return `You need ${need.toLocaleString("en-MU")} more pts to redeem (minimum ${p.min_redeem_points.toLocaleString("en-MU")}).`;
    }
    const minDiscount = Math.floor(
      (p.min_redeem_points * p.redeem_rate_mur_per_100_pts) / 100,
    );
    return `Cart subtotal is too low — you need at least Rs ${(minDiscount * 2).toLocaleString("en-MU")} to redeem ${p.min_redeem_points.toLocaleString("en-MU")} pts.`;
  }

  if (alreadyApplied && applied) {
    return (
      <div className="rounded-xl border border-coral-500 bg-coral-500/5 p-5">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          Doll Rewards applied
        </p>
        <p className="mt-2 font-display text-[20px] text-ink">
          {applied.points.toLocaleString("en-MU")} points | -Rs{" "}
          {applied.discount_mur.toLocaleString("en-MU")}
        </p>
        <p className="mt-2 font-sans text-[12px] text-ink-muted">
          This discount is saved on your cart.
        </p>
      </div>
    );
  }

  if (account.points_balance <= 0) return null;

  async function apply() {
    if (!preview || preview.requested_points <= 0) return;
    setApplying(true);
    setError(null);
    try {
      await applyLoyaltyRedemption(cartId, preview.requested_points);
      await onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply rewards.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          Use Doll Rewards
        </p>
        <p className="font-sans text-[12px] text-ink-soft">
          You have{" "}
          <strong className="text-ink">
            {account.points_balance.toLocaleString("en-MU")}
          </strong>{" "}
          pts
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={account.points_balance}
          step="100"
          inputMode="numeric"
          value={points}
          onChange={(event) => setPoints(event.target.value)}
          placeholder="Points to redeem"
          className="w-full rounded-full border border-blush-300 px-4 py-2.5 font-sans text-[14px] text-ink outline-none focus:border-coral-500"
        />
        <button
          type="button"
          disabled={applying || !preview || preview.requested_points <= 0}
          onClick={apply}
          className="shrink-0 rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
        >
          {applying ? "Applying..." : "Apply"}
        </button>
      </div>

      {previewing && (
        <p className="mt-2 font-sans text-[12px] text-ink-muted">
          Calculating...
        </p>
      )}

      {preview && !previewing && preview.max_redeemable > 0 && (
        <p className="mt-2 font-sans text-[12px] text-ink-soft">
          {preview.requested_points.toLocaleString("en-MU")} pts gives -Rs{" "}
          {preview.discount_mur.toLocaleString("en-MU")} off. Max{" "}
          {preview.max_redeemable.toLocaleString("en-MU")} pts allowed.
        </p>
      )}

      {preview && !previewing && preview.max_redeemable === 0 && (
        <p className="mt-2 font-sans text-[12px] text-coral-700">
          {explainNoRedemption(preview)}
        </p>
      )}

      {error && (
        <p className="mt-2 font-sans text-[12px] text-coral-700">{error}</p>
      )}
    </div>
  );
}

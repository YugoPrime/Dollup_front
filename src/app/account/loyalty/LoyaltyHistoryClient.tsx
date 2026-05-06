"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  listLoyaltyTransactions,
  type LoyaltyTransaction,
} from "@/lib/loyalty-client";

const PAGE_SIZE = 20;

function typeLabel(type: string): { label: string; color: string } {
  switch (type) {
    case "earn":
      return { label: "Earned", color: "text-emerald-600" };
    case "redeem":
      return { label: "Redeemed", color: "text-coral-500" };
    case "adjust":
      return { label: "Adjusted", color: "text-ink-soft" };
    case "expire":
      return { label: "Expired", color: "text-ink-muted" };
    default:
      return { label: type, color: "text-ink-soft" };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function LoyaltyHistoryClient() {
  const router = useRouter();
  const { status, customer } = useCustomer();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<LoyaltyTransaction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" && !customer) {
      router.replace("/login?redirect=/account/loyalty");
    }
  }, [status, customer, router]);

  useEffect(() => {
    if (status !== "ready" || !customer) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await listLoyaltyTransactions(PAGE_SIZE, page * PAGE_SIZE);
        if (!cancelled) {
          setItems(res.transactions);
          setCount(res.count);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setCount(0);
          setError("Could not load your points history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, customer, page]);

  if (status === "loading" || (status === "ready" && !customer)) {
    return <div className="h-32 animate-pulse rounded-xl bg-blush-100" />;
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-blush-100" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-coral-300 bg-white p-8 text-center">
        <p className="font-sans text-[14px] text-coral-700">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-blush-300 bg-white p-8 text-center">
        <p className="font-sans text-[14px] text-ink-soft">
          No transactions yet. Place an order to start earning.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-3">
      {items.map((transaction) => {
        const { label, color } = typeLabel(transaction.type);
        const sign = transaction.points >= 0 ? "+" : "";
        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-blush-300 bg-white p-4"
          >
            <div className="min-w-0">
              <p
                className={`font-sans text-[11px] font-bold uppercase tracking-[0.14em] ${color}`}
              >
                {label}
              </p>
              <p className="mt-1 truncate font-sans text-[13px] text-ink">
                {transaction.reason ?? "-"}
              </p>
              <p className="mt-1 font-sans text-[11px] text-ink-muted">
                {formatDate(transaction.created_at)}
                {transaction.order_id
                  ? ` | order ${transaction.order_id.slice(0, 8)}`
                  : ""}
              </p>
            </div>
            <p className="shrink-0 font-display text-[20px] text-ink">
              {sign}
              {transaction.points.toLocaleString("en-MU")}
            </p>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-sans text-[12px] text-ink-soft">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { OrderRow, PrepTab } from "@/lib/admin-orders";
import { reloadPrepOrdersAction } from "../actions";
import { PrepOrderCard } from "./PrepOrderCard";

const TABS: { id: PrepTab; label: string }[] = [
  { id: "by_post", label: "By Post" },
  { id: "home_delivery", label: "Home Delivery" },
  { id: "pick_up", label: "Pick Up" },
];

const WAY_TO_TAB: Record<string, PrepTab> = {
  "Postage": "by_post",
  "Express Postage": "by_post",
  "Rodrigues Postage": "by_post",
  "Home Delivery": "home_delivery",
  "Pick Up": "pick_up",
};

export function AdminPrepClient({
  initialDate,
  initialOrders,
}: {
  initialDate: string;
  initialOrders: OrderRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<PrepTab>("by_post");
  const [isPending, startTransition] = useTransition();

  const visible = orders.filter(
    (o) => o.deliveryMethod && WAY_TO_TAB[o.deliveryMethod] === tab,
  );

  function handleDateChange(next: string) {
    setDate(next);
    startTransition(async () => {
      const fresh = await reloadPrepOrdersAction(next);
      setOrders(fresh);
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-ink-muted">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded border border-ink-soft/40 px-2 py-1 text-sm"
        />
        {isPending && <span className="text-xs text-ink-muted">Loading…</span>}
      </div>

      <nav className="sticky top-0 z-10 -mx-3 mb-4 flex gap-1 border-b border-ink-soft/20 bg-cream/95 px-3 py-2 backdrop-blur">
        {TABS.map((t) => {
          const count = orders.filter(
            (o) => o.deliveryMethod && WAY_TO_TAB[o.deliveryMethod] === t.id,
          ).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? "bg-ink text-cream"
                  : "bg-blush-100 text-ink-muted"
              }`}
            >
              {t.label} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-soft/30 px-6 py-12 text-center text-sm text-ink-muted">
          No {TABS.find((t) => t.id === tab)?.label.toLowerCase()} orders to prep for {date}.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id}>
              <PrepOrderCard
                order={o}
                tab={tab}
                onDone={(id) => setOrders((prev) => prev.filter((x) => x.id !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

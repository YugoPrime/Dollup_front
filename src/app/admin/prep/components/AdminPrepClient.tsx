"use client";

import { useEffect, useState, useTransition } from "react";
import { LayoutGrid, List } from "lucide-react";
import type { OrderRow, PrepTab } from "@/lib/admin-orders";
import { reloadPrepOrdersAction } from "../actions";
import { PrepOrderCard } from "./PrepOrderCard";
import { PrepOrderRow } from "./PrepOrderRow";

// "all" is a UI-only tab — server's PrepTab stays the same since
// getPrepOrders(date) without a `tab` already returns the union of all buckets.
type PrepTabUI = "all" | PrepTab;

const TABS: { id: PrepTabUI; label: string }[] = [
  { id: "all", label: "All" },
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

type ViewMode = "card" | "list";
const VIEW_LS_KEY = "dub_admin_prep_view";

export function AdminPrepClient({
  initialDate,
  initialOrders,
}: {
  initialDate: string;
  initialOrders: OrderRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<PrepTabUI>("all");
  const [view, setView] = useState<ViewMode>("card");
  const [isPending, startTransition] = useTransition();

  // Hydrate view preference from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_LS_KEY);
    if (stored === "list" || stored === "card") {
      setView(stored);
    }
  }, []);

  function setViewPersisted(next: ViewMode) {
    setView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_LS_KEY, next);
    }
  }

  function inTab(o: OrderRow, t: PrepTabUI): boolean {
    if (t === "all") return true;
    return Boolean(o.deliveryMethod && WAY_TO_TAB[o.deliveryMethod] === t);
  }

  const visible = orders.filter((o) => inTab(o, tab));

  function handleDateChange(next: string) {
    setDate(next);
    startTransition(async () => {
      const fresh = await reloadPrepOrdersAction(next);
      setOrders(fresh);
    });
  }

  // PrepOrderCard takes a `tab: PrepTab` prop to decide the by-post action
  // branch. When the active UI tab is "all", we omit the prop so the card
  // derives `isByPost` from each order's delivery_method instead.
  const cardTabProp: PrepTab | undefined = tab === "all" ? undefined : tab;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-ink-muted">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded border border-ink-soft/40 px-2 py-1 text-sm"
        />
        {isPending && <span className="text-xs text-ink-muted">Loading…</span>}

        {/* View toggle — top-right */}
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewPersisted("card")}
            aria-pressed={view === "card"}
            aria-label="Card view"
            title="Card view"
            className={`rounded-md p-1.5 transition ${
              view === "card"
                ? "bg-coral-500 text-cream"
                : "bg-cream-50 text-ink-soft hover:bg-cream-100"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewPersisted("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            title="List view"
            className={`rounded-md p-1.5 transition ${
              view === "list"
                ? "bg-coral-500 text-cream"
                : "bg-cream-50 text-ink-soft hover:bg-cream-100"
            }`}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav className="sticky top-0 z-10 -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-ink-soft/20 bg-cream/95 px-3 py-2 backdrop-blur">
        {TABS.map((t) => {
          const count = orders.filter((o) => inTab(o, t.id)).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
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
      ) : view === "list" ? (
        <ul className="grid gap-2">
          {visible.map((o) => (
            <li key={o.id}>
              <PrepOrderRow
                order={o}
                onDone={(id) => setOrders((prev) => prev.filter((x) => x.id !== id))}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id}>
              <PrepOrderCard
                order={o}
                tab={cardTabProp}
                onDone={(id) => setOrders((prev) => prev.filter((x) => x.id !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

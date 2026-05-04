"use client";

import { useRef, useState, useTransition } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";
import { RecentOrdersSheet } from "./RecentOrdersSheet";
import { CustomerSearch } from "./CustomerSearch";
import { getRecentOrdersAction } from "../actions";
import type { CustomerHit, OrderRow } from "@/lib/admin-orders";

export function AdminOrdersClient({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const formRef = useRef<NewOrderRowRef | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [customerFilter, setCustomerFilter] = useState<CustomerHit | null>(
    null,
  );
  const [, startRefresh] = useTransition();

  function handlePick(v: SelectedVariant) {
    formRef.current?.addVariant(v);
    if (typeof window !== "undefined") {
      const el = document.getElementById("dm-order-form");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function refreshOrders() {
    startRefresh(async () => {
      try {
        const next = await getRecentOrdersAction(50);
        setOrders(next);
      } catch {
        // swallow — caller's UI already reflects success/failure
      }
    });
  }

  const visibleOrders = customerFilter
    ? orders.filter(
        (o) => (o.phone ?? "").replace(/\D/g, "") === customerFilter.phone,
      )
    : orders;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 bg-cream/85 px-4 pb-2 pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <StockChecker onPickVariant={handlePick} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <CustomerSearch onSelect={setCustomerFilter} />
        </div>
        {/* DateFilter slot reserved for Slice 6 */}
      </div>
      {customerFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-blush-300 bg-blush-100/40 px-3 py-2 text-xs">
          <span>
            Filtering for{" "}
            <strong>
              {customerFilter.name || customerFilter.displayPhone}
            </strong>{" "}
            ({customerFilter.orderCount} order
            {customerFilter.orderCount === 1 ? "" : "s"})
          </span>
          <button
            type="button"
            onClick={() => formRef.current?.applyCustomer(customerFilter)}
            className="rounded-md bg-coral-500 px-2 py-1 font-semibold uppercase tracking-wider text-white hover:bg-coral-700"
          >
            📋 Use customer in new entry
          </button>
          <button
            type="button"
            onClick={() => setCustomerFilter(null)}
            className="text-ink-muted hover:text-coral-700"
            aria-label="Clear filter"
          >
            ✕
          </button>
        </div>
      )}
      <div id="dm-order-form">
        <NewOrderRow ref={formRef} onSaved={refreshOrders} />
      </div>
      <RecentOrdersSheet orders={visibleOrders} onChanged={refreshOrders} />
    </div>
  );
}

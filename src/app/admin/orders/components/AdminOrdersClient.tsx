"use client";

import { useRef, useState, useTransition } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";
import { RecentOrdersSheet } from "./RecentOrdersSheet";
import { getRecentOrdersAction } from "../actions";
import type { OrderRow } from "@/lib/admin-orders";

export function AdminOrdersClient({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const formRef = useRef<NewOrderRowRef | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
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

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 bg-cream/85 px-4 pb-2 pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <StockChecker onPickVariant={handlePick} />
      </div>
      <div id="dm-order-form">
        <NewOrderRow ref={formRef} onSaved={refreshOrders} />
      </div>
      <RecentOrdersSheet orders={orders} onChanged={refreshOrders} />
    </div>
  );
}

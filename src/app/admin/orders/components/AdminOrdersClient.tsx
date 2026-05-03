"use client";

import { useRef } from "react";
import { OrderForm, type OrderFormRef } from "./OrderForm";
import { StockChecker, type SelectedVariant } from "./StockChecker";

export function AdminOrdersClient() {
  const formRef = useRef<OrderFormRef | null>(null);

  function handlePick(v: SelectedVariant) {
    formRef.current?.addVariant(v);
    if (typeof window !== "undefined") {
      const el = document.getElementById("dm-order-form");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 bg-cream/85 px-4 pb-2 pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <StockChecker onPickVariant={handlePick} />
      </div>
      <div id="dm-order-form">
        <OrderForm ref={formRef} />
      </div>
    </div>
  );
}

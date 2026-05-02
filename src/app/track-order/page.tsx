// src/app/track-order/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrackOrderForm, type TrackSubmitState } from "./TrackOrderForm";
import { OrderResult } from "./OrderResult";
import type { TrackOrderResponse } from "@/lib/track-order";

function TrackOrderInner() {
  const params = useSearchParams();

  const [orderRef, setOrderRef] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<TrackSubmitState>({ kind: "idle" });
  const [data, setData] = useState<TrackOrderResponse | null>(null);

  const onSubmit = async () => {
    setState({ kind: "loading" });
    setData(null);
    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderRef: orderRef.trim(), phone: phone.trim() }),
      });
      if (res.status === 404) {
        setPhone("");
        setState({ kind: "not_found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "network_error" });
        return;
      }
      const json = (await res.json()) as TrackOrderResponse;
      setData(json);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "network_error" });
    }
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-12 lg:py-20">
      <TrackOrderForm
        orderRef={orderRef}
        phone={phone}
        state={state}
        onChangeOrderRef={setOrderRef}
        onChangePhone={setPhone}
        onSubmit={onSubmit}
      />
      {data && <OrderResult data={data} />}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-20 text-center font-sans text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}

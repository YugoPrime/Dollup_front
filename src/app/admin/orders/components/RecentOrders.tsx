import { getRecentOrders } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/format";
import { OrderRowActions } from "./OrderRowActions";

export async function RecentOrders() {
  let orders;
  try {
    orders = await getRecentOrders(20);
  } catch (err) {
    return (
      <section className="rounded-2xl border border-blush-400 bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg text-ink">Recent orders</h2>
        <p className="mt-2 text-sm text-coral-700">
          Could not load orders: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Recent orders</h2>
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">
          last {orders.length}
        </span>
      </div>
      {orders.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">No orders yet.</p>
      )}
      {orders.length > 0 && (
        <ul className="mt-3 divide-y divide-blush-300/60">
          {orders.map((o) => (
            <li key={o.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <div className="flex w-14 flex-shrink-0 flex-col font-mono text-[11px] text-ink-muted">
                    <span className="text-base font-bold text-ink">
                      #{o.displayId}
                    </span>
                    <span>
                      {new Date(o.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {o.buyerName || "(no name)"}
                    </p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {o.phone ?? "—"} · {o.deliveryMethod ?? "—"} · {o.pointOfSale ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-ink">
                      {formatPrice(o.totalMur, "mur")}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Pill tone={o.paymentStatus === "captured" ? "ok" : "warn"}>
                        {o.paymentStatus ?? "—"}
                      </Pill>
                      <Pill tone={o.fulfillmentStatus === "fulfilled" ? "ok" : "warn"}>
                        {o.fulfillmentStatus ?? "—"}
                      </Pill>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 rounded-lg bg-cream/60 p-3 text-sm">
                  <ul className="space-y-1">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {it.quantity}× {it.title}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          {formatPrice(it.unitPriceMur * it.quantity, "mur")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && (
                    <p className="mt-2 text-xs italic text-ink-muted">
                      Notes: {o.notes}
                    </p>
                  )}
                  <OrderRowActions
                    orderId={o.id}
                    paymentStatus={o.paymentStatus}
                    fulfillmentStatus={o.fulfillmentStatus}
                    status={o.status}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-blush-300/60 text-ink"
      : "bg-coral-300/40 text-coral-700";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}

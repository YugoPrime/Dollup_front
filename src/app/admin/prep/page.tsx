import type { Metadata } from "next";
import { getPrepOrders } from "@/lib/admin-orders";
import { AdminPrepClient } from "./components/AdminPrepClient";

export const metadata: Metadata = {
  title: "DM prep",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPrepPage() {
  // Auth is handled by the proxy (src/proxy.ts) before this page runs.
  // Default the picker to the founder's local calendar day. Mauritius is UTC+4 fixed.
  const muMs = Date.now() + 4 * 60 * 60 * 1000;
  const today = new Date(muMs).toISOString().slice(0, 10);

  let initialOrders: Awaited<ReturnType<typeof getPrepOrders>> = [];
  let loadError: string | null = null;
  try {
    initialOrders = await getPrepOrders(today);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load prep orders";
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-5 sm:py-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Prep</h1>
          <p className="text-xs text-ink-muted">
            Orders in preparation, grouped by delivery method.
          </p>
        </div>
        <a
          href="/admin/orders"
          className="rounded-md border border-blush-400 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted transition hover:text-coral-700"
        >
          → Orders
        </a>
      </header>
      {loadError && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          Could not load prep orders: {loadError}
        </p>
      )}
      <AdminPrepClient initialDate={today} initialOrders={initialOrders} />
    </div>
  );
}

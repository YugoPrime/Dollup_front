import type { Metadata } from "next";
import { logoutAction } from "../login/actions";
import { AdminOrdersClient } from "./components/AdminOrdersClient";
import { getRecentOrders } from "@/lib/admin-orders";

export const metadata: Metadata = {
  title: "DM orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  let initialOrders: Awaited<ReturnType<typeof getRecentOrders>> = [];
  let loadError: string | null = null;
  try {
    initialOrders = await getRecentOrders(50);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load orders";
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:py-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">DM orders</h1>
          <p className="text-xs text-ink-muted">
            Inventory updates immediately. One device at a time to avoid races.
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-blush-400 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted transition hover:text-coral-700"
          >
            Sign out
          </button>
        </form>
      </header>
      {loadError && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          Could not load orders: {loadError}
        </p>
      )}
      <AdminOrdersClient initialOrders={initialOrders} />
    </div>
  );
}

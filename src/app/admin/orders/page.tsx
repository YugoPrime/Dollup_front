import type { Metadata } from "next";
import { logoutAction } from "../login/actions";
import { AdminOrdersClient } from "./components/AdminOrdersClient";
import { RecentOrders } from "./components/RecentOrders";

export const metadata: Metadata = {
  title: "DM orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <AdminOrdersClient />
        <aside className="lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
          <RecentOrders />
        </aside>
      </div>
    </div>
  );
}

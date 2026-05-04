"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCustomer } from "@/lib/auth-client";
import { clientSdk } from "@/lib/cart-client";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 10;
const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,currency_code,created_at,items.title,items.quantity";

export function OrdersListClient() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { status: authStatus, customer } = useCustomer();
  const [orders, setOrders] = useState<HttpTypes.StoreOrder[] | null>(null);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "ready" && !customer) {
      router.replace("/login?redirect=/account/orders");
    }
  }, [authStatus, customer, router]);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    setOrders(null);
    setError(null);
    clientSdk.store.order
      .list({ limit: PAGE_SIZE, offset, fields: ORDER_FIELDS })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders ?? []);
        setCount(res.count ?? 0);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load your orders.");
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customer, offset]);

  if (authStatus === "loading" || !customer) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-12 md:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-blush-100" />
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-blush-100" />
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 md:px-8 md:py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted"
      >
        <Link href="/" className="hover:text-coral-500">
          Home
        </Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <Link href="/account" className="hover:text-coral-500">
          My Account
        </Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <span>Orders</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-display text-[32px] leading-none text-ink md:text-[40px]">
          My <em className="not-italic text-coral-500">orders</em>
        </h1>
        <p className="mt-2 font-sans text-[12px] text-ink-muted">
          {count} {count === 1 ? "order" : "orders"} placed.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      {!orders ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-blush-100"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-blush-300 bg-white p-10 text-center">
          <p className="font-sans text-sm text-ink-muted">
            You haven&apos;t placed an order yet.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-coral-500 px-5 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-coral-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-blush-100 overflow-hidden rounded-xl border border-blush-300 bg-white">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-blush-100/40"
              >
                <div>
                  <p className="font-sans text-sm font-semibold text-ink">
                    Order #{o.display_id ?? o.id.slice(-6)}
                  </p>
                  <p className="font-sans text-[12px] text-ink-muted">
                    {formatDate(o.created_at)} · {orderStatusLabel(o)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-sans text-sm font-semibold text-ink">
                    {formatPrice(o.total ?? 0, o.currency_code ?? "MUR")}
                  </p>
                  <p className="font-sans text-[11px] text-ink-muted">
                    {o.items?.length ?? 0}{" "}
                    {(o.items?.length ?? 0) === 1 ? "item" : "items"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between"
        >
          <PageLink page={page - 1} disabled={page <= 1} label="← Previous" />
          <span className="font-sans text-[12px] text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            label="Next →"
          />
        </nav>
      )}

      <div className="mt-8">
        <Link
          href="/account"
          className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
        >
          ← Back to account
        </Link>
      </div>
    </main>
  );
}

function PageLink({
  page,
  disabled,
  label,
}: {
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="font-sans text-[12px] text-ink-muted opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`/account/orders?page=${page}`}
      className="font-sans text-[12px] font-semibold text-coral-500 hover:text-coral-700"
    >
      {label}
    </Link>
  );
}

function formatDate(iso: string | Date | undefined | null): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-MU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function orderStatusLabel(o: HttpTypes.StoreOrder): string {
  if (o.fulfillment_status === "delivered") return "Delivered";
  if (o.fulfillment_status === "shipped") return "Shipped";
  if (o.payment_status === "captured" || o.payment_status === "authorized") {
    return "Paid";
  }
  return "Pending";
}

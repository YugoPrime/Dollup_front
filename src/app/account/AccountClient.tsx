"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import {
  logout,
  updateCustomer,
  useCustomer,
  type Customer,
} from "@/lib/auth-client";
import { clientSdk } from "@/lib/cart-client";
import { formatPrice } from "@/lib/format";

const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,currency_code,created_at,items.title,items.quantity,items.thumbnail";

export function AccountClient() {
  const router = useRouter();
  const { status, customer } = useCustomer();

  useEffect(() => {
    if (status === "ready" && !customer) {
      router.replace("/login?redirect=/account");
    }
  }, [status, customer, router]);

  if (status === "loading" || !customer) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-blush-100" />
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-blush-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-8 md:py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted"
      >
        <Link href="/" className="hover:text-coral-500">
          Home
        </Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <span>My Account</span>
      </nav>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] leading-none text-ink md:text-[44px]">
            Hi,{" "}
            <em className="not-italic text-coral-500">
              {customer.first_name || "there"}
            </em>
          </h1>
          <p className="mt-2 font-sans text-[12px] text-ink-muted">
            Manage your profile, orders and addresses.
          </p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
        >
          Sign out
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <ProfileCard customer={customer} />
        <OrdersCard />
      </div>

      <div className="mt-6">
        <AddressesCard customer={customer} />
      </div>
    </main>
  );
}

function ProfileCard({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(customer.first_name ?? "");
  const [lastName, setLastName] = useState(customer.last_name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateCustomer({
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-blush-300 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      {editing ? (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
            />
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            type="tel"
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-coral-500 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFirstName(customer.first_name ?? "");
                setLastName(customer.last_name ?? "");
                setPhone(customer.phone ?? "");
                setError(null);
              }}
              disabled={saving}
              className="rounded-md border border-blush-400 px-4 py-2 font-sans text-sm font-medium text-ink hover:bg-blush-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="mt-5 space-y-2.5 font-sans text-sm">
          <Row label="Name">
            {customer.first_name || customer.last_name
              ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
              : "—"}
          </Row>
          <Row label="Email">{customer.email}</Row>
          <Row label="Phone">{customer.phone || "—"}</Row>
        </dl>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-blush-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

function OrdersCard() {
  const [orders, setOrders] = useState<HttpTypes.StoreOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    clientSdk.store.order
      .list({ limit: 5, offset: 0, fields: ORDER_FIELDS })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load your orders.");
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-blush-300 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Recent orders</h2>
      </div>

      {error && (
        <p className="mt-4 font-sans text-sm text-coral-700">{error}</p>
      )}

      {!orders ? (
        <div className="mt-5 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-md bg-blush-100"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-md border border-blush-100 bg-cream/40 p-6 text-center">
          <p className="font-sans text-sm text-ink-muted">
            You haven&apos;t placed an order yet.
          </p>
          <Link
            href="/shop"
            className="mt-3 inline-block rounded-full bg-coral-500 px-5 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-coral-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-blush-100">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-blush-100/40"
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
    </section>
  );
}

function AddressesCard({ customer }: { customer: Customer }) {
  const addresses = customer.addresses ?? [];
  return (
    <section className="rounded-xl border border-blush-300 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Saved addresses</h2>
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {addresses.length} saved
        </span>
      </div>

      {addresses.length === 0 ? (
        <p className="mt-5 font-sans text-sm text-ink-muted">
          No addresses saved yet. They&apos;ll appear here after your next checkout.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="rounded-md border border-blush-100 bg-cream/40 p-4 font-sans text-sm text-ink"
            >
              <p className="font-semibold">
                {a.first_name} {a.last_name}
              </p>
              <p className="text-ink-muted">
                {a.address_1}
                {a.address_2 ? `, ${a.address_2}` : ""}
              </p>
              <p className="text-ink-muted">
                {a.city}
                {a.province ? `, ${a.province}` : ""}
              </p>
              {a.phone && (
                <p className="mt-1 text-[12px] text-ink-muted">{a.phone}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
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

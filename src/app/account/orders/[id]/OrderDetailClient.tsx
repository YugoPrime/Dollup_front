"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCustomer } from "@/lib/auth-client";
import { clientSdk } from "@/lib/cart-client";
import { formatPrice } from "@/lib/format";

const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,subtotal,shipping_total,tax_total,discount_total,currency_code,created_at,email," +
  "items.title,items.quantity,items.thumbnail,items.unit_price,items.total,items.variant.title,items.product.handle," +
  "shipping_address.*,billing_address.*";

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { status: authStatus, customer } = useCustomer();

  const [order, setOrder] = useState<HttpTypes.StoreOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "ready" && !customer) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/account/orders/${orderId}`)}`,
      );
    }
  }, [authStatus, customer, router, orderId]);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    setLoading(true);
    clientSdk.store.order
      .retrieve(orderId, { fields: ORDER_FIELDS })
      .then((res) => {
        if (cancelled) return;
        setOrder(res.order ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load this order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, customer]);

  if (authStatus === "loading" || !customer) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-12 md:px-8">
        <div className="h-6 w-40 animate-pulse rounded bg-blush-100" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-blush-100" />
      </main>
    );
  }

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
        <span>Order</span>
      </nav>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-60 animate-pulse rounded bg-blush-100" />
          <div className="h-48 animate-pulse rounded-xl bg-blush-100" />
        </div>
      ) : error || !order ? (
        <div className="rounded-xl border border-blush-300 bg-white p-8 text-center">
          <p className="font-display text-xl text-ink">Order not found</p>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            {error ?? "We couldn't find this order on your account."}
          </p>
          <Link
            href="/account"
            className="mt-5 inline-block rounded-full bg-coral-500 px-5 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-coral-700"
          >
            Back to account
          </Link>
        </div>
      ) : (
        <article>
          <header className="mb-6">
            <h1 className="font-display text-[32px] leading-none text-ink md:text-[40px]">
              Order{" "}
              <em className="not-italic text-coral-500">
                #{order.display_id ?? order.id.slice(-6)}
              </em>
            </h1>
            <p className="mt-2 font-sans text-[12px] text-ink-muted">
              Placed {formatDate(order.created_at)} ·{" "}
              {orderStatusLabel(order)}
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
            <section className="rounded-xl border border-blush-300 bg-white p-6">
              <h2 className="font-display text-xl text-ink">Items</h2>
              <ul className="mt-4 divide-y divide-blush-100">
                {(order.items ?? []).map((it) => (
                  <li key={it.id} className="flex gap-3 py-3">
                    {it.thumbnail && (
                      <Image
                        src={it.thumbnail}
                        alt={it.title ?? ""}
                        width={64}
                        height={80}
                        className="h-20 w-16 rounded-md object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col">
                      <p className="font-sans text-sm font-semibold text-ink">
                        {it.product?.handle ? (
                          <Link
                            href={`/products/${it.product.handle}`}
                            className="hover:text-coral-500"
                          >
                            {it.title}
                          </Link>
                        ) : (
                          it.title
                        )}
                      </p>
                      {it.variant?.title && (
                        <p className="font-sans text-[12px] text-ink-muted">
                          {it.variant.title}
                        </p>
                      )}
                      <p className="mt-auto font-sans text-[12px] text-ink-muted">
                        Qty {it.quantity}
                      </p>
                    </div>
                    <p className="font-sans text-sm font-semibold text-ink">
                      {formatPrice(it.total ?? 0, order.currency_code)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-blush-100 pt-4 font-sans text-sm">
                <Total label="Subtotal" value={order.subtotal} cur={order.currency_code} />
                <Total label="Shipping" value={order.shipping_total} cur={order.currency_code} />
                {(order.discount_total ?? 0) > 0 && (
                  <Total
                    label="Discount"
                    value={-(order.discount_total ?? 0)}
                    cur={order.currency_code}
                  />
                )}
                {(order.tax_total ?? 0) > 0 && (
                  <Total label="Tax" value={order.tax_total} cur={order.currency_code} />
                )}
                <div className="flex justify-between border-t border-blush-100 pt-3 text-base font-semibold text-ink">
                  <dt>Total</dt>
                  <dd>{formatPrice(order.total, order.currency_code)}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4">
              {order.shipping_address && (
                <div className="rounded-xl border border-blush-300 bg-white p-6">
                  <h2 className="font-display text-base text-ink">
                    Shipping to
                  </h2>
                  <AddressBlock a={order.shipping_address} email={order.email} />
                </div>
              )}
              {order.billing_address && order.billing_address.id !== order.shipping_address?.id && (
                <div className="rounded-xl border border-blush-300 bg-white p-6">
                  <h2 className="font-display text-base text-ink">
                    Billing
                  </h2>
                  <AddressBlock a={order.billing_address} />
                </div>
              )}
            </section>
          </div>

          <div className="mt-8">
            <Link
              href="/account"
              className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
            >
              ← Back to account
            </Link>
          </div>
        </article>
      )}
    </main>
  );
}

function Total({
  label,
  value,
  cur,
}: {
  label: string;
  value: number | null | undefined;
  cur: string;
}) {
  return (
    <div className="flex justify-between text-ink-muted">
      <dt>{label}</dt>
      <dd>{formatPrice(value ?? 0, cur)}</dd>
    </div>
  );
}

function AddressBlock({
  a,
  email,
}: {
  a: HttpTypes.StoreOrderAddress;
  email?: string | null;
}) {
  return (
    <div className="mt-3 font-sans text-sm text-ink">
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
      {a.phone && <p className="mt-1 text-[12px] text-ink-muted">{a.phone}</p>}
      {email && <p className="mt-1 text-[12px] text-ink-muted">{email}</p>}
    </div>
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

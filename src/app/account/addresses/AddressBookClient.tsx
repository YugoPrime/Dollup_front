"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { refreshCustomer, useCustomer } from "@/lib/auth-client";
import { clientSdk } from "@/lib/cart-client";
import { MU_DISTRICTS } from "@/lib/checkout";

type FormState = {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
};

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  phone: "",
};

function fromAddress(a: HttpTypes.StoreCustomerAddress): FormState {
  return {
    first_name: a.first_name ?? "",
    last_name: a.last_name ?? "",
    address_1: a.address_1 ?? "",
    address_2: a.address_2 ?? "",
    city: a.city ?? "",
    province: a.province ?? "",
    postal_code: a.postal_code ?? "",
    phone: a.phone ?? "",
  };
}

function toPayload(f: FormState) {
  return {
    first_name: f.first_name,
    last_name: f.last_name,
    address_1: f.address_1,
    address_2: f.address_2 || undefined,
    city: f.city,
    province: f.province,
    postal_code: f.postal_code || undefined,
    phone: f.phone || undefined,
    country_code: "mu",
  };
}

function validate(f: FormState): string | null {
  if (!f.first_name.trim()) return "First name is required.";
  if (!f.last_name.trim()) return "Last name is required.";
  if (!f.address_1.trim()) return "Address is required.";
  if (!f.city.trim()) return "City is required.";
  if (!f.province.trim()) return "District is required.";
  return null;
}

export function AddressBookClient() {
  const router = useRouter();
  const { status, customer } = useCustomer();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" && !customer) {
      router.replace("/login?redirect=/account/addresses");
    }
  }, [status, customer, router]);

  if (status === "loading" || !customer) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-12 md:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-blush-100" />
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-blush-100" />
      </main>
    );
  }

  const addresses = customer.addresses ?? [];

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
        <span>Addresses</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] leading-none text-ink md:text-[40px]">
            Saved <em className="not-italic text-coral-500">addresses</em>
          </h1>
          <p className="mt-2 font-sans text-[12px] text-ink-muted">
            {addresses.length}{" "}
            {addresses.length === 1 ? "address" : "addresses"} saved.
          </p>
        </div>
        {!adding && !editingId && (
          <button
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
            className="rounded-md bg-coral-500 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-coral-700"
          >
            Add address
          </button>
        )}
      </header>

      {error && (
        <div className="mb-5 rounded-md border border-coral-500 bg-blush-100 px-3 py-2 font-sans text-[13px] text-coral-700">
          {error}
        </div>
      )}

      {adding && (
        <AddressForm
          initial={EMPTY}
          submitLabel="Save address"
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
          onSubmit={async (form) => {
            const v = validate(form);
            if (v) {
              setError(v);
              return false;
            }
            setError(null);
            try {
              await clientSdk.store.customer.createAddress(toPayload(form));
              await refreshCustomer();
              setAdding(false);
              return true;
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Couldn't save the address.",
              );
              return false;
            }
          }}
        />
      )}

      {addresses.length === 0 && !adding ? (
        <div className="rounded-xl border border-blush-300 bg-white p-10 text-center">
          <p className="font-sans text-sm text-ink-muted">
            No addresses saved yet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id}>
              {editingId === a.id ? (
                <AddressForm
                  initial={fromAddress(a)}
                  submitLabel="Save changes"
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  onSubmit={async (form) => {
                    const v = validate(form);
                    if (v) {
                      setError(v);
                      return false;
                    }
                    setError(null);
                    try {
                      await clientSdk.store.customer.updateAddress(
                        a.id,
                        toPayload(form),
                      );
                      await refreshCustomer();
                      setEditingId(null);
                      return true;
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Couldn't update the address.",
                      );
                      return false;
                    }
                  }}
                />
              ) : (
                <AddressCard
                  address={a}
                  onEdit={() => {
                    setEditingId(a.id);
                    setError(null);
                  }}
                  onDelete={async () => {
                    if (
                      !confirm(
                        "Delete this address? This can't be undone.",
                      )
                    ) {
                      return;
                    }
                    setError(null);
                    try {
                      await clientSdk.store.customer.deleteAddress(a.id);
                      await refreshCustomer();
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Couldn't delete the address.",
                      );
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
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

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: HttpTypes.StoreCustomerAddress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-blush-300 bg-white p-5 font-sans text-sm text-ink">
      <p className="font-semibold">
        {address.first_name} {address.last_name}
      </p>
      <p className="mt-1 text-ink-muted">
        {address.address_1}
        {address.address_2 ? `, ${address.address_2}` : ""}
      </p>
      <p className="text-ink-muted">
        {address.city}
        {address.province ? `, ${address.province}` : ""}
        {address.postal_code ? ` ${address.postal_code}` : ""}
      </p>
      {address.phone && (
        <p className="mt-1 text-[12px] text-ink-muted">{address.phone}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="rounded-md border border-blush-400 px-3 py-1.5 font-sans text-[12px] font-semibold text-ink hover:bg-blush-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-md border border-blush-400 px-3 py-1.5 font-sans text-[12px] font-semibold text-coral-500 hover:bg-blush-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddressForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (f: FormState) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="rounded-xl border border-blush-300 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.first_name}
          onChange={(e) => set("first_name", e.target.value)}
          placeholder="First name"
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        />
        <input
          value={form.last_name}
          onChange={(e) => set("last_name", e.target.value)}
          placeholder="Last name"
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        />
      </div>
      <input
        value={form.address_1}
        onChange={(e) => set("address_1", e.target.value)}
        placeholder="Address"
        className="mt-3 w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
      />
      <input
        value={form.address_2}
        onChange={(e) => set("address_2", e.target.value)}
        placeholder="Apartment, suite, landmark (optional)"
        className="mt-3 w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="City"
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        />
        <select
          value={form.province}
          onChange={(e) => set("province", e.target.value)}
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        >
          <option value="">Select a district</option>
          {MU_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={form.postal_code}
          onChange={(e) => set("postal_code", e.target.value)}
          placeholder="Postal code (optional)"
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        />
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Phone (optional)"
          className="rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-coral-500"
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            const ok = await onSubmit(form);
            if (!ok) setSubmitting(false);
          }}
          className="rounded-md bg-coral-500 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          disabled={submitting}
          onClick={onCancel}
          className="rounded-md border border-blush-400 px-4 py-2 font-sans text-sm font-medium text-ink hover:bg-blush-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

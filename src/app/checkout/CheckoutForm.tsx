"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { clientSdk } from "@/lib/cart-client";
import { OrderSummary } from "./OrderSummary";
import {
  EMPTY_CHECKOUT_STATE,
  MU_DISTRICTS,
  validateCheckout,
  toMedusaAddress,
  type CheckoutFormState,
  type FieldErrors,
} from "@/lib/checkout";

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-md border-[1.5px] bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-coral-500 ${
          error ? "border-coral-500" : "border-blush-400"
        }`}
      />
      {error && (
        <span className="mt-1 block font-sans text-[11px] text-coral-700">
          {error}
        </span>
      )}
    </label>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const [state, setState] = useState<CheckoutFormState>(EMPTY_CHECKOUT_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [shippingOptions, setShippingOptions] = useState<
    HttpTypes.StoreCartShippingOptionWithServiceZone[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const set = <K extends keyof CheckoutFormState>(
    key: K,
    value: CheckoutFormState[K],
  ) => setState((s) => ({ ...s, [key]: value }));

  const setBilling = (key: keyof CheckoutFormState["billing"], value: string) =>
    setState((s) => ({ ...s, billing: { ...s.billing, [key]: value } }));

  const markTouched = (name: string) => {
    setTouched((t) => new Set(t).add(name));
    setErrors(validateCheckout(state));
  };

  const showError = (name: string) =>
    touched.has(name) ? errors[name] : undefined;

  useEffect(() => {
    if (!cart?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { shipping_options } =
          await clientSdk.store.fulfillment.listCartOptions({
            cart_id: cart.id,
          });
        if (!cancelled) {
          setShippingOptions(shipping_options ?? []);
          setState((s) => ({
            ...s,
            shippingOptionId: s.shippingOptionId ?? shipping_options?.[0]?.id ?? null,
          }));
        }
      } catch {
        if (!cancelled) setShippingOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart?.id]);

  async function handleSubmit() {
    const validation = validateCheckout(state);
    setErrors(validation);
    setTouched(new Set(Object.keys(validation)));
    if (Object.keys(validation).length > 0) {
      setErrorBanner("Please fix the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!cart) return;
    setErrorBanner(null);
    setSubmitting(true);
    try {
      await clientSdk.store.cart.update(cart.id, {
        email: state.email,
        shipping_address: toMedusaAddress(state, "shipping"),
        billing_address: toMedusaAddress(state, "billing"),
        ...(state.notes.trim()
          ? { metadata: { notes: state.notes.trim() } }
          : {}),
      });

      await clientSdk.store.cart.addShippingMethod(cart.id, {
        option_id: state.shippingOptionId!,
      });

      await clientSdk.store.payment.initiatePaymentSession(cart, {
        provider_id: "pp_system_default",
      });

      const result = await clientSdk.store.cart.complete(cart.id);
      if (result.type !== "order") {
        throw new Error(
          result.error?.message ?? "Order could not be completed",
        );
      }

      if (state.createAccount && state.password) {
        try {
          await clientSdk.auth.register("customer", "emailpass", {
            email: state.email,
            password: state.password,
          });
          await clientSdk.store.customer.create({
            email: state.email,
            first_name: state.firstName,
            last_name: state.lastName,
            phone: state.phone,
          });
        } catch (e) {
          console.warn("Account creation skipped:", e);
        }
      }

      clearCart();
      router.push(`/checkout/success?order=${result.order.id}`);
    } catch (err) {
      let msg = "Couldn't place your order. Please try again.";
      if (err instanceof Error) {
        const text = err.message.toLowerCase();
        if (
          text.includes("out of stock") ||
          text.includes("inventory") ||
          text.includes("not enough")
        ) {
          msg = "Some items are no longer available. Please review your bag.";
        } else if (text.length > 0) {
          msg = err.message;
        }
      }
      setErrorBanner(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return (
      <div className="rounded-xl border border-blush-400 bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          Your bag is empty
        </p>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Add something beautiful before you check out.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-coral-500 px-7 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Contact
          </h2>
          <Field
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={state.email}
            onChange={(v) => set("email", v)}
            onBlur={() => markTouched("email")}
            error={showError("email")}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            value={state.phone}
            onChange={(v) => set("phone", v)}
            onBlur={() => markTouched("phone")}
            error={showError("phone")}
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Shipping address
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              required
              autoComplete="given-name"
              value={state.firstName}
              onChange={(v) => set("firstName", v)}
              onBlur={() => markTouched("firstName")}
              error={showError("firstName")}
            />
            <Field
              label="Last name"
              name="lastName"
              required
              autoComplete="family-name"
              value={state.lastName}
              onChange={(v) => set("lastName", v)}
              onBlur={() => markTouched("lastName")}
              error={showError("lastName")}
            />
          </div>
          <Field
            label="Address"
            name="address1"
            required
            autoComplete="address-line1"
            value={state.address1}
            onChange={(v) => set("address1", v)}
            onBlur={() => markTouched("address1")}
            error={showError("address1")}
          />
          <Field
            label="Apartment, suite, landmark (optional)"
            name="address2"
            autoComplete="address-line2"
            value={state.address2}
            onChange={(v) => set("address2", v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="City / Town"
              name="city"
              required
              autoComplete="address-level2"
              value={state.city}
              onChange={(v) => set("city", v)}
              onBlur={() => markTouched("city")}
              error={showError("city")}
            />
            <label className="block">
              <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
                District<span className="ml-1 text-coral-500">*</span>
              </span>
              <select
                name="province"
                value={state.province}
                onChange={(e) => set("province", e.target.value)}
                onBlur={() => markTouched("province")}
                className={`w-full rounded-md border-[1.5px] bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-coral-500 ${
                  showError("province") ? "border-coral-500" : "border-blush-400"
                }`}
              >
                <option value="">Select a district</option>
                {MU_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {showError("province") && (
                <span className="mt-1 block font-sans text-[11px] text-coral-700">
                  {showError("province")}
                </span>
              )}
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Postal code (optional)"
              name="postalCode"
              autoComplete="postal-code"
              value={state.postalCode}
              onChange={(v) => set("postalCode", v)}
            />
            <label className="block">
              <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
                Country
              </span>
              <input
                type="text"
                value="Mauritius"
                readOnly
                className="w-full rounded-md border-[1.5px] border-blush-400 bg-blush-100 px-3 py-2.5 font-sans text-sm text-ink-muted"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <label className="flex items-center gap-2 font-sans text-sm text-ink">
            <input
              type="checkbox"
              checked={state.billingSameAsShipping}
              onChange={(e) => set("billingSameAsShipping", e.target.checked)}
              className="h-4 w-4 accent-coral-500"
            />
            Billing address same as shipping
          </label>
          {!state.billingSameAsShipping && (
            <div className="space-y-4 rounded-lg border border-blush-100 bg-cream/40 p-4">
              <h3 className="font-display text-base font-semibold text-ink">
                Billing address
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="billing.firstName"
                  required
                  value={state.billing.firstName}
                  onChange={(v) => setBilling("firstName", v)}
                  onBlur={() => markTouched("billing.firstName")}
                  error={showError("billing.firstName")}
                />
                <Field
                  label="Last name"
                  name="billing.lastName"
                  required
                  value={state.billing.lastName}
                  onChange={(v) => setBilling("lastName", v)}
                  onBlur={() => markTouched("billing.lastName")}
                  error={showError("billing.lastName")}
                />
              </div>
              <Field
                label="Address"
                name="billing.address1"
                required
                value={state.billing.address1}
                onChange={(v) => setBilling("address1", v)}
                onBlur={() => markTouched("billing.address1")}
                error={showError("billing.address1")}
              />
              <Field
                label="Apartment (optional)"
                name="billing.address2"
                value={state.billing.address2}
                onChange={(v) => setBilling("address2", v)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  name="billing.city"
                  required
                  value={state.billing.city}
                  onChange={(v) => setBilling("city", v)}
                  onBlur={() => markTouched("billing.city")}
                  error={showError("billing.city")}
                />
                <label className="block">
                  <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
                    District<span className="ml-1 text-coral-500">*</span>
                  </span>
                  <select
                    value={state.billing.province}
                    onChange={(e) => setBilling("province", e.target.value)}
                    onBlur={() => markTouched("billing.province")}
                    className={`w-full rounded-md border-[1.5px] bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500 ${
                      showError("billing.province")
                        ? "border-coral-500"
                        : "border-blush-400"
                    }`}
                  >
                    <option value="">Select a district</option>
                    {MU_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {showError("billing.province") && (
                    <span className="mt-1 block font-sans text-[11px] text-coral-700">
                      {showError("billing.province")}
                    </span>
                  )}
                </label>
              </div>
              <Field
                label="Postal code (optional)"
                name="billing.postalCode"
                value={state.billing.postalCode}
                onChange={(v) => setBilling("postalCode", v)}
              />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Shipping method
          </h2>
          {shippingOptions.length === 0 ? (
            <p className="font-sans text-sm text-ink-muted">
              Loading shipping options…
            </p>
          ) : (
            <div className="space-y-2">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-between rounded-md border-[1.5px] px-4 py-3 transition-colors ${
                    state.shippingOptionId === opt.id
                      ? "border-coral-500 bg-blush-100"
                      : "border-blush-400 bg-white hover:border-coral-500"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingOption"
                      checked={state.shippingOptionId === opt.id}
                      onChange={() => set("shippingOptionId", opt.id)}
                      className="h-4 w-4 accent-coral-500"
                    />
                    <span className="font-sans text-sm font-medium text-ink">
                      {opt.name}
                    </span>
                  </span>
                  <span className="font-sans text-sm font-semibold text-ink">
                    {opt.amount === 0
                      ? "Free"
                      : new Intl.NumberFormat("en-MU", {
                          style: "currency",
                          currency: cart.currency_code ?? "MUR",
                          minimumFractionDigits: 0,
                        }).format(opt.amount ?? 0)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Order notes (optional)
          </h2>
          <textarea
            name="notes"
            value={state.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Landmarks, delivery instructions, gate code…"
            rows={3}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500"
          />
        </section>

        <section className="space-y-3">
          <label className="flex items-start gap-2 font-sans text-sm text-ink">
            <input
              type="checkbox"
              checked={state.createAccount}
              onChange={(e) => set("createAccount", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-coral-500"
            />
            <span>
              Create an account so I can track this order and check out faster
              next time.
            </span>
          </label>
          {state.createAccount && (
            <Field
              label="Choose a password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={state.password}
              onChange={(v) => set("password", v)}
              onBlur={() => markTouched("password")}
              error={showError("password")}
            />
          )}
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="sticky bottom-4 flex w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold text-white shadow-lg disabled:opacity-60 lg:hidden"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </form>

      <OrderSummary
        cart={cart}
        submitting={submitting}
        onSubmit={handleSubmit}
        errorBanner={errorBanner}
      />
    </div>
  );
}

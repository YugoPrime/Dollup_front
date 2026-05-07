"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { LoyaltyRedeemBox } from "@/components/checkout/LoyaltyRedeemBox";
import { clientSdk } from "@/lib/cart-client";
import { refreshCustomer, useCustomer } from "@/lib/auth-client";
import { readLoyaltyRedeemMetadata } from "@/lib/loyalty-client";
import { OrderSummary } from "./OrderSummary";
import {
  allowedPaymentMethods,
  deliveryDateApplies,
  earliestDeliveryDate,
  EMPTY_CHECKOUT_STATE,
  isValidDeliveryDate,
  qualifiesForFreeHomeDelivery,
  shippingOptionToDeliveryMethod,
  validateCheckout,
  toMedusaAddress,
  type CheckoutFormState,
  type FieldErrors,
  type PaymentMethod,
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
  const { cart, clearCart, refreshCart } = useCart();
  const { status: authStatus, customer } = useCustomer();
  const [state, setState] = useState<CheckoutFormState>(EMPTY_CHECKOUT_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [shippingOptions, setShippingOptions] = useState<
    HttpTypes.StoreCartShippingOptionWithServiceZone[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [prefilledFromCustomer, setPrefilledFromCustomer] = useState(false);

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

  // Resolve the selected option + canonical DM delivery method. The method
  // drives both the conditional date input and what we write to
  // cart.metadata.delivery_method (which the admin reads).
  const selectedOption = state.shippingOptionId
    ? (shippingOptions.find((o) => o.id === state.shippingOptionId) ?? null)
    : null;
  const selectedMethod = shippingOptionToDeliveryMethod(
    selectedOption?.name ?? null,
  );
  const showDeliveryDate = deliveryDateApplies(selectedMethod);
  const minDeliveryDate = earliestDeliveryDate();
  const allowedPayments = allowedPaymentMethods(selectedMethod);

  // Clear the delivery date when the selected shipping option is not
  // date-eligible (e.g., user switched to Postage).
  useEffect(() => {
    if (!showDeliveryDate && state.deliveryDate) {
      setState((s) => ({ ...s, deliveryDate: "" }));
    }
  }, [showDeliveryDate, state.deliveryDate]);

  // Auto-reset payment method when the current one is no longer allowed for
  // the chosen delivery method (e.g. customer picks Postage while Cash is
  // selected — Cash isn't offered for courier methods).
  useEffect(() => {
    if (!allowedPayments.includes(state.paymentMethod)) {
      setState((s) => ({ ...s, paymentMethod: allowedPayments[0] }));
    }
  }, [allowedPayments, state.paymentMethod]);

  // Push the selected shipping method to the cart so the order summary reflects
  // the live shipping cost and total. Skips if the cart already has it.
  useEffect(() => {
    if (!cart?.id || !state.shippingOptionId) return;
    const already = cart.shipping_methods?.some(
      (m) => m.shipping_option_id === state.shippingOptionId,
    );
    if (already) return;
    let cancelled = false;
    (async () => {
      try {
        await clientSdk.store.cart.addShippingMethod(cart.id, {
          option_id: state.shippingOptionId!,
        });
        if (!cancelled) await refreshCart();
      } catch {
        // best-effort — handleSubmit will retry before completing the order
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart?.id, cart?.shipping_methods, state.shippingOptionId, refreshCart]);

  // Prefill once when a logged-in customer's profile + saved address loads.
  useEffect(() => {
    if (prefilledFromCustomer || authStatus !== "ready" || !customer) return;
    const addr = customer.addresses?.[0];
    setState((s) => ({
      ...s,
      email: s.email || customer.email || "",
      phone: s.phone || customer.phone || addr?.phone || "",
      firstName: s.firstName || customer.first_name || addr?.first_name || "",
      lastName: s.lastName || customer.last_name || addr?.last_name || "",
      address1: s.address1 || addr?.address_1 || "",
      address2: s.address2 || addr?.address_2 || "",
      city: s.city || addr?.city || "",
      province: s.province || addr?.province || "",
      postalCode: s.postalCode || addr?.postal_code || "",
    }));
    setPrefilledFromCustomer(true);
  }, [authStatus, customer, prefilledFromCustomer]);

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
    // If a date was entered but is no longer valid (Sunday, past, before
    // cutoff window), drop it silently — the field is optional and we'd rather
    // place the order than block the customer over a stale picker value.
    const dateToSend =
      showDeliveryDate &&
      state.deliveryDate &&
      isValidDeliveryDate(state.deliveryDate)
        ? state.deliveryDate
        : null;
    const metadataPatch: Record<string, unknown> = {
      ...(cart.metadata ?? {}),
    };
    if (selectedMethod) metadataPatch.delivery_method = selectedMethod;
    if (state.notes.trim()) metadataPatch.notes = state.notes.trim();
    if (dateToSend) metadataPatch.delivery_date = dateToSend;
    else delete metadataPatch.delivery_date;
    metadataPatch.payment_method = state.paymentMethod;
    setErrorBanner(null);
    setSubmitting(true);
    try {
      await clientSdk.store.cart.update(cart.id, {
        email: state.email,
        shipping_address: toMedusaAddress(state, "shipping"),
        billing_address: toMedusaAddress(state, "billing"),
        metadata: metadataPatch,
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
          // SDK now holds the JWT in localStorage — refresh the in-memory auth
          // state so the header avatar appears immediately on /checkout/success.
          await refreshCustomer();
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

  const redeemMeta = readLoyaltyRedeemMetadata(
    cart.metadata as Record<string, unknown> | null | undefined,
  );

  const loyaltyBox = cart.id ? (
    <LoyaltyRedeemBox
      cartId={cart.id}
      alreadyApplied={!!redeemMeta}
      applied={redeemMeta}
      onApplied={refreshCart}
    />
  ) : null;

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
            <Field
              label="Postal code (optional)"
              name="postalCode"
              autoComplete="postal-code"
              value={state.postalCode}
              onChange={(v) => set("postalCode", v)}
            />
          </div>
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
                <Field
                  label="Postal code (optional)"
                  name="billing.postalCode"
                  value={state.billing.postalCode}
                  onChange={(v) => setBilling("postalCode", v)}
                />
              </div>
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
              {shippingOptions.map((opt) => {
                const label = opt.name ?? "";
                const free =
                  opt.amount === 0 ||
                  qualifiesForFreeHomeDelivery(
                    opt.name ?? "",
                    cart.item_total ?? cart.subtotal ?? 0,
                  );
                return (
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
                        {label}
                      </span>
                    </span>
                    <span className="font-sans text-sm font-semibold text-ink">
                      {free
                        ? "Free"
                        : new Intl.NumberFormat("en-MU", {
                            style: "currency",
                            currency: cart.currency_code ?? "MUR",
                            minimumFractionDigits: 0,
                          }).format(opt.amount ?? 0)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {showDeliveryDate && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ink">
              Preferred delivery date (optional)
            </h2>
            <p className="font-sans text-xs text-ink-muted">
              {selectedMethod === "Pick Up"
                ? "Choose when you'd like to pick up your order."
                : "Choose when you'd like to receive your order."}{" "}
              No deliveries on Sundays. Same-day requests close at 1pm.
            </p>
            <input
              type="date"
              name="deliveryDate"
              value={state.deliveryDate}
              min={minDeliveryDate}
              onChange={(e) => set("deliveryDate", e.target.value)}
              className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-coral-500 sm:w-auto"
            />
            {state.deliveryDate &&
              !isValidDeliveryDate(state.deliveryDate) && (
                <p className="font-sans text-[11px] text-coral-700">
                  That date isn't available — please pick another (no Sundays,
                  same-day cutoff is 1pm).
                </p>
              )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Payment method
          </h2>
          <div className="space-y-2">
            {allowedPayments.map((m) => {
              const checked = state.paymentMethod === m;
              const label =
                m === "Cash"
                  ? { main: "Cash on Delivery", sub: "Pay with cash when your order arrives." }
                  : m === "MCB Juice"
                  ? { main: "MCB Juice", sub: "Mobile transfer to our MCB account." }
                  : { main: "Bank Transfer", sub: "Transfer to our MCB business account." };
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border-[1.5px] px-4 py-3 transition-colors ${
                    checked
                      ? "border-coral-500 bg-blush-100"
                      : "border-blush-400 bg-white hover:border-coral-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={checked}
                    onChange={() => set("paymentMethod", m as PaymentMethod)}
                    className="mt-0.5 h-4 w-4 accent-coral-500"
                  />
                  <span className="flex flex-col">
                    <span className="font-sans text-sm font-medium text-ink">
                      {label.main}
                    </span>
                    <span className="font-sans text-[11px] text-ink-muted">
                      {label.sub}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {state.paymentMethod !== "Cash" && (
            <p className="font-sans text-[11px] text-ink-muted">
              Payment instructions will be shown after you place your order.
            </p>
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

        {!customer && (
          <section className="space-y-3">
            <label className="flex items-start gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={state.createAccount}
                onChange={(e) => set("createAccount", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-coral-500"
              />
              <span>
                Create an account so I can track this order and check out
                faster next time.
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
        )}

        <div className="lg:hidden">{loyaltyBox}</div>

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
        loyaltySlot={<div className="hidden lg:block">{loyaltyBox}</div>}
        selectedShippingOption={
          shippingOptions.find((o) => o.id === state.shippingOptionId) ?? null
        }
      />
    </div>
  );
}

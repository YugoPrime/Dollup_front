"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  ChevronLeft,
  Mail,
  Store,
  Truck,
} from "lucide-react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { LoyaltyRedeemBox } from "@/components/checkout/LoyaltyRedeemBox";
import { clientSdk } from "@/lib/cart-client";
import { refreshCustomer, useCustomer } from "@/lib/auth-client";
import { formatPrice } from "@/lib/format";
import { readLoyaltyRedeemMetadata } from "@/lib/loyalty-client";
import { OrderSummary } from "./OrderSummary";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
} from "@/lib/analytics";
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

type MobileCheckoutStep = "delivery" | "details" | "review";

const MOBILE_CHECKOUT_STEPS: { id: MobileCheckoutStep; label: string }[] = [
  { id: "delivery", label: "Delivery" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
];

const DETAILS_ERROR_FIELDS = [
  "email",
  "phone",
  "firstName",
  "lastName",
  "address1",
  "city",
  "password",
  "billing.firstName",
  "billing.lastName",
  "billing.address1",
  "billing.city",
] as const;

function pickErrors(
  validation: FieldErrors,
  fields: readonly string[],
): FieldErrors {
  return fields.reduce<FieldErrors>((acc, field) => {
    if (validation[field]) acc[field] = validation[field];
    return acc;
  }, {});
}

function scrollCheckoutToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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
  const errorId = error ? `${name}-error` : undefined;
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
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-md border-[1.5px] bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-coral-500 ${
          error ? "border-coral-500" : "border-blush-400"
        }`}
      />
      {error && (
        <span id={errorId} className="mt-1 block font-sans text-[11px] text-coral-700">
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
  const [mobileStep, setMobileStep] =
    useState<MobileCheckoutStep>("delivery");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [prefilledFromCustomer, setPrefilledFromCustomer] = useState(false);
  const beginCheckoutFiredRef = useRef(false);

  // Fire GA4 begin_checkout once when the cart first hydrates with items.
  useEffect(() => {
    if (beginCheckoutFiredRef.current) return;
    if (!cart || (cart.items?.length ?? 0) === 0) return;
    beginCheckoutFiredRef.current = true;
    trackBeginCheckout(cart);
  }, [cart]);

  const set = <K extends keyof CheckoutFormState>(
    key: K,
    value: CheckoutFormState[K],
  ) => setState((s) => ({ ...s, [key]: value }));

  const setBilling = (key: keyof CheckoutFormState["billing"], value: string) =>
    setState((s) => ({ ...s, billing: { ...s.billing, [key]: value } }));

  const markTouched = (name: string) => {
    setTouched((t) => new Set(t).add(name));
    setErrors(validateCheckout(state, selectedMethod));
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
  const isPickup = selectedMethod === "Pick Up";
  const minDeliveryDate = earliestDeliveryDate(new Date(), isPickup);
  const allowedPayments = allowedPaymentMethods(selectedMethod);

  // Clear the delivery date when the selected shipping option is not
  // date-eligible (e.g., user switched to Postage).
  useEffect(() => {
    if (!showDeliveryDate && state.deliveryDate) {
      const timeout = window.setTimeout(() => {
        setState((s) => ({ ...s, deliveryDate: "" }));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [showDeliveryDate, state.deliveryDate]);

  // Auto-reset payment method when the current one is no longer allowed for
  // the chosen delivery method (e.g. customer picks Postage while Cash is
  // selected — Cash isn't offered for courier methods).
  useEffect(() => {
    if (!allowedPayments.includes(state.paymentMethod)) {
      const timeout = window.setTimeout(() => {
        setState((s) => ({ ...s, paymentMethod: allowedPayments[0] }));
      }, 0);
      return () => window.clearTimeout(timeout);
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
    const timeout = window.setTimeout(() => {
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
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authStatus, customer, prefilledFromCustomer]);

  const mobileStepIndex = Math.max(
    0,
    MOBILE_CHECKOUT_STEPS.findIndex((step) => step.id === mobileStep),
  );

  function goToMobileStep(next: MobileCheckoutStep) {
    setErrorBanner(null);
    setMobileStep(next);
    scrollCheckoutToTop();
  }

  function markStepErrors(stepErrors: FieldErrors) {
    const fields = Object.keys(stepErrors);
    setTouched((current) => new Set([...current, ...fields]));
  }

  function continueFromDelivery() {
    const validation = validateCheckout(state, selectedMethod);
    const stepErrors =
      shippingOptions.length === 0
        ? {
            ...pickErrors(validation, ["shippingOptionId"]),
            shippingOptionId: "Choose a shipping method",
          }
        : pickErrors(validation, ["shippingOptionId"]);

    setErrors({ ...validation, ...stepErrors });
    markStepErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      setErrorBanner("Please choose how you want to receive your order.");
      scrollCheckoutToTop();
      return;
    }

    goToMobileStep("details");
  }

  function continueFromDetails() {
    const validation = validateCheckout(state, selectedMethod);
    const stepErrors = pickErrors(validation, DETAILS_ERROR_FIELDS);

    setErrors(validation);
    markStepErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      setErrorBanner("Please fix the highlighted fields.");
      scrollCheckoutToTop();
      return;
    }

    goToMobileStep("review");
  }

  function goBackMobileStep() {
    const previous = MOBILE_CHECKOUT_STEPS[Math.max(0, mobileStepIndex - 1)];
    goToMobileStep(previous.id);
  }

  function handleMobilePrimaryAction() {
    if (mobileStep === "delivery") {
      continueFromDelivery();
      return;
    }
    if (mobileStep === "details") {
      continueFromDetails();
      return;
    }
    handleSubmit();
  }

  async function handleSubmit() {
    const validation = validateCheckout(state, selectedMethod);
    setErrors(validation);
    setTouched(new Set(Object.keys(validation)));
    if (Object.keys(validation).length > 0) {
      setErrorBanner("Please fix the highlighted fields.");
      setMobileStep(validation.shippingOptionId ? "delivery" : "details");
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
      isValidDeliveryDate(state.deliveryDate, new Date(), isPickup)
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
        shipping_address: toMedusaAddress(state, "shipping", selectedMethod),
        billing_address: toMedusaAddress(state, "billing", selectedMethod),
        metadata: metadataPatch,
      });

      await clientSdk.store.cart.addShippingMethod(cart.id, {
        option_id: state.shippingOptionId!,
      });
      trackAddShippingInfo(cart, selectedMethod ?? selectedOption?.name ?? null);

      // Create the account BEFORE completing the cart so the resulting order's
      // customer_id is the new customer (Medusa copies cart.customer_id onto
      // the order at complete-time, then freezes it). If we registered after
      // cart.complete, the order would be locked to no/wrong customer and
      // never appear under /account/orders.
      if (!customer && state.createAccount && state.password) {
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
          // Bind the in-flight cart to the new customer so the order inherits
          // the right customer_id at cart.complete.
          await clientSdk.store.cart.transferCart(cart.id);
          // Refresh in-memory auth so the header avatar updates immediately
          // on /checkout/success.
          await refreshCustomer();
        } catch (e) {
          // Most common failure: email already registered. Don't block the
          // order — it still completes as guest. (User can claim it later
          // via the existing /forgot-password + /account flow.)
          console.warn("Account creation skipped:", e);
        }
      } else if (customer) {
        // Defensive: ensure cart belongs to the logged-in customer right
        // before completion. transferCart is a no-op when already bound.
        try {
          await clientSdk.store.cart.transferCart(cart.id);
        } catch {
          /* best effort — let cart.complete proceed */
        }
      }

      await clientSdk.store.payment.initiatePaymentSession(cart, {
        provider_id: "pp_system_default",
      });
      trackAddPaymentInfo(cart, state.paymentMethod);

      const result = await clientSdk.store.cart.complete(cart.id);
      if (result.type !== "order") {
        throw new Error(
          result.error?.message ?? "Order could not be completed",
        );
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
  const currency = cart.currency_code ?? "MUR";
  const itemSubtotal = cart.item_total ?? cart.subtotal ?? 0;
  const cartHasShippingMethod = (cart.shipping_methods?.length ?? 0) > 0;
  const selectedShippingFree =
    selectedOption &&
    (selectedOption.amount === 0 ||
      qualifiesForFreeHomeDelivery(selectedOption.name ?? "", itemSubtotal));
  const ctaShipping = cartHasShippingMethod
    ? (cart.shipping_total ?? 0)
    : selectedShippingFree
      ? 0
      : (selectedOption?.amount ?? 0);
  const ctaTotal = cartHasShippingMethod
    ? (cart.total ?? 0)
    : Math.max(0, itemSubtotal + ctaShipping - (cart.discount_total ?? 0));
  const ctaTotalLabel = formatPrice(ctaTotal, currency);
  const mobileStepLabel =
    MOBILE_CHECKOUT_STEPS[mobileStepIndex]?.label ?? "Delivery";
  const selectedDeliveryLabel =
    selectedOption?.name ?? "Delivery not selected";
  const reviewName =
    `${state.firstName} ${state.lastName}`.trim() || "No name entered";
  const reviewAddress =
    [state.address1, state.address2, state.city].filter(Boolean).join(", ") ||
    "No address entered";
  const reviewDate =
    state.deliveryDate &&
    isValidDeliveryDate(state.deliveryDate, new Date(), isPickup)
      ? new Intl.DateTimeFormat("en-MU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(`${state.deliveryDate}T00:00:00`))
      : null;
  const mobilePrimaryLabel =
    mobileStep === "delivery"
      ? "Continue to details"
      : mobileStep === "details"
        ? "Review order"
        : submitting
          ? "Placing order..."
          : "Place order";
  const shippingOptionError = showError("shippingOptionId");

  return (
    <>
      {errorBanner ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-coral-300 bg-coral-50 px-4 py-3 font-sans text-sm text-coral-700"
        >
          {errorBanner}
        </div>
      ) : null}

      <div className="mb-5 rounded-lg border border-blush-300 bg-white p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3 font-sans text-xs font-semibold text-ink">
          <span>
            Step {mobileStepIndex + 1} of {MOBILE_CHECKOUT_STEPS.length}
          </span>
          <span className="text-coral-600">{mobileStepLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MOBILE_CHECKOUT_STEPS.map((step, index) => {
            const active = step.id === mobileStep;
            const complete = index < mobileStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index <= mobileStepIndex) goToMobileStep(step.id);
                }}
                disabled={index > mobileStepIndex}
                aria-current={active ? "step" : undefined}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-2 font-sans text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-coral-500 bg-coral-500 text-white"
                    : complete
                      ? "border-coral-200 bg-coral-50 text-coral-700"
                      : "border-blush-300 bg-blush-50 text-ink-muted"
                } disabled:opacity-70`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? "bg-white text-coral-600"
                      : "bg-white text-ink-soft"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
      <form
        className="flex flex-col gap-8 lg:block lg:space-y-8"
        onSubmit={(e) => e.preventDefault()}
      >
        <section
          className={`${mobileStep === "delivery" ? "block" : "hidden"} space-y-3 lg:block`}
        >
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
                const method = shippingOptionToDeliveryMethod(label);
                const ShippingIcon =
                  method === "Pick Up"
                    ? Store
                    : method === "Postage" ||
                        method === "Express Postage" ||
                        method === "Rodrigues Postage"
                      ? Mail
                      : Truck;
                const hint =
                  method === "Pick Up"
                    ? "Collect from Doll Up Boutique."
                    : method === "Postage"
                      ? "Registered post across Mauritius."
                      : method === "Express Postage"
                        ? "Faster courier dispatch."
                        : method === "Rodrigues Postage"
                          ? "Postal delivery to Rodrigues."
                          : "Door-to-door delivery in Mauritius.";
                const free =
                  opt.amount === 0 ||
                  qualifiesForFreeHomeDelivery(
                    opt.name ?? "",
                    cart.item_total ?? cart.subtotal ?? 0,
                  );
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-md border-[1.5px] px-4 py-3 transition-colors ${
                      state.shippingOptionId === opt.id
                        ? "border-coral-500 bg-blush-100"
                        : "border-blush-400 bg-white hover:border-coral-500"
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-500/10 text-coral-700">
                        <ShippingIcon aria-hidden className="h-4 w-4" />
                      </span>
                      <input
                        type="radio"
                        name="shippingOption"
                        checked={state.shippingOptionId === opt.id}
                        onChange={() => set("shippingOptionId", opt.id)}
                        className="mt-2 h-4 w-4 accent-coral-500"
                      />
                      <span className="min-w-0">
                        <span className="block break-words font-sans text-sm font-medium text-ink">
                          {label}
                        </span>
                        <span className="mt-0.5 block font-sans text-[11px] text-ink-muted">
                          {hint}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 pt-2 font-sans text-sm font-semibold text-ink">
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
          {shippingOptionError ? (
            <p className="font-sans text-[11px] text-coral-700">
              {shippingOptionError}
            </p>
          ) : null}
        </section>

        {showDeliveryDate && (
          <section
            className={`${mobileStep === "delivery" ? "block" : "hidden"} space-y-3 lg:block`}
          >
            <h2 className="font-display text-lg font-semibold text-ink">
              {isPickup
                ? "Preferred Pick Up Date (optional)"
                : "Preferred delivery date (optional)"}
            </h2>
            <p className="font-sans text-xs text-ink-muted">
              {isPickup
                ? "Choose your pickup date. Same-day pickup is possible. No pickups on Sundays."
                : "Choose your delivery date. No same-day delivery. For next-day delivery, order before 1pm the day before. No deliveries on Sundays."}
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
              !isValidDeliveryDate(state.deliveryDate, new Date(), isPickup) && (
                <p className="font-sans text-[11px] text-coral-700">
                  {isPickup
                    ? "That date is not available — pickups are not offered on Sundays."
                    : "That date is not available. Please pick another date: no same-day delivery, next-day cutoff is 1pm the day before, and no Sundays."}
                </p>
              )}
          </section>
        )}

        <section
          className={`${mobileStep === "details" ? "block" : "hidden"} space-y-4 lg:block`}
        >
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

        <section
          className={`${mobileStep === "details" ? "block" : "hidden"} space-y-4 lg:block`}
        >
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
          {selectedMethod === "Pick Up" ? (
            <div className="rounded-lg border border-blush-100 bg-cream/60 p-4 font-sans text-sm text-ink-soft">
              <p className="mb-1 font-semibold text-ink">
                Pick up in Pereybere
              </p>
              <p>Location & Times will be confirmed.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </section>

        <section
          className={`${mobileStep === "details" ? "block" : "hidden"} space-y-3 lg:block`}
        >
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

        <section
          className={`${mobileStep === "review" ? "block" : "hidden"} space-y-3 lg:block`}
        >
          <h2 className="font-display text-lg font-semibold text-ink">
            Payment method
          </h2>
          <div className="space-y-2">
            {allowedPayments.map((m) => {
              const checked = state.paymentMethod === m;
              const label =
                m === "Cash"
                  ? {
                      main: "Cash on Delivery",
                      sub: "Pay with cash when your order arrives.",
                      Icon: Banknote,
                    }
                  : {
                      main: "Juice / Bank Transfer",
                      sub: "Send payment to our MCB business account.",
                      Icon: Building2,
                    };
              const PaymentIcon = label.Icon;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border-[1.5px] px-4 py-3 transition-colors ${
                    checked
                      ? "border-coral-500 bg-blush-100"
                      : "border-blush-400 bg-white hover:border-coral-500"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-500/10 text-coral-700">
                    <PaymentIcon aria-hidden className="h-4 w-4" />
                  </span>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={checked}
                    onChange={() => set("paymentMethod", m as PaymentMethod)}
                    className="mt-2 h-4 w-4 accent-coral-500"
                  />
                  <span className="flex min-w-0 flex-col">
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

        <section
          className={`${mobileStep === "details" ? "block" : "hidden"} space-y-3 lg:block`}
        >
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
          <section
            className={`${mobileStep === "details" ? "block" : "hidden"} space-y-3 lg:block`}
          >
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

        <section
          className={`${mobileStep === "review" ? "block" : "hidden"} space-y-3 lg:hidden`}
        >
          <h2 className="font-display text-lg font-semibold text-ink">
            Review details
          </h2>
          <div className="divide-y divide-blush-100 rounded-lg border border-blush-300 bg-white">
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-600">
                  Delivery
                </p>
                <button
                  type="button"
                  onClick={() => goToMobileStep("delivery")}
                  className="font-sans text-xs font-semibold text-coral-700"
                >
                  Edit
                </button>
              </div>
              <p className="font-sans text-sm font-semibold text-ink">
                {selectedDeliveryLabel}
              </p>
              {reviewDate ? (
                <p className="mt-1 font-sans text-xs text-ink-muted">
                  Preferred date: {reviewDate}
                </p>
              ) : null}
            </div>
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-600">
                  Details
                </p>
                <button
                  type="button"
                  onClick={() => goToMobileStep("details")}
                  className="font-sans text-xs font-semibold text-coral-700"
                >
                  Edit
                </button>
              </div>
              <p className="font-sans text-sm font-semibold text-ink">
                {reviewName}
              </p>
              <p className="mt-1 font-sans text-xs text-ink-muted">
                {state.phone}
              </p>
              <p className="mt-1 font-sans text-xs text-ink-muted">
                {reviewAddress}
              </p>
            </div>
          </div>
        </section>

        <div className={`${mobileStep === "review" ? "block" : "hidden"} lg:hidden`}>
          {loyaltyBox}
        </div>
        <div aria-hidden className="h-24 lg:hidden" />
        <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-blush-300 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,18,18,0.08)] backdrop-blur lg:hidden">
          <div className="flex gap-2">
            {mobileStep !== "delivery" ? (
              <button
                type="button"
                onClick={goBackMobileStep}
                disabled={submitting}
                className="flex h-12 w-24 shrink-0 items-center justify-center gap-1 rounded-md border border-blush-300 bg-white font-sans text-sm font-semibold text-ink transition-colors hover:border-coral-500 disabled:opacity-60"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleMobilePrimaryAction}
              disabled={submitting}
              className="flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-coral-500 px-4 font-sans text-sm font-semibold text-white shadow-lg transition-colors hover:bg-coral-700 disabled:opacity-60"
            >
              <span className="truncate">{mobilePrimaryLabel}</span>
              <span className="shrink-0">{ctaTotalLabel}</span>
            </button>
          </div>
        </div>
      </form>

      <div className={`${mobileStep === "review" ? "block" : "hidden"} lg:block`}>
        <OrderSummary
          cart={cart}
          submitting={submitting}
          onSubmit={handleSubmit}
          loyaltySlot={<div className="hidden lg:block">{loyaltyBox}</div>}
          selectedShippingOption={
            shippingOptions.find((o) => o.id === state.shippingOptionId) ?? null
          }
        />
      </div>
      </div>
    </>
  );
}

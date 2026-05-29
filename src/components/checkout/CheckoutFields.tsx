"use client";

import type { CheckoutFormState, FieldErrors } from "@/lib/checkout";

type Accent = "coral" | "sage";

export type CheckoutFieldsProps = {
  state: CheckoutFormState;
  errors: FieldErrors;
  onChange: (field: string, value: string) => void;
  onBlur: (field: string) => void;
  accent?: Accent; // preorder passes "sage"; default "coral"
};

// Local copy of the apex Field helper, parameterized by accent. The apex form
// (src/app/checkout/CheckoutForm.tsx) still has its own inline copy — this
// extraction only ADDS the shared component; apex is refactored to use it in a
// later task.
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
  accent = "coral",
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
  accent?: Accent;
}) {
  // Error border is always coral for both accents. Idle border stays
  // border-blush-400 for both. Only the focus border + required asterisk
  // follow the accent.
  const focusBorder =
    accent === "sage" ? "focus:border-sage-500" : "focus:border-coral-500";
  const asterisk = accent === "sage" ? "text-sage-700" : "text-coral-500";
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-xs font-semibold text-ink">
        {label}
        {required && <span className={`ml-1 ${asterisk}`}>*</span>}
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
        className={`w-full rounded-md border-[1.5px] bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors ${focusBorder} ${
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

export function CheckoutFields({
  state,
  errors,
  onChange,
  onBlur,
  accent = "coral",
}: CheckoutFieldsProps) {
  const focusBorder =
    accent === "sage" ? "focus:border-sage-500" : "focus:border-coral-500";

  return (
    <>
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">Contact</h2>
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          accent={accent}
          value={state.email}
          onChange={(v) => onChange("email", v)}
          onBlur={() => onBlur("email")}
          error={errors["email"]}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          accent={accent}
          value={state.phone}
          onChange={(v) => onChange("phone", v)}
          onBlur={() => onBlur("phone")}
          error={errors["phone"]}
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
            accent={accent}
            value={state.firstName}
            onChange={(v) => onChange("firstName", v)}
            onBlur={() => onBlur("firstName")}
            error={errors["firstName"]}
          />
          <Field
            label="Last name"
            name="lastName"
            required
            autoComplete="family-name"
            accent={accent}
            value={state.lastName}
            onChange={(v) => onChange("lastName", v)}
            onBlur={() => onBlur("lastName")}
            error={errors["lastName"]}
          />
        </div>
        <Field
          label="Address"
          name="address1"
          required
          autoComplete="address-line1"
          accent={accent}
          value={state.address1}
          onChange={(v) => onChange("address1", v)}
          onBlur={() => onBlur("address1")}
          error={errors["address1"]}
        />
        <Field
          label="Apartment, suite, landmark (optional)"
          name="address2"
          autoComplete="address-line2"
          accent={accent}
          value={state.address2}
          onChange={(v) => onChange("address2", v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="City / Town"
            name="city"
            required
            autoComplete="address-level2"
            accent={accent}
            value={state.city}
            onChange={(v) => onChange("city", v)}
            onBlur={() => onBlur("city")}
            error={errors["city"]}
          />
          <Field
            label="Postal code (optional)"
            name="postalCode"
            autoComplete="postal-code"
            accent={accent}
            value={state.postalCode}
            onChange={(v) => onChange("postalCode", v)}
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
        <h2 className="font-display text-lg font-semibold text-ink">
          Order notes (optional)
        </h2>
        <textarea
          name="notes"
          value={state.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Landmarks, delivery instructions, gate code…"
          rows={3}
          className={`w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none ${focusBorder}`}
        />
      </section>
    </>
  );
}

// src/lib/checkout.ts
import type { HttpTypes } from "@medusajs/types";

export const DM_DELIVERY_METHODS = [
  "Pick Up",
  "Home Delivery",
  "Postage",
  "Express Postage",
  "Rodrigues Postage",
] as const;
export type DmDeliveryMethod = (typeof DM_DELIVERY_METHODS)[number];

export const HOME_DELIVERY_FREE_THRESHOLD_MUR = 1500;

export function computeDeliveryCost(
  method: DmDeliveryMethod,
  subtotalMur: number,
): number {
  switch (method) {
    case "Pick Up":
      return 0;
    case "Home Delivery":
      return subtotalMur >= HOME_DELIVERY_FREE_THRESHOLD_MUR ? 0 : 150;
    case "Postage":
      return 70;
    case "Express Postage":
      return 110;
    case "Rodrigues Postage":
      return 120;
  }
}

export const MU_DISTRICTS = [
  "Port Louis",
  "Pamplemousses",
  "Rivière du Rempart",
  "Flacq",
  "Grand Port",
  "Savanne",
  "Plaines Wilhems",
  "Moka",
  "Black River",
  "Rodrigues",
] as const;

export type MUDistrict = (typeof MU_DISTRICTS)[number];

export type CheckoutFormState = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string; // MU district
  postalCode: string;
  billingSameAsShipping: boolean;
  billing: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    postalCode: string;
  };
  shippingOptionId: string | null;
  notes: string;
  createAccount: boolean;
  password: string;
};

export const EMPTY_CHECKOUT_STATE: CheckoutFormState = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  billingSameAsShipping: true,
  billing: {
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
  },
  shippingOptionId: null,
  notes: "",
  createAccount: false,
  password: "",
};

export type FieldErrors = Partial<Record<string, string>>;

export function validateCheckout(state: CheckoutFormState): FieldErrors {
  const errors: FieldErrors = {};
  const required: [keyof CheckoutFormState, string][] = [
    ["email", "Email is required"],
    ["phone", "Phone is required"],
    ["firstName", "First name is required"],
    ["lastName", "Last name is required"],
    ["address1", "Address is required"],
    ["city", "City is required"],
    ["province", "District is required"],
  ];
  for (const [key, msg] of required) {
    if (!String(state[key] ?? "").trim()) errors[key as string] = msg;
  }
  if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    errors.email = "Enter a valid email";
  }
  if (state.phone && state.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a valid phone number";
  }
  if (!state.shippingOptionId) {
    errors.shippingOptionId = "Choose a shipping method";
  }
  if (state.createAccount && state.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  if (!state.billingSameAsShipping) {
    const b = state.billing;
    const billingRequired: [keyof typeof b, string][] = [
      ["firstName", "First name is required"],
      ["lastName", "Last name is required"],
      ["address1", "Address is required"],
      ["city", "City is required"],
      ["province", "District is required"],
    ];
    for (const [key, msg] of billingRequired) {
      if (!String(b[key] ?? "").trim()) errors[`billing.${key}`] = msg;
    }
  }
  return errors;
}

export function pickShippingOption(
  options: HttpTypes.StoreCartShippingOption[] | undefined,
  preferredId: string | null,
): HttpTypes.StoreCartShippingOption | null {
  if (!options || options.length === 0) return null;
  if (preferredId) {
    const found = options.find((o) => o.id === preferredId);
    if (found) return found;
  }
  return options[0];
}

export function toMedusaAddress(
  state: CheckoutFormState,
  kind: "shipping" | "billing",
): HttpTypes.StoreAddAddress {
  const useBilling = kind === "billing" && !state.billingSameAsShipping;
  const src = useBilling ? state.billing : state;
  return {
    first_name: src.firstName,
    last_name: src.lastName,
    address_1: src.address1,
    address_2: src.address2 || undefined,
    city: src.city,
    province: src.province,
    postal_code: src.postalCode || undefined,
    country_code: "mu",
    phone: kind === "shipping" ? state.phone : undefined,
  };
}

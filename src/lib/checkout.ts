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

// Free-over-Rs.1500 applies to the Home/Office Delivery tier. Match by name
// substring so it works for "Home/Office Delivery", "Home Delivery",
// "Livraison", or any future rename.
export function qualifiesForFreeHomeDelivery(
  optionName: string,
  subtotalMur: number,
): boolean {
  if (subtotalMur < HOME_DELIVERY_FREE_THRESHOLD_MUR) return false;
  const n = optionName.toLowerCase();
  return (
    n.includes("home") ||
    n.includes("office") ||
    n.includes("livraison")
  );
}

// Map a Medusa shipping-option name to the canonical DmDeliveryMethod the
// admin reads from order.metadata.delivery_method. Substring-based so renames
// in Medusa admin don't break the link. Order matters: "Express Postage" must
// be checked before plain "Postage".
export function shippingOptionToDeliveryMethod(
  optionName: string | null | undefined,
): DmDeliveryMethod | null {
  if (!optionName) return null;
  const n = optionName.toLowerCase();
  if (n.includes("rodrigues")) return "Rodrigues Postage";
  if (n.includes("express")) return "Express Postage";
  if (n.includes("home") || n.includes("office") || n.includes("livraison")) {
    return "Home Delivery";
  }
  if (n.includes("pick")) return "Pick Up";
  if (n.includes("post") || n.includes("registered")) return "Postage";
  return null;
}

// Delivery date applies to local methods only (in-person handoff or pickup).
// Postage methods ship via courier on Medusa's schedule, so the date input is
// hidden for those.
export function deliveryDateApplies(method: DmDeliveryMethod | null): boolean {
  return method === "Home Delivery" || method === "Pick Up";
}

// MU is UTC+4 fixed (no DST). Build today's MU calendar day from a JS Date.
function muDateParts(d: Date): { year: number; month: number; day: number; hour: number; dow: number } {
  const muMs = d.getTime() + 4 * 60 * 60 * 1000;
  const mu = new Date(muMs);
  return {
    year: mu.getUTCFullYear(),
    month: mu.getUTCMonth(),
    day: mu.getUTCDate(),
    hour: mu.getUTCHours(),
    // 0 = Sunday … 6 = Saturday
    dow: mu.getUTCDay(),
  };
}

function fmtYmd(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function dowOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  // UTC math is fine — same calendar day, just need day-of-week.
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return fmtYmd(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

// Earliest delivery date the customer can pick. Rules:
//  - No Sundays (dow === 0). Push to Monday.
//  - Cutoff 13:00 MU time: before 1pm → today is allowed; from 1pm on → start
//    at tomorrow.
// If the resulting earliest date lands on Sunday, advance to Monday.
export function earliestDeliveryDate(now: Date = new Date()): string {
  const { year, month, day, hour } = muDateParts(now);
  const todayYmd = fmtYmd(year, month, day);
  let candidate = hour < 13 ? todayYmd : addDaysYmd(todayYmd, 1);
  if (dowOfYmd(candidate) === 0) candidate = addDaysYmd(candidate, 1);
  return candidate;
}

// True when the given yyyy-mm-dd is a valid delivery date right now.
export function isValidDeliveryDate(
  ymd: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  if (dowOfYmd(ymd) === 0) return false;
  return ymd >= earliestDeliveryDate(now);
}

export const VAT_RATE_PERCENT = 15;

export function computeVatAmount(totalMur: number): number {
  return Math.round((totalMur * VAT_RATE_PERCENT) / (100 + VAT_RATE_PERCENT));
}

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
      return 100;
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
  // yyyy-mm-dd. Optional. Only collected when the selected shipping option is
  // Home Delivery or Pick Up; cleared on switch to a Postage method.
  deliveryDate: string;
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
  deliveryDate: "",
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
    // District field removed from checkout UI; send "N/A" so any backend
    // workflow that still reads `province` gets a non-empty value.
    province: src.province || "N/A",
    postal_code: src.postalCode || undefined,
    country_code: "mu",
    phone: kind === "shipping" ? state.phone : undefined,
  };
}

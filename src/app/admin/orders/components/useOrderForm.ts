"use client";

import { useMemo, useState } from "react";
import {
  computeDeliveryCost,
  type DmDeliveryMethod,
} from "@/lib/checkout";
import {
  ADJUSTMENT_TITLE,
  DISCOUNT_TITLE,
  isAutoLine,
} from "@/lib/admin-order-lines";
import type { CreateDmOrderInput, OrderRow } from "@/lib/admin-orders";
import { getEffectiveStatus } from "@/lib/admin-orders-shared";
import type { SelectedVariant } from "./StockChecker";

export const PAYMENT_METHODS = [
  "Cash",
  "MCB Juice",
  "Bank Transfer",
  "Card",
  "Other",
] as const;

export const POINTS_OF_SALE = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "In Store",
  "Other",
] as const;

export const SALE_TYPES = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "deposit", label: "Deposit" },
] as const;

export type SaleType = (typeof SALE_TYPES)[number]["value"];

export type LineRow = {
  rid: string;
  kind: "variant" | "manual";
  variantId?: string;
  sku?: string | null;
  title: string;
  quantity: number;
  unitPriceMur: number;
};

export type FormState = {
  // 1. Delivery
  deliveryDate: string;
  deliveryMethod: DmDeliveryMethod;
  // 2-3. Buyer
  buyerName: string;
  pseudo: string;
  // 4-6. Address
  city: string;
  address2: string; // address details
  phone: string;
  email: string;
  // products via items
  customNotes: string;
  // manual via state.manual
  // money
  deliveryFee: string; // empty = use auto; else override
  discountMur: string;
  totalOverride: string;
  // payment / status
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  pointOfSale: (typeof POINTS_OF_SALE)[number];
  saleType: SaleType;
  status: "" | "ready" | "delivered" | "cancelled";
  trackingNumber: string;
};

export type OrderFormFieldKey = keyof FormState;

export const EMPTY: FormState = {
  deliveryDate: "",
  deliveryMethod: "Pick Up",
  buyerName: "",
  pseudo: "",
  city: "",
  address2: "",
  phone: "",
  email: "",
  customNotes: "",
  deliveryFee: "",
  discountMur: "",
  totalOverride: "",
  paymentMethod: "Cash",
  pointOfSale: "Instagram",
  saleType: "paid",
  status: "",
  trackingNumber: "",
};

export function rid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Translate an OrderRow into a partial FormState suitable for `useOrderForm`.
 * Used by EditableRow + the mobile drawer when hydrating an existing order
 * for inline editing. Items are NOT included here — callers seed `setItems`
 * separately so they can filter out auto-appended Delivery/Discount/Adjustment
 * lines.
 *
 * Money fields (deliveryFee / discountMur / totalOverride) are derived from
 * the order's auto-appended lines so heavy edits can re-populate them. This
 * lets the operator see and edit the current values; the classify/diff in
 * `classifyOrderEdit` uses these populated inputs to detect "no change"
 * correctly.
 */
export function hydrateOrderToForm(order: OrderRow): Partial<FormState> {
  const eff = getEffectiveStatus(order);
  const status: FormState["status"] = eff === "preparation" ? "" : eff;
  const discountLine = order.items.find((it) => it.title === DISCOUNT_TITLE);
  const adjustmentLine = order.items.find((it) => it.title === ADJUSTMENT_TITLE);
  const realLines = order.items.filter((it) => !isAutoLine(it.title));
  const realSubtotal = realLines.reduce(
    (s, it) => s + it.quantity * it.unitPriceMur,
    0,
  );
  // Delivery fee comes from OrderRow.deliveryFeeMur — populated from
  // shipping_methods on new orders, falls back to legacy "Delivery — *" line
  // item amount for orders created before the shipping_methods migration.
  const deliveryFeeMur = order.deliveryFeeMur ?? 0;
  const discountMur = discountLine ? -discountLine.unitPriceMur : 0;
  // Detect override by line existence (not adjustment value): a stored
  // adjustment line is the canonical signal that the operator overrode the
  // total — even if it later rounded to zero, the override intent persists.
  const totalOverrideMur = adjustmentLine
    ? realSubtotal - discountMur + deliveryFeeMur + adjustmentLine.unitPriceMur
    : null;
  // Address Details / city fallback unwind: createDmOrder writes city into
  // address_1 when the operator left Address Details empty. If we hydrate
  // that back into the form's address2 field as-is, a later city edit would
  // leave address_1 stuck on the OLD city. So when the stored value equals
  // the city, treat it as a fallback and show the field empty — a city edit
  // then correctly re-applies the fallback with the new city. False-positive
  // risk (operator legitimately typed the city as the street) is acceptable
  // since saving with the field empty produces the same result anyway.
  const addressIsCityFallback =
    !!order.addressDetails &&
    !!order.city &&
    order.addressDetails.trim() === order.city.trim();
  return {
    deliveryDate: order.deliveryDate ?? "",
    deliveryMethod: (order.deliveryMethod ?? "Pick Up") as DmDeliveryMethod,
    buyerName: order.buyerName,
    pseudo: order.pseudo ?? "",
    city: order.city ?? "",
    address2: addressIsCityFallback ? "" : (order.addressDetails ?? ""),
    phone: order.phone ?? "",
    email: order.email ?? "",
    customNotes: order.customNotes ?? "",
    paymentMethod: (order.paymentMethod ??
      "Cash") as FormState["paymentMethod"],
    pointOfSale: (order.pointOfSale ??
      "Instagram") as FormState["pointOfSale"],
    saleType: (order.saleType ?? "paid") as SaleType,
    status,
    trackingNumber: order.trackingNumber ?? "",
    deliveryFee: String(deliveryFeeMur),
    discountMur: discountMur > 0 ? String(discountMur) : "",
    totalOverride: totalOverrideMur != null ? String(totalOverrideMur) : "",
  };
}

export function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 12;
}

export type UseOrderFormResult = {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  items: LineRow[];
  setItems: React.Dispatch<React.SetStateAction<LineRow[]>>;
  manual: { title: string; price: string };
  setManual: React.Dispatch<React.SetStateAction<{ title: string; price: string }>>;
  touched: Set<string>;
  markTouched: (...keys: string[]) => void;
  errorBanner: string | null;
  setErrorBanner: (m: string | null) => void;
  successBanner: string | null;
  setSuccessBanner: (m: string | null) => void;
  // computed
  itemsSubtotal: number;
  manualLineTotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  autoDeliveryCost: number;
  deliveryCost: number;
  computedTotal: number;
  finalTotal: number;
  adjustment: number;
  overrideNum: number | null;
  // helpers
  addVariant: (v: SelectedVariant) => void;
  reset: () => void;
  showErr: (k: string) => string | undefined;
  fieldErrors: Record<string, string>;
  isValid: boolean;
  toCreateInput: () => CreateDmOrderInput;
};

export function useOrderForm(initial?: Partial<FormState>): UseOrderFormResult {
  const initialState: FormState = { ...EMPTY, ...(initial ?? {}) };
  const [state, setState] = useState<FormState>(initialState);
  const [items, setItems] = useState<LineRow[]>([]);
  const [manual, setManual] = useState<{ title: string; price: string }>({
    title: "",
    price: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  function markTouched(...keys: string[]) {
    setTouched((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
  }

  function addVariant(v: SelectedVariant) {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.kind === "variant" && i.variantId === v.variantId,
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      const title = [v.productTitle, v.variantTitle].filter(Boolean).join(" — ");
      return [
        ...prev,
        {
          rid: rid(),
          kind: "variant",
          variantId: v.variantId,
          sku: v.sku,
          title,
          quantity: 1,
          unitPriceMur: v.priceMur ?? 0,
        },
      ];
    });
    setSuccessBanner(null);
  }

  const itemsSubtotal = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unitPriceMur, 0),
    [items],
  );
  const manualPrice = Number.parseInt(manual.price || "0", 10) || 0;
  const manualLineTotal = manual.title.trim() && manualPrice > 0 ? manualPrice : 0;
  const discount = Math.max(0, Number.parseInt(state.discountMur || "0", 10) || 0);
  const subtotalAfterDiscount = itemsSubtotal + manualLineTotal - discount;
  const autoDeliveryCost = computeDeliveryCost(
    state.deliveryMethod,
    subtotalAfterDiscount,
  );
  const deliveryFeeOverride = state.deliveryFee.trim();
  const deliveryCost =
    deliveryFeeOverride === ""
      ? autoDeliveryCost
      : Math.max(0, Number.parseInt(deliveryFeeOverride, 10) || 0);
  const computedTotal = subtotalAfterDiscount + deliveryCost;
  const overrideRaw = state.totalOverride.trim();
  const overrideNum = overrideRaw === "" ? null : Number.parseInt(overrideRaw, 10);
  const adjustment =
    overrideNum != null && Number.isFinite(overrideNum)
      ? overrideNum - computedTotal
      : 0;
  const finalTotal =
    overrideNum != null && Number.isFinite(overrideNum)
      ? overrideNum
      : computedTotal;

  const fieldErrors: Record<string, string> = {};
  if (!state.buyerName.trim()) fieldErrors.buyerName = "Buyer name is required";
  if (!isPhoneValid(state.phone)) fieldErrors.phone = "Enter a valid phone number";
  if (!state.city.trim()) fieldErrors.city = "City is required";
  const hasItems = items.length > 0 || manualLineTotal > 0;
  if (!hasItems) fieldErrors.items = "Add at least one product (catalog or manual)";

  const showErr = (k: string) =>
    touched.has(k) ? fieldErrors[k] : undefined;

  const isValid = Object.keys(fieldErrors).length === 0;

  function reset() {
    setState(EMPTY);
    setItems([]);
    setManual({ title: "", price: "" });
    setTouched(new Set());
  }

  function toCreateInput(): CreateDmOrderInput {
    const trackingApplies =
      state.deliveryMethod === "Postage" ||
      state.deliveryMethod === "Express Postage";
    return {
      buyerFirstName: state.buyerName.trim(),
      buyerLastName: undefined,
      phone: state.phone.trim(),
      address1: state.address2.trim() || state.city.trim(),
      address2: undefined,
      city: state.city.trim(),
      email: state.email.trim() || undefined,
      deliveryMethod: state.deliveryMethod,
      deliveryDate: state.deliveryDate || undefined,
      deliveryFeeMur: deliveryCost,
      discountMur: discount,
      totalOverrideMur:
        overrideNum != null && Number.isFinite(overrideNum) ? overrideNum : null,
      paymentMethod: state.paymentMethod,
      pointOfSale: state.pointOfSale,
      saleType: state.saleType,
      customNotes: state.customNotes.trim() || undefined,
      pseudo: state.pseudo.trim() || undefined,
      trackingNumber: trackingApplies
        ? state.trackingNumber.trim() || undefined
        : undefined,
      status: state.status || undefined,
      items: [
        ...items.map((it) =>
          it.kind === "variant"
            ? ({
                kind: "variant" as const,
                variantId: it.variantId!,
                quantity: it.quantity,
                unitPriceMur: it.unitPriceMur,
                title: it.title,
              })
            : ({
                kind: "manual" as const,
                title: it.title,
                quantity: it.quantity,
                unitPriceMur: it.unitPriceMur,
              }),
        ),
        ...(manualLineTotal > 0
          ? [
              {
                kind: "manual" as const,
                title: manual.title.trim(),
                quantity: 1,
                unitPriceMur: manualPrice,
              },
            ]
          : []),
      ],
    };
  }

  return {
    state,
    set,
    items,
    setItems,
    manual,
    setManual,
    touched,
    markTouched,
    errorBanner,
    setErrorBanner,
    successBanner,
    setSuccessBanner,
    itemsSubtotal,
    manualLineTotal,
    discount,
    subtotalAfterDiscount,
    autoDeliveryCost,
    deliveryCost,
    computedTotal,
    finalTotal,
    adjustment,
    overrideNum,
    addVariant,
    reset,
    showErr,
    fieldErrors,
    isValid,
    toCreateInput,
  };
}

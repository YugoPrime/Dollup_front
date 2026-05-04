"use client";

import { useMemo, useState } from "react";
import {
  computeDeliveryCost,
  type DmDeliveryMethod,
} from "@/lib/checkout";
import type { CreateDmOrderInput } from "@/lib/admin-orders";
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
  buyerFirstName: string;
  buyerLastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  district: string;
  email: string;
  deliveryMethod: DmDeliveryMethod;
  deliveryDate: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  pointOfSale: (typeof POINTS_OF_SALE)[number];
  saleType: SaleType;
  discountMur: string;
  totalOverride: string;
  notes: string;
};

export type OrderFormFieldKey = keyof FormState;

export const EMPTY: FormState = {
  buyerFirstName: "",
  buyerLastName: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  district: "",
  email: "",
  deliveryMethod: "Pick Up",
  deliveryDate: "",
  paymentMethod: "Cash",
  pointOfSale: "Instagram",
  saleType: "paid",
  discountMur: "",
  totalOverride: "",
  notes: "",
};

export function rid() {
  return Math.random().toString(36).slice(2, 9);
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
  const deliveryCost = computeDeliveryCost(state.deliveryMethod, subtotalAfterDiscount);
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
  if (!state.buyerFirstName.trim()) fieldErrors.buyerFirstName = "Buyer name is required";
  if (!isPhoneValid(state.phone)) fieldErrors.phone = "Enter a valid phone number";
  if (!state.address1.trim()) fieldErrors.address1 = "Address is required";
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
    return {
      buyerFirstName: state.buyerFirstName.trim(),
      buyerLastName: state.buyerLastName.trim() || undefined,
      phone: state.phone.trim(),
      address1: state.address1.trim(),
      address2: state.address2.trim() || undefined,
      city: state.city.trim() || undefined,
      district: state.district || undefined,
      email: state.email.trim() || undefined,
      deliveryMethod: state.deliveryMethod,
      deliveryDate: state.deliveryDate || undefined,
      discountMur: discount,
      totalOverrideMur:
        overrideNum != null && Number.isFinite(overrideNum) ? overrideNum : null,
      paymentMethod: state.paymentMethod,
      pointOfSale: state.pointOfSale,
      saleType: state.saleType,
      notes: state.notes.trim() || undefined,
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

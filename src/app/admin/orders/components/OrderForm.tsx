"use client";

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
  forwardRef,
} from "react";
import { createDmOrderAction, searchVariantsAction } from "../actions";
import {
  DM_DELIVERY_METHODS,
  MU_DISTRICTS,
  computeDeliveryCost,
  type DmDeliveryMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import type { CreateDmOrderInput } from "@/lib/admin-orders";
import type { SelectedVariant } from "./StockChecker";

const PAYMENT_METHODS = [
  "Cash",
  "MCB Juice",
  "Bank Transfer",
  "Card",
  "Other",
] as const;
const POINTS_OF_SALE = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "In Store",
  "Other",
] as const;
const SALE_TYPES = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "deposit", label: "Deposit" },
] as const;
type SaleType = (typeof SALE_TYPES)[number]["value"];

type LineRow = {
  rid: string;
  kind: "variant" | "manual";
  variantId?: string;
  sku?: string | null;
  title: string;
  quantity: number;
  unitPriceMur: number;
};

type FormState = {
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

const EMPTY: FormState = {
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

function rid() {
  return Math.random().toString(36).slice(2, 9);
}

export type OrderFormRef = {
  addVariant: (v: SelectedVariant) => void;
};

function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 12;
}

export const OrderForm = forwardRef<OrderFormRef>(function OrderForm(_, ref) {
  const [state, setState] = useState<FormState>(EMPTY);
  const [items, setItems] = useState<LineRow[]>([]);
  const [manual, setManual] = useState<{ title: string; price: string }>({
    title: "",
    price: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  useImperativeHandle(ref, () => ({
    addVariant(v) {
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
    },
  }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

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
  const finalTotal = overrideNum != null && Number.isFinite(overrideNum)
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

  function markTouched(...keys: string[]) {
    setTouched((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
  }

  async function handleSubmit() {
    setErrorBanner(null);
    setSuccessBanner(null);
    markTouched(
      "buyerFirstName",
      "phone",
      "address1",
      "items",
    );
    if (Object.keys(fieldErrors).length > 0) return;

    const payload: CreateDmOrderInput = {
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
      totalOverrideMur: overrideNum != null && Number.isFinite(overrideNum) ? overrideNum : null,
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

    startTransition(async () => {
      const res = await createDmOrderAction(payload);
      if (res.ok) {
        setSuccessBanner(`Order #${res.displayId} saved.`);
        setState(EMPTY);
        setItems([]);
        setManual({ title: "", price: "" });
        setTouched(new Set());
      } else {
        setErrorBanner(res.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">New order</h2>
      </div>
      {successBanner && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-blush-300 bg-blush-100/60 px-3 py-1.5 text-sm text-ink"
        >
          {successBanner}
        </p>
      )}
      {errorBanner && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          {errorBanner}
        </p>
      )}

      <SectionLabel>Buyer</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Field
          label="First name"
          value={state.buyerFirstName}
          onChange={(v) => set("buyerFirstName", v)}
          onBlur={() => markTouched("buyerFirstName")}
          error={showErr("buyerFirstName")}
          required
        />
        <Field
          label="Last name"
          value={state.buyerLastName}
          onChange={(v) => set("buyerLastName", v)}
        />
        <Field
          label="Phone"
          type="tel"
          inputMode="numeric"
          value={state.phone}
          onChange={(v) => set("phone", v)}
          onBlur={() => markTouched("phone")}
          error={showErr("phone")}
          required
        />
        <Field
          label="Email"
          type="email"
          value={state.email}
          onChange={(v) => set("email", v)}
        />
      </div>

      <SectionLabel className="mt-3">Address</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Field
          label="Address line"
          value={state.address1}
          onChange={(v) => set("address1", v)}
          onBlur={() => markTouched("address1")}
          error={showErr("address1")}
          required
          className="md:col-span-2"
        />
        <Field
          label="Details"
          value={state.address2}
          onChange={(v) => set("address2", v)}
        />
        <Field
          label="City / village"
          value={state.city}
          onChange={(v) => set("city", v)}
        />
        <Select
          label="District"
          value={state.district}
          onChange={(v) => set("district", v)}
          options={[{ value: "", label: "—" }, ...MU_DISTRICTS.map((d) => ({ value: d, label: d }))]}
        />
      </div>

      <SectionLabel className="mt-3">Products</SectionLabel>
      <div className="mt-1.5">
        <ProductPicker
          onPick={(v) => {
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
          }}
        />
        {items.length === 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            No products yet — search above or use the stock checker.
          </p>
        )}
        {items.length > 0 && (
          <ul className="mt-3 divide-y divide-blush-300/60 rounded-lg border border-blush-300/60">
            {items.map((it) => (
              <li key={it.rid} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{it.title}</p>
                  <p className="font-mono text-[11px] text-ink-muted">
                    {it.sku ?? (it.kind === "manual" ? "Manual" : "—")}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => {
                    const q = Math.max(1, Number.parseInt(e.target.value || "1", 10));
                    setItems((prev) =>
                      prev.map((p) => (p.rid === it.rid ? { ...p, quantity: q } : p)),
                    );
                  }}
                  className="w-14 rounded border-[1.5px] border-blush-400 bg-cream px-2 py-1 text-center text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={it.unitPriceMur}
                  onChange={(e) => {
                    const p = Math.max(0, Number.parseInt(e.target.value || "0", 10));
                    setItems((prev) =>
                      prev.map((x) => (x.rid === it.rid ? { ...x, unitPriceMur: p } : x)),
                    );
                  }}
                  className="w-20 rounded border-[1.5px] border-blush-400 bg-cream px-2 py-1 text-right text-sm"
                />
                <span className="w-20 text-right text-sm font-semibold text-ink">
                  {formatPrice(it.quantity * it.unitPriceMur, "mur")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((p) => p.rid !== it.rid))
                  }
                  className="text-coral-700 transition hover:text-coral-500"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {showErr("items") && (
          <p className="mt-2 text-xs text-coral-700">{showErr("items")}</p>
        )}
      </div>

      <SectionLabel className="mt-3">Manual product</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        <Field
          label="Title"
          value={manual.title}
          onChange={(v) => setManual((m) => ({ ...m, title: v }))}
          className="sm:col-span-2"
        />
        <Field
          label="Price (MUR)"
          type="number"
          inputMode="numeric"
          value={manual.price}
          onChange={(v) => setManual((m) => ({ ...m, price: v }))}
        />
      </div>

      <SectionLabel className="mt-3">Delivery & payment</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3 md:grid-cols-6">
        <Select
          label="Delivery"
          value={state.deliveryMethod}
          onChange={(v) => set("deliveryMethod", v as DmDeliveryMethod)}
          options={DM_DELIVERY_METHODS.map((m) => ({ value: m, label: m }))}
          className="md:col-span-2"
        />
        <Field
          label="Delivery date"
          type="date"
          value={state.deliveryDate}
          onChange={(v) => set("deliveryDate", v)}
        />
        <Field
          label="Discount"
          type="number"
          inputMode="numeric"
          value={state.discountMur}
          onChange={(v) => set("discountMur", v)}
        />
        <Select
          label="Payment"
          value={state.paymentMethod}
          onChange={(v) => set("paymentMethod", v as FormState["paymentMethod"])}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        />
        <Select
          label="Point of sale"
          value={state.pointOfSale}
          onChange={(v) => set("pointOfSale", v as FormState["pointOfSale"])}
          options={POINTS_OF_SALE.map((m) => ({ value: m, label: m }))}
        />
        <Select
          label="Sale type"
          value={state.saleType}
          onChange={(v) => set("saleType", v as SaleType)}
          options={SALE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
          className="md:col-span-2"
        />
        <label className="block md:col-span-4">
          <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Notes
          </span>
          <input
            type="text"
            value={state.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="optional internal note"
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-blush-300/60 bg-cream/60 p-3 text-sm md:flex-row md:items-end md:gap-5">
        <div className="flex flex-1 flex-col gap-1">
          <Row label="Items subtotal">{formatPrice(itemsSubtotal + manualLineTotal, "mur")}</Row>
          {discount > 0 && (
            <Row label="Discount">- {formatPrice(discount, "mur")}</Row>
          )}
          <Row label={`Delivery (${state.deliveryMethod})`}>
            {deliveryCost === 0 ? "Free" : formatPrice(deliveryCost, "mur")}
          </Row>
          <Row label="Computed total">{formatPrice(computedTotal, "mur")}</Row>
          {adjustment !== 0 && (
            <Row label="Adjustment line">
              {adjustment > 0 ? "+" : ""}
              {formatPrice(adjustment, "mur")}
            </Row>
          )}
        </div>
        <div className="flex flex-shrink-0 items-end gap-3">
          <label className="block">
            <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Total override
            </span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(computedTotal)}
              value={state.totalOverride}
              onChange={(e) => set("totalOverride", e.target.value)}
              className="w-28 rounded border-[1.5px] border-blush-400 bg-white px-2 py-1.5 text-right text-sm"
            />
          </label>
          <div className="flex flex-col items-end">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Final total
            </span>
            <span className="font-display text-2xl font-bold text-ink">
              {formatPrice(finalTotal, "mur")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-coral-500 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </section>
  );
});

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted ${
        className ?? ""
      }`}
    >
      {children}
    </h3>
  );
}

function Row({
  label,
  children,
  emphasize,
}: {
  label: string;
  children: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`font-sans text-xs uppercase tracking-wider ${
          emphasize ? "font-bold text-ink" : "text-ink-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${
          emphasize ? "font-bold text-ink" : "font-semibold text-ink"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  required?: boolean;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-md border-[1.5px] bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500 ${
          error ? "border-coral-500" : "border-blush-400"
        }`}
      />
      {error && (
        <span className="mt-0.5 block font-sans text-[11px] text-coral-700">{error}</span>
      )}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductPicker({
  onPick,
}: {
  onPick: (v: SelectedVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SelectedVariant[]>([]);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const reqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchVariantsAction(q, { availableOnly: true });
        if (reqId !== reqIdRef.current) return;
        setHits(
          res.map((v) => ({
            variantId: v.variantId,
            sku: v.sku,
            variantTitle: v.variantTitle,
            productTitle: v.productTitle,
            productThumbnail: v.productThumbnail,
            priceMur: v.priceMur,
          })),
        );
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative mt-2">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Add product (only in-stock variants shown)…"
        inputMode="search"
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-coral-500"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-blush-400 bg-white shadow-lg">
          {pending && (
            <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>
          )}
          {!pending && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-muted">
              No in-stock matches.
            </p>
          )}
          {hits.map((v) => (
            <button
              key={v.variantId}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(v);
                setQuery("");
                setHits([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blush-100"
            >
              {v.productThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.productThumbnail} alt="" className="h-9 w-9 rounded object-cover" />
              ) : (
                <div className="h-9 w-9 rounded bg-blush-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{v.productTitle}</p>
                <p className="font-mono text-[11px] text-ink-muted">
                  {v.sku ?? "—"} · {v.variantTitle ?? "Default"}
                </p>
              </div>
              {v.priceMur != null && (
                <span className="text-xs font-semibold text-ink">
                  {formatPrice(v.priceMur, "mur")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

# DM Admin Orders v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/orders` as a Google Sheet–style hybrid layout (desktop sheet + mobile stacked) with inline edit, customer search/autofill, date filter, VAT breakdown, conditional Tracking field, and District removed from admin UI.

**Architecture:** Split the current monolithic `OrderForm.tsx` into a shared `useOrderForm` hook plus three rendering layers (`NewOrderRow` for desktop entry, `OrderRowFields` for inline edit cells, `OrderEditDrawer` for mobile/heavy-edit fallback). Add `searchOrders` + `searchCustomers` + `updateOrderLight` + `editOrderHeavy` to the admin lib. Replace `RecentOrders` with `RecentOrdersSheet` that supports inline edit and `replaces_order_id` filtering. Keep auth/proxy/session unchanged.

**Tech Stack:** Next.js 16.2.4 (App Router, Server Components, Server Actions), React 19.2.4, Tailwind v4, `@medusajs/js-sdk@2.14.1`. No tests — verification is `npx tsc --noEmit` + `npm run build` + manual browser smoke (project convention from `CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-05-05-dm-admin-orders-v2-design.md`

**Working branch:** `master` (project convention — solo, no PR review). Commit per slice. Push only after all 9 slices verified.

---

## File index

**New (8):**
- `src/lib/use-media-query.ts`
- `src/app/admin/orders/components/useOrderForm.ts`
- `src/app/admin/orders/components/NewOrderRow.tsx`
- `src/app/admin/orders/components/OrderRowFields.tsx`
- `src/app/admin/orders/components/OrderEditDrawer.tsx`
- `src/app/admin/orders/components/CustomerSearch.tsx`
- `src/app/admin/orders/components/DateFilter.tsx`
- `src/app/admin/orders/components/VatBreakdown.tsx`

**Renamed + rewritten:**
- `src/app/admin/orders/components/RecentOrders.tsx` → `RecentOrdersSheet.tsx`

**Rewritten in place:**
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/components/AdminOrdersClient.tsx`

**Extended:**
- `src/lib/admin-orders.ts`
- `src/app/admin/orders/actions.ts`

**Deleted:**
- `src/app/admin/orders/components/OrderForm.tsx`
- `src/app/admin/orders/components/OrderRowActions.tsx`

---

## Slice 1 — Refactor `OrderForm.tsx` into 4 files (parity, no new behavior)

**Goal:** Replace the monolithic `OrderForm.tsx` with `useOrderForm` + `OrderRowFields` + `NewOrderRow` + `OrderEditDrawer`. UI looks and works identically. Foundation for slices 2-9.

**Files:**
- Create: `src/app/admin/orders/components/useOrderForm.ts`
- Create: `src/app/admin/orders/components/OrderRowFields.tsx`
- Create: `src/app/admin/orders/components/NewOrderRow.tsx`
- Create: `src/app/admin/orders/components/OrderEditDrawer.tsx`
- Modify: `src/app/admin/orders/components/AdminOrdersClient.tsx`
- Delete: `src/app/admin/orders/components/OrderForm.tsx`

### Task 1.1: Create `useOrderForm.ts` hook

- [ ] **Step 1: Create the hook file**

`src/app/admin/orders/components/useOrderForm.ts` — extract all form state from current `OrderForm.tsx` into a hook. Move:
- The `FormState`, `LineRow`, `EMPTY` constants (lines 23-94 of current `OrderForm.tsx`)
- `useState` for `state`, `items`, `manual`, `touched`, `errorBanner`, `successBanner`
- The `set`, `markTouched`, `rid` helpers
- The computed values: `itemsSubtotal`, `manualLineTotal`, `discount`, `subtotalAfterDiscount`, `deliveryCost`, `computedTotal`, `overrideNum`, `adjustment`, `finalTotal`
- The `fieldErrors` derivation
- The `addVariant(v)` function (currently inside `useImperativeHandle`)

The hook returns:
```ts
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

export function useOrderForm(initial?: Partial<FormState>): UseOrderFormResult { ... }
```

`toCreateInput()` builds the `CreateDmOrderInput` payload (lines 199-244 of current `OrderForm.tsx`). `reset()` sets state back to `EMPTY`, clears items/manual/touched.

Also export the constants for other components: `PAYMENT_METHODS`, `POINTS_OF_SALE`, `SALE_TYPES`, `EMPTY`, types `FormState`, `LineRow`, `SaleType`, `OrderFormFieldKey`.

Do NOT export render-related helpers (`Field`, `Select`, etc.) — those move to `OrderRowFields.tsx`.

- [ ] **Step 2: Verify nothing imports it yet**

Run: `npx tsc --noEmit`
Expected: clean (the new hook file is self-contained, isn't imported anywhere yet)

### Task 1.2: Create `OrderRowFields.tsx` (presentation primitives + cells)

- [ ] **Step 1: Create the file**

`src/app/admin/orders/components/OrderRowFields.tsx`. Move the helper components from current `OrderForm.tsx`:
- `Field` (lines 606-648)
- `Select` (lines 650-681)
- `SectionLabel` (lines 559-575)
- `Row` (lines 577-604)
- `ProductPicker` (lines 683-780)

Mark `"use client"` at top. Export them all individually.

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean (still no consumers)

### Task 1.3: Create `NewOrderRow.tsx` (the entry-row form, current visual layout)

- [ ] **Step 1: Create the file**

`src/app/admin/orders/components/NewOrderRow.tsx`. This replaces the `OrderForm` body (lines 260-555 of current `OrderForm.tsx`). It:
- Takes a ref-like prop OR exposes `addVariant` via a `useImperativeHandle` (preserve the existing API surface so `AdminOrdersClient` doesn't break)
- Internally calls `useOrderForm()`
- Renders the same JSX as the current `OrderForm` body (Buyer / Address / Products / Manual / Delivery & payment / totals + save button)
- Uses `Field`, `Select`, `SectionLabel`, `Row`, `ProductPicker` from `OrderRowFields.tsx`
- Submits via `createDmOrderAction` (same as today) using `form.toCreateInput()`

Export type:
```ts
export type NewOrderRowRef = { addVariant: (v: SelectedVariant) => void };
export const NewOrderRow = forwardRef<NewOrderRowRef>(function NewOrderRow(_, ref) { ... });
```

This is a literal extraction. Visual layout, classes, validation rules — all unchanged.

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 1.4: Create `OrderEditDrawer.tsx` stub

- [ ] **Step 1: Create the file as a no-op stub**

`src/app/admin/orders/components/OrderEditDrawer.tsx`:
```tsx
"use client";

import type { OrderRow } from "@/lib/admin-orders";

export function OrderEditDrawer(_: {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Filled in slices 3 + 4. Stub for now to keep imports stable.
  return null;
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 1.5: Swap `AdminOrdersClient` to use `NewOrderRow`

- [ ] **Step 1: Update imports + ref type**

In `src/app/admin/orders/components/AdminOrdersClient.tsx`:
```tsx
"use client";

import { useRef } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";

export function AdminOrdersClient() {
  const formRef = useRef<NewOrderRowRef | null>(null);

  function handlePick(v: SelectedVariant) {
    formRef.current?.addVariant(v);
    if (typeof window !== "undefined") {
      const el = document.getElementById("dm-order-form");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 bg-cream/85 px-4 pb-2 pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <StockChecker onPickVariant={handlePick} />
      </div>
      <div id="dm-order-form">
        <NewOrderRow ref={formRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete `OrderForm.tsx`**

```bash
rm "src/app/admin/orders/components/OrderForm.tsx"
```

(On Windows PowerShell: `Remove-Item "src\app\admin\orders\components\OrderForm.tsx"`)

- [ ] **Step 3: tsc + build**

Run: `npx tsc --noEmit`
Expected: clean
Run: `npm run build`
Expected: clean

- [ ] **Step 4: Manual smoke**

Boot dev server: `npm run dev`
- Visit `http://localhost:3000/admin/login` → login with `ADMIN_PASSWORD`
- `/admin/orders` loads, looks identical to before
- Stock checker search works, "Add" button still pushes a variant into the form
- Fill name + phone + address + pick a variant + delivery method, click Save
- Toast "Order #N saved" appears
- Recent Orders shows the new order

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/orders/components/useOrderForm.ts \
        src/app/admin/orders/components/OrderRowFields.tsx \
        src/app/admin/orders/components/NewOrderRow.tsx \
        src/app/admin/orders/components/OrderEditDrawer.tsx \
        src/app/admin/orders/components/AdminOrdersClient.tsx
git rm src/app/admin/orders/components/OrderForm.tsx
git commit -m "refactor(admin): split OrderForm into useOrderForm + 3 components (parity)"
```

---

## Slice 2 — New fields + field reorder + remove District from admin

**Goal:** Reorder fields per spec, add: Pseudo (collapsible), Custom Notes (visible), Manual Product (collapsible), VAT breakdown (conditional on Juice), Tracking (conditional on Postage/Express). Remove District field from admin UI. New metadata fields persisted on order create.

**Spec section to follow:** "Fields" table (20 fields, exact order, exact storage paths)

### Task 2.1: Extend `useOrderForm` types + state

- [ ] **Step 1: Add new fields to `FormState`**

In `useOrderForm.ts`, replace the `FormState` type:

```ts
export type FormState = {
  // 1. Delivery
  deliveryDate: string;
  deliveryMethod: DmDeliveryMethod;
  // 2-3. Buyer
  buyerName: string;        // single field — used as full name
  pseudo: string;           // hidden by default
  // 4-6. Address
  city: string;
  address2: string;         // "Address details" — optional
  phone: string;
  email: string;            // hidden by default
  // 7. Products handled via `items`
  customNotes: string;      // visible textarea below products
  // 8. Manual product handled via `manual`
  // 9. Money
  deliveryFee: string;      // empty string = use auto value; non-empty = override
  discountMur: string;
  totalOverride: string;
  // 10. Payment / status
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  pointOfSale: (typeof POINTS_OF_SALE)[number];
  saleType: SaleType;
  status: "" | "delivered" | "cancelled";
  // 11. Conditional
  trackingNumber: string;   // only shown when Postage/Express Postage
};
```

Update `EMPTY` accordingly. Drop `buyerFirstName`, `buyerLastName`, `address1`, `district`, `notes` (replaced by `buyerName`, `address2`, `customNotes`).

The form no longer collects `address1` separately — `address2` (renamed mentally to "Address details") becomes the primary address line on the order. Map it to `shipping_address.address_1` on submit (existing schema). The current standalone `city` field stays.

- [ ] **Step 2: Update field validation**

```ts
const fieldErrors: Record<string, string> = {};
if (!state.buyerName.trim()) fieldErrors.buyerName = "Name is required";
if (!isPhoneValid(state.phone)) fieldErrors.phone = "Enter a valid phone";
if (!state.city.trim()) fieldErrors.city = "City is required";
const hasItems = items.length > 0 || manualLineTotal > 0;
if (!hasItems) fieldErrors.items = "Add at least one product";
```

(Address details is optional. District removed entirely.)

- [ ] **Step 3: Update `deliveryCost` to honor manual override**

```ts
const autoDeliveryCost = computeDeliveryCost(state.deliveryMethod, subtotalAfterDiscount);
const deliveryFeeOverride = state.deliveryFee.trim();
const deliveryCost =
  deliveryFeeOverride === ""
    ? autoDeliveryCost
    : Math.max(0, Number.parseInt(deliveryFeeOverride, 10) || 0);
```

- [ ] **Step 4: Update `toCreateInput()` to send new fields**

```ts
function toCreateInput(): CreateDmOrderInput {
  return {
    buyerFirstName: state.buyerName.trim(),  // map single field → first_name
    buyerLastName: undefined,
    phone: state.phone.trim(),
    address1: state.address2.trim() || state.city.trim(),  // primary line
    address2: undefined,                                    // we no longer use 2-line addresses
    city: state.city.trim(),
    district: undefined,                                    // removed
    email: state.email.trim() || undefined,
    deliveryMethod: state.deliveryMethod,
    deliveryDate: state.deliveryDate || undefined,
    deliveryFeeMur: deliveryCost,                           // NEW — pass computed (auto or override)
    discountMur: discount,
    totalOverrideMur: overrideNum != null && Number.isFinite(overrideNum) ? overrideNum : null,
    paymentMethod: state.paymentMethod,
    pointOfSale: state.pointOfSale,
    saleType: state.saleType,
    notes: undefined,                                       // dropped
    customNotes: state.customNotes.trim() || undefined,     // NEW
    pseudo: state.pseudo.trim() || undefined,               // NEW
    trackingNumber:
      (state.deliveryMethod === "Postage" || state.deliveryMethod === "Express Postage")
        ? (state.trackingNumber.trim() || undefined)
        : undefined,                                        // NEW (only stored when applicable)
    status: state.status || undefined,                      // NEW
    items: [
      ...items.map(...),
      ...(manualLineTotal > 0 ? [{ kind: "manual" as const, ... }] : []),
    ],
  };
}
```

- [ ] **Step 5: tsc check (will fail until Task 2.2 updates the input type)**

Run: `npx tsc --noEmit`
Expected: errors on `deliveryFeeMur`, `customNotes`, `pseudo`, `trackingNumber`, `status` not being known properties of `CreateDmOrderInput`. Continue to Task 2.2.

### Task 2.2: Extend `CreateDmOrderInput` + `createDmOrder` + persistence

- [ ] **Step 1: Update `CreateDmOrderInput` type in `src/lib/admin-orders.ts`**

Add the new fields:
```ts
export type CreateDmOrderInput = {
  buyerFirstName: string;
  buyerLastName?: string;
  phone: string;
  address1: string;
  address2?: string;
  city?: string;
  // district removed
  email?: string;
  items: CreateOrderItemInput[];
  deliveryMethod: DmDeliveryMethod;
  deliveryDate?: string;
  deliveryFeeMur?: number;          // NEW: explicit delivery fee (override). If undefined, computed via computeDeliveryCost.
  discountMur?: number;
  totalOverrideMur?: number | null;
  paymentMethod: string;
  pointOfSale: string;
  saleType: "paid" | "unpaid" | "deposit";
  // notes dropped, replaced by customNotes
  customNotes?: string;             // NEW
  pseudo?: string;                  // NEW
  trackingNumber?: string;          // NEW
  status?: "delivered" | "cancelled"; // NEW (empty string handled at call site)
};
```

- [ ] **Step 2: Update `createDmOrder` to honor + persist new fields**

In `createDmOrder` (currently lines 180-309):

Replace the `deliveryCost` line:
```ts
const autoDelivery = computeDeliveryCost(input.deliveryMethod, subtotalAfterDiscount);
const deliveryCost =
  typeof input.deliveryFeeMur === "number" ? Math.max(0, Math.round(input.deliveryFeeMur)) : autoDelivery;
```

Replace the address builder (province was district):
```ts
const address: HttpTypes.OrderAddress = {
  first_name: input.buyerFirstName,
  last_name: input.buyerLastName ?? "",
  phone: input.phone,
  address_1: input.address1,
  address_2: input.address2 || null,
  city: input.city || null,
  province: null,    // no longer used
  country_code: "mu",
};
```

Extend metadata block:
```ts
const metadata: Record<string, unknown> = {
  payment_method: input.paymentMethod,
  point_of_sale: input.pointOfSale,
  sale_type: input.saleType,
  delivery_method: input.deliveryMethod,
  source: "dm_admin",
};
if (input.deliveryDate) metadata.delivery_date = input.deliveryDate;
if (input.customNotes) metadata.custom_notes = input.customNotes;
if (input.pseudo) metadata.pseudo = input.pseudo;
if (input.trackingNumber) metadata.tracking_number = input.trackingNumber;
if (overrideTotal != null) metadata.total_override_mur = overrideTotal;

// VAT breakdown: extracted from VAT-inclusive total when payment is MCB Juice.
const finalTotal = overrideTotal != null ? overrideTotal : computedTotal;
if (input.paymentMethod === "MCB Juice") {
  metadata.vat_amount = Math.round((finalTotal * 15) / 115);
}
```

Apply status if set, AFTER the order is converted:
```ts
if (input.status === "cancelled") {
  try {
    await sdk.admin.order.cancel(convertedOrder.id);
  } catch (err) {
    console.warn("[createDmOrder] cancel after status set failed:", err);
  }
} else if (input.status === "delivered") {
  try {
    await markOrderFulfilled(convertedOrder.id);
  } catch (err) {
    console.warn("[createDmOrder] markFulfilled failed:", err);
  }
}
```

- [ ] **Step 3: Extend `OrderRow` to expose new metadata for read paths**

In `mapOrder()`:
```ts
return {
  id: o.id,
  displayId: o.display_id ?? 0,
  createdAt: String(o.created_at ?? ""),
  email: o.email ?? null,
  buyerName,
  phone: ship?.phone ?? null,
  city: ship?.city ?? null,                                  // NEW
  addressDetails: ship?.address_1 ?? null,                   // NEW (renamed semantically)
  totalMur: Math.round(Number(o.total ?? 0)),
  paymentStatus: o.payment_status ?? null,
  fulfillmentStatus: o.fulfillment_status ?? null,
  status: o.status ?? null,
  paymentMethod: typeof meta.payment_method === "string" ? meta.payment_method : null,
  pointOfSale: typeof meta.point_of_sale === "string" ? meta.point_of_sale : null,
  saleType: typeof meta.sale_type === "string" ? meta.sale_type : null,
  deliveryMethod: typeof meta.delivery_method === "string" ? meta.delivery_method : null,
  deliveryDate: typeof meta.delivery_date === "string" ? meta.delivery_date : null,           // NEW
  customNotes: typeof meta.custom_notes === "string" ? meta.custom_notes : null,              // NEW
  pseudo: typeof meta.pseudo === "string" ? meta.pseudo : null,                               // NEW
  trackingNumber: typeof meta.tracking_number === "string" ? meta.tracking_number : null,     // NEW
  vatAmount: typeof meta.vat_amount === "number" ? meta.vat_amount : null,                    // NEW
  notes: typeof meta.notes === "string" ? meta.notes : null,                                  // legacy, keep displaying
  items: (o.items ?? []).map(...),
};
```

Update the `OrderRow` type to include the new fields.

- [ ] **Step 4: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 2.3: Create `VatBreakdown.tsx`

- [ ] **Step 1: Create the component**

`src/app/admin/orders/components/VatBreakdown.tsx`:
```tsx
"use client";
import { formatPrice } from "@/lib/format";

export function VatBreakdown({
  total,
  paymentMethod,
}: {
  total: number;
  paymentMethod: string;
}) {
  if (paymentMethod !== "MCB Juice") return null;
  const vat = Math.round((total * 15) / 115);
  return (
    <p className="text-[11px] italic text-ink-muted">
      Of which VAT (15%): {formatPrice(vat, "mur")}
    </p>
  );
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 2.4: Update `NewOrderRow.tsx` rendering — new field order, conditional cells

- [ ] **Step 1: Reorder JSX to match spec field order**

In `NewOrderRow.tsx`, restructure the JSX inside the form section. The new section ordering (use `<SectionLabel>` for each):

1. **Delivery** — Delivery Date + Way of Delivery (2 cols)
2. **Buyer** — Name + (collapsible Pseudo via "+" toggle) (2 cols)
3. **Address** — City + Address Details (2 cols; District field removed entirely)
4. **Contact** — Phone + (collapsible Email via "+" toggle) (2 cols)
5. **Products** — `<ProductPicker>` + items list (existing)
6. **Custom notes** — `<textarea>` for `state.customNotes` (visible, optional) — placeholder "e.g. all small even though M selected, hide price"
7. **Manual product** — collapsed by default. Show a "+ Add manual product" button; expanded → 2 inputs (title + price)
8. **Money** — Delivery fee (auto-filled from `autoDeliveryCost`, editable, with a small "↻ auto" link to clear override) + Discount + Total override (3 cols)
9. **Total + VAT breakdown** — final-total display + `<VatBreakdown total={finalTotal} paymentMethod={state.paymentMethod} />`
10. **Payment** — Method of Payment + Point of Sale + Sale Type (3 cols)
11. **Status** — Status select (default "—" for empty)
12. **Tracking** — only rendered when `deliveryMethod === "Postage" || deliveryMethod === "Express Postage"`. Single text input.
13. **Save button**

Use the `Field` / `Select` / `SectionLabel` / `Row` components from `OrderRowFields.tsx`. Keep all existing class names and styling tokens (coral / blush / cream / ink / Tailwind responsive prefixes).

- [ ] **Step 2: Add collapsible "+" pattern**

For Pseudo, Email, Manual Product — render a "+ Add pseudo" / "+ Add email" / "+ Add manual product" button initially. Click → swap to the actual input(s). Once typed-in, stays expanded for the session. Use local component state:

```tsx
const [showPseudo, setShowPseudo] = useState(false);
const [showEmail, setShowEmail] = useState(false);
const [showManual, setShowManual] = useState(false);

// In JSX:
{!showPseudo && !state.pseudo ? (
  <button type="button" onClick={() => setShowPseudo(true)}
    className="text-xs text-coral-700 hover:text-coral-500">
    + Add pseudo
  </button>
) : (
  <Field label="Pseudo / IG handle" value={state.pseudo} onChange={(v) => set("pseudo", v)} />
)}
```

Once `state.pseudo` has a value, the field stays rendered automatically.

- [ ] **Step 3: Status select**

```tsx
<Select
  label="Status"
  value={state.status}
  onChange={(v) => set("status", v as FormState["status"])}
  options={[
    { value: "", label: "— pending —" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ]}
/>
```

- [ ] **Step 4: tsc + build**

Run: `npx tsc --noEmit`
Expected: clean
Run: `npm run build`
Expected: clean

- [ ] **Step 5: Manual smoke**

`npm run dev` → `/admin/orders`
- Field order top-to-bottom: Delivery Date → Way → Name → City → Address Details → Phone → Products → Custom Notes → Money (delivery fee + discount + total override) → Total → Payment + POS + Sale Type → Status → (Tracking only if Postage selected)
- Click "+ Add pseudo" → cell expands
- Click "+ Add email" → cell expands
- Click "+ Add manual product" → 2 inputs appear
- Select "Postage" → Tracking field appears below Status; select "Pick Up" → Tracking field disappears
- Select "MCB Juice" payment → "Of which VAT (15%): Rs.X" caption shows under final total; switch to Cash → caption disappears
- District field is **gone** from the form
- Save a test order with: Name + City + Phone + 1 product + Postage + tracking="TRK123" + Juice payment
- In Medusa admin, confirm order has `metadata.tracking_number`, `metadata.vat_amount`, `metadata.custom_notes` etc.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-orders.ts \
        src/app/admin/orders/components/useOrderForm.ts \
        src/app/admin/orders/components/NewOrderRow.tsx \
        src/app/admin/orders/components/OrderRowFields.tsx \
        src/app/admin/orders/components/VatBreakdown.tsx
git commit -m "feat(admin): reorder fields, add pseudo/custom_notes/tracking/VAT, remove District"
```

---

## Slice 3 — Light edit infrastructure

**Goal:** Pencil icon on each past order. Click → row swaps to editable inputs (desktop) or opens drawer (mobile fallback for now). Light fields (status, address, phone, name, city, tracking, custom notes, payment method, sale type, POS, pseudo, delivery date, email) save in place via metadata + address patch — no Medusa cancel + recreate.

**Spec section to follow:** "Inline edit flow" → "Light edit path"

### Task 3.1: Add `updateOrderLight` to `src/lib/admin-orders.ts`

- [ ] **Step 1: Add the type and function**

```ts
export type OrderLightPatch = {
  // shipping_address fields
  buyerName?: string;
  phone?: string;
  city?: string;
  addressDetails?: string;   // -> address_1
  // metadata fields
  email?: string;
  deliveryMethod?: DmDeliveryMethod;
  deliveryDate?: string | null;
  pseudo?: string | null;
  customNotes?: string | null;
  trackingNumber?: string | null;
  paymentMethod?: string;
  pointOfSale?: string;
  saleType?: "paid" | "unpaid" | "deposit";
  // status changes
  status?: "delivered" | "cancelled" | "pending";
};

export async function updateOrderLight(
  orderId: string,
  patch: OrderLightPatch,
): Promise<void> {
  const sdk = await getAdminSdk();

  // 1. Address patch (if any address-related field is set)
  const hasAddressChange =
    patch.buyerName !== undefined ||
    patch.phone !== undefined ||
    patch.city !== undefined ||
    patch.addressDetails !== undefined;
  if (hasAddressChange) {
    // Need current address to merge — fetch existing order
    const { order } = await sdk.admin.order.retrieve(orderId, { fields: "id,*shipping_address,*billing_address" });
    const ship = order.shipping_address;
    const newAddress: HttpTypes.OrderAddress = {
      first_name: patch.buyerName ?? ship?.first_name ?? "",
      last_name: ship?.last_name ?? "",
      phone: patch.phone ?? ship?.phone ?? "",
      address_1: patch.addressDetails ?? ship?.address_1 ?? "",
      address_2: ship?.address_2 ?? null,
      city: patch.city ?? ship?.city ?? "",
      province: null,
      country_code: ship?.country_code ?? "mu",
    };
    await sdk.admin.order.update(orderId, {
      shipping_address: newAddress,
      billing_address: newAddress,
    });
  }

  // 2. Metadata patch (merge — Medusa replaces the metadata object on update)
  const metaKeys: (keyof OrderLightPatch)[] = [
    "email", "deliveryMethod", "deliveryDate", "pseudo",
    "customNotes", "trackingNumber", "paymentMethod", "pointOfSale", "saleType",
  ];
  const hasMetaChange = metaKeys.some((k) => patch[k] !== undefined);
  if (hasMetaChange) {
    const { order } = await sdk.admin.order.retrieve(orderId, { fields: "id,metadata" });
    const oldMeta = (order.metadata ?? {}) as Record<string, unknown>;
    const newMeta = { ...oldMeta };
    if (patch.email !== undefined) {
      // email is a top-level Medusa order field, not metadata. Update separately:
      await sdk.admin.order.update(orderId, { email: patch.email });
    }
    if (patch.deliveryMethod !== undefined) newMeta.delivery_method = patch.deliveryMethod;
    if (patch.deliveryDate !== undefined) {
      if (patch.deliveryDate === null || patch.deliveryDate === "") delete newMeta.delivery_date;
      else newMeta.delivery_date = patch.deliveryDate;
    }
    if (patch.pseudo !== undefined) {
      if (!patch.pseudo) delete newMeta.pseudo; else newMeta.pseudo = patch.pseudo;
    }
    if (patch.customNotes !== undefined) {
      if (!patch.customNotes) delete newMeta.custom_notes; else newMeta.custom_notes = patch.customNotes;
    }
    if (patch.trackingNumber !== undefined) {
      if (!patch.trackingNumber) delete newMeta.tracking_number;
      else newMeta.tracking_number = patch.trackingNumber;
    }
    if (patch.paymentMethod !== undefined) newMeta.payment_method = patch.paymentMethod;
    if (patch.pointOfSale !== undefined) newMeta.point_of_sale = patch.pointOfSale;
    if (patch.saleType !== undefined) newMeta.sale_type = patch.saleType;
    await sdk.admin.order.update(orderId, { metadata: newMeta });
  }

  // 3. Status change
  if (patch.status === "cancelled") {
    await sdk.admin.order.cancel(orderId);
  } else if (patch.status === "delivered") {
    await markOrderFulfilled(orderId);
  }
}
```

- [ ] **Step 2: Add a `splitDiff` helper to detect heavy vs light**

```ts
export type OrderEditDiff =
  | { kind: "light"; patch: OrderLightPatch }
  | { kind: "heavy"; reason: string }
  | { kind: "noop" };

export function classifyOrderEdit(
  before: OrderRow,
  next: CreateDmOrderInput,
): OrderEditDiff {
  // Heavy if items / unit prices / discount / delivery fee / total override / manual product changed.
  // Inputs to before: items[], deliveryFeeMur (re-derive from delivery item line in the order),
  // discount, total override.

  // For Slice 3, heavy detection is simply: any change to items, prices, discount, totals, manual.
  // We compare the new items array vs the original. If lengths differ or any line item changed → heavy.
  // For Slice 4 we'll wire the real heavy path; for now, return heavy with reason "Not implemented yet"
  // so the UI can disable the Save button when only heavy fields changed.

  const beforeLineCount = before.items.length;
  const nextLineCount = next.items.length;
  if (beforeLineCount !== nextLineCount) {
    return { kind: "heavy", reason: "Item count changed" };
  }
  // Compare each line:
  for (let i = 0; i < nextLineCount; i++) {
    const b = before.items[i];
    const n = next.items[i];
    const nUnit = n.unitPriceMur;
    const nQty = n.quantity;
    if (b.unitPriceMur !== nUnit || b.quantity !== nQty) {
      return { kind: "heavy", reason: "Item qty or price changed" };
    }
    // Title comparison is unreliable (server may differ); skip.
  }
  // Compare delivery fee, discount, total — slice 4 wires these properly. For Slice 3 assume
  // they're always equal (no editable inputs for them in light-only UI — see Task 3.3).

  // Build the light patch by diffing the rest:
  const patch: OrderLightPatch = {};
  if (next.buyerFirstName !== before.buyerName.split(" ")[0]) {
    patch.buyerName = next.buyerFirstName;
  }
  if (next.phone !== (before.phone ?? "")) patch.phone = next.phone;
  if ((next.city ?? "") !== (before as unknown as { city?: string | null }).city) {
    patch.city = next.city ?? "";
  }
  if ((next.address1 ?? "") !== ((before as unknown as { addressDetails?: string | null }).addressDetails ?? "")) {
    patch.addressDetails = next.address1;
  }
  if ((next.email ?? "") !== (before.email ?? "")) patch.email = next.email ?? "";
  if (next.deliveryMethod !== before.deliveryMethod) patch.deliveryMethod = next.deliveryMethod;
  if ((next.deliveryDate ?? "") !== ((before as unknown as { deliveryDate?: string | null }).deliveryDate ?? "")) {
    patch.deliveryDate = next.deliveryDate ?? null;
  }
  if ((next.pseudo ?? "") !== ((before as unknown as { pseudo?: string | null }).pseudo ?? "")) {
    patch.pseudo = next.pseudo ?? null;
  }
  if ((next.customNotes ?? "") !== ((before as unknown as { customNotes?: string | null }).customNotes ?? "")) {
    patch.customNotes = next.customNotes ?? null;
  }
  if ((next.trackingNumber ?? "") !== ((before as unknown as { trackingNumber?: string | null }).trackingNumber ?? "")) {
    patch.trackingNumber = next.trackingNumber ?? null;
  }
  if (next.paymentMethod !== (before.paymentMethod ?? "")) patch.paymentMethod = next.paymentMethod;
  if (next.pointOfSale !== (before.pointOfSale ?? "")) patch.pointOfSale = next.pointOfSale;
  if (next.saleType !== (before.saleType ?? "")) patch.saleType = next.saleType;
  if ((next.status ?? "") !== (before.status === "canceled" ? "cancelled" : "")) {
    patch.status = next.status as OrderLightPatch["status"];
  }

  if (Object.keys(patch).length === 0) return { kind: "noop" };
  return { kind: "light", patch };
}
```

(The repeated `as unknown as` casts can be removed once `OrderRow` exposes these fields directly — they were added in Task 2.3 step 3. After that step lands, simplify the comparisons to direct property access.)

- [ ] **Step 3: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 3.2: Add `updateOrderAction` server action

- [ ] **Step 1: Add to `src/app/admin/orders/actions.ts`**

```ts
import {
  classifyOrderEdit,
  updateOrderLight,
  getRecentOrders,
  type OrderRow,
} from "@/lib/admin-orders";

export type UpdateOrderResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function fetchOrderRow(orderId: string): Promise<OrderRow | null> {
  const orders = await getRecentOrders(200);
  return orders.find((o) => o.id === orderId) ?? null;
}

export async function updateOrderAction(
  orderId: string,
  input: CreateDmOrderInput,
): Promise<UpdateOrderResult> {
  await requireAdmin();
  try {
    const before = await fetchOrderRow(orderId);
    if (!before) return { ok: false, error: "Order not found" };
    const diff = classifyOrderEdit(before, input);
    if (diff.kind === "noop") {
      return { ok: true, id: orderId };
    }
    if (diff.kind === "heavy") {
      // Slice 4 fills this in. Until then, surface a clear error.
      return { ok: false, error: `Heavy edit not yet supported: ${diff.reason}` };
    }
    await updateOrderLight(orderId, diff.patch);
    revalidatePath("/admin/orders");
    return { ok: true, id: orderId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    console.error("[updateOrderAction]", err);
    return { ok: false, error: message };
  }
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 3.3: Rename `RecentOrders.tsx` → `RecentOrdersSheet.tsx` with sheet table + pencil/edit row

- [ ] **Step 1: Rename + rewrite**

```bash
git mv src/app/admin/orders/components/RecentOrders.tsx src/app/admin/orders/components/RecentOrdersSheet.tsx
```

Replace the file contents. The new component is a **client component** (was server before) because it needs edit-row state + drawer integration. Take an `orders` prop from the parent (the parent fetches server-side):

```tsx
"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import { updateOrderAction } from "../actions";
import type { OrderRow, CreateDmOrderInput } from "@/lib/admin-orders";
import { useOrderForm } from "./useOrderForm";
import { EditableRowCells } from "./OrderRowFields";  // we'll add this in Task 3.4

export function RecentOrdersSheet({
  orders,
  onChanged,
}: {
  orders: OrderRow[];
  onChanged: () => void;     // parent re-fetches
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  // ... (see Task 3.4 for the cells)

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Recent orders</h2>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          {orders.length} shown
        </span>
      </div>
      {orders.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">No orders yet.</p>
      )}
      {orders.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blush-300/60 text-left text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="w-8"></th>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Way</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">City</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2">Products</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2">Pay</th>
                <th className="px-2 py-2">POS</th>
                <th className="px-2 py-2">Sale</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isEditing = editingId === o.id;
                if (isEditing) {
                  return (
                    <EditableRow
                      key={o.id}
                      order={o}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        onChanged();
                      }}
                      onError={(msg) => setErrorBanner(msg)}
                    />
                  );
                }
                return (
                  <ReadOnlyRow
                    key={o.id}
                    order={o}
                    onEdit={() => {
                      setEditingId(o.id);
                      setErrorBanner(null);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {errorBanner && (
        <p role="alert" className="mt-2 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700">
          {errorBanner}
        </p>
      )}
    </section>
  );
}

function ReadOnlyRow({ order, onEdit }: { order: OrderRow; onEdit: () => void }) {
  const trackingShown =
    order.deliveryMethod === "Postage" || order.deliveryMethod === "Express Postage";
  return (
    <tr className="border-b border-blush-300/40">
      <td className="px-2 py-2">
        <button onClick={onEdit} aria-label="Edit" className="text-coral-700 hover:text-coral-500">
          ✏️
        </button>
      </td>
      <td className="px-2 py-2 font-mono text-[11px]">#{order.displayId}</td>
      <td className="px-2 py-2 whitespace-nowrap">
        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
      </td>
      <td className="px-2 py-2">{order.deliveryMethod ?? "—"}</td>
      <td className="px-2 py-2 max-w-[180px] truncate">{order.buyerName || "—"}</td>
      <td className="px-2 py-2 max-w-[140px] truncate">{order.city ?? "—"}</td>
      <td className="px-2 py-2 whitespace-nowrap font-mono text-[11px]">{order.phone ?? "—"}</td>
      <td className="px-2 py-2 max-w-[200px] truncate">
        {order.items.length > 0
          ? `${order.items.length}× ${order.items[0].title}${order.items.length > 1 ? " +" + (order.items.length - 1) : ""}`
          : "—"}
      </td>
      <td className="px-2 py-2 text-right font-bold">{formatPrice(order.totalMur, "mur")}</td>
      <td className="px-2 py-2">{order.paymentMethod ?? "—"}</td>
      <td className="px-2 py-2">{order.pointOfSale ?? "—"}</td>
      <td className="px-2 py-2">{order.saleType ?? "—"}</td>
      <td className="px-2 py-2">
        {order.status === "canceled" ? "Cancelled" : order.fulfillmentStatus === "fulfilled" ? "Delivered" : "—"}
      </td>
      <td className="px-2 py-2 font-mono text-[11px]">
        {trackingShown ? (order.trackingNumber ?? "—") : ""}
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: errors on `EditableRowCells` import (Task 3.4 fixes this) and on missing fields in `OrderRow`. If `OrderRow` doesn't yet have `city`, `customNotes`, `pseudo`, etc., revisit Task 2.3 step 3.

### Task 3.4: Implement `<EditableRow>` using `useOrderForm`

- [ ] **Step 1: Add to `RecentOrdersSheet.tsx`**

```tsx
function EditableRow({
  order,
  onCancel,
  onSaved,
  onError,
}: {
  order: OrderRow;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const form = useOrderForm({
    deliveryDate: order.deliveryDate ?? "",
    deliveryMethod: (order.deliveryMethod ?? "Pick Up") as DmDeliveryMethod,
    buyerName: order.buyerName,
    pseudo: order.pseudo ?? "",
    city: order.city ?? "",
    address2: order.addressDetails ?? "",
    phone: order.phone ?? "",
    email: order.email ?? "",
    customNotes: order.customNotes ?? "",
    paymentMethod: (order.paymentMethod ?? "Cash") as FormState["paymentMethod"],
    pointOfSale: (order.pointOfSale ?? "Instagram") as FormState["pointOfSale"],
    saleType: (order.saleType ?? "paid") as SaleType,
    status:
      order.status === "canceled" ? "cancelled" :
      order.fulfillmentStatus === "fulfilled" ? "delivered" :
      "",
    trackingNumber: order.trackingNumber ?? "",
  });
  // Pre-fill items from the order:
  // (skip the "Delivery — X", "Discount", "Adjustment" auto-lines we appended on create)
  useEffect(() => {
    const realItems = order.items.filter(
      (it) => !/^Delivery\s—|^Discount$|^Adjustment$/.test(it.title),
    );
    form.setItems(realItems.map((it) => ({
      rid: Math.random().toString(36).slice(2, 9),
      kind: "variant",   // best-effort; original variant_id not exposed in OrderRow today (revisit if needed)
      title: it.title,
      quantity: it.quantity,
      unitPriceMur: it.unitPriceMur,
    })));
  }, [order.id]);  // intentionally only on order change

  const [submitting, startTransition] = useTransition();

  function save() {
    if (!form.isValid) {
      onError("Fill all required fields");
      return;
    }
    const input = form.toCreateInput();
    startTransition(async () => {
      const res = await updateOrderAction(order.id, input);
      if (res.ok) onSaved();
      else onError(res.error);
    });
  }

  return (
    <tr className="border-b border-blush-300/40 bg-blush-100/30">
      <td colSpan={14} className="p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
          Editing #{order.displayId}
        </p>
        {/* Reuse the same JSX layout as NewOrderRow, just with form bound to this order. */}
        {/* For DRY: extract the inner-form layout into a shared component.
            See "Refactor option" below. For Slice 3, copy the JSX from NewOrderRow into a
            local <EditFormLayout form={form} /> render and call it here. */}
        <EditFormLayout form={form} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-blush-400 px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button onClick={save} disabled={submitting}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-60">
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
}
```

**Refactor option to avoid duplication:** extract the entire JSX body of `NewOrderRow` (everything between `return (<section>` and the Save button) into a reusable `<OrderFormLayout form={form} />` component in `OrderRowFields.tsx`. Both `NewOrderRow` and `EditableRow` then render `<OrderFormLayout form={form} />`, differing only in the wrapper (section vs row) and the Save handler.

Recommended: do this extraction. It's the whole point of `useOrderForm` — to avoid copy-paste.

- [ ] **Step 2: Extract `OrderFormLayout` shared component**

In `OrderRowFields.tsx`, add:

```tsx
export function OrderFormLayout({
  form,
}: {
  form: UseOrderFormResult;
}) {
  // The whole field layout (Delivery → Buyer → Address → Contact → Products → Custom Notes →
  // Manual → Money → Total → Payment → Status → Tracking) lives here.
  // Move the JSX body of NewOrderRow's <section>...</section> here, minus:
  //  - The outer <section> wrapper
  //  - The Save button (specific to the calling context)
  //  - Banners (also caller-specific)
  // Keep the SectionLabel / Field / Select / ProductPicker / VatBreakdown usage.
  return (
    <>
      {/* ...all the form sections... */}
    </>
  );
}
```

Update `NewOrderRow` to use it:
```tsx
return (
  <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
    <h2 className="font-display text-lg text-ink">New order</h2>
    {/* banners */}
    <OrderFormLayout form={form} />
    <div className="mt-3 flex justify-end">
      <button onClick={handleSubmit} disabled={submitting} className="...">Save order</button>
    </div>
  </section>
);
```

`EditableRow` uses `<OrderFormLayout form={form} />` inside the `<td>`.

- [ ] **Step 3: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean

### Task 3.5: Wire `RecentOrdersSheet` into `AdminOrdersClient`

- [ ] **Step 1: Update `page.tsx` to fetch + hydrate**

`src/app/admin/orders/page.tsx`:
```tsx
export const dynamic = "force-dynamic";

import { AdminOrdersClient } from "./components/AdminOrdersClient";
import { getRecentOrders } from "@/lib/admin-orders";

export default async function AdminOrdersPage() {
  const initialOrders = await getRecentOrders(50);
  return (
    <main className="mx-auto max-w-screen-2xl px-3 py-3 sm:px-4 sm:py-4">
      <AdminOrdersClient initialOrders={initialOrders} />
    </main>
  );
}
```

- [ ] **Step 2: Update `AdminOrdersClient` to manage orders + refresh**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";
import { RecentOrdersSheet } from "./RecentOrdersSheet";
import { searchOrdersAction } from "../actions";  // wired in Slice 6; for Slice 3 use a fallback
import type { OrderRow } from "@/lib/admin-orders";

export function AdminOrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const formRef = useRef<NewOrderRowRef | null>(null);
  const [orders, setOrders] = useState(initialOrders);
  const [refreshing, startRefresh] = useTransition();

  function handlePick(v: SelectedVariant) { /* unchanged */ }

  function refreshOrders() {
    // For Slice 3, simplest path: hard refresh by calling getRecentOrders via a server action.
    // We add a `getRecentOrdersAction` server action below.
    startRefresh(async () => {
      const next = await getRecentOrdersAction();
      setOrders(next);
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 ...">
        <StockChecker onPickVariant={handlePick} />
      </div>
      <div id="dm-order-form">
        <NewOrderRow ref={formRef} onSaved={refreshOrders} />
      </div>
      <RecentOrdersSheet orders={orders} onChanged={refreshOrders} />
    </div>
  );
}
```

Add a tiny server action for refresh in `actions.ts`:
```ts
export async function getRecentOrdersAction(limit = 50): Promise<OrderRow[]> {
  await requireAdmin();
  return getRecentOrders(limit);
}
```

`NewOrderRow` accepts an optional `onSaved` callback — call it after successful create.

- [ ] **Step 3: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean

- [ ] **Step 4: Manual smoke**

`npm run dev` → `/admin/orders`
- Page loads, shows recent orders as a horizontal table (scroll right to see all columns)
- Pencil icon visible on each row
- Click pencil → row expands, all fields editable, current values pre-filled
- Edit phone number → click Save → row collapses, table refreshes, new phone shown
- Edit Status to "Delivered" → Save → in Medusa admin, fulfillment status = fulfilled
- Edit Tracking on a Postage order → Save → cell shows new value
- Try to edit a price (heavy edit) → click Save → error banner: "Heavy edit not yet supported: …"

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-orders.ts \
        src/app/admin/orders/page.tsx \
        src/app/admin/orders/actions.ts \
        src/app/admin/orders/components/AdminOrdersClient.tsx \
        src/app/admin/orders/components/RecentOrdersSheet.tsx \
        src/app/admin/orders/components/NewOrderRow.tsx \
        src/app/admin/orders/components/OrderRowFields.tsx \
        src/app/admin/orders/components/useOrderForm.ts
git rm src/app/admin/orders/components/RecentOrders.tsx
git commit -m "feat(admin): inline edit for past orders (light edits — metadata + address)"
```

---

## Slice 4 — Heavy edit (cancel + recreate)

**Goal:** When the user changes line items, prices, discount, delivery fee, or total, the system pre-flight-checks stock, cancels the old order, creates a new one with the edited data, and stamps `metadata.replaces_order_id` / `metadata.replaced_by_order_id` for traceability. The Recent Orders fetcher hides predecessors.

**Spec section to follow:** "Heavy edit path"

### Task 4.1: Implement `editOrderHeavy` in `src/lib/admin-orders.ts`

- [ ] **Step 1: Add the function**

```ts
export type HeavyEditResult =
  | { ok: true; newOrderId: string; newDisplayId: number }
  | { ok: false; error: string };

export async function editOrderHeavy(
  oldOrderId: string,
  input: CreateDmOrderInput,
): Promise<HeavyEditResult> {
  const sdk = await getAdminSdk();

  // 1. Fetch old order's line items (with variant_ids and qtys) to compute net delta.
  const { order: oldOrder } = await sdk.admin.order.retrieve(oldOrderId, {
    fields: "id,*items,metadata",
  });
  const oldByVariant = new Map<string, number>();
  for (const it of oldOrder.items ?? []) {
    if (!it.variant_id) continue;
    oldByVariant.set(it.variant_id, (oldByVariant.get(it.variant_id) ?? 0) + Number(it.quantity ?? 0));
  }
  const newByVariant = new Map<string, number>();
  for (const it of input.items) {
    if (it.kind === "variant") {
      newByVariant.set(it.variantId, (newByVariant.get(it.variantId) ?? 0) + it.quantity);
    }
  }

  // 2. Pre-flight stock check at STOCK_LOCATION_ID.
  const allVariantIds = new Set([...oldByVariant.keys(), ...newByVariant.keys()]);
  for (const variantId of allVariantIds) {
    const oldQty = oldByVariant.get(variantId) ?? 0;
    const newQty = newByVariant.get(variantId) ?? 0;
    const delta = newQty - oldQty;
    if (delta <= 0) continue; // need fewer or same — fine
    // Need `delta` more units. Fetch current available inventory.
    const v = await sdk.admin.productVariant.retrieve(variantId, {
      fields: "id,sku,title,inventory_quantity,manage_inventory,product.title",
    });
    const variant = v.variant as VariantWithRefs;
    const manage = variant.manage_inventory ?? true;
    if (!manage) continue;
    const available = variant.inventory_quantity ?? 0;
    if (available < delta) {
      return {
        ok: false,
        error: `Not enough stock for ${variant.product?.title ?? "?"} / ${variant.title ?? "?"} — only ${available} available (need ${delta} more).`,
      };
    }
  }

  // 3. Cancel old order
  await sdk.admin.order.cancel(oldOrderId);
  // Tag old order metadata; will set replaced_by below after we have the new id.

  // 4. Create new order via existing createDmOrder pipeline (but with extra metadata).
  let created: { id: string; displayId: number };
  try {
    created = await createDmOrder(input);
  } catch (err) {
    // 5a. Rollback path: createDmOrder failed AFTER cancel. Surface clear error to caller.
    return {
      ok: false,
      error: `Recreate failed after cancel: ${err instanceof Error ? err.message : "unknown"}. Old order #${oldOrder.display_id ?? "?"} is canceled.`,
    };
  }

  // 5b. Stamp bidirectional links
  try {
    const newOrderRetrieve = await sdk.admin.order.retrieve(created.id, { fields: "id,metadata" });
    const newMeta = (newOrderRetrieve.order.metadata ?? {}) as Record<string, unknown>;
    newMeta.replaces_order_id = oldOrderId;
    newMeta.replaces_display_id = oldOrder.display_id ?? null;
    await sdk.admin.order.update(created.id, { metadata: newMeta });

    const oldMeta = (oldOrder.metadata ?? {}) as Record<string, unknown>;
    oldMeta.replaced_by_order_id = created.id;
    oldMeta.replaced_by_display_id = created.displayId;
    await sdk.admin.order.update(oldOrderId, { metadata: oldMeta });
  } catch (err) {
    console.warn("[editOrderHeavy] failed to stamp replaces metadata:", err);
    // Non-fatal — the new order exists with the new data; the link is just missing.
  }

  return { ok: true, newOrderId: created.id, newDisplayId: created.displayId };
}
```

- [ ] **Step 2: Update `getRecentOrders` to filter out replaced predecessors**

```ts
export async function getRecentOrders(limit = 20): Promise<OrderRow[]> {
  const sdk = await getAdminSdk();
  // Over-fetch so we can drop replaced predecessors without thinning the visible count.
  const fetchLimit = Math.max(limit * 2, 50);
  const res = await sdk.admin.order.list({
    limit: fetchLimit,
    order: "-created_at",
    fields: "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,*shipping_address",
  });
  const all = (res.orders as HttpTypes.AdminOrder[]).map(mapOrder);
  // Drop orders that have been superseded by an edit.
  const visible = all.filter((o) => {
    const meta = (o as unknown as { __raw?: Record<string, unknown> }).__raw;
    // `mapOrder` doesn't currently expose raw metadata. Add a `replacedByOrderId` field.
    return o.replacedByOrderId == null;
  });
  return visible.slice(0, limit);
}
```

Update `mapOrder` to include `replacedByOrderId`:
```ts
function mapOrder(o: HttpTypes.AdminOrder): OrderRow {
  const meta = (o.metadata ?? {}) as Record<string, unknown>;
  // ...
  return {
    // ...
    replacedByOrderId:
      typeof meta.replaced_by_order_id === "string" ? meta.replaced_by_order_id : null,
    replacesOrderId:
      typeof meta.replaces_order_id === "string" ? meta.replaces_order_id : null,
    replacesDisplayId:
      typeof meta.replaces_display_id === "number" ? meta.replaces_display_id : null,
    // ...
  };
}
```

Update the `OrderRow` type to expose these.

- [ ] **Step 3: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 4.2: Wire heavy path into `updateOrderAction`

- [ ] **Step 1: Replace the heavy stub**

```ts
import { editOrderHeavy, ... } from "@/lib/admin-orders";

export async function updateOrderAction(
  orderId: string,
  input: CreateDmOrderInput,
): Promise<UpdateOrderResult> {
  await requireAdmin();
  try {
    const before = await fetchOrderRow(orderId);
    if (!before) return { ok: false, error: "Order not found" };
    const diff = classifyOrderEdit(before, input);
    if (diff.kind === "noop") return { ok: true, id: orderId };
    if (diff.kind === "light") {
      await updateOrderLight(orderId, diff.patch);
      revalidatePath("/admin/orders");
      return { ok: true, id: orderId };
    }
    // Heavy
    const res = await editOrderHeavy(orderId, input);
    if (!res.ok) return { ok: false, error: res.error };
    revalidatePath("/admin/orders");
    return { ok: true, id: res.newOrderId };
  } catch (err) {
    console.error("[updateOrderAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update" };
  }
}
```

Note: when the result is heavy and successful, the action returns the **new** order id. The UI uses `onChanged` (full refetch) to reflect the swap, so the caller doesn't need to track the id swap directly.

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 4.3: Add "↻ replaces #N" caption to Recent Orders display

- [ ] **Step 1: In `RecentOrdersSheet.tsx` `<ReadOnlyRow>`**

Below the `#displayId` cell, render the caption when `order.replacesDisplayId` is set:

```tsx
<td className="px-2 py-2 font-mono text-[11px]">
  #{order.displayId}
  {order.replacesDisplayId != null && (
    <span className="block text-[9px] italic text-ink-muted">↻ replaces #{order.replacesDisplayId}</span>
  )}
</td>
```

- [ ] **Step 2: tsc + build + manual smoke**

`npm run dev` → `/admin/orders`
- Edit a recent order's product price → Save
- In a few seconds the table refreshes
- The old display_id is gone (filtered out as replaced); the new display_id shows up with "↻ replaces #N" caption
- In Medusa admin, confirm: old order has `metadata.replaced_by_order_id` and is in `canceled` status; new order has `metadata.replaces_order_id` and the corrected price; inventory has been net-adjusted (returned for old qty, decremented for new qty)
- Try to edit qty up beyond available stock → error toast: "Not enough stock for X — only N available"
- After failed pre-flight, original order is still intact (not canceled)

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-orders.ts \
        src/app/admin/orders/actions.ts \
        src/app/admin/orders/components/RecentOrdersSheet.tsx
git commit -m "feat(admin): heavy edit (cancel+recreate) with stock pre-flight + replaces metadata"
```

---

## Slice 5 — Customer search + autofill

**Goal:** Top-of-page search by name/phone. Result dropdown deduped by phone. Click result → filter Recent Orders to that customer + show "📋 Use customer in new entry" button that pre-fills the entry row.

**Spec section to follow:** "Search, filter, customer autofill" → "Customer search bar"

### Task 5.1: Add `searchCustomers` to `src/lib/admin-orders.ts`

- [ ] **Step 1: Add the function**

```ts
export type CustomerHit = {
  phone: string;        // canonical (digits only)
  displayPhone: string; // as stored
  name: string;
  city: string | null;
  addressDetails: string | null;
  pseudo: string | null;
  email: string | null;
  orderCount: number;
  mostRecentOrderAt: string;  // ISO date
  mostRecentOrderId: string;
};

export async function searchCustomers(query: string, limit = 8): Promise<CustomerHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const sdk = await getAdminSdk();
  // Fetch a wider window of recent orders, then match client-side.
  const res = await sdk.admin.order.list({
    limit: 200,
    order: "-created_at",
    fields: "id,display_id,created_at,email,*shipping_address,metadata",
  });
  const orders = res.orders as HttpTypes.AdminOrder[];
  const nameRe = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const digitsOnly = q.replace(/\D/g, "");

  const byPhone = new Map<string, CustomerHit>();
  for (const o of orders) {
    const ship = o.shipping_address;
    if (!ship) continue;
    const name = [ship.first_name, ship.last_name].filter(Boolean).join(" ").trim();
    const phone = ship.phone ?? "";
    const phoneDigits = phone.replace(/\D/g, "");
    const matchesName = name && nameRe.test(name);
    const matchesPhone = phoneDigits && digitsOnly && phoneDigits.includes(digitsOnly);
    if (!matchesName && !matchesPhone) continue;
    if (!phoneDigits) continue;
    const meta = (o.metadata ?? {}) as Record<string, unknown>;
    const existing = byPhone.get(phoneDigits);
    if (existing) {
      existing.orderCount += 1;
    } else {
      byPhone.set(phoneDigits, {
        phone: phoneDigits,
        displayPhone: phone,
        name,
        city: ship.city ?? null,
        addressDetails: ship.address_1 ?? null,
        pseudo: typeof meta.pseudo === "string" ? meta.pseudo : null,
        email: o.email ?? null,
        orderCount: 1,
        mostRecentOrderAt: String(o.created_at ?? ""),
        mostRecentOrderId: o.id,
      });
    }
  }
  return [...byPhone.values()]
    .sort((a, b) => b.mostRecentOrderAt.localeCompare(a.mostRecentOrderAt))
    .slice(0, limit);
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 5.2: Add `searchCustomersAction` server action

- [ ] **Step 1: In `src/app/admin/orders/actions.ts`**

```ts
import { searchCustomers, type CustomerHit } from "@/lib/admin-orders";

export async function searchCustomersAction(query: string): Promise<CustomerHit[]> {
  await requireAdmin();
  return searchCustomers(query);
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 5.3: Create `CustomerSearch.tsx`

- [ ] **Step 1: Create the component**

`src/app/admin/orders/components/CustomerSearch.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchCustomersAction } from "../actions";
import type { CustomerHit } from "@/lib/admin-orders";

export function CustomerSearch({
  onSelect,
}: {
  onSelect: (c: CustomerHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    const reqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchCustomersAction(q);
        if (reqId !== reqIdRef.current) return;
        setHits(res);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="🔎 Search by name or phone…"
        inputMode="search"
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 text-sm outline-none focus:border-coral-500"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-blush-400 bg-white shadow-lg">
          {pending && <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>}
          {!pending && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-muted">No matches.</p>
          )}
          {hits.map((c) => (
            <button
              key={c.phone}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blush-100"
            >
              <span>
                <span className="font-semibold text-ink">{c.name || "—"}</span>
                <span className="ml-2 font-mono text-[11px] text-ink-muted">{c.displayPhone}</span>
              </span>
              <span className="text-[11px] text-ink-muted">
                {c.orderCount} order{c.orderCount === 1 ? "" : "s"} · last {new Date(c.mostRecentOrderAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 5.4: Wire customer chip + autofill into `AdminOrdersClient`

- [ ] **Step 1: Add chip + filter state + autofill ref method**

In `AdminOrdersClient`:
```tsx
const [customerFilter, setCustomerFilter] = useState<CustomerHit | null>(null);

// Filter visible orders by phone match when chip is active.
const visibleOrders = customerFilter
  ? orders.filter((o) => (o.phone ?? "").replace(/\D/g, "") === customerFilter.phone)
  : orders;
```

JSX (above the form):
```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
  <div className="flex-1">
    <CustomerSearch onSelect={setCustomerFilter} />
  </div>
  {/* DateFilter slot, wired in Slice 6 */}
</div>
{customerFilter && (
  <div className="flex flex-wrap items-center gap-2 rounded-md border border-blush-300 bg-blush-100/40 px-3 py-2 text-xs">
    <span>
      Filtering for <strong>{customerFilter.name || customerFilter.displayPhone}</strong>
      ({customerFilter.orderCount} orders)
    </span>
    <button
      onClick={() => formRef.current?.applyCustomer(customerFilter)}
      className="rounded-md bg-coral-500 px-2 py-1 font-semibold uppercase tracking-wider text-white"
    >
      📋 Use customer in new entry
    </button>
    <button
      onClick={() => setCustomerFilter(null)}
      className="text-ink-muted hover:text-coral-700"
      aria-label="Clear filter"
    >
      ✕
    </button>
  </div>
)}
```

Pass `<RecentOrdersSheet orders={visibleOrders} ... />`.

- [ ] **Step 2: Add `applyCustomer` to `NewOrderRowRef`**

Extend the ref interface:
```ts
export type NewOrderRowRef = {
  addVariant: (v: SelectedVariant) => void;
  applyCustomer: (c: CustomerHit) => void;
};

useImperativeHandle(ref, () => ({
  addVariant(v) { /* ... */ },
  applyCustomer(c) {
    form.set("buyerName", c.name);
    form.set("phone", c.displayPhone);
    form.set("city", c.city ?? "");
    form.set("address2", c.addressDetails ?? "");
    form.set("pseudo", c.pseudo ?? "");
    form.set("email", c.email ?? "");
    // optionally scroll to form
    if (typeof window !== "undefined") {
      document.getElementById("dm-order-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },
}));
```

- [ ] **Step 3: tsc + build + manual smoke**

Run: `npx tsc --noEmit && npm run build`

`npm run dev` → `/admin/orders`
- Type a customer name (e.g. "Ana") → dropdown shows matching customers, deduped by phone
- Click a result → chip appears, Recent Orders filters to that customer's orders
- Click "📋 Use customer" → entry form pre-fills name, phone, city, address details
- Click "✕" on chip → filter clears, full list returns
- Search by partial phone digits → matches orders whose phone contains those digits

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin-orders.ts \
        src/app/admin/orders/actions.ts \
        src/app/admin/orders/components/CustomerSearch.tsx \
        src/app/admin/orders/components/AdminOrdersClient.tsx \
        src/app/admin/orders/components/NewOrderRow.tsx \
        src/app/admin/orders/components/useOrderForm.ts
git commit -m "feat(admin): customer search with autofill chip + filtered recent orders"
```

---

## Slice 6 — Date filter + Load older

**Goal:** Date preset dropdown (Today/Yesterday/Last 7 days/This month/Custom range), filters orders server-side. Replace initial fetch + refresh with `searchOrdersAction`. "Load older" button paginates by 50.

**Spec section to follow:** "Date filter" + "Composing"

### Task 6.1: Add `searchOrders` to `src/lib/admin-orders.ts`

- [ ] **Step 1: Add the function**

```ts
export type OrderQueryFilter = {
  query?: string;        // currently unused server-side; client filters by customer
  dateFrom?: string;     // ISO date (yyyy-mm-dd)
  dateTo?: string;       // ISO date inclusive
  limit?: number;
  offset?: number;
};

export async function searchOrders(filter: OrderQueryFilter = {}): Promise<OrderRow[]> {
  const sdk = await getAdminSdk();
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;
  const params: Record<string, unknown> = {
    limit: Math.max(limit * 2, 50),  // over-fetch for replaced filter
    offset,
    order: "-created_at",
    fields: "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,*shipping_address",
  };
  if (filter.dateFrom) (params as Record<string, unknown>).created_at = { ...((params as Record<string, unknown>).created_at as object ?? {}), $gte: filter.dateFrom };
  if (filter.dateTo) {
    const to = new Date(filter.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    (params as Record<string, unknown>).created_at = {
      ...((params as Record<string, unknown>).created_at as object ?? {}),
      $lte: to.toISOString(),
    };
  }
  const res = await sdk.admin.order.list(params);
  const all = (res.orders as HttpTypes.AdminOrder[]).map(mapOrder);
  const visible = all.filter((o) => o.replacedByOrderId == null);
  return visible.slice(0, limit);
}
```

- [ ] **Step 2: Add `searchOrdersAction` to `actions.ts`**

```ts
export async function searchOrdersAction(filter: OrderQueryFilter = {}): Promise<OrderRow[]> {
  await requireAdmin();
  return searchOrders(filter);
}
```

- [ ] **Step 3: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 6.2: Create `DateFilter.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";

export type DateFilterValue =
  | { kind: "all" }
  | { kind: "preset"; preset: "today" | "yesterday" | "last7" | "thisMonth" }
  | { kind: "custom"; from: string; to: string };

export function DateFilter({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}) {
  const [showCustom, setShowCustom] = useState(value.kind === "custom");
  const [customFrom, setCustomFrom] = useState(value.kind === "custom" ? value.from : "");
  const [customTo, setCustomTo] = useState(value.kind === "custom" ? value.to : "");

  function selectPreset(p: string) {
    if (p === "all") { onChange({ kind: "all" }); setShowCustom(false); return; }
    if (p === "custom") { setShowCustom(true); return; }
    onChange({ kind: "preset", preset: p as "today" | "yesterday" | "last7" | "thisMonth" });
    setShowCustom(false);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value.kind === "preset" ? value.preset : value.kind}
        onChange={(e) => selectPreset(e.target.value)}
        className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1.5 text-xs"
      >
        <option value="all">📅 All time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="last7">Last 7 days</option>
        <option value="thisMonth">This month</option>
        <option value="custom">Custom range…</option>
      </select>
      {showCustom && (
        <>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1 text-xs" />
          <span className="text-xs">→</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1 text-xs" />
          <button onClick={() => onChange({ kind: "custom", from: customFrom, to: customTo })}
            className="rounded-md bg-coral-500 px-2 py-1 text-[11px] font-semibold uppercase text-white">
            Apply
          </button>
        </>
      )}
    </div>
  );
}

export function dateFilterToQuery(v: DateFilterValue): { dateFrom?: string; dateTo?: string } {
  if (v.kind === "all") return {};
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (v.kind === "custom") return { dateFrom: v.from || undefined, dateTo: v.to || undefined };
  switch (v.preset) {
    case "today": return { dateFrom: iso(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { dateFrom: iso(y), dateTo: iso(y) };
    }
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { dateFrom: iso(from) };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: iso(from) };
    }
  }
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 6.3: Wire date filter + pagination into `AdminOrdersClient`

- [ ] **Step 1: Add filter state + reload function**

```tsx
const [dateFilter, setDateFilter] = useState<DateFilterValue>({ kind: "all" });
const [offset, setOffset] = useState(0);

async function reloadOrders(opts: { reset?: boolean } = {}) {
  const queryParams = dateFilterToQuery(dateFilter);
  const nextOffset = opts.reset ? 0 : offset;
  const res = await searchOrdersAction({
    ...queryParams,
    limit: 50,
    offset: nextOffset,
  });
  if (opts.reset) {
    setOrders(res);
    setOffset(50);
  } else {
    setOrders((prev) => [...prev, ...res]);
    setOffset(nextOffset + 50);
  }
}

useEffect(() => {
  reloadOrders({ reset: true });
}, [dateFilter]);
```

- [ ] **Step 2: Render DateFilter + Load older button**

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
  <div className="flex-1"><CustomerSearch onSelect={setCustomerFilter} /></div>
  <DateFilter value={dateFilter} onChange={setDateFilter} />
</div>
{/* ...recent orders sheet... */}
<button onClick={() => reloadOrders()} className="mx-auto mt-3 block rounded-md border border-blush-400 px-3 py-1.5 text-xs">
  Load older
</button>
```

- [ ] **Step 3: tsc + build + smoke**

`npm run dev` → `/admin/orders`
- Date filter dropdown shows all presets
- Select "Today" → table shows only today's orders
- Select "Last 7 days" → table shows last week
- "Custom range…" → calendar inputs appear → pick from 2026-04-01 to 2026-04-30 → Apply → table shows April orders only
- Load older button appends 50 more orders to the bottom

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin-orders.ts \
        src/app/admin/orders/actions.ts \
        src/app/admin/orders/components/DateFilter.tsx \
        src/app/admin/orders/components/AdminOrdersClient.tsx
git commit -m "feat(admin): date filter (presets + custom) + load-older pagination"
```

---

## Slice 7 — Stock checker reposition + use-media-query hook

**Goal:** Stock checker becomes a sticky right-column card on desktop (≥1024px), and a bottom drawer triggered by a `📦 Stock` button on mobile. Two-column page grid on desktop.

**Spec section to follow:** "Page layout" → "Desktop" + "Mobile"

### Task 7.1: Create `src/lib/use-media-query.ts`

- [ ] **Step 1: Add the hook**

```ts
"use client";
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
```

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 7.2: Restructure `AdminOrdersClient` two-column layout (desktop)

- [ ] **Step 1: Update layout JSX**

```tsx
const isDesktop = useMediaQuery("(min-width: 1024px)");
const [stockOpen, setStockOpen] = useState(false);

return (
  <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
    <div className="space-y-4">
      {/* Top toolbar: customer search + date filter + (mobile) stock button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><CustomerSearch onSelect={setCustomerFilter} /></div>
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        {!isDesktop && (
          <button onClick={() => setStockOpen(true)}
            className="rounded-md border border-coral-500 px-3 py-1.5 text-xs font-semibold uppercase text-coral-700">
            📦 Stock
          </button>
        )}
      </div>
      {/* Customer chip */}
      {customerFilter && (...)}
      {/* New order entry */}
      <div id="dm-order-form"><NewOrderRow ref={formRef} onSaved={() => reloadOrders({ reset: true })} /></div>
      {/* Recent orders sheet */}
      <RecentOrdersSheet orders={visibleOrders} onChanged={() => reloadOrders({ reset: true })} />
    </div>
    {isDesktop && (
      <aside className="sticky top-3 self-start">
        <StockChecker onPickVariant={handlePick} />
      </aside>
    )}
    {/* Mobile drawer */}
    {!isDesktop && stockOpen && (
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-blush-400 bg-white p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base">Stock checker</h3>
          <button onClick={() => setStockOpen(false)} className="text-ink-muted">✕</button>
        </div>
        <StockChecker onPickVariant={(v) => { handlePick(v); setStockOpen(false); }} />
      </div>
    )}
  </div>
);
```

- [ ] **Step 2: Update `StockChecker.tsx` to remove its outer sticky wrapper**

The `<StockChecker>` no longer needs internal sticky/backdrop classes (those move to `<aside>`). Remove `autoFocus` on the input (causes scroll jumps on mobile drawer open).

- [ ] **Step 3: tsc + build + manual smoke**

`npm run dev` → `/admin/orders`
- Resize window to ≥1024px: stock checker is a fixed card on the right column, sticky as you scroll
- Resize to <1024px: stock checker is gone from layout, `📦 Stock` button visible in toolbar
- Click `📦 Stock` → bottom drawer slides up with the search + results
- Pick a variant in the drawer → drawer closes, variant added to the entry form

- [ ] **Step 4: Commit**

```bash
git add src/lib/use-media-query.ts \
        src/app/admin/orders/components/AdminOrdersClient.tsx \
        src/app/admin/orders/components/StockChecker.tsx
git commit -m "feat(admin): two-column layout — sticky stock checker on desktop, drawer on mobile"
```

---

## Slice 8 — Mobile responsive refinement

**Goal:** Mobile (<1024px) uses a stacked entry form (already works because the existing field layout collapses) AND a condensed Recent Orders list (not the wide table). Tap pencil on mobile → opens `OrderEditDrawer` (slide-up drawer) instead of the inline expanding row.

**Spec section to follow:** "Mobile / tablet" + "Mobile edit drawer"

### Task 8.1: Wire `OrderEditDrawer` for real

- [ ] **Step 1: Implement the drawer**

`src/app/admin/orders/components/OrderEditDrawer.tsx`:
```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import type { OrderRow } from "@/lib/admin-orders";
import { useOrderForm } from "./useOrderForm";
import { OrderFormLayout } from "./OrderRowFields";
import { updateOrderAction } from "../actions";

export function OrderEditDrawer({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // (Re-init the form when `order` changes.)
  const form = useOrderForm(order ? hydrateOrderToForm(order) : undefined);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    form.reset();
    Object.entries(hydrateOrderToForm(order)).forEach(([k, v]) => {
      // Type cast — initial map matches FormState shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.set(k as any, v as any);
    });
    // Hydrate items separately
    const realItems = order.items.filter(
      (it) => !/^Delivery\s—|^Discount$|^Adjustment$/.test(it.title),
    );
    form.setItems(realItems.map((it) => ({
      rid: Math.random().toString(36).slice(2, 9),
      kind: "variant" as const,
      title: it.title,
      quantity: it.quantity,
      unitPriceMur: it.unitPriceMur,
    })));
  }, [order?.id]);  // eslint-disable-line

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
      <button onClick={onClose} aria-label="Close" className="flex-1" />
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg">Editing #{order.displayId}</h3>
          <button onClick={onClose} className="text-ink-muted">✕</button>
        </div>
        {error && <p className="mb-3 rounded-md border border-coral-500 bg-coral-300/30 p-2 text-xs text-coral-700">{error}</p>}
        <OrderFormLayout form={form} />
        <div className="sticky bottom-0 mt-3 -mx-4 flex justify-end gap-2 border-t border-blush-300 bg-white px-4 py-3">
          <button onClick={onClose} className="rounded-md border border-blush-400 px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={() => {
            if (!form.isValid) { setError("Fill all required fields"); return; }
            startTransition(async () => {
              const res = await updateOrderAction(order.id, form.toCreateInput());
              if (res.ok) onSaved();
              else setError(res.error);
            });
          }} disabled={submitting}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-sm font-semibold uppercase text-white disabled:opacity-60">
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hydrateOrderToForm(order: OrderRow) {
  return {
    deliveryDate: order.deliveryDate ?? "",
    deliveryMethod: (order.deliveryMethod ?? "Pick Up") as DmDeliveryMethod,
    buyerName: order.buyerName,
    pseudo: order.pseudo ?? "",
    city: order.city ?? "",
    address2: order.addressDetails ?? "",
    phone: order.phone ?? "",
    email: order.email ?? "",
    customNotes: order.customNotes ?? "",
    paymentMethod: (order.paymentMethod ?? "Cash") as FormState["paymentMethod"],
    pointOfSale: (order.pointOfSale ?? "Instagram") as FormState["pointOfSale"],
    saleType: (order.saleType ?? "paid") as SaleType,
    status:
      order.status === "canceled" ? "cancelled" :
      order.fulfillmentStatus === "fulfilled" ? "delivered" :
      "" as FormState["status"],
    trackingNumber: order.trackingNumber ?? "",
  };
}
```

(The same `hydrateOrderToForm` lives in two places — `RecentOrdersSheet.EditableRow` and here. **Move it to `useOrderForm.ts`** as an exported helper to keep DRY: `export function hydrateOrderToForm(order: OrderRow): Partial<FormState>`.)

- [ ] **Step 2: tsc check**

Run: `npx tsc --noEmit`
Expected: clean

### Task 8.2: Switch mobile inline-edit to drawer in `RecentOrdersSheet`

- [ ] **Step 1: In `RecentOrdersSheet.tsx`**

Use `useMediaQuery` to swap edit modes:
```tsx
const isDesktop = useMediaQuery("(min-width: 1024px)");

// state: `editingId` for desktop inline; `mobileEditingOrder` for mobile drawer
const [mobileEditingOrder, setMobileEditingOrder] = useState<OrderRow | null>(null);

function handleEdit(o: OrderRow) {
  if (isDesktop) setEditingId(o.id);
  else setMobileEditingOrder(o);
}
```

In the JSX:
- Pass `onEdit={() => handleEdit(o)}` to `<ReadOnlyRow>`
- Render `<OrderEditDrawer open={mobileEditingOrder != null} order={mobileEditingOrder} onClose={() => setMobileEditingOrder(null)} onSaved={() => { setMobileEditingOrder(null); onChanged(); }} />` near the bottom of the section

### Task 8.3: Add condensed mobile list view

- [ ] **Step 1: In `RecentOrdersSheet.tsx`**

For mobile (<1024px), render a compact stacked list instead of the wide table:
```tsx
{!isDesktop && orders.length > 0 && (
  <ul className="mt-3 divide-y divide-blush-300/40">
    {orders.map((o) => (
      <li key={o.id} className="flex items-center gap-3 py-2">
        <button onClick={() => handleEdit(o)} className="text-coral-700">✏️</button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">#{o.displayId} · {o.buyerName || "—"}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {o.phone ?? "—"} · {o.deliveryMethod ?? "—"}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold">{formatPrice(o.totalMur, "mur")}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
            {o.status === "canceled" ? "Cancelled" : o.fulfillmentStatus === "fulfilled" ? "Delivered" : "Pending"}
          </span>
        </div>
      </li>
    ))}
  </ul>
)}
{isDesktop && orders.length > 0 && (
  /* existing horizontal-table */
)}
```

- [ ] **Step 2: tsc + build + manual mobile smoke**

`npm run dev` → open dev tools → toggle device toolbar → set to iPhone-sized viewport
- Recent orders list is a compact stacked list (NOT the wide table)
- Tap pencil on a row → drawer slides up from the bottom, ~90% of viewport
- Drawer has the full stacked form pre-filled with the order's data
- Save button at bottom (sticky)
- Edit phone → Save → drawer closes, list refreshes with new phone
- Resize wider than 1024px → table view returns

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/orders/components/OrderEditDrawer.tsx \
        src/app/admin/orders/components/RecentOrdersSheet.tsx \
        src/app/admin/orders/components/useOrderForm.ts
git commit -m "feat(admin): mobile-friendly edit drawer + condensed mobile order list"
```

---

## Slice 9 — Polish, edge cases, final verification

**Goal:** Tighten error handling, empty states, loading states. Confirm the bottom-nav is hidden, robots.txt blocks, and run the full smoke checklist.

### Task 9.1: Error toast / banner unification

- [ ] **Step 1: Extract a shared `<Toast>` or banner pattern**

Currently each component has its own `errorBanner` / `successBanner`. Add a tiny `ToastContext` in `AdminOrdersClient` (or simpler: a `<Banner>` component in `OrderRowFields.tsx`). Keep it scoped — no full toast library.

```tsx
export function Banner({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  const cls = tone === "ok"
    ? "border-blush-300 bg-blush-100/60 text-ink"
    : "border-coral-500 bg-coral-300/30 text-coral-700";
  return (
    <p role={tone === "ok" ? "status" : "alert"} className={`rounded-lg border px-3 py-1.5 text-sm ${cls}`}>
      {children}
    </p>
  );
}
```

Use it in NewOrderRow + EditableRow + OrderEditDrawer.

### Task 9.2: Empty states

- [ ] **Step 1: Pageful zero-data states**

- Recent Orders empty + no filter → "No orders yet. Save your first DM order above."
- Recent Orders empty + filter active → "No orders match this filter. ✕ Clear filter"
- Customer search empty → "No matches for '<query>'."
- Stock checker empty → "No matches. Try a different SKU or product name."

### Task 9.3: Verify Mobile bottom nav still hidden + noindex

- [ ] **Step 1: Inspect**

```bash
grep -n "MobileBottomNav" src/app/layout.tsx
grep -rn "admin" src/app/robots.ts
```

Expected: `MobileBottomNav` hidden via existing pathname check (`!pathname.startsWith("/admin")` or similar). `robots.ts` has `Disallow: /admin/`. If either is missing, fix it.

### Task 9.4: Edge cases

- [ ] **Step 1: Test these scenarios manually**

- Heavy edit when ALL items removed → server should reject with "Add at least one product" (use the existing client-side validation; keep the server-side defense in `editOrderHeavy` or `createDmOrder`)
- Heavy edit failing pre-flight (qty up beyond stock) → clear error, original order unchanged
- Heavy edit failing AFTER cancel (simulate by killing Medusa connection mid-flight if possible — otherwise just trust the code path) → error message, "Retry create" button (or just instruct user to recreate via New Order)
- Network error during light edit → error toast, no state corruption
- Customer search with phone digits only → matches
- Customer search with name typo → no false matches

### Task 9.5: Final verification pass

- [ ] **Step 1: Type-check + build + dev-server smoke**

```bash
npx tsc --noEmit
npm run build
npm run dev
```

Then walk the spec's "Acceptance" scenario verbatim:
- Open `/admin/orders` on phone-sized viewport → DM order entry, save → confirm in Medusa admin
- Open on desktop → click pencil on a recent order, fix a price → confirm cancel+recreate, replaces caption shows
- Search customer by name → use customer in entry → save new order
- Filter "Today" → only today's orders show
- Mark old order Delivered → light edit, instant

- [ ] **Step 2: Final commit**

```bash
git add .
git commit -m "polish(admin): banners, empty states, edge case handling for v2"
```

- [ ] **Step 3: Push to origin**

```bash
git push origin master
```

Coolify auto-deploys to `shop.dollupboutique.com`. Verify the live site at `https://shop.dollupboutique.com/admin/orders` shows the new UI and works end-to-end (login, stock check, save, edit).

---

## Self-review of this plan

**Spec coverage check:**
- ✅ Hybrid layout (Slice 7 + 8)
- ✅ B2 cancel-recreate edit semantics (Slice 4)
- ✅ VAT breakdown (Slice 2 — `VatBreakdown.tsx` + metadata persisting in `createDmOrder`)
- ✅ Customer search with autofill (Slice 5)
- ✅ Date filter (Slice 6)
- ✅ Inline edit + light/heavy split (Slice 3 + 4)
- ✅ Stock checker reposition (Slice 7)
- ✅ Mobile drawer (Slice 8)
- ✅ District removal from admin only (Slice 2)
- ✅ Conditional Tracking visibility (Slice 2 — `NewOrderRow.tsx` JSX condition)
- ✅ Replace-order metadata + filter from list (Slice 4)
- ✅ "↻ replaces #N" caption (Slice 4 task 4.3)
- ✅ Custom notes textarea (Slice 2)
- ✅ Pseudo + Email + Manual product collapsible "+" pattern (Slice 2 task 2.4)

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate handling" in steps. The drawer in Slice 1 task 1.4 IS a stub but that's deliberate — it's filled in in Slices 3, 4, and 8.

**Type consistency:** `OrderRow` type extensions across slices are consistent (city, addressDetails, customNotes, pseudo, trackingNumber, vatAmount, deliveryDate, replacesOrderId, replacesDisplayId, replacedByOrderId added in Slice 2 + 4). `CreateDmOrderInput` extensions in Slice 2 stay consistent through Slice 4's heavy edit reuse. `OrderLightPatch` in Slice 3 covers all light fields.

**Risks worth noting at execution time:**
1. Medusa `sdk.admin.order.update` may reject `metadata` updates on canceled orders. If Slice 4 step 5b fails because old order is canceled, that's recoverable (the cancel happened first; the metadata stamp on the OLD order is best-effort).
2. The `EditableRow` items hydration uses `kind: "variant"` for ALL items, but the original `variant_id` isn't currently exposed in `OrderRow`. **Fix in Slice 3 task 3.4 step 2: extend `OrderRow.items[]` to include `variantId: string | null`.** The heavy edit path needs this — without `variant_id`, item-level changes can't decrement the right inventory. Add this field to `mapOrder` in Slice 2 task 2.3.
3. Medusa's `order.list` `created_at` filter syntax (`$gte`/`$lte`) varies by version. If Slice 6 task 6.1 fails, fall back to fetching `limit: 200` and filtering client-side by `created_at` — slower but reliable.

These three risks are surfaced now so the implementer can catch them as they appear, rather than rediscovering them mid-build.

# Mystery Box Spin Wheel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mystery Box spin-wheel mechanic — customer picks a size, spins a wheel that randomly draws 5 in-stock products, locks the box at a flat **Rs 3,500**, then checks out through the normal Medusa cart flow. Stock is deducted naturally when the order completes (Medusa's standard behaviour). The total is forced to Rs 3,500 by a server-side cart-level discount adjustment that survives `cart.complete` validation.

**Architecture (two repos):**

- **Backend (`Backend/dollup-medusa`)** — a new workflow `apply-mystery-box-discount.ts` (mirrors the existing `apply-loyalty-discount.ts` pattern) and a Store API route `POST /store/mystery-box/create-cart`. The route creates a cart, adds the 5 line items at their normal prices, and applies a single discount adjustment so `cart.subtotal − adjustments = 3500`. The cart is stamped with `metadata.mystery_box = { id, size, applied_at, original_subtotal }`. A `completeCartWorkflow.hooks.validate` hook ensures the adjustment is still present at checkout.
- **Frontend (`DUB-front`)** — new `/events/mystery-box` route. Server fetches one in-stock pool per size; client component handles the size pick, spin animation (3 spins/day per session, localStorage), result view. "Lock this box" calls the backend route, replaces the localStorage cart id, refreshes the cart context, and routes to `/checkout`. Inventory deducts on order completion via the standard Medusa flow.

**Tech Stack:**
- Backend: Medusa v2.13.1, Yarn 4.12, TypeScript 5.6, Jest. Workflow uses `@medusajs/medusa/core-flows` + `@medusajs/framework/utils`.
- Frontend: Next.js 16 App Router (RSC for the pool, client for the wheel), React 19, TypeScript 5, Tailwind v4, `@medusajs/js-sdk@2.14.1`. No animation library — `setInterval` + CSS `transform`. No new deps. No frontend test runner — verification is `tsc --noEmit`, `next build`, manual browser smoke.

**Verification approach:**
- Backend has Jest. Add unit tests for the pure helpers (`buildMysteryBoxLineItemAdjustments`, validation logic) the same way `apply-loyalty-discount.test.ts` does.
- Frontend has no test runner. Each task ends with `tsc --noEmit` + manual verification per `DUB-front/CLAUDE.md`.

**Pre-flight (do once before Task 1):**
- Read `Backend/dollup-medusa/src/workflows/apply-loyalty-discount.ts` end-to-end. The Mystery Box discount workflow is structurally identical — same line-item adjustment spreading, same `completeCartWorkflow.hooks.validate` hook, same metadata-on-cart pattern. Don't reinvent.
- Read `Backend/dollup-medusa/src/workflows/__tests__/apply-loyalty-discount.test.ts` — copy the test scaffolding.
- Read `Backend/dollup-medusa/src/api/store/loyalty/redeem-apply/route.ts` — closest existing route in shape.
- Read `DUB-front/src/components/cart/CartProvider.tsx` and `DUB-front/src/lib/cart-client.ts` — understand `getStoredCartId` / `setStoredCartId` / `clearStoredCartId` and `refreshCart`. The Mystery Box flow swaps the stored cart id and refreshes.
- `cd Backend/dollup-medusa && yarn dev` and `cd DUB-front && npm run dev` in two terminals; keep both running through the plan.
- Have at least 30 in-stock products with size variants (enough for ~6 in each common size XS–XL) so spin pools are meaningful.

---

## Decisions baked into this plan

1. **Stock deducts at order completion, not at spin time.** Medusa decrements inventory when a cart completes — same as every other order on the storefront. The race condition (two customers spin and pick the same last-unit variant) is handled by Medusa's standard cart-completion inventory check; the loser sees a checkout error. Frontend shows a "Sorry, that piece just sold — spin again" recovery path.
2. **Flat Rs 3,500 enforced via cart-level discount adjustment**, spread across line items (mirrors loyalty pattern). This means each line item carries a slice of the discount, so any per-item display still works. `cart.total` will read `3500` directly — no client-side recomputation.
3. **`is_discountable` filter:** the workflow only applies the adjustment to `is_discountable !== false` items. All Mystery Box pool items must be `is_discountable === true` (the default). Skip products that aren't — they can't be in the pool.
4. **One mystery box cart at a time per customer.** Calling create-cart replaces their active cart. A frontend confirm() warns if their existing cart has items.
5. **Customer auth optional.** Mystery Box works for guest carts too (matches the rest of the storefront's COD checkout).
6. **Region/currency:** MUR only. Reject any region whose currency_code isn't `mur`.

---

## File Map

### Backend (`Backend/dollup-medusa/`)
| File | Purpose | Action |
| --- | --- | --- |
| `src/workflows/apply-mystery-box-discount.ts` | Pure helpers + `applyMysteryBoxDiscountToCart()` + `completeCartWorkflow.hooks.validate` hook | **Create** |
| `src/workflows/__tests__/apply-mystery-box-discount.test.ts` | Unit tests for the helpers | **Create** |
| `src/api/store/mystery-box/create-cart/route.ts` | `POST /store/mystery-box/create-cart` Store API route | **Create** |

### Frontend (`DUB-front/`)
| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/mystery-box.ts` | Pure helpers + types (`MysteryBoxSlot`, `MysteryBox`, `selectRandomBox`, `generateBoxId`, `sumBoxValue`) | **Create** |
| `src/lib/mystery-box-client.ts` | Client spin counter (3/day, localStorage, useSyncExternalStore) | **Create** |
| `src/lib/products.ts` | Add `listInStockProductsForSize(size, regionId)` helper | **Modify** |
| `src/app/events/mystery-box/page.tsx` | Server shell — fetches per-size pools, mounts client | **Create** |
| `src/app/events/mystery-box/MysteryBoxClient.tsx` | Size picker → wheel → result → lock CTA → checkout redirect | **Create** |
| `src/app/events/mystery-box/SpinWheel.tsx` | The animated 5-column strip | **Create** |
| `src/app/events/page.tsx` | Replace "DM to reserve" CTA with "Try the wheel →" link | **Modify** |
| `src/app/checkout/OrderSummary.tsx` | Render "Mystery Box" line + box id when `cart.metadata.mystery_box` is present | **Modify** |

---

## Backend tasks (do these first — frontend depends on them)

### Task B1: Discount workflow + validation hook

**Files:**
- Create: `Backend/dollup-medusa/src/workflows/apply-mystery-box-discount.ts`

This file mirrors `apply-loyalty-discount.ts`. Structurally identical: pure helpers, line-item adjustment spread, `completeCartWorkflow.hooks.validate` hook. The only difference is the discount calculation: Mystery Box discount = `subtotal − 3500`.

- [ ] **Step 1: Create the file**

```ts
// Backend/dollup-medusa/src/workflows/apply-mystery-box-discount.ts
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  completeCartWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"

export const MYSTERY_BOX_FLAT_PRICE_MUR = 3500
export const MYSTERY_BOX_ADJUSTMENT_CODE = "MYSTERY_BOX"
export const MYSTERY_BOX_ADJUSTMENT_DESCRIPTION = "Mystery Box flat-rate discount"

export type MysteryBoxMetadata = {
  id: string
  size: string
  flat_price_mur: number
  original_subtotal_mur: number
  applied_at: string
}

type CartAdjustment = {
  id?: string
  code?: string | null
  amount?: number | string | { value?: string | number } | null
}

type CartLineItem = {
  id: string
  quantity?: number | string | { value?: string | number } | null
  unit_price?: number | string | { value?: string | number } | null
  subtotal?: number | string | { value?: string | number } | null
  total?: number | string | { value?: string | number } | null
  is_discountable?: boolean
  adjustments?: CartAdjustment[]
}

type MysteryBoxCart = {
  id: string
  subtotal?: number | string | { value?: string | number } | null
  metadata?: Record<string, unknown> | null
  items?: CartLineItem[]
}

export function readMysteryBoxMetadata(
  metadata: Record<string, unknown> | null | undefined,
): MysteryBoxMetadata | null {
  const raw = metadata?.mystery_box
  if (!raw || typeof raw !== "object") return null

  const r = raw as Record<string, unknown>
  const id = typeof r.id === "string" ? r.id : null
  const size = typeof r.size === "string" ? r.size : null
  const flatPrice = Number(r.flat_price_mur)
  const originalSubtotal = Number(r.original_subtotal_mur)
  const appliedAt = typeof r.applied_at === "string" ? r.applied_at : null

  if (
    !id ||
    !size ||
    !appliedAt ||
    !Number.isFinite(flatPrice) ||
    flatPrice <= 0 ||
    !Number.isFinite(originalSubtotal) ||
    originalSubtotal <= 0
  ) {
    return null
  }

  return {
    id,
    size,
    flat_price_mur: Math.floor(flatPrice),
    original_subtotal_mur: Math.floor(originalSubtotal),
    applied_at: appliedAt,
  }
}

export function moneyNumber(
  value: number | string | { value?: string | number } | null | undefined,
) {
  if (typeof value === "object" && value !== null && "value" in value) {
    return Number(value.value)
  }
  return Number(value ?? 0)
}

/**
 * Discount that brings cart subtotal down to MYSTERY_BOX_FLAT_PRICE_MUR.
 * Returns 0 if the subtotal is already at or below the flat price (don't
 * make the customer pay more than catalogue if pool got cheap).
 */
export function calculateMysteryBoxDiscount(
  subtotalMur: number,
  flatPriceMur: number = MYSTERY_BOX_FLAT_PRICE_MUR,
) {
  if (!Number.isFinite(subtotalMur) || subtotalMur <= 0) return 0
  if (subtotalMur <= flatPriceMur) return 0
  return Math.floor(subtotalMur - flatPriceMur)
}

export function buildMysteryBoxLineItemAdjustments(
  cart: MysteryBoxCart,
  discountMur: number,
) {
  let remaining = Math.floor(discountMur)
  const items = (cart.items ?? []).filter((item) => {
    return item.is_discountable !== false && getLineItemSubtotal(item) > 0
  })
  const adjustments: {
    item_id: string
    code: string
    amount: number
    description: string
    provider_id: string
  }[] = []

  for (const item of items) {
    if (remaining <= 0) break
    const amount = Math.min(remaining, getLineItemSubtotal(item))
    if (amount <= 0) continue
    adjustments.push({
      item_id: item.id,
      code: MYSTERY_BOX_ADJUSTMENT_CODE,
      amount,
      description: MYSTERY_BOX_ADJUSTMENT_DESCRIPTION,
      provider_id: "mystery_box",
    })
    remaining -= amount
  }

  if (remaining > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Mystery Box discount exceeds discountable cart subtotal",
    )
  }

  return adjustments
}

export function assertCartHasMysteryBoxDiscount(cart: MysteryBoxCart) {
  const meta = readMysteryBoxMetadata(cart.metadata)
  if (!meta) return

  const subtotal = moneyNumber(cart.subtotal)
  const expectedDiscount = calculateMysteryBoxDiscount(
    subtotal,
    meta.flat_price_mur,
  )
  if (expectedDiscount === 0) return

  const adjustmentTotal = (cart.items ?? [])
    .flatMap((item) => item.adjustments ?? [])
    .filter((a) => a.code === MYSTERY_BOX_ADJUSTMENT_CODE)
    .reduce((sum, a) => sum + moneyNumber(a.amount), 0)

  if (Math.floor(adjustmentTotal) !== expectedDiscount) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Mystery Box cart is missing its discount adjustment",
    )
  }
}

export async function applyMysteryBoxDiscountToCart({
  cartId,
  container,
  refreshPaymentCollection = true,
}: {
  cartId: string
  container: MedusaContainer
  refreshPaymentCollection?: boolean
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "subtotal",
      "metadata",
      "items.*",
      "items.adjustments.*",
    ],
    filters: { id: cartId },
  })
  const cart = carts?.[0] as MysteryBoxCart | undefined
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${cartId} not found`,
    )
  }

  const meta = readMysteryBoxMetadata(cart.metadata)
  if (!meta) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart has no mystery_box metadata",
    )
  }

  const subtotal = moneyNumber(cart.subtotal)
  const discount = calculateMysteryBoxDiscount(subtotal, meta.flat_price_mur)
  if (discount <= 0) {
    // Subtotal already <= flat price; nothing to discount.
    return
  }

  const cartModuleService = container.resolve(Modules.CART) as {
    softDeleteLineItemAdjustments: (ids: string[]) => Promise<void>
    addLineItemAdjustments: (
      cartId: string,
      adjustments: ReturnType<typeof buildMysteryBoxLineItemAdjustments>,
    ) => Promise<unknown>
  }

  const existingIds = (cart.items ?? [])
    .flatMap((item) => item.adjustments ?? [])
    .filter((a) => a.code === MYSTERY_BOX_ADJUSTMENT_CODE)
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id))

  if (existingIds.length > 0) {
    await cartModuleService.softDeleteLineItemAdjustments(existingIds)
  }

  await cartModuleService.addLineItemAdjustments(
    cart.id,
    buildMysteryBoxLineItemAdjustments(cart, discount),
  )

  if (refreshPaymentCollection) {
    await refreshPaymentCollectionForCartWorkflow(container).run({
      input: { cart_id: cart.id },
    })
  }
}

function getLineItemSubtotal(item: CartLineItem) {
  const subtotal = moneyNumber(item.subtotal ?? item.total)
  if (subtotal > 0) return Math.floor(subtotal)
  return Math.max(
    0,
    Math.floor(moneyNumber(item.unit_price) * moneyNumber(item.quantity ?? 1)),
  )
}

completeCartWorkflow.hooks.validate(async ({ cart }) => {
  assertCartHasMysteryBoxDiscount(cart as MysteryBoxCart)
})
```

- [ ] **Step 2: Type-check**

```bash
cd Backend/dollup-medusa
yarn build 2>&1 | tail -30
```

Expected: clean build. If you get errors about the `Modules.CART` type cast, look at how `apply-loyalty-discount.ts` casts it on line 241 — same shape.

- [ ] **Step 3: Commit**

```bash
git add src/workflows/apply-mystery-box-discount.ts
git commit -m "feat(mystery-box): discount workflow + completeCart validation hook"
```

---

### Task B2: Unit tests for the discount helpers

**Files:**
- Create: `Backend/dollup-medusa/src/workflows/__tests__/apply-mystery-box-discount.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// Backend/dollup-medusa/src/workflows/__tests__/apply-mystery-box-discount.test.ts
import {
  buildMysteryBoxLineItemAdjustments,
  calculateMysteryBoxDiscount,
  MYSTERY_BOX_ADJUSTMENT_CODE,
  MYSTERY_BOX_FLAT_PRICE_MUR,
  readMysteryBoxMetadata,
} from "../apply-mystery-box-discount"

describe("calculateMysteryBoxDiscount", () => {
  it("returns subtotal − flat_price when subtotal exceeds flat", () => {
    expect(calculateMysteryBoxDiscount(5000)).toBe(1500)
    expect(calculateMysteryBoxDiscount(10000, 3500)).toBe(6500)
  })

  it("returns 0 when subtotal <= flat price", () => {
    expect(calculateMysteryBoxDiscount(3500)).toBe(0)
    expect(calculateMysteryBoxDiscount(2000)).toBe(0)
  })

  it("returns 0 for non-positive or non-finite subtotals", () => {
    expect(calculateMysteryBoxDiscount(0)).toBe(0)
    expect(calculateMysteryBoxDiscount(-100)).toBe(0)
    expect(calculateMysteryBoxDiscount(NaN)).toBe(0)
  })

  it("floors to integer", () => {
    expect(calculateMysteryBoxDiscount(5000.7)).toBe(1500)
  })
})

describe("buildMysteryBoxLineItemAdjustments", () => {
  it("spreads the discount across discountable line items", () => {
    const cart = {
      id: "cart_1",
      items: [
        { id: "li_1", subtotal: 1000, is_discountable: true },
        { id: "li_2", subtotal: 1500, is_discountable: true },
        { id: "li_3", subtotal: 2000, is_discountable: true },
      ],
    }
    const adj = buildMysteryBoxLineItemAdjustments(cart, 1500)
    expect(adj).toHaveLength(2)
    expect(adj[0]).toMatchObject({ item_id: "li_1", amount: 1000, code: MYSTERY_BOX_ADJUSTMENT_CODE })
    expect(adj[1]).toMatchObject({ item_id: "li_2", amount: 500, code: MYSTERY_BOX_ADJUSTMENT_CODE })
  })

  it("skips non-discountable items", () => {
    const cart = {
      id: "cart_2",
      items: [
        { id: "li_1", subtotal: 1000, is_discountable: false },
        { id: "li_2", subtotal: 2000, is_discountable: true },
      ],
    }
    const adj = buildMysteryBoxLineItemAdjustments(cart, 500)
    expect(adj).toHaveLength(1)
    expect(adj[0].item_id).toBe("li_2")
  })

  it("throws when discount exceeds discountable subtotal", () => {
    const cart = {
      id: "cart_3",
      items: [{ id: "li_1", subtotal: 1000, is_discountable: true }],
    }
    expect(() => buildMysteryBoxLineItemAdjustments(cart, 2000)).toThrow(
      /exceeds discountable/,
    )
  })
})

describe("readMysteryBoxMetadata", () => {
  it("parses a well-formed metadata object", () => {
    const got = readMysteryBoxMetadata({
      mystery_box: {
        id: "MB-2026-05-06-x7k2",
        size: "M",
        flat_price_mur: 3500,
        original_subtotal_mur: 5200,
        applied_at: "2026-05-06T12:00:00Z",
      },
    })
    expect(got).toMatchObject({
      id: "MB-2026-05-06-x7k2",
      size: "M",
      flat_price_mur: 3500,
      original_subtotal_mur: 5200,
    })
  })

  it("returns null for missing or malformed metadata", () => {
    expect(readMysteryBoxMetadata(null)).toBeNull()
    expect(readMysteryBoxMetadata({})).toBeNull()
    expect(readMysteryBoxMetadata({ mystery_box: "string" })).toBeNull()
    expect(
      readMysteryBoxMetadata({
        mystery_box: { id: "x", size: "M", flat_price_mur: 0, original_subtotal_mur: 1, applied_at: "now" },
      }),
    ).toBeNull()
  })
})

describe("MYSTERY_BOX_FLAT_PRICE_MUR", () => {
  it("is 3500", () => {
    expect(MYSTERY_BOX_FLAT_PRICE_MUR).toBe(3500)
  })
})
```

- [ ] **Step 2: Run them**

```bash
cd Backend/dollup-medusa
yarn test:unit src/workflows/__tests__/apply-mystery-box-discount.test.ts
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/workflows/__tests__/apply-mystery-box-discount.test.ts
git commit -m "test(mystery-box): unit tests for discount helpers"
```

---

### Task B3: `POST /store/mystery-box/create-cart` route

**Files:**
- Create: `Backend/dollup-medusa/src/api/store/mystery-box/create-cart/route.ts`

This route receives `{ size, region_id, slots: [{ variant_id }] }`, validates everything, creates a cart, adds line items, applies the discount, stamps metadata, returns `{ cart_id, mystery_box: { id, size, flat_price_mur, original_subtotal_mur } }`.

The frontend will pass the customer JWT if logged in (the route will associate the cart with that customer). Guests are also allowed — matches the rest of the COD flow.

- [ ] **Step 1: Create the file**

```ts
// Backend/dollup-medusa/src/api/store/mystery-box/create-cart/route.ts
import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  createCartWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  applyMysteryBoxDiscountToCart,
  MYSTERY_BOX_FLAT_PRICE_MUR,
  type MysteryBoxMetadata,
} from "../../../../../workflows/apply-mystery-box-discount"

const SLOT_COUNT = 5
const MAX_SIZE_LENGTH = 8
const ID_RANDOM = () => Math.random().toString(36).slice(2, 6)

function generateBoxId(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `MB-${y}-${m}-${d}-${ID_RANDOM()}`
}

type CreateCartBody = {
  region_id?: unknown
  size?: unknown
  slots?: unknown
}

export const POST = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id ?? null
  const body = (req.body ?? {}) as CreateCartBody

  // ---- Validate input shape ----
  const regionId = typeof body.region_id === "string" ? body.region_id : ""
  const size = typeof body.size === "string" ? body.size : ""
  const rawSlots = Array.isArray(body.slots) ? body.slots : []

  if (!regionId) {
    res.status(400).json({ message: "region_id is required" })
    return
  }
  if (!size || size.length > MAX_SIZE_LENGTH) {
    res.status(400).json({ message: "size is required and must be <= 8 chars" })
    return
  }
  if (rawSlots.length !== SLOT_COUNT) {
    res
      .status(400)
      .json({ message: `slots must have exactly ${SLOT_COUNT} entries` })
    return
  }

  const variantIds: string[] = []
  for (const s of rawSlots) {
    if (
      !s ||
      typeof s !== "object" ||
      typeof (s as { variant_id?: unknown }).variant_id !== "string"
    ) {
      res
        .status(400)
        .json({ message: "each slot must be { variant_id: string }" })
      return
    }
    variantIds.push((s as { variant_id: string }).variant_id)
  }

  // ---- Validate region currency ----
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { id: regionId },
  })
  const region = regions?.[0]
  if (!region) {
    res.status(404).json({ message: `Region ${regionId} not found` })
    return
  }
  if ((region.currency_code ?? "").toLowerCase() !== "mur") {
    res
      .status(400)
      .json({ message: "Mystery Box is only available in MUR" })
    return
  }

  // ---- Validate variants exist, are in stock, and match the requested size ----
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "title",
      "manage_inventory",
      "is_discountable",
      "inventory_quantity",
      "options.value",
      "product.id",
      "product.title",
      "calculated_price.calculated_amount",
    ],
    filters: { id: variantIds },
  })

  if (!variants || variants.length !== variantIds.length) {
    res.status(404).json({ message: "One or more variants not found" })
    return
  }

  const v = variants as Array<{
    id: string
    sku: string | null
    title: string | null
    manage_inventory?: boolean
    is_discountable?: boolean
    inventory_quantity?: number
    options?: Array<{ value: string }>
    product?: { id: string; title?: string | null }
    calculated_price?: { calculated_amount?: number } | null
  }>

  const requestedSizeUpper = size.toUpperCase()
  const outOfStock: string[] = []
  const wrongSize: string[] = []
  const notDiscountable: string[] = []
  let originalSubtotal = 0

  for (const variant of v) {
    if (variant.is_discountable === false) notDiscountable.push(variant.id)

    const matchesSize = (variant.options ?? []).some(
      (o) => o.value?.toUpperCase() === requestedSizeUpper,
    )
    if (!matchesSize) wrongSize.push(variant.id)

    if (variant.manage_inventory) {
      const qty = Number(variant.inventory_quantity ?? 0)
      if (!Number.isFinite(qty) || qty < 1) outOfStock.push(variant.id)
    }

    const price = Number(variant.calculated_price?.calculated_amount ?? 0)
    if (!Number.isFinite(price) || price <= 0) {
      res
        .status(400)
        .json({ message: `Variant ${variant.id} has no valid price` })
      return
    }
    originalSubtotal += price
  }

  if (outOfStock.length > 0) {
    res.status(409).json({
      message: "Some items are out of stock",
      out_of_stock_variant_ids: outOfStock,
    })
    return
  }
  if (wrongSize.length > 0) {
    res.status(400).json({
      message: "Some items don't match the requested size",
      wrong_size_variant_ids: wrongSize,
    })
    return
  }
  if (notDiscountable.length > 0) {
    res.status(400).json({
      message: "Some items are not discountable",
      not_discountable_variant_ids: notDiscountable,
    })
    return
  }
  if (originalSubtotal < MYSTERY_BOX_FLAT_PRICE_MUR) {
    res.status(400).json({
      message: `Box value (Rs ${originalSubtotal}) is below the flat price (Rs ${MYSTERY_BOX_FLAT_PRICE_MUR}). Pick a different size or refresh.`,
    })
    return
  }

  // ---- Create cart with the 5 line items ----
  const boxId = generateBoxId()
  const appliedAt = new Date().toISOString()

  const { result: createdCart } = await createCartWorkflow(req.scope).run({
    input: {
      region_id: regionId,
      currency_code: "mur",
      customer_id: customerId ?? undefined,
      metadata: {
        mystery_box: {
          id: boxId,
          size: requestedSizeUpper,
          flat_price_mur: MYSTERY_BOX_FLAT_PRICE_MUR,
          original_subtotal_mur: originalSubtotal,
          applied_at: appliedAt,
        } satisfies MysteryBoxMetadata,
      },
      sales_channel_id: req.publishable_key_context?.sales_channel_ids?.[0],
    },
  })

  const cartId = (createdCart as { id: string }).id

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      items: variantIds.map((variantId) => ({
        variant_id: variantId,
        quantity: 1,
      })),
    },
  })

  // ---- Apply the flat-price discount adjustment ----
  try {
    await applyMysteryBoxDiscountToCart({
      cartId,
      container: req.scope,
    })
  } catch (err) {
    // If anything went wrong applying the discount, soft-delete the cart so
    // we don't leave a Rs 5,200 cart sitting around without its discount.
    const cartModule = req.scope.resolve(Modules.CART) as {
      softDeleteCarts: (ids: string[]) => Promise<void>
    }
    await cartModule.softDeleteCarts([cartId]).catch(() => undefined)
    if (err instanceof MedusaError) throw err
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : "Failed to apply mystery box discount",
    )
  }

  res.json({
    cart_id: cartId,
    mystery_box: {
      id: boxId,
      size: requestedSizeUpper,
      flat_price_mur: MYSTERY_BOX_FLAT_PRICE_MUR,
      original_subtotal_mur: originalSubtotal,
      applied_at: appliedAt,
    },
  })
}
```

- [ ] **Step 2: Build + manual smoke**

```bash
cd Backend/dollup-medusa
yarn build
yarn dev
```

In a separate terminal, smoke-test against the dev server. Replace `<region_id>` and `<variant_id_X>` with real ones from your DB:

```bash
# Get a region id
curl -s http://localhost:9000/store/regions \
  -H "x-publishable-api-key: <pak>" | jq '.regions[0].id'

# Pick 5 in-stock variant ids of size M from /store/products

# Create the mystery box cart
curl -s -X POST http://localhost:9000/store/mystery-box/create-cart \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: <pak>" \
  -d '{
    "region_id": "<region_id>",
    "size": "M",
    "slots": [
      { "variant_id": "<v1>" },
      { "variant_id": "<v2>" },
      { "variant_id": "<v3>" },
      { "variant_id": "<v4>" },
      { "variant_id": "<v5>" }
    ]
  }' | jq

# Then retrieve the cart to confirm the math
curl -s "http://localhost:9000/store/carts/<cart_id>?fields=*items,*items.adjustments,+subtotal,+total,metadata" \
  -H "x-publishable-api-key: <pak>" | jq
```

Expected:
- 200 with `{ cart_id, mystery_box: { id, size, flat_price_mur: 3500, original_subtotal_mur: ..., applied_at } }`
- Cart retrieve: `subtotal` is the natural total of the 5 items, `total` is `3500`, each line item has an adjustment with `code: "MYSTERY_BOX"`, `metadata.mystery_box` is stamped.
- Try with an out-of-stock variant → 409 with `out_of_stock_variant_ids`.
- Try with a wrong-size variant → 400 with `wrong_size_variant_ids`.
- Try with an EUR region → 400 "Mystery Box is only available in MUR".

- [ ] **Step 3: Commit + push backend**

```bash
git add src/api/store/mystery-box/
git commit -m "feat(mystery-box): POST /store/mystery-box/create-cart with stock + discount"
git push
```

(Coolify will rebuild + redeploy `api.dollupboutique.com` automatically.)

---

## Frontend tasks

### Task F1: Pure helpers + types

**Files:**
- Create: `DUB-front/src/lib/mystery-box.ts`

Pure functions only — no React, no DOM, no fetch. Types are shared between server-rendered pool fetch and the client wheel.

- [ ] **Step 1: Create the file**

```ts
// DUB-front/src/lib/mystery-box.ts

export type CanonicalSize =
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "2XL"
  | "3XL"
  | "4XL"
  | "FREE";

export type MysteryBoxSlot = {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  size: string;
  thumbnail: string | null;
  price_mur: number;
};

export type MysteryBox = {
  id: string;          // local placeholder until backend returns real id
  size: CanonicalSize;
  slots: MysteryBoxSlot[];
  total_value_mur: number;
  flat_price_mur: number;
};

export const MYSTERY_BOX_FLAT_PRICE_MUR = 3500;
export const MYSTERY_BOX_SLOT_COUNT = 5;

/** Fisher-Yates shuffle, take N. */
export function selectRandomBox(
  pool: MysteryBoxSlot[],
  count: number = MYSTERY_BOX_SLOT_COUNT,
): MysteryBoxSlot[] {
  if (pool.length < count) {
    throw new Error(
      `Not enough products in pool: have ${pool.length}, need ${count}`,
    );
  }
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function generateBoxId(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6);
  return `MB-${y}-${m}-${d}-${rand}`;
}

export function sumBoxValue(slots: MysteryBoxSlot[]): number {
  return slots.reduce((acc, s) => acc + s.price_mur, 0);
}
```

- [ ] **Step 2: Type-check**

```bash
cd DUB-front
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/mystery-box.ts
git commit -m "feat(mystery-box): pure helpers + types"
```

---

### Task F2: Spin counter (3/day, localStorage)

**Files:**
- Create: `DUB-front/src/lib/mystery-box-client.ts`

Mirrors `wishlist-client.ts`: `useSyncExternalStore` + `localStorage` + a stable cached snapshot to avoid React #185 infinite loops (this exact bug bit the wishlist before — see `storefront-polish-session-2026-05-04.md`).

- [ ] **Step 1: Create the file**

```ts
// DUB-front/src/lib/mystery-box-client.ts
"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dub_mystery_box_spins";
const DAILY_LIMIT = 3;

type SpinRecord = { date: string; spins: number };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function readRecord(): SpinRecord {
  if (typeof window === "undefined") return { date: todayKey(), spins: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), spins: 0 };
    const parsed = JSON.parse(raw) as SpinRecord;
    if (parsed.date !== todayKey()) return { date: todayKey(), spins: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), spins: 0 };
  }
}

function writeRecord(r: SpinRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  window.dispatchEvent(new CustomEvent("dub:mystery-spin-change"));
}

let cachedSnapshot: SpinRecord | null = null;
let cachedKey = "";

function getSnapshot(): SpinRecord {
  const r = readRecord();
  const key = `${r.date}:${r.spins}`;
  if (key !== cachedKey) {
    cachedSnapshot = r;
    cachedKey = key;
  }
  return cachedSnapshot!;
}

function getServerSnapshot(): SpinRecord {
  return { date: todayKey(), spins: 0 };
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("dub:mystery-spin-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("dub:mystery-spin-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useSpinCounter(): {
  spinsUsed: number;
  spinsRemaining: number;
  canSpin: boolean;
  recordSpin: () => void;
  reset: () => void;
} {
  const record = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    spinsUsed: record.spins,
    spinsRemaining: Math.max(0, DAILY_LIMIT - record.spins),
    canSpin: record.spins < DAILY_LIMIT,
    recordSpin: () => writeRecord({ date: todayKey(), spins: record.spins + 1 }),
    reset: () => writeRecord({ date: todayKey(), spins: 0 }),
  };
}

export const MYSTERY_BOX_DAILY_LIMIT = DAILY_LIMIT;
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/mystery-box-client.ts
git commit -m "feat(mystery-box): client spin counter — 3/day with daily reset"
```

---

### Task F3: `listInStockProductsForSize` server helper

**Files:**
- Modify: `DUB-front/src/lib/products.ts`

- [ ] **Step 1: Read the file first to find the existing fetch pattern**

```bash
cat DUB-front/src/lib/products.ts | head -40
```

Note the existing `import { sdk } from "./medusa"` (or whatever the server SDK import looks like) and copy the import style.

- [ ] **Step 2: Append the helper**

```ts
// Append to DUB-front/src/lib/products.ts:

import type { CanonicalSize, MysteryBoxSlot } from "@/lib/mystery-box";
// (mystery-box.ts is pure types/helpers — safe to import from server code.)

const MYSTERY_BOX_POOL_LIMIT = 200;

export async function listInStockProductsForSize(
  size: CanonicalSize,
  regionId: string,
): Promise<MysteryBoxSlot[]> {
  // Use whichever server-side SDK accessor this file already uses.
  // Look at the top of products.ts for the existing pattern.
  const { products } = await sdk.store.product.list({
    region_id: regionId,
    limit: MYSTERY_BOX_POOL_LIMIT,
    fields:
      "id,title,thumbnail," +
      "variants.id,variants.sku,variants.title,variants.is_discountable," +
      "variants.inventory_quantity,variants.manage_inventory," +
      "variants.calculated_price.calculated_amount," +
      "variants.options.value",
  });

  const pool: MysteryBoxSlot[] = [];

  for (const p of products) {
    for (const v of p.variants ?? []) {
      type V = {
        id?: string;
        sku?: string | null;
        is_discountable?: boolean;
        manage_inventory?: boolean;
        inventory_quantity?: number;
        options?: { value: string }[];
        calculated_price?: { calculated_amount?: number } | null;
      };
      const variant = v as unknown as V;

      if (variant.is_discountable === false) continue;

      // Stock check — only enforce when manage_inventory is true.
      if (variant.manage_inventory) {
        const qty = Number(variant.inventory_quantity ?? 0);
        if (!Number.isFinite(qty) || qty < 1) continue;
      }

      // Size match — variant.options is [{ value: "M" }, ...]
      const matchesSize = (variant.options ?? []).some(
        (o) => canonicalSize(o.value) === size,
      );
      if (!matchesSize) continue;

      const price = Number(variant.calculated_price?.calculated_amount ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;

      pool.push({
        productId: p.id,
        variantId: variant.id!,
        sku: variant.sku ?? p.id,
        title: p.title ?? "Untitled",
        size,
        thumbnail: p.thumbnail ?? null,
        price_mur: price,
      });
    }
  }

  return pool;
}
```

If `canonicalSize` is not yet exported from `products.ts`, search the codebase for it (it's used by `ShopFilterSidebar` and the shop filters per `storefront-polish-session-2026-05-04.md`). If it lives in another lib, import it; if it's local to `products.ts`, just call it directly.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

If types complain about the `variant.calculated_price` shape, look at `node_modules/@medusajs/types/dist/http/product/common.d.ts` for the right interface name (per `DUB-front/CLAUDE.md`: real names sometimes differ from doc names).

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts
git commit -m "feat(mystery-box): listInStockProductsForSize server helper"
```

---

### Task F4: `SpinWheel` visual

**Files:**
- Create: `DUB-front/src/app/events/mystery-box/SpinWheel.tsx`

5 vertical strips of thumbnails. Each strip starts at offset 0, animates `translateY` to its bottom-most tile (the chosen one) over ~2.2s with a `cubic-bezier` ease-out so it feels like the wheel lands.

- [ ] **Step 1: Create the file**

```tsx
// DUB-front/src/app/events/mystery-box/SpinWheel.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MysteryBoxSlot } from "@/lib/mystery-box";

type Props = {
  pool: MysteryBoxSlot[];
  selected: MysteryBoxSlot[] | null;
  spinning: boolean;
  onSpinEnd: () => void;
};

const STRIP_TILE_HEIGHT = 96;
const STRIP_TILES_PER_COLUMN = 24;
const SPIN_DURATION_MS = 2200;

export function SpinWheel({ pool, selected, spinning, onSpinEnd }: Props) {
  const [columns, setColumns] = useState<MysteryBoxSlot[][]>(() =>
    Array.from({ length: 5 }, () => []),
  );
  const calledRef = useRef(false);

  useEffect(() => {
    if (!spinning || !selected) return;
    calledRef.current = false;

    const next: MysteryBoxSlot[][] = selected.map((finalSlot, colIdx) => {
      const cycle: MysteryBoxSlot[] = [];
      for (let i = 0; i < STRIP_TILES_PER_COLUMN - 1; i++) {
        cycle.push(pool[(colIdx * 7 + i * 3) % pool.length]);
      }
      cycle.push(finalSlot);
      return cycle;
    });
    setColumns(next);

    const t = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onSpinEnd();
      }
    }, SPIN_DURATION_MS + 100);
    return () => clearTimeout(t);
  }, [spinning, selected, pool, onSpinEnd]);

  return (
    <div className="grid grid-cols-5 gap-2 overflow-hidden rounded-2xl bg-ink p-3">
      {columns.map((col, i) => (
        <div
          key={i}
          className="relative h-[96px] overflow-hidden rounded-xl bg-ink/60"
        >
          <div
            className="will-change-transform"
            style={{
              transform: spinning
                ? `translateY(-${(STRIP_TILES_PER_COLUMN - 1) * STRIP_TILE_HEIGHT}px)`
                : "translateY(0)",
              transition: spinning
                ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.8, 0.25, 1)`
                : "none",
            }}
          >
            {col.map((slot, j) => (
              <div
                key={`${i}-${j}-${slot.variantId}`}
                className="flex h-[96px] items-center justify-center"
              >
                {slot.thumbnail ? (
                  <Image
                    src={slot.thumbnail}
                    alt=""
                    width={80}
                    height={80}
                    className="h-[80px] w-[80px] rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-[80px] w-[80px] rounded-lg bg-blush-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/app/events/mystery-box/SpinWheel.tsx
git commit -m "feat(mystery-box): SpinWheel visual — 5-column animated strip"
```

---

### Task F5: `MysteryBoxClient` orchestrator (calls real backend)

**Files:**
- Create: `DUB-front/src/app/events/mystery-box/MysteryBoxClient.tsx`

Picks size → spins → result → "Lock & checkout" button. The lock button:
1. (If existing cart has items) `confirm("This will replace your current cart with the Mystery Box. Continue?")`
2. POST to `/store/mystery-box/create-cart`
3. On 200: `setStoredCartId(cart_id)`, `await refreshCart()`, `router.push("/checkout")`
4. On 409 out_of_stock: show "Sorry, that piece just sold — spin again", restore the spin (don't burn one)
5. On other errors: show generic error + retry

- [ ] **Step 1: Create the file**

```tsx
// DUB-front/src/app/events/mystery-box/MysteryBoxClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SpinWheel } from "./SpinWheel";
import {
  generateBoxId,
  MYSTERY_BOX_FLAT_PRICE_MUR,
  MYSTERY_BOX_SLOT_COUNT,
  selectRandomBox,
  sumBoxValue,
  type CanonicalSize,
  type MysteryBox,
  type MysteryBoxSlot,
} from "@/lib/mystery-box";
import {
  useSpinCounter,
  MYSTERY_BOX_DAILY_LIMIT,
} from "@/lib/mystery-box-client";
import { useCart } from "@/components/cart/CartProvider";
import { clientSdk, setStoredCartId } from "@/lib/cart-client";

type Props = {
  poolsBySize: Partial<Record<CanonicalSize, MysteryBoxSlot[]>>;
  regionId: string;
};

const SIZE_OPTIONS: CanonicalSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

type LockError =
  | { kind: "out_of_stock"; ids: string[] }
  | { kind: "generic"; message: string };

export function MysteryBoxClient({ poolsBySize, regionId }: Props) {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { spinsUsed, spinsRemaining, canSpin, recordSpin } = useSpinCounter();
  const [size, setSize] = useState<CanonicalSize | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [box, setBox] = useState<MysteryBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<LockError | null>(null);

  const pool = size ? poolsBySize[size] ?? [] : [];
  const poolReady = pool.length >= MYSTERY_BOX_SLOT_COUNT;

  const cartHasOtherItems = useMemo(
    () => (cart?.items?.length ?? 0) > 0,
    [cart],
  );

  const startSpin = () => {
    if (!size || !poolReady || !canSpin) return;
    setError(null);
    setLockError(null);
    let slots: MysteryBoxSlot[];
    try {
      slots = selectRandomBox(pool, MYSTERY_BOX_SLOT_COUNT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pick a box");
      return;
    }
    const next: MysteryBox = {
      id: generateBoxId(), // placeholder; backend assigns the real id
      size,
      slots,
      total_value_mur: sumBoxValue(slots),
      flat_price_mur: MYSTERY_BOX_FLAT_PRICE_MUR,
    };
    setBox(next);
    setSpinning(true);
    recordSpin();
  };

  const handleLock = async () => {
    if (!box || !size) return;
    if (cartHasOtherItems) {
      const ok = window.confirm(
        "This will replace your current cart with the Mystery Box. Continue?",
      );
      if (!ok) return;
    }

    setLocking(true);
    setLockError(null);
    try {
      const res = await clientSdk.client.fetch<{
        cart_id: string;
        mystery_box: { id: string; size: string; flat_price_mur: number };
      }>("/store/mystery-box/create-cart", {
        method: "POST",
        body: {
          region_id: regionId,
          size,
          slots: box.slots.map((s) => ({ variant_id: s.variantId })),
        },
      });

      setStoredCartId(res.cart_id);
      await refreshCart();
      router.push("/checkout");
    } catch (e) {
      // Try to extract structured error from Medusa SDK
      const errAny = e as {
        message?: string;
        body?: { out_of_stock_variant_ids?: string[]; message?: string };
        status?: number;
      };
      const ids = errAny.body?.out_of_stock_variant_ids;
      if (Array.isArray(ids) && ids.length > 0) {
        setLockError({ kind: "out_of_stock", ids });
      } else {
        setLockError({
          kind: "generic",
          message: errAny.body?.message ?? errAny.message ?? "Could not lock this box",
        });
      }
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Size */}
      <section>
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
          ✦ Step 1
        </p>
        <h2 className="mb-4 font-display text-[24px] leading-tight text-white md:text-[32px]">
          Pick your size
        </h2>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((s) => {
            const available = (poolsBySize[s]?.length ?? 0) >= MYSTERY_BOX_SLOT_COUNT;
            return (
              <button
                key={s}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSize(s);
                  setBox(null);
                  setError(null);
                  setLockError(null);
                }}
                className={[
                  "rounded-full border px-5 py-2.5 font-sans text-[12px] font-bold uppercase tracking-[0.12em] transition-colors",
                  size === s
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-white/30 text-white hover:border-coral-300 hover:text-coral-300",
                  !available && "cursor-not-allowed opacity-30",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {s}
              </button>
            );
          })}
        </div>
        {size && !poolReady && (
          <p className="mt-3 font-sans text-[12px] text-coral-300">
            Not enough stock in size {size} right now. Try another size.
          </p>
        )}
      </section>

      {/* Step 2: Wheel */}
      {size && poolReady && (
        <section>
          <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ✦ Step 2
          </p>
          <h2 className="mb-4 font-display text-[24px] leading-tight text-white md:text-[32px]">
            Spin the wheel
          </h2>

          <SpinWheel
            pool={pool}
            selected={box?.slots ?? null}
            spinning={spinning}
            onSpinEnd={() => setSpinning(false)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-[12px] text-white/70">
              {spinsRemaining} of {MYSTERY_BOX_DAILY_LIMIT} spins left today
            </p>
            <button
              type="button"
              disabled={spinning || !canSpin}
              onClick={startSpin}
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
            >
              {spinning ? "Spinning…" : box ? "Spin again" : "Spin →"}
            </button>
          </div>

          {!canSpin && (
            <p className="mt-2 font-sans text-[12px] text-coral-300">
              You've used all {MYSTERY_BOX_DAILY_LIMIT} spins today. Come back tomorrow.
            </p>
          )}
          {error && (
            <p className="mt-2 font-sans text-[12px] text-coral-300">{error}</p>
          )}
        </section>
      )}

      {/* Step 3: Result */}
      {box && !spinning && (
        <section className="rounded-2xl bg-white/10 p-6 text-white">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ✦ Your box
          </p>
          <h2 className="mb-4 font-display text-[24px] leading-tight md:text-[32px]">
            5 surprises · Rs {box.flat_price_mur.toLocaleString("en-MU")}
          </h2>

          <ul className="grid gap-2 md:grid-cols-2">
            {box.slots.map((s, i) => (
              <li
                key={`${s.variantId}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
              >
                <span className="font-display text-[18px] text-coral-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-sans text-[13px] text-white">
                  {s.title}{" "}
                  <span className="text-white/60">— size {s.size}</span>
                </span>
                <span className="font-sans text-[12px] text-white/60">{s.sku}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-sans text-[12px] text-white/70">
            Catalogue value: Rs {box.total_value_mur.toLocaleString("en-MU")} · You pay Rs {box.flat_price_mur.toLocaleString("en-MU")}
          </p>

          <button
            type="button"
            disabled={locking}
            onClick={handleLock}
            className="mt-5 rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
          >
            {locking ? "Locking…" : "Lock this box & checkout →"}
          </button>

          {lockError?.kind === "out_of_stock" && (
            <p className="mt-3 font-sans text-[12px] text-coral-300">
              Sorry, one or more of those just sold. Spin again to get a fresh box.
            </p>
          )}
          {lockError?.kind === "generic" && (
            <p className="mt-3 font-sans text-[12px] text-coral-300">
              {lockError.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

The `clientSdk.client.fetch` error shape may differ from what's typed. If your error-extraction casts trip TypeScript, fall back to the SDK's actual `FetchError` import (look at how `loyalty-client.ts` from the loyalty plan handles 401 — same vendor SDK).

- [ ] **Step 3: Commit**

```bash
git add src/app/events/mystery-box/MysteryBoxClient.tsx
git commit -m "feat(mystery-box): client orchestrator wired to real /store/mystery-box/create-cart"
```

---

### Task F6: Server shell page

**Files:**
- Create: `DUB-front/src/app/events/mystery-box/page.tsx`

Server component. Fetches one pool per supported size in parallel, hands them and the region id to the client.

- [ ] **Step 1: Create the file**

```tsx
// DUB-front/src/app/events/mystery-box/page.tsx
import type { Metadata } from "next";
import { getRegion } from "@/lib/region";
import { listInStockProductsForSize } from "@/lib/products";
import type { CanonicalSize, MysteryBoxSlot } from "@/lib/mystery-box";
import { MysteryBoxClient } from "./MysteryBoxClient";

export const metadata: Metadata = {
  title: "Mystery Box · Spin the wheel",
  description:
    "Pick your size, spin our mystery wheel, lock 5 surprise pieces for a flat Rs 3,500.",
  alternates: { canonical: "/events/mystery-box" },
  openGraph: {
    title: "Mystery Box",
    description: "5 surprise pieces · Rs 3,500 · Mauritius only",
    url: "/events/mystery-box",
  },
};

const SIZES: CanonicalSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export const revalidate = 600; // 10 min

export default async function MysteryBoxPage() {
  const region = await getRegion();
  if (!region) {
    return (
      <div className="bg-ink px-6 py-20 text-center text-white">
        <p className="font-sans text-[14px] text-white/70">
          Mystery Box is currently unavailable. Try again later.
        </p>
      </div>
    );
  }

  const pools = await Promise.all(
    SIZES.map(async (s): Promise<[CanonicalSize, MysteryBoxSlot[]]> => {
      try {
        const pool = await listInStockProductsForSize(s, region.id);
        return [s, pool];
      } catch {
        return [s, []];
      }
    }),
  );
  const poolsBySize: Partial<Record<CanonicalSize, MysteryBoxSlot[]>> =
    Object.fromEntries(pools);

  return (
    <div className="bg-ink min-h-screen px-6 py-14 text-white md:px-10 md:py-20">
      <div className="mx-auto max-w-[1100px]">
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
          🎁 Mystery Box
        </p>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-[-1px] md:text-[64px]">
          Spin the wheel.{" "}
          <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
            Trust the drop.
          </em>
        </h1>
        <p className="mt-4 max-w-[560px] font-sans text-[14px] leading-[1.55] text-white/80 md:text-[15px]">
          5 surprise pieces curated for your size. Flat Rs 3,500. Always more value than the price tag.
        </p>

        <div className="mt-10">
          <MysteryBoxClient poolsBySize={poolsBySize} regionId={region.id} />
        </div>

        <p className="mt-12 font-sans text-[11px] text-white/50">
          Free delivery + COD across Mauritius · Stock is reserved at checkout, not at spin time.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: route `/events/mystery-box` shows up in the build manifest.

- [ ] **Step 3: Commit**

```bash
git add src/app/events/mystery-box/page.tsx
git commit -m "feat(mystery-box): server shell with per-size pools"
```

---

### Task F7: Wire the events page CTA

**Files:**
- Modify: `DUB-front/src/app/events/page.tsx`

- [ ] **Step 1: Replace the "Coming soon" pill with a real link**

In the Mystery Box section's CTA cluster, replace:

```tsx
<span className="rounded-full bg-coral-500/20 px-5 py-2.5 ...">
  Coming soon — DM to reserve yours
</span>
```

with:

```tsx
<Link
  href="/events/mystery-box"
  className="rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
>
  Try the wheel →
</Link>
```

(`Link` is already imported at the top of the file.)

- [ ] **Step 2: Commit**

```bash
git add src/app/events/page.tsx
git commit -m "feat(mystery-box): wire /events CTA to /events/mystery-box"
```

---

### Task F8: OrderSummary line for the locked box

**Files:**
- Modify: `DUB-front/src/app/checkout/OrderSummary.tsx`

When `cart.metadata.mystery_box` is present, show "Mystery Box · MB-..." as a labelled line between subtotal and total. The discount itself shows up as the negative delta in the existing total — no need to render the adjustment separately.

- [ ] **Step 1: Add the conditional line**

Find where subtotal/shipping/total are rendered. Add this block above the total (or wherever feels natural):

```tsx
{(() => {
  const mb = cart?.metadata?.mystery_box as
    | { id: string; size: string; flat_price_mur: number }
    | undefined;
  if (!mb) return null;
  return (
    <div className="rounded-xl border border-coral-500/40 bg-coral-500/5 p-3">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-coral-500">
        🎁 Mystery Box
      </p>
      <p className="mt-1 font-sans text-[12px] text-ink">
        Box <strong>{mb.id}</strong> · size {mb.size} · flat Rs {mb.flat_price_mur.toLocaleString("en-MU")}
      </p>
    </div>
  );
})()}
```

- [ ] **Step 2: Smoke test full happy path**

```bash
npm run dev
```

1. `/events/mystery-box` → pick M → spin → lock & checkout
2. `/checkout` shows the 5 line items, the Mystery Box meta line, total = Rs 3,500
3. Fill the form, place order
4. Order completes; success page shows order id
5. Medusa admin order shows: 5 line items, total 3500, `metadata.mystery_box`, line-item adjustments with code `MYSTERY_BOX`
6. Each variant's `inventory_quantity` decremented by 1

Edge cases:
- Have an existing item in cart → trigger lock → confirm dialog appears → click OK → cart replaced
- Manually mark a variant out of stock in admin between spin and lock → click lock → see "Sorry, that piece just sold — spin again"
- Use up all 3 spins → button disables with "Come back tomorrow"

- [ ] **Step 3: Commit + push**

```bash
git add src/app/checkout/OrderSummary.tsx
git commit -m "feat(mystery-box): show box id + flat price in checkout summary"
git push
```

---

## Final verification checklist (run all)

### Backend
- [ ] `cd Backend/dollup-medusa && yarn build` clean
- [ ] `yarn test:unit src/workflows/__tests__/apply-mystery-box-discount.test.ts` all green
- [ ] `curl POST /store/mystery-box/create-cart` happy path returns 200 with cart_id + box meta
- [ ] Out-of-stock variant → 409 with `out_of_stock_variant_ids`
- [ ] Wrong-size variant → 400 with `wrong_size_variant_ids`
- [ ] Non-MUR region → 400
- [ ] Cart retrieve shows `total === 3500`, line-item adjustments with `code === "MYSTERY_BOX"`, `metadata.mystery_box` populated
- [ ] Cart with mystery_box metadata but the discount adjustment manually deleted → `cart.complete` rejects (the `completeCartWorkflow.hooks.validate` hook fires)

### Frontend
- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run build` clean, `/events/mystery-box` in route manifest
- [ ] Browser smoke (size pick → spin → lock → checkout → order placed) end-to-end
- [ ] Inventory deducts on order completion (admin shows `−1` per variant)
- [ ] Spin counter decrements; resets at midnight local
- [ ] Out-of-stock recovery shown without consuming a spin (since the user already spun)
- [ ] Disable JavaScript and load `/events/mystery-box` — server-rendered headline + size buttons still appear (degraded but not broken)

---

## Memory entry to save after merge

```
name: Mystery Box wheel shipped (YYYY-MM-DD)
description: /events/mystery-box live with real Medusa cart + flat Rs 3,500 discount + stock deduction at checkout
type: project

Frontend: /events/mystery-box.
Backend: POST /store/mystery-box/create-cart, src/workflows/apply-mystery-box-discount.ts (mirrors loyalty pattern).

Why flat price: cart-level discount adjustment spread across line items via Modules.CART.addLineItemAdjustments. completeCartWorkflow.hooks.validate ensures the adjustment survives checkout.

How to apply: when extending or debugging, treat it as a sibling of apply-loyalty-discount.ts — same shape, same hook style. Stock deduction is Medusa default behaviour on cart completion.

Edge case: race condition (two customers pick the same last-unit variant) is handled by Medusa's standard cart completion inventory check; the loser sees a checkout error. Frontend shows "Sorry, that piece just sold — spin again" and doesn't burn a spin on the error path.
```

---

## Out of scope (deferred)

- **Inventory reservation at spin time.** Right now stock deducts on cart completion. If two customers race for the last unit, the loser sees a checkout error. Adding reservations means using `IInventoryService.createReservation` at create-cart time with a TTL — separate plan.
- **Per-customer monthly limit.** No throttle on how many Mystery Boxes one customer can buy. If abuse appears, add a subscriber on `order.placed` that enforces a `max-per-customer-per-month` rule.
- **Admin filter by `metadata.mystery_box`.** A `dollup-admin` view of "all mystery box orders" — separate plan in dollup-admin, not here.

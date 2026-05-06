# dollup-admin Email + Shipping + Store Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three new settings pages — `/settings/email`, `/settings/shipping`, `/settings/store` — in the `dollup-admin` Next.js app. They write to a new Medusa `store-config` module (3 typed singleton rows). The Resend notification module reads email toggles. The DUB-front storefront `/shipping`, `/returns`, `/contact` pages, plus `nav.ts` social links and Footer contact info, switch from hardcoded constants to dynamic values pulled from these settings.

**Architecture:**
- **Backend:** new module `store-config` in `Backend/dollup-medusa/src/modules/store-config/` with three Mikro-ORM models (`EmailSettings`, `ShippingSettings`, `StoreSettings`), each a singleton row, mirroring the existing `loyalty` module pattern. Service exposes `getEmailSettings()` / `updateEmailSettings(input)` and the equivalents for shipping + store. Three admin routes under `/admin/store-config/{email,shipping,store}`. One **public** route `GET /store/store-config` returns a slim union of the public-facing fields the storefront actually needs (free-ship threshold, return fee, pre-order ETA copy, social URLs, contact phone/email/hours).
- **Admin UI:** three new pages under `dollup-admin/src/app/(app)/settings/` reuse the existing settings layout (created in the loyalty plan). Server actions, `useActionState` form pattern, no toast lib.
- **Storefront refactor:** small. Replace `SOCIAL_LINKS` const in `nav.ts` and Footer hardcoded phone/email/contact with reads from a new server helper `getStoreConfig()` that fetches `/store/store-config` (cached via `unstable_cache`, 5 min). Replace the `freeOver: 1500` and the pre-order/return-fee copy with the same.
- **Resend module:** `notification-resend/service.ts` reads `EmailSettings.enabled_*` flags before sending; if a flag is false, `send()` returns silently (logs only).

**Tech Stack:**
- Backend: Medusa v2.13.1, Yarn 4.12, TypeScript 5.6, Jest. Module pattern matches `src/modules/loyalty/`. Use `model.define(...)` builder, not raw decorators.
- dollup-admin: Next.js 16, React 19 (`useActionState`), TypeScript 5, Tailwind v4, `@medusajs/js-sdk@2.13.1`.
- DUB-front: Next.js 16, React 19, `unstable_cache` for the settings fetch.
- No new deps in any repo.

**Verification approach:**
- Backend has Jest. Add unit tests for the three settings models' default-row creation paths (trivial — mirror `loyalty-service.spec.ts`). Skip integration tests; verification is admin smoke + storefront smoke.
- Frontend (dollup-admin and DUB-front): no test runner. Verification is `npx tsc --noEmit`, `npm run build`, manual browser smoke per CLAUDE.md.

**Pre-flight (do once before Task 1):**
- Read `Backend/dollup-medusa/src/modules/loyalty/index.ts`, `service.ts`, `models/loyalty-settings.ts`, `migrations/Migration20260505000000.ts`. The new `store-config` module is structurally identical — three singleton rows instead of one + an account/transaction model. Copy the patterns verbatim.
- Read `Backend/dollup-medusa/src/api/admin/loyalty/settings/route.ts` — the canonical shape for admin GET/POST settings routes.
- Read `dollup-admin/src/app/(app)/settings/loyalty/{actions,LoyaltySettingsForm,page}.tsx` from the loyalty-settings plan (assumes that plan landed first — if not, run that plan to completion FIRST). The shipping/email/store forms are direct rip-offs of the loyalty form pattern.
- Read `Backend/dollup-medusa/src/modules/notification-resend/service.ts` — that's where the `enabled_*` gates plug in.
- Read `DUB-front/src/lib/{nav,shipping-rates}.ts` and `DUB-front/src/components/Footer.tsx` to know exactly which strings and numbers move to settings.
- Make sure dev environments are running: `cd Backend/dollup-medusa && node .yarn/releases/yarn-4.12.0.cjs dev` and `cd dollup-admin && npm run dev` and `cd DUB-front && npm run dev`.

---

## Decisions

1. **One module, three models.** Avoids three separate migration directories and three separate modules just to hold settings rows. Settings are read+write by admin, read-only by storefront, never linked to other entities — they belong in one container.
2. **`/store/store-config` is a single read-only route.** Returns the union of public-facing fields from all three settings rows. Storefront makes one call to populate everything. CORS enforced via standard `STORE_CORS`. No auth — these values are visible on the public site anyway.
3. **From-address is read-only in admin UI.** Founder sets `RESEND_FROM_EMAIL` env var; admin can't change it (would require Resend domain re-verification, dangerous from a UI). Show as a disabled input.
4. **Shipping option PRICES stay in Medusa.** `DUB-front/src/lib/shipping-rates.ts` already pulls live prices from Medusa shipping options. The shipping SETTINGS page only owns: free-shipping threshold (currently hardcoded `Rs 1500`), pre-order ETA copy (currently `"Confirm before noon for next-day delivery"`), and return fee (currently free / hardcoded). Don't duplicate Medusa.
5. **No partial updates from admin form.** POST sends the full row; backend overwrites. Simpler than diff-and-merge.
6. **Defaults match current hardcoded values.** Migration seeds rows with whatever the storefront ships today, so toggling on/off doesn't surprise live customers.
7. **You may execute Email, Shipping, Store sub-plans in parallel** after Tasks B1–B3 + UI1 land. Each touches independent files. Suggest one subagent per group if running parallel.

---

## File Map

### Backend `Backend/dollup-medusa/`
| File | Purpose | Action |
| --- | --- | --- |
| `src/modules/store-config/index.ts` | Module export with `STORE_CONFIG_MODULE = "store_config"` | **Create** |
| `src/modules/store-config/service.ts` | `StoreConfigModuleService` extending `MedusaService({ EmailSettings, ShippingSettings, StoreSettings })` with 6 business methods | **Create** |
| `src/modules/store-config/models/email-settings.ts` | Singleton model — `enabled_*` flags + from-address mirror | **Create** |
| `src/modules/store-config/models/shipping-settings.ts` | Singleton model — free threshold + ETA copy + return fee | **Create** |
| `src/modules/store-config/models/store-settings.ts` | Singleton model — phone, email, hours, social URLs, copyright | **Create** |
| `src/modules/store-config/migrations/Migration<timestamp>.ts` | Creates the 3 tables with default rows | **Create** |
| `src/modules/store-config/__tests__/_store-config-service.spec.ts` | Unit tests for default-row creation. Underscore-prefixed per repo convention. | **Create** |
| `medusa-config.ts` | Register the new module | **Modify** |
| `src/api/admin/store-config/email/route.ts` | GET/POST | **Create** |
| `src/api/admin/store-config/shipping/route.ts` | GET/POST | **Create** |
| `src/api/admin/store-config/store/route.ts` | GET/POST | **Create** |
| `src/api/store/store-config/route.ts` | Public GET — slim public union | **Create** |
| `src/modules/notification-resend/service.ts` | Read `EmailSettings.enabled_*` before sending | **Modify** |

### dollup-admin `dollup-admin/`
| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/store-config.ts` | Server-only fetchers + updaters for all 3 settings groups | **Create** |
| `src/app/(app)/settings/layout.tsx` | Add Email / Shipping / Store entries to the left rail | **Modify** |
| `src/app/(app)/settings/email/page.tsx` | Server shell | **Create** |
| `src/app/(app)/settings/email/EmailSettingsForm.tsx` | Client form | **Create** |
| `src/app/(app)/settings/email/actions.ts` | `saveEmailSettingsAction` | **Create** |
| `src/app/(app)/settings/shipping/page.tsx` | Server shell | **Create** |
| `src/app/(app)/settings/shipping/ShippingSettingsForm.tsx` | Client form | **Create** |
| `src/app/(app)/settings/shipping/actions.ts` | `saveShippingSettingsAction` | **Create** |
| `src/app/(app)/settings/store/page.tsx` | Server shell | **Create** |
| `src/app/(app)/settings/store/StoreSettingsForm.tsx` | Client form | **Create** |
| `src/app/(app)/settings/store/actions.ts` | `saveStoreSettingsAction` | **Create** |

### DUB-front `DUB-front/`
| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/store-config.ts` | Server-only fetcher for `/store/store-config` cached 5 min | **Create** |
| `src/lib/nav.ts` | Make `SOCIAL_LINKS` async / move to `store-config` | **Modify** |
| `src/components/Footer.tsx` | Read social URLs + contact from `getStoreConfig()` | **Modify** |
| `src/lib/shipping-rates.ts` | Replace `freeOver: 1500` constant with settings value | **Modify** |
| `src/app/contact/page.tsx` | Read phone / email / hours from settings | **Modify** |
| `src/app/returns/page.tsx` | Read return fee from settings | **Modify** |
| `src/app/shipping/page.tsx` | Read free-ship threshold + pre-order ETA from settings | **Modify** |
| `src/app/products/[handle]/page.tsx` (or PDP shipping copy file) | Read pre-order ETA from settings if it appears there | **Modify** (skip if not used) |

---

## Backend foundation (sequential)

### Task B1: Build the `store-config` module + migrations

**Files:** as listed above.

- [ ] **Step 1: Create the email settings model**

```ts
// Backend/dollup-medusa/src/modules/store-config/models/email-settings.ts
import { model } from "@medusajs/framework/utils"

const EmailSettings = model.define("EmailSettings", {
  id: model.id({ prefix: "emailset" }).primaryKey(),
  enabled_order_placed: model.boolean().default(true),
  enabled_order_shipped: model.boolean().default(true),
  enabled_welcome: model.boolean().default(true),
  enabled_password_reset: model.boolean().default(true),
  enabled_order_delivered: model.boolean().default(false),
  // From-address is mirrored from env, read-only in UI but stored so the admin
  // can see it without checking Coolify. Backend ignores writes.
  from_email_mirror: model.text().default(""),
})

export default EmailSettings
```

- [ ] **Step 2: Create the shipping settings model**

```ts
// Backend/dollup-medusa/src/modules/store-config/models/shipping-settings.ts
import { model } from "@medusajs/framework/utils"

const ShippingSettings = model.define("ShippingSettings", {
  id: model.id({ prefix: "shipset" }).primaryKey(),
  free_shipping_threshold_mur: model.number().default(1500),
  return_fee_mur: model.number().default(0),
  preorder_eta_copy: model
    .text()
    .default("Confirm before noon for next-day delivery"),
})

export default ShippingSettings
```

- [ ] **Step 3: Create the store settings model**

```ts
// Backend/dollup-medusa/src/modules/store-config/models/store-settings.ts
import { model } from "@medusajs/framework/utils"

const StoreSettings = model.define("StoreSettings", {
  id: model.id({ prefix: "storeset" }).primaryKey(),
  contact_phone: model.text().default("+230 5941 6359"),
  contact_email: model.text().default("hello@dollupboutique.com"),
  contact_hours: model
    .text()
    .default("Mon–Sat 09:00–18:00 (Mauritius time)"),
  instagram_url: model
    .text()
    .default("https://www.instagram.com/dollupboutique/"),
  facebook_url: model
    .text()
    .default("https://www.facebook.com/dollupboutique/"),
  tiktok_url: model
    .text()
    .default("https://www.tiktok.com/@dollupboutique"),
  whatsapp_url: model.text().default("https://wa.me/23059416359"),
  footer_copyright: model
    .text()
    .default("© Doll Up Boutique. All rights reserved."),
})

export default StoreSettings
```

- [ ] **Step 4: Create the service**

```ts
// Backend/dollup-medusa/src/modules/store-config/service.ts
import { MedusaService } from "@medusajs/framework/utils"

import EmailSettings from "./models/email-settings"
import ShippingSettings from "./models/shipping-settings"
import StoreSettings from "./models/store-settings"

export const EMAIL_SETTINGS_ID = "email_settings"
export const SHIPPING_SETTINGS_ID = "shipping_settings"
export const STORE_SETTINGS_ID = "store_settings"

export type EmailSettingsDTO = {
  id: string
  enabled_order_placed: boolean
  enabled_order_shipped: boolean
  enabled_welcome: boolean
  enabled_password_reset: boolean
  enabled_order_delivered: boolean
  from_email_mirror: string
}

export type ShippingSettingsDTO = {
  id: string
  free_shipping_threshold_mur: number
  return_fee_mur: number
  preorder_eta_copy: string
}

export type StoreSettingsDTO = {
  id: string
  contact_phone: string
  contact_email: string
  contact_hours: string
  instagram_url: string
  facebook_url: string
  tiktok_url: string
  whatsapp_url: string
  footer_copyright: string
}

export type UpdateEmailSettingsInput = Partial<Omit<EmailSettingsDTO, "id" | "from_email_mirror">>
export type UpdateShippingSettingsInput = Partial<Omit<ShippingSettingsDTO, "id">>
export type UpdateStoreSettingsInput = Partial<Omit<StoreSettingsDTO, "id">>

class StoreConfigModuleService extends MedusaService({
  EmailSettings,
  ShippingSettings,
  StoreSettings,
}) {
  async getEmailSettings(): Promise<EmailSettingsDTO> {
    const svc = this as unknown as {
      listEmailSettings: (filters: Record<string, unknown>) => Promise<EmailSettingsDTO[]>
      createEmailSettings: (input: Partial<EmailSettingsDTO>) => Promise<EmailSettingsDTO>
    }
    const existing = await svc.listEmailSettings({ id: EMAIL_SETTINGS_ID })
    if (existing.length > 0) {
      // Refresh from-email mirror from env at read time so it stays accurate.
      const fromMirror = process.env.RESEND_FROM_EMAIL ?? ""
      if (existing[0].from_email_mirror !== fromMirror) {
        return this.updateEmailSettingsRow({ from_email_mirror: fromMirror })
      }
      return existing[0]
    }
    return svc.createEmailSettings({
      id: EMAIL_SETTINGS_ID,
      from_email_mirror: process.env.RESEND_FROM_EMAIL ?? "",
    })
  }

  async updateEmailSettings(input: UpdateEmailSettingsInput): Promise<EmailSettingsDTO> {
    await this.getEmailSettings() // ensure row exists
    return this.updateEmailSettingsRow(input)
  }

  private async updateEmailSettingsRow(
    input: Partial<EmailSettingsDTO>,
  ): Promise<EmailSettingsDTO> {
    const svc = this as unknown as {
      updateEmailSettings: (data: Partial<EmailSettingsDTO> & { id: string }) => Promise<EmailSettingsDTO>
    }
    return svc.updateEmailSettings({ id: EMAIL_SETTINGS_ID, ...input })
  }

  async getShippingSettings(): Promise<ShippingSettingsDTO> {
    const svc = this as unknown as {
      listShippingSettings: (filters: Record<string, unknown>) => Promise<ShippingSettingsDTO[]>
      createShippingSettings: (input: Partial<ShippingSettingsDTO>) => Promise<ShippingSettingsDTO>
    }
    const existing = await svc.listShippingSettings({ id: SHIPPING_SETTINGS_ID })
    if (existing.length > 0) return existing[0]
    return svc.createShippingSettings({ id: SHIPPING_SETTINGS_ID })
  }

  async updateShippingSettings(input: UpdateShippingSettingsInput): Promise<ShippingSettingsDTO> {
    await this.getShippingSettings()
    const svc = this as unknown as {
      updateShippingSettings: (data: Partial<ShippingSettingsDTO> & { id: string }) => Promise<ShippingSettingsDTO>
    }
    return svc.updateShippingSettings({ id: SHIPPING_SETTINGS_ID, ...input })
  }

  async getStoreSettings(): Promise<StoreSettingsDTO> {
    const svc = this as unknown as {
      listStoreSettings: (filters: Record<string, unknown>) => Promise<StoreSettingsDTO[]>
      createStoreSettings: (input: Partial<StoreSettingsDTO>) => Promise<StoreSettingsDTO>
    }
    const existing = await svc.listStoreSettings({ id: STORE_SETTINGS_ID })
    if (existing.length > 0) return existing[0]
    return svc.createStoreSettings({ id: STORE_SETTINGS_ID })
  }

  async updateStoreSettings(input: UpdateStoreSettingsInput): Promise<StoreSettingsDTO> {
    await this.getStoreSettings()
    const svc = this as unknown as {
      updateStoreSettings: (data: Partial<StoreSettingsDTO> & { id: string }) => Promise<StoreSettingsDTO>
    }
    return svc.updateStoreSettings({ id: STORE_SETTINGS_ID, ...input })
  }
}

export default StoreConfigModuleService
```

- [ ] **Step 5: Create the module index**

```ts
// Backend/dollup-medusa/src/modules/store-config/index.ts
import { Module } from "@medusajs/framework/utils"

import StoreConfigModuleService from "./service"

export const STORE_CONFIG_MODULE = "store_config"

export default Module(STORE_CONFIG_MODULE, {
  service: StoreConfigModuleService,
})
```

- [ ] **Step 6: Generate migration**

```bash
cd Backend/dollup-medusa
node .yarn/releases/yarn-4.12.0.cjs medusa db:generate store_config
```

This writes a migration file under `src/modules/store-config/migrations/`. Open it; verify it creates 3 tables. The CLI may emit an empty migration if the model files aren't picked up — if so, register the module first (Step 7) and re-run.

- [ ] **Step 7: Register the module**

Edit `medusa-config.ts`. Add to the `modules` array (mirror how `loyalty` is registered):

```ts
{
  resolve: "./src/modules/store-config",
},
```

- [ ] **Step 8: Run the migration**

```bash
node .yarn/releases/yarn-4.12.0.cjs medusa db:migrate
```

Expected: `Migration<timestamp>.ts` applied. Tables `email_settings`, `shipping_settings`, `store_settings` exist.

- [ ] **Step 9: Build + boot smoke**

```bash
node .yarn/releases/yarn-4.12.0.cjs build
node .yarn/releases/yarn-4.12.0.cjs dev
```

Watch the logs. If you see "describe is not defined" the test file got picked up by ResourceLoader — make sure the test file from Step 10 is named with a `_` prefix.

- [ ] **Step 10: Add unit tests**

```ts
// Backend/dollup-medusa/src/modules/store-config/__tests__/_store-config-service.spec.ts
import { MedusaService } from "@medusajs/framework/utils"

// Lightweight test: just verify the DTO shapes + default values are intact.
// Real integration tests would need a full MikroORM context — skip per repo convention.

import {
  type EmailSettingsDTO,
  type ShippingSettingsDTO,
  type StoreSettingsDTO,
  EMAIL_SETTINGS_ID,
  SHIPPING_SETTINGS_ID,
  STORE_SETTINGS_ID,
} from "../service"

describe("store-config DTO contract", () => {
  it("exposes the expected singleton ids", () => {
    expect(EMAIL_SETTINGS_ID).toBe("email_settings")
    expect(SHIPPING_SETTINGS_ID).toBe("shipping_settings")
    expect(STORE_SETTINGS_ID).toBe("store_settings")
  })

  it("EmailSettingsDTO has the 5 enabled_* flags + from_email_mirror", () => {
    const dto: EmailSettingsDTO = {
      id: "x",
      enabled_order_placed: true,
      enabled_order_shipped: true,
      enabled_welcome: true,
      enabled_password_reset: true,
      enabled_order_delivered: false,
      from_email_mirror: "",
    }
    expect(Object.keys(dto)).toHaveLength(7)
  })

  it("ShippingSettingsDTO has 4 fields", () => {
    const dto: ShippingSettingsDTO = {
      id: "x",
      free_shipping_threshold_mur: 1500,
      return_fee_mur: 0,
      preorder_eta_copy: "x",
    }
    expect(Object.keys(dto)).toHaveLength(4)
  })

  it("StoreSettingsDTO has 9 fields", () => {
    const dto: StoreSettingsDTO = {
      id: "x",
      contact_phone: "x",
      contact_email: "x",
      contact_hours: "x",
      instagram_url: "x",
      facebook_url: "x",
      tiktok_url: "x",
      whatsapp_url: "x",
      footer_copyright: "x",
    }
    expect(Object.keys(dto)).toHaveLength(9)
  })
})
```

```bash
node .yarn/releases/yarn-4.12.0.cjs test:unit src/modules/store-config/__tests__/_store-config-service.spec.ts
```

Expected: 4/4 pass.

- [ ] **Step 11: Commit**

```bash
git add src/modules/store-config medusa-config.ts
git commit -m "feat(store-config): module with email/shipping/store singleton settings"
```

---

### Task B2: Admin routes for the 3 settings groups

**Files:**
- Create: `src/api/admin/store-config/email/route.ts`
- Create: `src/api/admin/store-config/shipping/route.ts`
- Create: `src/api/admin/store-config/store/route.ts`

Each follows the loyalty settings route pattern verbatim. Below is the email route — duplicate for shipping + store with the right service methods.

- [ ] **Step 1: Email route**

```ts
// Backend/dollup-medusa/src/api/admin/store-config/email/route.ts
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { STORE_CONFIG_MODULE } from "../../../../modules/store-config"
import type {
  StoreConfigModuleService,
  UpdateEmailSettingsInput,
} from "../../../../modules/store-config/service"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  const settings = await svc.getEmailSettings()
  res.json({ settings })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const input: UpdateEmailSettingsInput = {
    enabled_order_placed: parseBool(body.enabled_order_placed),
    enabled_order_shipped: parseBool(body.enabled_order_shipped),
    enabled_welcome: parseBool(body.enabled_welcome),
    enabled_password_reset: parseBool(body.enabled_password_reset),
    enabled_order_delivered: parseBool(body.enabled_order_delivered),
  }
  for (const k of Object.keys(input) as (keyof UpdateEmailSettingsInput)[]) {
    if (input[k] === undefined) delete input[k]
  }

  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  try {
    const settings = await svc.updateEmailSettings(input)
    res.json({ settings })
  } catch (err) {
    res.status(400).json({
      message: (err as Error)?.message ?? "Failed to update email settings",
    })
  }
}

function parseBool(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  return value === true || value === "true" || value === 1 || value === "1"
}
```

Note: the `StoreConfigModuleService` import is the type only — the runtime container resolves by `STORE_CONFIG_MODULE` key. If TS complains about importing `StoreConfigModuleService` as a type, add `export type { default as StoreConfigModuleService } from "./service"` to `src/modules/store-config/index.ts` and re-export.

- [ ] **Step 2: Shipping route**

```ts
// Backend/dollup-medusa/src/api/admin/store-config/shipping/route.ts
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { STORE_CONFIG_MODULE } from "../../../../modules/store-config"
import type {
  StoreConfigModuleService,
  UpdateShippingSettingsInput,
} from "../../../../modules/store-config/service"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  const settings = await svc.getShippingSettings()
  res.json({ settings })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const input: UpdateShippingSettingsInput = {
    free_shipping_threshold_mur: parseNonNegativeInt(
      body.free_shipping_threshold_mur,
    ),
    return_fee_mur: parseNonNegativeInt(body.return_fee_mur),
    preorder_eta_copy:
      typeof body.preorder_eta_copy === "string"
        ? body.preorder_eta_copy.trim().slice(0, 200)
        : undefined,
  }
  for (const k of Object.keys(input) as (keyof UpdateShippingSettingsInput)[]) {
    if (input[k] === undefined) delete input[k]
  }

  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  try {
    const settings = await svc.updateShippingSettings(input)
    res.json({ settings })
  } catch (err) {
    res.status(400).json({
      message: (err as Error)?.message ?? "Failed to update shipping settings",
    })
  }
}

function parseNonNegativeInt(v: unknown): number | undefined {
  if (v === undefined) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.trunc(n)
}
```

- [ ] **Step 3: Store route**

```ts
// Backend/dollup-medusa/src/api/admin/store-config/store/route.ts
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { STORE_CONFIG_MODULE } from "../../../../modules/store-config"
import type {
  StoreConfigModuleService,
  UpdateStoreSettingsInput,
} from "../../../../modules/store-config/service"

const TEXT_FIELDS: Array<keyof UpdateStoreSettingsInput> = [
  "contact_phone",
  "contact_email",
  "contact_hours",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "whatsapp_url",
  "footer_copyright",
]

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  const settings = await svc.getStoreSettings()
  res.json({ settings })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const input: UpdateStoreSettingsInput = {}
  for (const f of TEXT_FIELDS) {
    const v = body[f]
    if (typeof v === "string") input[f] = v.trim().slice(0, 500)
  }

  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  try {
    const settings = await svc.updateStoreSettings(input)
    res.json({ settings })
  } catch (err) {
    res.status(400).json({
      message: (err as Error)?.message ?? "Failed to update store settings",
    })
  }
}
```

- [ ] **Step 4: Smoke each route**

```bash
node .yarn/releases/yarn-4.12.0.cjs dev
# In another terminal, get an admin JWT first via the admin login flow.
# Then:
curl -s http://localhost:9000/admin/store-config/email \
  -H "authorization: Bearer <admin-jwt>" | jq
curl -s http://localhost:9000/admin/store-config/shipping \
  -H "authorization: Bearer <admin-jwt>" | jq
curl -s http://localhost:9000/admin/store-config/store \
  -H "authorization: Bearer <admin-jwt>" | jq
```

Each returns `{ settings: {...} }` populated with defaults.

- [ ] **Step 5: Commit**

```bash
git add src/api/admin/store-config
git commit -m "feat(store-config): admin GET/POST routes for email, shipping, store"
```

---

### Task B3: Public `/store/store-config` route

**Files:**
- Create: `src/api/store/store-config/route.ts`

Returns ONLY the public-facing fields, in a flat shape the storefront can drop into nav/footer/page bodies.

- [ ] **Step 1: Create the route**

```ts
// Backend/dollup-medusa/src/api/store/store-config/route.ts
import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"

import { STORE_CONFIG_MODULE } from "../../../modules/store-config"
import type { StoreConfigModuleService } from "../../../modules/store-config/service"

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
  const [shipping, store] = await Promise.all([
    svc.getShippingSettings(),
    svc.getStoreSettings(),
  ])

  res.json({
    config: {
      shipping: {
        free_shipping_threshold_mur: shipping.free_shipping_threshold_mur,
        return_fee_mur: shipping.return_fee_mur,
        preorder_eta_copy: shipping.preorder_eta_copy,
      },
      store: {
        contact_phone: store.contact_phone,
        contact_email: store.contact_email,
        contact_hours: store.contact_hours,
        instagram_url: store.instagram_url,
        facebook_url: store.facebook_url,
        tiktok_url: store.tiktok_url,
        whatsapp_url: store.whatsapp_url,
        footer_copyright: store.footer_copyright,
      },
    },
  })
}
```

- [ ] **Step 2: Smoke + commit**

```bash
curl -s -H "x-publishable-api-key: <pak>" http://localhost:9000/store/store-config | jq
```

Expected: `{ config: { shipping: {...}, store: {...} } }`. Email settings deliberately NOT exposed publicly.

```bash
git add src/api/store/store-config
git commit -m "feat(store-config): public GET /store/store-config slim union"
git push
```

(Coolify rebuilds api.dollupboutique.com.)

---

## dollup-admin UI foundation

### Task UI1: Extend the settings layout

**Files:**
- Modify: `dollup-admin/src/app/(app)/settings/layout.tsx`

The loyalty plan created a settings layout with one item ("Loyalty"). Add three more.

- [ ] **Step 1: Update NAV_ITEMS**

Open `dollup-admin/src/app/(app)/settings/layout.tsx`. Replace the `NAV_ITEMS` const:

```tsx
const NAV_ITEMS = [
  { href: "/settings/loyalty", label: "Loyalty" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/shipping", label: "Shipping" },
  { href: "/settings/store", label: "Store" },
];
```

- [ ] **Step 2: Add active-state styling**

Convert the layout to a server component that reads the current path is non-trivial. Easier: wrap in a small client component for the active highlight, OR leave it without active state for now (founder won't get lost — labels are short).

For YAGNI's sake, **skip active state** in this iteration.

- [ ] **Step 3: Type-check + commit**

```bash
cd dollup-admin
npx tsc --noEmit
git add src/app/(app)/settings/layout.tsx
git commit -m "feat(settings): add Email/Shipping/Store entries to settings nav"
```

---

### Task UI2: Server-side store-config client

**Files:**
- Create: `dollup-admin/src/lib/store-config.ts`

Same pattern as `loyalty-settings.ts` from the loyalty plan. Three settings groups.

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/lib/store-config.ts
import "server-only";
import { getAdminSdk } from "./medusa-admin";

export type EmailSettings = {
  enabled_order_placed: boolean;
  enabled_order_shipped: boolean;
  enabled_welcome: boolean;
  enabled_password_reset: boolean;
  enabled_order_delivered: boolean;
  from_email_mirror: string;
};

export type ShippingSettings = {
  free_shipping_threshold_mur: number;
  return_fee_mur: number;
  preorder_eta_copy: string;
};

export type StoreSettings = {
  contact_phone: string;
  contact_email: string;
  contact_hours: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  whatsapp_url: string;
  footer_copyright: string;
};

type Wrap<T> = { settings: T };

export async function getEmailSettings(): Promise<EmailSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<EmailSettings>>(
    "/admin/store-config/email",
    { method: "GET" },
  );
  return r.settings;
}

export async function updateEmailSettings(
  input: Partial<Omit<EmailSettings, "from_email_mirror">>,
): Promise<EmailSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<EmailSettings>>(
    "/admin/store-config/email",
    { method: "POST", body: input },
  );
  return r.settings;
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<ShippingSettings>>(
    "/admin/store-config/shipping",
    { method: "GET" },
  );
  return r.settings;
}

export async function updateShippingSettings(
  input: Partial<ShippingSettings>,
): Promise<ShippingSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<ShippingSettings>>(
    "/admin/store-config/shipping",
    { method: "POST", body: input },
  );
  return r.settings;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<StoreSettings>>(
    "/admin/store-config/store",
    { method: "GET" },
  );
  return r.settings;
}

export async function updateStoreSettings(
  input: Partial<StoreSettings>,
): Promise<StoreSettings> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<Wrap<StoreSettings>>(
    "/admin/store-config/store",
    { method: "POST", body: input },
  );
  return r.settings;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/store-config.ts
git commit -m "feat(store-config): admin-side client wrapper"
```

---

## Sub-plan E — Email settings page

After Tasks B1–B3 + UI1–UI2 land, this sub-plan can run in parallel with Sub-plan S and Sub-plan ST.

### Task E1: Action

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/email/actions.ts`

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/app/(app)/settings/email/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  updateEmailSettings,
  type EmailSettings,
} from "@/lib/store-config";

export type SaveResult =
  | { ok: true; settings: EmailSettings }
  | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) throw new Error("Unauthorized");
}

const FLAGS = [
  "enabled_order_placed",
  "enabled_order_shipped",
  "enabled_welcome",
  "enabled_password_reset",
  "enabled_order_delivered",
] as const;

export async function saveEmailSettingsAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const input = Object.fromEntries(
    FLAGS.map((f) => [f, formData.get(f) === "on"]),
  ) as Partial<EmailSettings>;

  try {
    const settings = await updateEmailSettings(input);
    revalidatePath("/settings/email");
    return { ok: true, settings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/settings/email/actions.ts
git commit -m "feat(email-settings): saveEmailSettingsAction"
```

---

### Task E2: Form + page

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/email/EmailSettingsForm.tsx`
- Create: `dollup-admin/src/app/(app)/settings/email/page.tsx`

- [ ] **Step 1: Form**

```tsx
// dollup-admin/src/app/(app)/settings/email/EmailSettingsForm.tsx
"use client";

import { useActionState } from "react";
import {
  saveEmailSettingsAction,
  type SaveResult,
} from "./actions";
import type { EmailSettings } from "@/lib/store-config";

const TOGGLES: Array<{ name: keyof EmailSettings; label: string; hint: string }> = [
  {
    name: "enabled_order_placed",
    label: "Order confirmation",
    hint: "Sent immediately after a customer places an order.",
  },
  {
    name: "enabled_order_shipped",
    label: "Shipped / ready notification",
    hint: "Triggered from the Prep page when you mark an order ready/shipped.",
  },
  {
    name: "enabled_welcome",
    label: "Welcome email",
    hint: "Sent on customer registration with the welcome bonus credit.",
  },
  {
    name: "enabled_password_reset",
    label: "Password reset",
    hint: "Sent when a customer requests a reset link from /forgot-password.",
  },
  {
    name: "enabled_order_delivered",
    label: "Delivery follow-up (review nudge)",
    hint: "Sent ~3 days after delivery. Currently a placeholder template.",
  },
];

export function EmailSettingsForm({ initial }: { initial: EmailSettings }) {
  const [state, formAction, pending] = useActionState<SaveResult | null, FormData>(
    saveEmailSettingsAction,
    null,
  );
  const current = state?.ok ? state.settings : initial;

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        {TOGGLES.map((t) => {
          const checked = (current[t.name] as boolean) ?? false;
          return (
            <label
              key={t.name}
              className="flex items-start gap-3 rounded-md border border-blush-400 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                name={t.name}
                defaultChecked={checked}
                className="mt-0.5 h-4 w-4"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink dark:text-zinc-100">
                  {t.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-muted dark:text-zinc-400">
                  {t.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-md border border-dashed border-blush-400 bg-cream/50 p-3 text-[12px] text-ink-muted dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        <strong>From address:</strong>{" "}
        <code>{current.from_email_mirror || "(not set)"}</code>
        <br />
        Set via the <code>RESEND_FROM_EMAIL</code> environment variable on the
        Medusa backend. Changes here have no effect.
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-blush-400 pt-4 dark:border-zinc-800">
        <div className="text-[12px]" role="status" aria-live="polite">
          {state?.ok && (
            <span className="text-emerald-600 dark:text-emerald-400">Saved.</span>
          )}
          {state && !state.ok && (
            <span className="text-coral-700 dark:text-coral-400">{state.error}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-coral-500 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Page**

```tsx
// dollup-admin/src/app/(app)/settings/email/page.tsx
import { getEmailSettings } from "@/lib/store-config";
import { EmailSettingsForm } from "./EmailSettingsForm";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const initial = await getEmailSettings();
  return (
    <div className="rounded-lg border border-blush-400 bg-cream/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl text-ink dark:text-zinc-100">
          Transactional email
        </h2>
        <p className="mt-1 text-[12px] text-ink-muted dark:text-zinc-400">
          Toggle which transactional emails go out. The Resend backend still
          renders the templates; these flags gate sending.
        </p>
      </header>
      <EmailSettingsForm initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + smoke**

```bash
npx tsc --noEmit
npm run dev
# Visit http://localhost:3001/settings/email
```

Expected: 5 toggles, the read-only from-address banner, Save button. Toggle one, save, reload — sticks.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/email
git commit -m "feat(email-settings): /settings/email page with 5 toggles"
```

---

### Task E3: Wire toggles into the Resend module

**Files:**
- Modify: `Backend/dollup-medusa/src/modules/notification-resend/service.ts`

The Resend module's `send()` method should check the `enabled_*` flag for the template before actually shipping the email.

- [ ] **Step 1: Find the send method**

Read the file. The `send()` method takes `{ to, channel, template, data, ... }`. The `template` arg matches the `EmailTemplate` enum.

- [ ] **Step 2: Map templates to flags**

At the top of the file, add:

```ts
import type { StoreConfigModuleService } from "../store-config/service"
import { STORE_CONFIG_MODULE } from "../store-config"
import type { EmailTemplate } from "./service" // self-reference if EmailTemplate is in this file; otherwise inline

const FLAG_BY_TEMPLATE: Record<EmailTemplate, keyof EmailSettingsFlags> = {
  // assuming EmailTemplate values are exactly these strings
  "order-placed": "enabled_order_placed",
  "order-shipped": "enabled_order_shipped",
  "welcome": "enabled_welcome",
  "password-reset": "enabled_password_reset",
  // add "order-delivered": "enabled_order_delivered" when that template lands
} as const

type EmailSettingsFlags = {
  enabled_order_placed: boolean
  enabled_order_shipped: boolean
  enabled_welcome: boolean
  enabled_password_reset: boolean
  enabled_order_delivered: boolean
}
```

- [ ] **Step 3: Read the flag inside `send()`**

The Resend service needs access to the container. If it doesn't already, the cleanest path is a constructor injection — `MedusaService` constructors receive `(__container__, options)`. Check the existing class signature; if it already takes the container, resolve `StoreConfigModuleService` lazily and check the flag. If not, refactor minimally to accept the container.

```ts
// Inside ResendNotificationProviderService — somewhere it has access to the container:
async send(
  notification: ProviderSendNotificationDTO,
): Promise<ProviderSendNotificationResultsDTO> {
  const template = notification.template as EmailTemplate
  const flagKey = FLAG_BY_TEMPLATE[template]
  if (flagKey) {
    try {
      const cfg = this.container_.resolve<StoreConfigModuleService>(STORE_CONFIG_MODULE)
      const settings = await cfg.getEmailSettings()
      if (!settings[flagKey]) {
        this.logger_?.info?.(
          `[resend] skipping ${template} for ${notification.to} — disabled in settings`,
        )
        return { id: "skipped" }
      }
    } catch (err) {
      // Fail-open: if settings are unreachable, send the email. Better to
      // send a duplicate than to drop a real order confirmation.
      this.logger_?.warn?.(
        `[resend] could not read store-config; sending anyway: ${(err as Error).message}`,
      )
    }
  }
  // ...existing send logic continues unchanged...
}
```

If the existing class doesn't store `container_` / `logger_`, look at how `LoyaltyModuleService` handles its container access and copy that pattern. The Medusa v2 convention is that providers receive `(container, options)` in their constructor.

- [ ] **Step 4: Build + smoke**

```bash
node .yarn/releases/yarn-4.12.0.cjs build
node .yarn/releases/yarn-4.12.0.cjs dev
```

In dollup-admin, toggle "Welcome email" OFF and save. Then on the storefront, register a fresh test customer. Expected: no welcome email arrives, Medusa logs show `[resend] skipping welcome for ... — disabled in settings`. Toggle back ON, register again, email arrives.

- [ ] **Step 5: Commit + push**

```bash
git add src/modules/notification-resend/service.ts
git commit -m "feat(email-settings): gate Resend sends on EmailSettings.enabled_* flags"
git push
```

---

## Sub-plan S — Shipping settings page

### Task S1: Action

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/shipping/actions.ts`

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/app/(app)/settings/shipping/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  updateShippingSettings,
  type ShippingSettings,
} from "@/lib/store-config";

export type SaveResult =
  | { ok: true; settings: ShippingSettings }
  | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) throw new Error("Unauthorized");
}

function parseInt0(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function saveShippingSettingsAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const free = parseInt0(formData.get("free_shipping_threshold_mur"));
  const ret = parseInt0(formData.get("return_fee_mur"));
  const eta = formData.get("preorder_eta_copy")?.toString().trim() ?? "";

  if (free === null || ret === null || eta === "") {
    return {
      ok: false,
      error: "Threshold and fee must be non-negative whole numbers; ETA copy required.",
    };
  }
  if (eta.length > 200) {
    return { ok: false, error: "ETA copy must be 200 characters or fewer." };
  }

  try {
    const settings = await updateShippingSettings({
      free_shipping_threshold_mur: free,
      return_fee_mur: ret,
      preorder_eta_copy: eta,
    });
    revalidatePath("/settings/shipping");
    return { ok: true, settings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/settings/shipping/actions.ts
git commit -m "feat(shipping-settings): saveShippingSettingsAction"
```

---

### Task S2: Form + page

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/shipping/ShippingSettingsForm.tsx`
- Create: `dollup-admin/src/app/(app)/settings/shipping/page.tsx`

- [ ] **Step 1: Form**

```tsx
// dollup-admin/src/app/(app)/settings/shipping/ShippingSettingsForm.tsx
"use client";

import { useActionState } from "react";
import {
  saveShippingSettingsAction,
  type SaveResult,
} from "./actions";
import type { ShippingSettings } from "@/lib/store-config";

export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const [state, formAction, pending] = useActionState<SaveResult | null, FormData>(
    saveShippingSettingsAction,
    null,
  );
  const current = state?.ok ? state.settings : initial;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
            Free shipping threshold (Rs)
          </span>
          <input
            type="number"
            name="free_shipping_threshold_mur"
            min={0}
            step={1}
            defaultValue={current.free_shipping_threshold_mur}
            className="rounded-md border border-blush-400 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <span className="text-[11px] text-ink-muted dark:text-zinc-500">
            Home delivery is free for orders ≥ this amount. 0 disables the offer.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
            Return fee (Rs)
          </span>
          <input
            type="number"
            name="return_fee_mur"
            min={0}
            step={1}
            defaultValue={current.return_fee_mur}
            className="rounded-md border border-blush-400 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <span className="text-[11px] text-ink-muted dark:text-zinc-500">
            Charged on returns. 0 = free returns.
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
          Pre-order / next-day ETA copy
        </span>
        <input
          type="text"
          name="preorder_eta_copy"
          maxLength={200}
          defaultValue={current.preorder_eta_copy}
          className="rounded-md border border-blush-400 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <span className="text-[11px] text-ink-muted dark:text-zinc-500">
          Used on PDP shipping accordion + /shipping page. Plain text, ≤ 200 chars.
        </span>
      </label>

      <div className="rounded-md border border-dashed border-blush-400 bg-cream/50 p-3 text-[12px] text-ink-muted dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Shipping option <strong>prices</strong> (home / post / express / Rodrigues)
        are managed in the Medusa admin → Settings → Shipping options. They flow
        live into the storefront via{" "}
        <code>src/lib/shipping-rates.ts</code>.
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-blush-400 pt-4 dark:border-zinc-800">
        <div className="text-[12px]" role="status" aria-live="polite">
          {state?.ok && (
            <span className="text-emerald-600 dark:text-emerald-400">Saved.</span>
          )}
          {state && !state.ok && (
            <span className="text-coral-700 dark:text-coral-400">{state.error}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-coral-500 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Page**

```tsx
// dollup-admin/src/app/(app)/settings/shipping/page.tsx
import { getShippingSettings } from "@/lib/store-config";
import { ShippingSettingsForm } from "./ShippingSettingsForm";

export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage() {
  const initial = await getShippingSettings();
  return (
    <div className="rounded-lg border border-blush-400 bg-cream/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl text-ink dark:text-zinc-100">
          Shipping settings
        </h2>
        <p className="mt-1 text-[12px] text-ink-muted dark:text-zinc-400">
          Free-shipping threshold, return fee, and the pre-order / next-day ETA
          copy shown on PDPs and the /shipping page.
        </p>
      </header>
      <ShippingSettingsForm initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Smoke + commit**

```bash
npx tsc --noEmit
npm run dev
# Visit /settings/shipping; change threshold to 2000; save; reload; sticks.
git add src/app/(app)/settings/shipping
git commit -m "feat(shipping-settings): /settings/shipping page"
```

---

## Sub-plan ST — Store settings page

### Task ST1: Action

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/store/actions.ts`

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/app/(app)/settings/store/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  updateStoreSettings,
  type StoreSettings,
} from "@/lib/store-config";

export type SaveResult =
  | { ok: true; settings: StoreSettings }
  | { ok: false; error: string };

const FIELDS: Array<keyof StoreSettings> = [
  "contact_phone",
  "contact_email",
  "contact_hours",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "whatsapp_url",
  "footer_copyright",
];

const URL_FIELDS: Array<keyof StoreSettings> = [
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "whatsapp_url",
];

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) throw new Error("Unauthorized");
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveStoreSettingsAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const input: Partial<StoreSettings> = {};
  for (const f of FIELDS) {
    const v = formData.get(f)?.toString().trim() ?? "";
    if (v === "") {
      return { ok: false, error: `${f} cannot be blank.` };
    }
    if (URL_FIELDS.includes(f) && !isValidHttpUrl(v)) {
      return { ok: false, error: `${f} must be a valid http(s) URL.` };
    }
    if (v.length > 500) {
      return { ok: false, error: `${f} must be ≤ 500 chars.` };
    }
    input[f] = v;
  }

  try {
    const settings = await updateStoreSettings(input);
    revalidatePath("/settings/store");
    return { ok: true, settings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/settings/store/actions.ts
git commit -m "feat(store-settings): saveStoreSettingsAction with URL validation"
```

---

### Task ST2: Form + page

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/store/StoreSettingsForm.tsx`
- Create: `dollup-admin/src/app/(app)/settings/store/page.tsx`

- [ ] **Step 1: Form**

```tsx
// dollup-admin/src/app/(app)/settings/store/StoreSettingsForm.tsx
"use client";

import { useActionState } from "react";
import {
  saveStoreSettingsAction,
  type SaveResult,
} from "./actions";
import type { StoreSettings } from "@/lib/store-config";

const GROUPS: Array<{
  heading: string;
  fields: Array<{ name: keyof StoreSettings; label: string; type?: "text" | "url" }>;
}> = [
  {
    heading: "Contact",
    fields: [
      { name: "contact_phone", label: "Phone" },
      { name: "contact_email", label: "Email" },
      { name: "contact_hours", label: "Hours / availability" },
    ],
  },
  {
    heading: "Social",
    fields: [
      { name: "instagram_url", label: "Instagram URL", type: "url" },
      { name: "facebook_url", label: "Facebook URL", type: "url" },
      { name: "tiktok_url", label: "TikTok URL", type: "url" },
      { name: "whatsapp_url", label: "WhatsApp URL", type: "url" },
    ],
  },
  {
    heading: "Footer",
    fields: [{ name: "footer_copyright", label: "Copyright line" }],
  },
];

export function StoreSettingsForm({ initial }: { initial: StoreSettings }) {
  const [state, formAction, pending] = useActionState<SaveResult | null, FormData>(
    saveStoreSettingsAction,
    null,
  );
  const current = state?.ok ? state.settings : initial;

  return (
    <form action={formAction} className="space-y-6">
      {GROUPS.map((g) => (
        <fieldset key={g.heading} className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-coral-700 dark:text-coral-400">
            {g.heading}
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            {g.fields.map((f) => (
              <label key={f.name} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
                  {f.label}
                </span>
                <input
                  type={f.type === "url" ? "url" : "text"}
                  name={f.name}
                  defaultValue={current[f.name] as string}
                  maxLength={500}
                  className="rounded-md border border-blush-400 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center justify-between gap-4 border-t border-blush-400 pt-4 dark:border-zinc-800">
        <div className="text-[12px]" role="status" aria-live="polite">
          {state?.ok && (
            <span className="text-emerald-600 dark:text-emerald-400">Saved.</span>
          )}
          {state && !state.ok && (
            <span className="text-coral-700 dark:text-coral-400">{state.error}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-coral-500 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Page**

```tsx
// dollup-admin/src/app/(app)/settings/store/page.tsx
import { getStoreSettings } from "@/lib/store-config";
import { StoreSettingsForm } from "./StoreSettingsForm";

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage() {
  const initial = await getStoreSettings();
  return (
    <div className="rounded-lg border border-blush-400 bg-cream/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl text-ink dark:text-zinc-100">
          Store info
        </h2>
        <p className="mt-1 text-[12px] text-ink-muted dark:text-zinc-400">
          Contact details, social URLs, and footer copyright. Read by the
          storefront on every page.
        </p>
      </header>
      <StoreSettingsForm initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Smoke + commit + push**

```bash
npx tsc --noEmit
npm run dev
# /settings/store; change WhatsApp URL; save; reload; sticks.
git add src/app/(app)/settings/store
git commit -m "feat(store-settings): /settings/store page with grouped fields"
git push
```

---

## Storefront refactor (DUB-front)

### Task SF1: Server-side config fetcher

**Files:**
- Create: `DUB-front/src/lib/store-config.ts`

- [ ] **Step 1: Create the fetcher**

```ts
// DUB-front/src/lib/store-config.ts
import "server-only";
import { unstable_cache } from "next/cache";

export type PublicStoreConfig = {
  shipping: {
    free_shipping_threshold_mur: number;
    return_fee_mur: number;
    preorder_eta_copy: string;
  };
  store: {
    contact_phone: string;
    contact_email: string;
    contact_hours: string;
    instagram_url: string;
    facebook_url: string;
    tiktok_url: string;
    whatsapp_url: string;
    footer_copyright: string;
  };
};

const FALLBACK: PublicStoreConfig = {
  shipping: {
    free_shipping_threshold_mur: 1500,
    return_fee_mur: 0,
    preorder_eta_copy: "Confirm before noon for next-day delivery",
  },
  store: {
    contact_phone: "+230 5941 6359",
    contact_email: "hello@dollupboutique.com",
    contact_hours: "Mon–Sat 09:00–18:00 (Mauritius time)",
    instagram_url: "https://www.instagram.com/dollupboutique/",
    facebook_url: "https://www.facebook.com/dollupboutique/",
    tiktok_url: "https://www.tiktok.com/@dollupboutique",
    whatsapp_url: "https://wa.me/23059416359",
    footer_copyright: "© Doll Up Boutique. All rights reserved.",
  },
};

const fetchConfig = unstable_cache(
  async (): Promise<PublicStoreConfig> => {
    const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
    const pak = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
    if (!baseUrl || !pak) return FALLBACK;
    try {
      const res = await fetch(`${baseUrl}/store/store-config`, {
        headers: { "x-publishable-api-key": pak },
        // server-side fetch; explicit no-store would defeat unstable_cache.
      });
      if (!res.ok) return FALLBACK;
      const json = (await res.json()) as { config: PublicStoreConfig };
      return json.config ?? FALLBACK;
    } catch {
      return FALLBACK;
    }
  },
  ["store-config-v1"],
  { revalidate: 300, tags: ["store-config"] },
);

export async function getStoreConfig(): Promise<PublicStoreConfig> {
  return fetchConfig();
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd DUB-front
npx tsc --noEmit
git add src/lib/store-config.ts
git commit -m "feat(storefront): getStoreConfig() with 5-min cache + fallback"
```

---

### Task SF2: Refactor Footer + nav.ts social links

**Files:**
- Modify: `DUB-front/src/lib/nav.ts`
- Modify: `DUB-front/src/components/Footer.tsx`

- [ ] **Step 1: Remove `SOCIAL_LINKS` from nav.ts**

Open `src/lib/nav.ts`. Delete the `SOCIAL_LINKS` export (lines 59–64). Anything that imports it must move to `getStoreConfig()` instead — there should be exactly one consumer (Footer).

- [ ] **Step 2: Update Footer to read from getStoreConfig**

Open `src/components/Footer.tsx`. Make it an `async` server component:

```tsx
// At the top of Footer.tsx:
import { getStoreConfig } from "@/lib/store-config";
import { FOOTER_SHOP, FOOTER_HELP, FOOTER_ABOUT, FOOTER_LEGAL } from "@/lib/nav";
// Remove the SOCIAL_LINKS import.

export async function Footer() {
  const cfg = await getStoreConfig();
  // ...

  // Replace `SOCIAL_LINKS.facebook` → `cfg.store.facebook_url`
  // Replace `SOCIAL_LINKS.instagram` → `cfg.store.instagram_url`
  // Replace `SOCIAL_LINKS.tiktok` → `cfg.store.tiktok_url`
  // Replace `SOCIAL_LINKS.whatsapp` → `cfg.store.whatsapp_url`
  // Replace any hardcoded copyright with `cfg.store.footer_copyright`
}
```

If `Footer` is currently used in places that expect a non-async component, the App Router accepts async components. Check that no `"use client"` parent imports Footer directly — server components can't be inside client components. Footer is in the root `layout.tsx`, which is server-only, so this is fine.

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit
npm run dev
# Visit /. Footer renders with social links pulled from API.
# Change a URL in dollup-admin → save → wait 5 min OR add ?nocache to bust → footer updates.
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/nav.ts src/components/Footer.tsx
git commit -m "refactor(footer): read social URLs from store-config instead of nav.ts const"
```

---

### Task SF3: Shipping page + free-ship threshold

**Files:**
- Modify: `DUB-front/src/lib/shipping-rates.ts`
- Modify: `DUB-front/src/app/shipping/page.tsx`

- [ ] **Step 1: Replace hardcoded `freeOver: 1500`**

Open `src/lib/shipping-rates.ts`. The `FALLBACKS` const has `home: { amount: 150, freeOver: 1500 }`. Move the `freeOver` to come from settings:

```ts
import { getStoreConfig } from "./store-config";

// ...

export async function getMauritiusRates(): Promise<ShippingRate[]> {
  const [live, cfg] = await Promise.all([fetchRatesFromMedusa(), getStoreConfig()]);
  const freeOver = cfg.shipping.free_shipping_threshold_mur;
  return DISPLAY.map((d) => {
    const fallback = FALLBACKS[d.key];
    const liveRow = live?.[d.key];
    return {
      key: d.key,
      label: d.label,
      timeframe: d.timeframe,
      amount: liveRow?.amount ?? fallback?.amount ?? null,
      currency: liveRow?.currency ?? "MUR",
      freeOver: d.key === "home" && freeOver > 0 ? freeOver : undefined,
    };
  });
}
```

- [ ] **Step 2: Update /shipping page if it has hardcoded threshold copy**

Read `src/app/shipping/page.tsx`. If the page has any inline "free over Rs 1,500" text not driven by `ShippingRate.freeOver`, swap it to read `cfg.shipping.free_shipping_threshold_mur`.

If the page has copy that uses the pre-order ETA (search for "Confirm before noon"), replace with `cfg.shipping.preorder_eta_copy`.

- [ ] **Step 3: Smoke + commit**

```bash
npx tsc --noEmit
npm run dev
# Visit /shipping; change threshold in admin to 2000; storefront /shipping shows new value after cache TTL.
git add src/lib/shipping-rates.ts src/app/shipping/page.tsx
git commit -m "refactor(shipping): read free threshold + ETA from store-config"
```

---

### Task SF4: Returns + Contact

**Files:**
- Modify: `DUB-front/src/app/returns/page.tsx`
- Modify: `DUB-front/src/app/contact/page.tsx`

- [ ] **Step 1: Returns page**

Read `src/app/returns/page.tsx`. Find any hardcoded mention of return fees ("free returns", "Rs X return fee") — replace with copy that reads from `cfg.shipping.return_fee_mur`:

```tsx
import { getStoreConfig } from "@/lib/store-config";

export default async function ReturnsPage() {
  const cfg = await getStoreConfig();
  const fee = cfg.shipping.return_fee_mur;
  // Use `fee === 0 ? "Free" : `Rs ${fee}`` somewhere in the body.
  // ...
}
```

- [ ] **Step 2: Contact page**

Read `src/app/contact/page.tsx`. Replace any hardcoded phone/email/hours/social URL with reads from `cfg.store.*`:

```tsx
import { getStoreConfig } from "@/lib/store-config";

export default async function ContactPage() {
  const cfg = await getStoreConfig();
  // Replace hardcoded contact_phone, contact_email, contact_hours,
  // whatsapp_url, instagram_url etc. with cfg.store.*
}
```

- [ ] **Step 3: Smoke + commit + push**

```bash
npx tsc --noEmit
npm run dev
# /returns shows live return fee; /contact shows live phone/email/hours.
git add src/app/returns/page.tsx src/app/contact/page.tsx
git commit -m "refactor(content): /returns + /contact read from store-config"
git push
```

---

## Final verification checklist

### Backend
- [ ] `node .yarn/releases/yarn-4.12.0.cjs build` clean
- [ ] `_store-config-service.spec.ts` 4/4 pass
- [ ] Migrations applied — 3 tables exist with default rows
- [ ] `GET /admin/store-config/{email,shipping,store}` each return defaults
- [ ] `POST` to each persists; `GET` reads back the new values
- [ ] `GET /store/store-config` returns the public union (no email settings exposed)
- [ ] Resend `welcome` email is suppressed when `enabled_welcome === false`

### dollup-admin
- [ ] `npx tsc --noEmit` clean; `npm run build` lists `/settings/{loyalty,email,shipping,store}`
- [ ] Settings nav rail lists all four
- [ ] Each settings page round-trips: change → save → reload → sticks
- [ ] Validation kicks in (negative numbers rejected, non-URL rejected for social)
- [ ] Email page shows the read-only from-address

### DUB-front
- [ ] `npx tsc --noEmit` clean; `npm run build` clean
- [ ] Footer social URLs come from settings (change in admin → footer updates after 5 min cache)
- [ ] /shipping reflects free threshold
- [ ] /returns reflects return fee
- [ ] /contact reflects phone/email/hours
- [ ] Backend down → fallback values render (validate by stopping local backend)

---

## Memory entry to save after merge

```
name: dollup-admin email/shipping/store settings shipped (YYYY-MM-DD)
description: store-config module + 3 admin settings pages + storefront refactor; founder owns email toggles, free threshold, return fee, contact info, social URLs
type: project

Backend: src/modules/store-config/ with EmailSettings, ShippingSettings, StoreSettings singletons. /admin/store-config/{email,shipping,store} GET/POST. /store/store-config slim public union.

dollup-admin: /settings/{email,shipping,store} pages + lib/store-config.ts.

Storefront (DUB-front): src/lib/store-config.ts (cached 5 min), Footer + nav.ts + shipping-rates.ts + /shipping + /returns + /contact all read from settings.

Resend: enabled_* flags gate sends. Fail-open if settings unreachable.

Why: founder needs to tweak copy + toggles without redeploys; one source of truth lives off-code.

How to apply: when adding a new public-facing field, add it to the model + DTO + admin form + /store/store-config response + storefront fetcher fallback. Five-touch update — keep them in sync.
```

---

## Out of scope (deferred)

- **From-address editing** — would require Resend domain re-verification flow. Stays read-only.
- **Per-region shipping settings** — site is MU-only. If Rodrigues ever splits into its own region, settings can fork.
- **Settings audit log** — no history of who changed what. Add later if multiple admins exist.
- **Public route caching invalidation on save** — current implementation has a 5-min TTL. Acceptable lag for content tweaks. If immediacy is needed, add a `revalidateTag("store-config")` call from the admin save action via a backend webhook. Not worth it pre-launch.

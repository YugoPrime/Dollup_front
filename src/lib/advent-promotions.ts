// Turns each advent door into a Medusa campaign + automatic promotion payload.
// Pure: no I/O. The owner-run scripts/advent-promotions.ts sends them.
import { doorCode, doorWindow, type Door } from "./advent"

export type PromotionRule = { attribute: string; operator: "in" | "eq" | "ne"; values: string[] }
export type DoorPromotion = {
  campaign: { name: string; campaign_identifier: string; starts_at: string; ends_at: string }
  promotion: {
    code: string
    type: "standard" | "buyget"
    is_automatic: true
    status: "active"
    rules: PromotionRule[]
    application_method: Record<string, unknown>
  }
}

/** Website carts only: the storefront stamps metadata.cart_type = "instock". */
export const WEBSITE_RULE: PromotionRule = { attribute: "metadata.cart_type", operator: "eq", values: ["instock"] }

export const SHIPPING_TYPE = {
  postage: "sotype_01KN7026VC6CYW8PEDG18X6TA9",
  homeDelivery: "sotype_01KN7026VCRHTDZC73438FDJHQ",
} as const

const pad2 = (n: number) => String(n).padStart(2, "0")

function shippingMethod(typeId: string): Record<string, unknown> {
  return {
    type: "percentage",
    target_type: "shipping_methods",
    allocation: "across",
    value: 100,
    target_rules: [{ attribute: "shipping_methods.shipping_option.shipping_option_type_id", operator: "in", values: [typeId] }],
  }
}

function applicationMethod(door: Door, ids: { categoryIdByHandle: Record<string, string> }): { type: "standard" | "buyget"; method: Record<string, unknown> } | null {
  switch (door.kind) {
    case "category": {
      const values = (door.categoryHandles ?? []).map((h) => {
        const id = ids.categoryIdByHandle[h]
        if (!id) throw new Error(`Door ${door.day}: unknown category handle "${h}"`)
        return id
      })
      const target_rules: PromotionRule[] = [{ attribute: "items.product.categories.id", operator: "in", values }]
      if (door.excludeProductIds?.length) {
        target_rules.push({ attribute: "items.product_id", operator: "ne", values: [...door.excludeProductIds] })
      }
      return {
        type: "standard",
        method: { type: "fixed", target_type: "items", allocation: "each", value: door.amountOff, max_quantity: 99, currency_code: "mur", target_rules },
      }
    }
    case "happy-hour":
      return { type: "standard", method: { type: "percentage", target_type: "items", allocation: "across", value: door.percentOff ?? 20 } }
    case "free-postage":
      return { type: "standard", method: shippingMethod(SHIPPING_TYPE.postage) }
    case "free-delivery":
      return { type: "standard", method: shippingMethod(SHIPPING_TYPE.homeDelivery) }
    case "gift": {
      if (!door.gift) throw new Error(`Door ${door.day}: gift door has no gift`)
      const productId = door.gift.productId
      return {
        type: "buyget",
        method: {
          type: "percentage",
          target_type: "items",
          allocation: "each",
          value: 100,
          max_quantity: 1,
          apply_to_quantity: 1,
          buy_rules_min_quantity: 1,
          buy_rules: [{ attribute: "items.product_id", operator: "ne", values: [productId] }],
          target_rules: [{ attribute: "items.product_id", operator: "in", values: [productId] }],
        },
      }
    }
    case "double-points":
      return null
  }
}

export function buildDoorPromotion(
  door: Door,
  ids: { categoryIdByHandle: Record<string, string> },
  test?: { testerGroupId: string; startsAt: string; endsAt: string },
): DoorPromotion | null {
  const am = applicationMethod(door, ids)
  if (!am) return null
  const n = pad2(door.day)
  const window = test ? { startsAt: test.startsAt, endsAt: test.endsAt } : doorWindow(door)
  const rules: PromotionRule[] = [WEBSITE_RULE]
  if (test) rules.push({ attribute: "customer.groups.id", operator: "in", values: [test.testerGroupId] })
  return {
    campaign: {
      name: `Advent 2026${test ? " TEST" : ""} · Door ${n}`,
      campaign_identifier: `advent-2026-${test ? "test-" : ""}door-${n}`,
      starts_at: window.startsAt,
      ends_at: window.endsAt,
    },
    promotion: { code: doorCode(door.day, !!test), type: am.type, is_automatic: true, status: "active", rules, application_method: am.method },
  }
}

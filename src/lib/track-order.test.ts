// Covers what /track-order and the account order page show for Mauritius
// Post parcels. Plain script: `npx tsx src/lib/track-order.test.ts`.
import type { HttpTypes } from "@medusajs/types"
import {
  buildTrackingUrl,
  deriveStatus,
  isPostageOrder,
  readShippedAt,
  readTrackingCode,
} from "./track-order"

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok  ${name}`)
  else {
    failed++
    console.log(`  FAIL ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function order(fields: Record<string, unknown>): HttpTypes.StoreOrder {
  return { status: "pending", fulfillment_status: "not_fulfilled", metadata: {}, fulfillments: [], ...fields } as unknown as HttpTypes.StoreOrder
}

// What dollup-admin saves today (real shape, 98 postage orders on 26 Nov 2026).
const shippedPostage = order({
  fulfillment_status: "fulfilled",
  metadata: { delivery_method: "Postage", tracking_number: " RR123456789MU ", shipped_at: "2026-11-18T08:00:00.000Z" },
  fulfillments: [{ id: "ful_1", shipped_at: null, metadata: {} }],
})

check("reads metadata.tracking_number", readTrackingCode(shippedPostage), "RR123456789MU")
check("still reads the old tracking_code", readTrackingCode(order({ metadata: { tracking_code: "CP1MU" } })), "CP1MU")
check("reads a fulfilment's tracking_number", readTrackingCode(order({ fulfillments: [{ metadata: { tracking_number: "EE9MU" } }] })), "EE9MU")
check("blank number is no number", readTrackingCode(order({ metadata: { tracking_number: "  " } })), null)
check("tracking link", buildTrackingUrl("RR123456789MU"), "https://www.mauritiuspost.mu/track-trace/?tracking_code=RR123456789MU")
// Rahvi's example link, 26 Nov 2026: opens straight on the parcel's history.
check("Rahvi's example link", buildTrackingUrl("DP207137471MU"), "https://www.mauritiuspost.mu/track-trace/?tracking_code=DP207137471MU")
check("lower case and spaces are cleaned", readTrackingCode(order({ metadata: { tracking_number: "dp 207137471 mu" } })), "DP207137471MU")
check("link is cleaned too", buildTrackingUrl("dp207137471mu "), "https://www.mauritiuspost.mu/track-trace/?tracking_code=DP207137471MU")

check("Postage is postage", isPostageOrder(shippedPostage), true)
check("Express Postage is postage", isPostageOrder(order({ metadata: { delivery_method: "Express Postage" } })), true)
check("Rodrigues Postage is postage", isPostageOrder(order({ metadata: { delivery_method: "Rodrigues Postage" } })), true)
check("Home Delivery is not", isPostageOrder(order({ metadata: { delivery_method: "Home Delivery" } })), false)
check("no method is not", isPostageOrder(order({ metadata: null })), false)

check("shipped postage order shows as shipped (the tracking step)", deriveStatus(shippedPostage), "shipped")
check(
  "postage with a number but not fulfilled yet is shipped",
  deriveStatus(order({ metadata: { delivery_method: "Postage", tracking_number: "RR1MU" } })),
  "shipped",
)
check(
  "fulfilled postage without a number is shipped",
  deriveStatus(order({ fulfillment_status: "fulfilled", metadata: { delivery_method: "Postage" } })),
  "shipped",
)
check(
  "fulfilled home delivery stays packed (unchanged)",
  deriveStatus(order({ fulfillment_status: "fulfilled", metadata: { delivery_method: "Home Delivery" } })),
  "packed",
)
check(
  "cancelled postage with a number stays cancelled",
  deriveStatus(order({ status: "canceled", metadata: { delivery_method: "Postage", tracking_number: "RR1MU" } })),
  "canceled",
)
check("unfulfilled postage without a number is placed", deriveStatus(order({ metadata: { delivery_method: "Postage" } })), "placed")

check("shipped date falls back to metadata.shipped_at", readShippedAt(shippedPostage), "2026-11-18T08:00:00.000Z")
check(
  "fulfilment shipped date wins",
  readShippedAt(order({ fulfillments: [{ shipped_at: "2026-11-19T10:00:00.000Z" }], metadata: { shipped_at: "2026-11-18T08:00:00.000Z" } })),
  "2026-11-19T10:00:00.000Z",
)
check("no shipped date", readShippedAt(order({})), null)

if (failed > 0) {
  console.log(`\n${failed} FAILED`)
  process.exit(1)
}
console.log("\nALL PASS")

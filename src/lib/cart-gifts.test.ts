// Revert safety net. Plain script: `npx tsx src/lib/cart-gifts.test.ts`.
import type { HttpTypes } from "@medusajs/types"
import { giftsToRevert } from "./cart-gifts"

type Cart = HttpTypes.StoreCart

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

const line = (total: number, tag: string | null) => ({ id: "g", product_id: "p", quantity: 1, total, original_total: 550, metadata: tag ? { auto_gift: tag } : null })
check("unpaid advent gift removed", giftsToRevert({ items: [line(550, "advent-gift")] } as unknown as Cart), [{ rule: "advent-gift", kind: "remove", lineId: "g" }])
check("free advent gift kept", giftsToRevert({ items: [line(0, "advent-gift")] } as unknown as Cart), [])
check("customer line untouched", giftsToRevert({ items: [line(550, null)] } as unknown as Cart), [])

if (ok) console.log("ALL PASS")
else process.exit(1)

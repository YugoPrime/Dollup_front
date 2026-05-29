// Pre-order deposit math. MUR is stored as WHOLE RUPEES in this stack
// (formatPrice never divides by 100; sample variant prices are 800/1100/890).
// So all amounts here are whole rupees.
export const PREORDER_PAYMENT_PROVIDER_ID = "pp_system_default"

export type DepositBreakdown = {
  total: number   // items + delivery
  deposit: number // 75%, rounded UP to nearest Rs 50
  balance: number // total - deposit
}

const DEPOSIT_RATE = 0.75
const ROUND_TO = 50

export function computeDeposit(itemTotal: number, shippingTotal: number): DepositBreakdown {
  const total = Math.max(0, Math.round(itemTotal) + Math.round(shippingTotal))
  const raw = total * DEPOSIT_RATE
  const deposit = Math.min(total, Math.ceil(raw / ROUND_TO) * ROUND_TO)
  return { total, deposit, balance: total - deposit }
}

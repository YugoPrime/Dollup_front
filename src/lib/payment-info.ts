// Payment destination info for non-cash methods. Both MCB Juice and Bank
// Transfer route to the same MCB business account. If these change, update
// here and ship a new build.
export const PAYMENT_INFO = {
  account_name: "Doll Up Boutique Limited",
  bank: "MCB",
  account_number: "000446948071",
  whatsapp: "+230 5941 6359",
  // Digits-only form for the wa.me deep link.
  whatsapp_digits: "23059416359",
} as const;

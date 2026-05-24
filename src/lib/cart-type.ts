export type CartType = "instock" | "preorder";

export function cartTypeOf(
  cart: { metadata?: Record<string, unknown> | null } | null | undefined,
): CartType | null {
  const t = cart?.metadata?.cart_type;
  if (t === "instock" || t === "preorder") return t;
  return null;
}

export function canAddItem(
  cart: { metadata?: Record<string, unknown> | null } | null | undefined,
  intendedType: CartType,
): { ok: true } | { ok: false; reason: string } {
  if (!cart) return { ok: true };
  const current = cartTypeOf(cart);
  if (current === null) return { ok: true };
  if (current === intendedType) return { ok: true };
  return {
    ok: false,
    reason:
      intendedType === "preorder"
        ? "Your cart has in-stock items. Finish that checkout or empty your cart before adding pre-order items."
        : "Your cart has pre-order items. Finish that checkout or empty your cart before adding in-stock items.",
  };
}

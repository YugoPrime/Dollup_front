// Helpers for distinguishing auto-appended order lines (Delivery / Discount /
// Adjustment) from real catalog/manual line items. These run on both server
// and client (no "server-only" guard), since the inline-edit form needs them
// to hydrate state and the server uses them to diff edits.

export const DELIVERY_LINE_RE = /^Delivery\s—/;
export const DISCOUNT_TITLE = "Discount";
export const ADJUSTMENT_TITLE = "Adjustment";

export function isAutoLine(title: string): boolean {
  return (
    DELIVERY_LINE_RE.test(title) ||
    title === DISCOUNT_TITLE ||
    title === ADJUSTMENT_TITLE
  );
}

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

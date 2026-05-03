"use client";

import { useState } from "react";
import { ShopFilterChips } from "./ShopFilterChips";
import { ShopFilterSheet } from "./ShopFilterSheet";
import { ShopStickyBar } from "./ShopStickyBar";

export function ShopMobileClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <ShopFilterChips onOpenFilters={() => setOpen(true)} />
      {children}
      <ShopStickyBar onOpenFilters={() => setOpen(true)} />
      <ShopFilterSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

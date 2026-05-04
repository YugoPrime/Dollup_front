"use client";

import { useState } from "react";
import { ShopFilterChips } from "./ShopFilterChips";
import { ShopFilterSheet, type SheetCategory, type SheetFacets } from "./ShopFilterSheet";
import { ShopStickyBar } from "./ShopStickyBar";

export function ShopMobileClient({
  children,
  categories,
  facets,
}: {
  children: React.ReactNode;
  categories: SheetCategory[];
  facets: SheetFacets;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <ShopFilterChips onOpenFilters={() => setOpen(true)} />
      {children}
      <ShopStickyBar onOpenFilters={() => setOpen(true)} />
      <ShopFilterSheet open={open} onClose={() => setOpen(false)} categories={categories} facets={facets} />
    </div>
  );
}

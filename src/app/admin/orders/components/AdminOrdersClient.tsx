"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";
import { RecentOrdersSheet } from "./RecentOrdersSheet";
import { CustomerSearch } from "./CustomerSearch";
import {
  DateFilter,
  dateFilterToQuery,
  type DateFilterValue,
} from "./DateFilter";
import { searchOrdersAction } from "../actions";
import type { CustomerHit, OrderRow } from "@/lib/admin-orders";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

export function AdminOrdersClient({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const formRef = useRef<NewOrderRowRef | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [customerFilter, setCustomerFilter] = useState<CustomerHit | null>(
    null,
  );
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    kind: "all",
  });
  const PAGE_SIZE = 50;
  // Offset advances by PAGE_SIZE per server fetch — the server pages by
  // raw rows, so we must mirror that. Don't advance by visible-row count;
  // that double-pulls rows that were already fetched but filtered out as
  // replaced predecessors.
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const isFirstMount = useRef(true);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [stockOpen, setStockOpen] = useState(false);

  function handlePick(v: SelectedVariant) {
    formRef.current?.addVariant(v);
    if (typeof window !== "undefined") {
      const el = document.getElementById("dm-order-form");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reloadOrders(opts: { reset?: boolean } = {}) {
    startRefresh(async () => {
      try {
        setErrorBanner(null);
        const queryParams = dateFilterToQuery(dateFilter);
        const nextOffset = opts.reset ? 0 : offset;
        const res = await searchOrdersAction({
          ...queryParams,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if (opts.reset) {
          setOrders(res);
          setOffset(PAGE_SIZE);
        } else {
          setOrders((prev) => [...prev, ...res]);
          setOffset(nextOffset + PAGE_SIZE);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not load orders";
        console.error("[AdminOrdersClient.reloadOrders]", err);
        setErrorBanner(msg);
      }
    });
  }

  // Refetch when the date filter changes. Skip the very first mount so we
  // don't immediately overwrite the SSR-rendered initialOrders with an
  // identical "all time" fetch.
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    reloadOrders({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Close the mobile stock drawer if the layout grows past the desktop
  // breakpoint, otherwise the drawer pops back open if the user later
  // returns to mobile width.
  useEffect(() => {
    if (isDesktop) setStockOpen(false);
  }, [isDesktop]);

  // While the mobile drawer is open: lock body scroll, listen for Escape
  // to close. No-ops on desktop (drawer never mounts there).
  useEffect(() => {
    if (!stockOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStockOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [stockOpen]);

  const visibleOrders = customerFilter
    ? orders.filter(
        (o) => (o.phone ?? "").replace(/\D/g, "") === customerFilter.phone,
      )
    : orders;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
      {/* LEFT COLUMN — main content */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <CustomerSearch onSelect={setCustomerFilter} />
          </div>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setStockOpen(true)}
              className="rounded-md border border-coral-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-coral-700 hover:bg-coral-500 hover:text-white"
            >
              📦 Stock
            </button>
          )}
        </div>
        {errorBanner && (
          <p
            role="alert"
            className="rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
          >
            {errorBanner}
          </p>
        )}
        {customerFilter && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-blush-300 bg-blush-100/40 px-3 py-2 text-xs">
            <span>
              Filtering for{" "}
              <strong>
                {customerFilter.name || customerFilter.displayPhone}
              </strong>{" "}
              ({customerFilter.orderCount} order
              {customerFilter.orderCount === 1 ? "" : "s"})
            </span>
            <button
              type="button"
              onClick={() => formRef.current?.applyCustomer(customerFilter)}
              className="rounded-md bg-coral-500 px-2 py-1 font-semibold uppercase tracking-wider text-white hover:bg-coral-700"
            >
              📋 Use customer in new entry
            </button>
            <button
              type="button"
              onClick={() => setCustomerFilter(null)}
              className="text-ink-muted hover:text-coral-700"
              aria-label="Clear filter"
            >
              ✕
            </button>
          </div>
        )}
        <div id="dm-order-form">
          <NewOrderRow
            ref={formRef}
            onSaved={() => reloadOrders({ reset: true })}
          />
        </div>
        <RecentOrdersSheet
          orders={visibleOrders}
          onChanged={() => reloadOrders({ reset: true })}
          isFilterActive={customerFilter != null || dateFilter.kind !== "all"}
        />
        {!customerFilter && visibleOrders.length > 0 && (
          <button
            type="button"
            onClick={() => reloadOrders()}
            className="mx-auto mt-3 block rounded-md border border-blush-400 px-3 py-1.5 text-xs hover:bg-blush-100"
          >
            Load older
          </button>
        )}
      </div>

      {/* RIGHT COLUMN — desktop sticky stock checker. The aside stretches
          to match the left column's height; the inner div is the actual
          sticky element so it pins to the viewport while you scroll the
          orders list. */}
      {isDesktop && (
        <aside>
          <div className="sticky top-3">
            <StockChecker onPickVariant={handlePick} />
          </div>
        </aside>
      )}

      {/* MOBILE: bottom drawer for stock checker */}
      {!isDesktop && stockOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Stock checker"
        >
          <button
            type="button"
            onClick={() => setStockOpen(false)}
            aria-label="Close"
            className="flex-1"
          />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-blush-400 bg-white p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base text-ink">Stock checker</h3>
              <button
                type="button"
                onClick={() => setStockOpen(false)}
                className="text-ink-muted hover:text-coral-700"
                aria-label="Close stock checker"
              >
                ✕
              </button>
            </div>
            <StockChecker
              onPickVariant={(v) => {
                handlePick(v);
                setStockOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

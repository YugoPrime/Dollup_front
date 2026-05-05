"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { NewOrderRow, type NewOrderRowRef } from "./NewOrderRow";
import { StockChecker, type SelectedVariant } from "./StockChecker";
import { RecentOrdersSheet } from "./RecentOrdersSheet";
import { CustomerSearch } from "./CustomerSearch";
import { dateFilterToQuery, type DateFilterValue } from "./DateFilter";
import {
  CollapsibleNewOrder,
  type CollapsibleNewOrderRef,
} from "./CollapsibleNewOrder";
import { OrderListFilterBar } from "./OrderListFilterBar";
import { searchOrdersAction } from "../actions";
import type { CustomerHit, OrderRow } from "@/lib/admin-orders";
import { getEffectiveStatus } from "@/lib/admin-orders-shared";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

const PERIOD_STORAGE_KEY = "dub_admin_recent_period";
const HIDE_CANCELLED_STORAGE_KEY = "dub_admin_hide_cancelled";

function readStoredDateFilter(): DateFilterValue {
  if (typeof window === "undefined") return { kind: "all" };
  try {
    const raw = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    if (!raw) return { kind: "all" };
    const parsed = JSON.parse(raw) as DateFilterValue;
    // Light shape validation — discard anything we don't recognise so a
    // stale/malformed value can't crash the page.
    if (parsed && typeof parsed === "object" && "kind" in parsed) {
      if (
        parsed.kind === "all" ||
        parsed.kind === "preset" ||
        parsed.kind === "custom"
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return { kind: "all" };
}

function writeStoredDateFilter(v: DateFilterValue) {
  if (typeof window === "undefined") return;
  try {
    if (v.kind === "all") {
      window.localStorage.removeItem(PERIOD_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(v));
    }
  } catch {
    /* ignore */
  }
}

export function AdminOrdersClient({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const formRef = useRef<NewOrderRowRef | null>(null);
  const collapsibleRef = useRef<CollapsibleNewOrderRef | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [customerFilter, setCustomerFilter] = useState<CustomerHit | null>(
    null,
  );
  // Server renders with default ({ kind: "all" }) to avoid SSR mismatch.
  // After hydration we read the persisted value, which triggers a refetch
  // via the existing `[dateFilter]` effect.
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    kind: "all",
  });
  const [hideCancelled, setHideCancelled] = useState(false);
  // Hydrate persisted filter prefs once on mount.
  useEffect(() => {
    const stored = readStoredDateFilter();
    if (stored.kind !== "all") setDateFilter(stored);
    try {
      if (window.localStorage.getItem(HIDE_CANCELLED_STORAGE_KEY) === "1") {
        setHideCancelled(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function updateDateFilter(v: DateFilterValue) {
    setDateFilter(v);
    writeStoredDateFilter(v);
  }
  function updateHideCancelled(v: boolean) {
    setHideCancelled(v);
    try {
      if (v) window.localStorage.setItem(HIDE_CANCELLED_STORAGE_KEY, "1");
      else window.localStorage.removeItem(HIDE_CANCELLED_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
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
    // Force the form open BEFORE reaching for the inner ref. When the
    // collapsible body is unmounted (collapsed), `formRef.current` is null
    // and the addVariant() call would be a silent no-op. We expand first,
    // then defer the addVariant() to the next tick so React has a chance
    // to mount NewOrderRow and populate the ref.
    collapsibleRef.current?.expand();
    if (formRef.current) {
      formRef.current.addVariant(v);
    } else {
      // Form was just expanded — wait one frame for it to mount.
      setTimeout(() => formRef.current?.addVariant(v), 0);
    }
    if (typeof window !== "undefined") {
      const el = document.getElementById("dm-order-form");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function handleApplyCustomer(c: CustomerHit) {
    collapsibleRef.current?.expand();
    if (formRef.current) {
      formRef.current.applyCustomer(c);
    } else {
      setTimeout(() => formRef.current?.applyCustomer(c), 0);
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

  const customerScoped = customerFilter
    ? orders.filter(
        (o) => (o.phone ?? "").replace(/\D/g, "") === customerFilter.phone,
      )
    : orders;
  const visibleOrders = hideCancelled
    ? customerScoped.filter((o) => getEffectiveStatus(o) !== "cancelled")
    : customerScoped;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
      {/* LEFT COLUMN — main content */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <CustomerSearch onSelect={setCustomerFilter} />
          </div>
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
              onClick={() => handleApplyCustomer(customerFilter)}
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
          <CollapsibleNewOrder ref={collapsibleRef}>
            <NewOrderRow
              ref={formRef}
              onSaved={() => reloadOrders({ reset: true })}
            />
          </CollapsibleNewOrder>
        </div>
        <OrderListFilterBar
          dateFilter={dateFilter}
          onDateFilterChange={updateDateFilter}
          hideCancelled={hideCancelled}
          onHideCancelledChange={updateHideCancelled}
        />
        <RecentOrdersSheet
          orders={visibleOrders}
          onChanged={() => reloadOrders({ reset: true })}
          isFilterActive={
            customerFilter != null ||
            dateFilter.kind !== "all" ||
            hideCancelled
          }
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

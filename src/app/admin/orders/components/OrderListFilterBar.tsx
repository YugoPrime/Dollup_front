"use client";

import { DateFilter, type DateFilterValue } from "./DateFilter";

/**
 * Horizontal filter row that sits ABOVE the recent orders list. Owns the
 * period (date) selector and the "Hide cancelled" toggle. State lives in
 * the parent (AdminOrdersClient) so other components can react to filter
 * changes; this component is purely presentational.
 *
 * Stacks vertically on narrow viewports.
 */
export function OrderListFilterBar({
  dateFilter,
  onDateFilterChange,
  hideCancelled,
  onHideCancelledChange,
}: {
  dateFilter: DateFilterValue;
  onDateFilterChange: (v: DateFilterValue) => void;
  hideCancelled: boolean;
  onHideCancelledChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
      <DateFilter value={dateFilter} onChange={onDateFilterChange} />
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
        <input
          type="checkbox"
          checked={hideCancelled}
          onChange={(e) => onHideCancelledChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-coral-500"
        />
        <span className="font-semibold uppercase tracking-wider text-ink-muted">
          Hide cancelled
        </span>
      </label>
    </div>
  );
}

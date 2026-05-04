"use client";

import { useState } from "react";

export type DateFilterValue =
  | { kind: "all" }
  | { kind: "preset"; preset: "today" | "yesterday" | "last7" | "thisMonth" }
  | { kind: "custom"; from: string; to: string };

export function DateFilter({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}) {
  // Track the dropdown's intended selection separately so picking
  // "Custom range…" doesn't snap visually back to the previous preset
  // while the from/to inputs are still being edited.
  const [intent, setIntent] = useState<string>(
    value.kind === "preset" ? value.preset : value.kind,
  );
  const showCustom = intent === "custom";
  const [customFrom, setCustomFrom] = useState(
    value.kind === "custom" ? value.from : "",
  );
  const [customTo, setCustomTo] = useState(
    value.kind === "custom" ? value.to : "",
  );

  function selectPreset(p: string) {
    setIntent(p);
    if (p === "all") {
      onChange({ kind: "all" });
      return;
    }
    if (p === "custom") return; // wait for Apply
    onChange({
      kind: "preset",
      preset: p as "today" | "yesterday" | "last7" | "thisMonth",
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={intent}
        onChange={(e) => selectPreset(e.target.value)}
        className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1.5 text-xs"
      >
        <option value="all">📅 All time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="last7">Last 7 days</option>
        <option value="thisMonth">This month</option>
        <option value="custom">Custom range…</option>
      </select>
      {showCustom && (
        <>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1 text-xs"
          />
          <span className="text-xs">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border-[1.5px] border-blush-400 bg-white px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() =>
              onChange({ kind: "custom", from: customFrom, to: customTo })
            }
            className="rounded-md bg-coral-500 px-2 py-1 text-[11px] font-semibold uppercase text-white"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
}

export function dateFilterToQuery(v: DateFilterValue): {
  dateFrom?: string;
  dateTo?: string;
} {
  if (v.kind === "all") return {};
  const today = new Date();
  const iso = (d: Date) => {
    // Local-zone yyyy-mm-dd (avoids the off-by-one from toISOString in PM hours).
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  if (v.kind === "custom") {
    return {
      dateFrom: v.from || undefined,
      dateTo: v.to || undefined,
    };
  }
  switch (v.preset) {
    case "today":
      return { dateFrom: iso(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { dateFrom: iso(y), dateTo: iso(y) };
    }
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { dateFrom: iso(from) };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: iso(from) };
    }
  }
}

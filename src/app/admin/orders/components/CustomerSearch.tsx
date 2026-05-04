"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchCustomersAction } from "../actions";
import type { CustomerHit } from "@/lib/admin-orders";

export function CustomerSearch({
  onSelect,
}: {
  onSelect: (c: CustomerHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const reqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchCustomersAction(q);
        if (reqId !== reqIdRef.current) return;
        setHits(res);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="🔎 Search by name or phone…"
        inputMode="search"
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-3 py-2 text-sm outline-none focus:border-coral-500"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-blush-400 bg-white shadow-lg">
          {pending && (
            <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>
          )}
          {!pending && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-muted">No matches.</p>
          )}
          {hits.map((c) => (
            <button
              key={c.phone}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blush-100"
            >
              <span>
                <span className="font-semibold text-ink">{c.name || "—"}</span>
                <span className="ml-2 font-mono text-[11px] text-ink-muted">
                  {c.displayPhone}
                </span>
              </span>
              <span className="text-[11px] text-ink-muted">
                {c.orderCount} order{c.orderCount === 1 ? "" : "s"} · last{" "}
                {new Date(c.mostRecentOrderAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

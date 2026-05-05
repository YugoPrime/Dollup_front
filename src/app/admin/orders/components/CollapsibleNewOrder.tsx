"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "dub_admin_new_order_expanded";

export type CollapsibleNewOrderRef = {
  /** Force the panel open. No-op if already expanded. */
  expand: () => void;
};

/**
 * Collapsible container around the new-order form. Default state is COLLAPSED.
 * State persists in localStorage under `dub_admin_new_order_expanded`
 * ("1" when expanded, absent otherwise). The trigger is a header bar with a
 * chevron icon that rotates 180° when expanded.
 *
 * Exposes an `expand()` imperative handle so callers (stock checker pick,
 * "Use customer in new entry") can force the form open before reaching into
 * the inner form's ref — which is otherwise null while the body is unmounted.
 */
export const CollapsibleNewOrder = forwardRef<
  CollapsibleNewOrderRef,
  { children: ReactNode }
>(function CollapsibleNewOrder({ children }, ref) {
  // Hydrate from localStorage AFTER mount to avoid SSR mismatch.
  // Server renders collapsed; client may flip to expanded on hydration.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setExpanded(true);
    } catch {
      /* SSR / disabled storage — keep default. */
    }
  }, []);

  function setExpandedAndPersist(next: boolean) {
    setExpanded(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    setExpandedAndPersist(!expanded);
  }

  useImperativeHandle(
    ref,
    () => ({
      expand() {
        if (!expanded) setExpandedAndPersist(true);
      },
    }),
    [expanded],
  );

  return (
    <div className="rounded-2xl border border-blush-400 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls="dm-new-order-body"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-blush-100/50 sm:px-4 sm:py-3"
      >
        <span className="font-display text-lg text-ink">+ New order</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-5 w-5 text-ink-muted transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <div id="dm-new-order-body" className="border-t border-blush-300/60">
          {children}
        </div>
      )}
    </div>
  );
});

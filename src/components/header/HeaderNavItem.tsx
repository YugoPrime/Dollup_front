"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { NavLink } from "@/lib/nav";

function HotBadge() {
  return (
    <span
      aria-label="Hot"
      className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-coral-500 to-coral-700 px-1.5 py-[2px] font-sans text-[9px] font-bold uppercase leading-none tracking-wider text-white shadow-[0_1px_2px_rgba(229,96,74,0.35)]"
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.5 1.5c.3 3.5-1.3 5.6-3 7.5-1.8 2-3.5 4-3.5 7a8 8 0 0 0 16 0c0-4-2.4-7.3-5.1-9.7.4 2.4-.5 3.9-1.8 4.5-.2-3-1-6.5-2.6-9.3zm-.8 12.4c.6 1.4 2.2 1.8 2.7 3.4.4 1.4-.6 2.7-2 2.7-1.7 0-3-1.4-2.5-3 .3-1 1.2-1.7 1.8-3.1z" />
      </svg>
      Hot
    </span>
  );
}

export function HeaderNavItem({ link }: { link: NavLink }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  if (!link.children) {
    return (
      <Link
        href={link.href}
        className="flex items-center font-sans text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-coral-500"
      >
        {link.label}
        {link.badge === "hot" ? <HotBadge /> : null}
      </Link>
    );
  }

  const onContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // If focus moves to a sibling (item or trigger) inside the container, keep open.
    const next = e.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    setOpen(false);
  };

  const onContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" && document.activeElement === triggerRef.current) {
      e.preventDefault();
      setOpen(true);
      // Defer one tick so the submenu has rendered before we look for items.
      requestAnimationFrame(() => {
        const first = containerRef.current?.querySelector<HTMLAnchorElement>(
          "[data-submenu-item]",
        );
        first?.focus();
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={onContainerBlur}
      onKeyDown={onContainerKeyDown}
    >
      <Link
        ref={triggerRef}
        href={link.href}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 font-sans text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-coral-500"
      >
        {link.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Link>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div role="menu" className="min-w-[180px] rounded-xl border border-blush-300 bg-white py-2 shadow-[0_8px_24px_rgba(229,96,74,0.12)]">
            {link.children.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                role="menuitem"
                data-submenu-item
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-sans text-[13px] text-ink transition-colors hover:bg-blush-100 hover:text-coral-500 focus:bg-blush-100 focus:text-coral-500 focus:outline-none"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

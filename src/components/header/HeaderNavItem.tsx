"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavLink } from "@/lib/nav";

export function HeaderNavItem({ link }: { link: NavLink }) {
  const [open, setOpen] = useState(false);
  if (!link.children) {
    return (
      <Link
        href={link.href}
        className="font-sans text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-coral-500"
      >
        {link.label}
      </Link>
    );
  }
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={link.href}
        className="flex items-center gap-1 font-sans text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-coral-500"
      >
        {link.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Link>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div className="min-w-[180px] rounded-xl border border-blush-300 bg-white py-2 shadow-[0_8px_24px_rgba(229,96,74,0.12)]">
            {link.children.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-sans text-[13px] text-ink transition-colors hover:bg-blush-100 hover:text-coral-500"
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

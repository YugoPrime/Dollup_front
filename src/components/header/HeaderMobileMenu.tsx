"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { NavLink } from "@/lib/nav";

const FocusTrapLayer = dynamic(
  () => import("@/components/a11y/FocusTrapLayer").then((m) => m.FocusTrapLayer),
  { ssr: false, loading: () => null },
);

export function HeaderMobileMenu({ navLinks }: { navLinks: NavLink[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-blush-100 md:hidden"
        aria-label="Menu"
        aria-controls="mobile-menu"
        aria-expanded={menuOpen}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {menuOpen ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      {menuOpen && (
        <FocusTrapLayer
          ariaLabel="Mobile menu"
          className="md:hidden"
          onDeactivate={() => setMenuOpen(false)}
        >
          <nav id="mobile-menu" className="flex flex-col border-t border-blush-400 bg-white">
            {navLinks.map((link) => (
              <div key={link.label} className="border-b border-blush-100">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center px-6 py-3.5 font-sans text-sm font-medium text-ink"
                >
                  {link.label}
                  {link.badge === "hot" ? (
                    <span
                      aria-label="Hot"
                      className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-coral-500 to-coral-700 px-1.5 py-[2px] font-sans text-[9px] font-bold uppercase leading-none tracking-wider text-white shadow-[0_1px_2px_rgba(229,96,74,0.35)]"
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
                  ) : null}
                </Link>
                {link.children && (
                  <div className="bg-blush-100/40 pl-4">
                    {link.children.map((c) => (
                      <Link
                        key={c.label}
                        href={c.href}
                        onClick={() => setMenuOpen(false)}
                        className="block border-t border-blush-100 px-6 py-2.5 font-sans text-[13px] text-ink-soft"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </FocusTrapLayer>
      )}
    </>
  );
}

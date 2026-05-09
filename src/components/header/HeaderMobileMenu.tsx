"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/nav";

const FocusTrapLayer = dynamic(
  () => import("@/components/a11y/FocusTrapLayer").then((m) => m.FocusTrapLayer),
  { ssr: false, loading: () => null },
);

export function HeaderMobileMenu() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-blush-100 md:hidden"
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
            {NAV_LINKS.map((link) => (
              <div key={link.label} className="border-b border-blush-100">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-6 py-3.5 font-sans text-sm font-medium text-ink"
                >
                  {link.label}
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

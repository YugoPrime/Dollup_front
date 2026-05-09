"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout, useCustomer, type Customer } from "@/lib/auth-client";

export function HeaderAccountMenu() {
  const router = useRouter();
  const { status, customer } = useCustomer();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading" || !customer) {
    return (
      <Link
        href="/account"
        prefetch={false}
        className="rounded-md p-2 hover:bg-blush-100"
        aria-label="Account"
      >
        <UserIcon />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full bg-coral-500 p-1.5 text-white hover:bg-coral-700"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 items-center justify-center font-sans text-[11px] font-bold uppercase">
          {customerInitials(customer)}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-blush-300 bg-white py-2 shadow-[0_8px_24px_rgba(229,96,74,0.12)]"
        >
          <div className="border-b border-blush-100 px-4 py-2">
            <p className="font-display text-sm text-ink">
              Hi, {customer.first_name || "there"}
            </p>
            <p className="font-sans text-[11px] text-ink-muted">
              {customer.email}
            </p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 font-sans text-[13px] text-ink hover:bg-blush-100 hover:text-coral-500"
          >
            My account
          </Link>
          <Link
            href="/wishlist"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 font-sans text-[13px] text-ink hover:bg-blush-100 hover:text-coral-500"
          >
            Wishlist
          </Link>
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              router.replace("/");
            }}
            className="block w-full border-t border-blush-100 px-4 py-2 text-left font-sans text-[13px] text-ink hover:bg-blush-100 hover:text-coral-500"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function customerInitials(c: Customer): string {
  const first = c.first_name?.[0] ?? "";
  const last = c.last_name?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return c.email?.[0]?.toUpperCase() ?? "?";
}

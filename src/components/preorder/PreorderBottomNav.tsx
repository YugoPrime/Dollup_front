"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";

type IconProps = { active: boolean };

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function GridIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.4" />
      <rect x="14" y="3" width="7" height="7" rx="1.4" />
      <rect x="3" y="14" width="7" height="7" rx="1.4" />
      <rect x="14" y="14" width="7" height="7" rx="1.4" />
    </svg>
  );
}

function SparkleIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BagIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function StoreIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9 4.5 4h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </svg>
  );
}

const TABS = [
  { label: "Home", href: "/preorder", icon: HomeIcon, exact: true },
  { label: "Browse", href: "/preorder/products", icon: GridIcon },
  { label: "Request", href: "/preorder/request", icon: SparkleIcon },
] as const;

export function PreorderBottomNav() {
  const pathname = usePathname() || "/preorder";
  const { itemCount, setOpen } = useCart();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Pre-order"
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-sage-200 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, "exact" in tab ? tab.exact : false);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition ${
                  active ? "text-sage-700" : "text-ink-muted"
                }`}
              >
                <Icon active={active} />
                <span className="leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="flex h-[60px] w-full flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide text-ink-muted"
          >
            <span className="relative inline-flex">
              <BagIcon active={false} />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-sage-700 px-1 text-[9px] font-bold leading-none text-cream">
                  {itemCount}
                </span>
              )}
            </span>
            <span className="leading-none">Cart</span>
          </button>
        </li>

        <li>
          <a
            href="https://dollupboutique.com"
            className="flex h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide text-ink-muted"
          >
            <StoreIcon active={false} />
            <span className="leading-none">In-Stock</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

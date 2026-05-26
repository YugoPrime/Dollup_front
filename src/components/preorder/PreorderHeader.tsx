import Link from "next/link";
import Image from "next/image";
import { PreorderHeaderCartButton } from "./PreorderHeaderCartButton";

const NAV: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/preorder" },
  { label: "Browse", href: "/preorder/products" },
  { label: "Request", href: "/preorder/request" },
  { label: "How it works", href: "/preorder/how-it-works" },
];

export function PreorderHeader() {
  return (
    <header className="sticky top-0 z-[100] border-b border-sage-200 bg-cream">
      {/* Permanent mode strip — sage, single message, calm. Distinct from the
          coral apex strip so customers immediately know they're in pre-order. */}
      <div className="flex items-center justify-center gap-3 bg-sage-500 px-4 py-1.5 text-[11px] font-medium tracking-[0.14em] text-cream uppercase">
        <span className="opacity-80">Pre-order Store</span>
        <span className="opacity-40">·</span>
        <span className="hidden sm:inline opacity-80">75% deposit reserves your piece</span>
        <span className="opacity-40 hidden sm:inline">·</span>
        <span className="opacity-80">Ships in ~15–20 days</span>
      </div>

      <div className="flex min-h-[60px] items-center gap-3 px-4 md:min-h-[88px] md:gap-6 md:px-8">
        <Link href="/preorder" aria-label="Doll Up Boutique — Pre-Order" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="Doll Up Boutique"
            width={260}
            height={224}
            loading="eager"
            sizes="(max-width: 768px) 48px, 84px"
            className="h-[44px] w-auto md:h-[72px]"
          />
          <span className="hidden flex-col leading-tight md:flex">
            <span className="font-display text-[15px] text-ink">Doll Up Boutique</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-700">
              Pre-Order
            </span>
          </span>
        </Link>

        <nav aria-label="Pre-order primary" className="hidden flex-1 items-center justify-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium tracking-wide text-ink-soft transition hover:text-sage-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile: discreet "How it works" link — secondary action that the
            bottom-nav can't fit (only 5 slots). Tap target hits 44px easily. */}
        <Link
          href="/preorder/how-it-works"
          className="ml-auto text-[11px] font-medium uppercase tracking-[0.14em] text-sage-700 underline-offset-4 hover:underline md:hidden"
        >
          How it works
        </Link>

        <div className="hidden items-center gap-1 md:ml-auto md:flex">
          <a
            href="https://dollupboutique.com"
            className="rounded-full border border-sage-300 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-sage-700 transition hover:bg-sage-100"
          >
            ← In-Stock Store
          </a>
          <PreorderHeaderCartButton />
        </div>
      </div>
    </header>
  );
}

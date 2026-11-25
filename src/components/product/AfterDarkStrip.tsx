import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AFTER_DARK_PATH } from "@/lib/after-dark";

// Lingerie product pages point shoppers to After Dark (Rahvi, 25 Nov 2026).
// Same look and words as the /shop lingerie banner, as a slim card.
export function AfterDarkStrip({ className = "" }: { className?: string }) {
  return (
    <Link
      href={AFTER_DARK_PATH}
      className={`group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-coral-500 via-coral-700 to-ink px-4 py-3 text-white transition hover:from-ink hover:via-coral-700 hover:to-coral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500 ${className}`}
    >
      <span>
        <span className="block font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
          Feeling bold?
        </span>
        <span className="mt-0.5 block font-display text-[18px] leading-tight">
          Explore After Dark
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

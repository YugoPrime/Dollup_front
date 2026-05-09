"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[app-error]", error);
    }
  }, [error]);

  return (
    <main className="bg-cream px-6 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Doll Up Boutique"
          width={120}
          height={104}
          className="mb-6 h-auto w-[120px]"
          priority
        />
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-coral-500">
          Something snagged
        </p>
        <h1 className="font-display text-[40px] leading-[0.95] text-ink md:text-[64px]">
          We couldn&apos;t load this.
        </h1>
        <p className="mt-4 max-w-[460px] font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[16px]">
          Try again in a moment, or head back to the shop and pick up where you
          left off.
        </p>
        {error.digest ? (
          <p className="mt-3 font-sans text-[11px] text-ink-muted">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
          >
            Try again
          </button>
          <Link
            href="/shop"
            className="rounded-full border-[1.5px] border-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-blush-100"
          >
            Browse the shop
          </Link>
        </div>
      </div>
    </main>
  );
}

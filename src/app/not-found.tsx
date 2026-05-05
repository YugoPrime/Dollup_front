import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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
          Page not found
        </p>
        <h1 className="font-display text-[40px] leading-[0.95] text-ink md:text-[64px]">
          This style has moved.
        </h1>
        <p className="mt-4 max-w-[460px] font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[16px]">
          The page you were looking for is not available. Head back to the shop
          to find the latest Doll Up Boutique pieces.
        </p>
        <Link
          href="/shop"
          className="mt-7 rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
        >
          Browse the shop
        </Link>
      </div>
    </main>
  );
}

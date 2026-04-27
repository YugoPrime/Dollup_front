import Link from "next/link";

export function EditorialBanner() {
  return (
    <section className="relative overflow-hidden bg-ink px-6 py-20 text-center text-white md:px-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="font-display text-[200px] italic text-white/[0.04]">
          DUB
        </div>
      </div>
      <div className="relative z-[1] mx-auto max-w-[560px]">
        <p className="mb-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-500">
          Doll Up Boutique
        </p>
        <h2 className="mb-4 font-display text-5xl font-bold leading-[1.1]">
          Style that speaks
          <br />
          for itself.
        </h2>
        <p className="mb-8 font-sans text-base leading-relaxed text-coral-600/90">
          From beach days to date nights, we&apos;ve got you dressed. Explore our
          curated lookbook for outfit inspiration.
        </p>
        <Link
          href="/lookbook"
          className="inline-block rounded bg-coral-500 px-8 py-3.5 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Explore the Lookbook
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";

export function HeroA() {
  return (
    <section className="relative flex min-h-[580px] items-center gap-10 overflow-hidden border-b border-blush-400 bg-gradient-to-br from-cream from-55% to-blush-300 px-6 py-10 md:px-20">
      <div className="z-10 max-w-xl flex-shrink-0 md:basis-[500px]">
        <p className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-500">
          New Season · 2026
        </p>
        <h1 className="mb-5 font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink md:text-7xl">
          Doll Up
          <br />
          <em className="font-display font-bold not-italic italic text-coral-500">
            in Style.
          </em>
        </h1>
        <p className="mb-8 max-w-sm font-sans text-base leading-relaxed text-ink-soft">
          Curated women&apos;s fashion, lingerie &amp; beachwear for every occasion.
        </p>
        <div className="mb-7 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="rounded bg-coral-500 px-7 py-3.5 font-sans text-sm font-semibold tracking-wide text-white transition-colors hover:bg-coral-700"
          >
            Shop New Arrivals
          </Link>
          <Link
            href="/lookbook"
            className="rounded border-[1.5px] border-coral-500 px-7 py-3 font-sans text-sm font-medium text-coral-500 hover:bg-blush-100"
          >
            View Lookbook
          </Link>
        </div>
        <div className="flex flex-wrap gap-5">
          {["Free Shipping Rs.999+", "Easy Returns", "New Drops Weekly"].map(
            (t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 font-sans text-xs text-ink-soft"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#E5604A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="relative hidden flex-1 items-center justify-center md:flex md:h-[580px]">
        <div className="absolute h-[420px] w-[420px] rounded-full bg-blush-300 opacity-70" />
        <div className="absolute right-10 top-14 h-[300px] w-[300px] rounded-full bg-blush-200 opacity-50" />
        <div className="relative z-[2] flex h-[420px] w-[360px] flex-col items-center justify-center rounded-[200px] border border-coral-500/10 bg-white/50 backdrop-blur-sm">
          <div className="font-display text-2xl italic text-coral-500/40">
            Doll Up Boutique
          </div>
          <p className="mt-2 font-sans text-[11px] text-coral-300">
            Hero photo goes here
          </p>
        </div>
        <div className="absolute bottom-20 left-5 z-[3] flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <span className="text-lg">✨</span>
          <div>
            <div className="font-display text-xs font-semibold text-ink">
              New Arrivals
            </div>
            <div className="font-sans text-[10px] text-ink-muted">
              Just dropped
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

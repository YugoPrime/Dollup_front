import Link from "next/link";

const STATS = [
  { label: "Pieces", value: "5" },
  { label: "Flat price", value: "Rs 3,500" },
  { label: "Spins", value: "3/day" },
];

export function MysteryBoxTeaser() {
  return (
    <section className="relative overflow-hidden bg-ink py-12 text-white md:py-16">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-coral-500/25 blur-2xl md:h-[320px] md:w-[320px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 h-[220px] w-[220px] rounded-full bg-blush-400/15 blur-2xl md:h-[280px] md:w-[280px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1080px] items-center gap-8 px-6 md:grid-cols-[1.2fr_1fr] md:gap-12 md:px-10">
        <div className="text-center md:text-left">
          <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-coral-300">
            Mystery Box
          </p>
          <h2 className="font-display text-[30px] leading-[1.02] md:text-[48px]">
            Spin the wheel.{" "}
            <em
              className="not-italic text-coral-300"
              style={{ fontStyle: "italic" }}
            >
              Trust the drop.
            </em>
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] font-sans text-[13px] leading-[1.55] text-white/70 md:mx-0 md:text-[15px]">
            5 surprise pieces curated for your size. Flat Rs 3,500. Always more
            value than the price tag.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 md:flex-row md:items-center">
            <Link
              href="/events/mystery-box"
              className="inline-block w-full rounded-full bg-coral-500 px-7 py-3.5 text-center font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-coral-700 md:w-auto"
            >
              Spin the wheel
            </Link>
            <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/50">
              Mauritius only · Free delivery
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm md:grid-cols-1 md:gap-0 md:p-5">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={
                "py-3 text-center md:py-4 md:text-left" +
                (i < STATS.length - 1
                  ? " border-r border-white/10 md:border-r-0 md:border-b"
                  : "")
              }
            >
              <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-white/50 md:text-[10px]">
                {stat.label}
              </p>
              <p className="mt-1 font-display text-[20px] text-white md:text-[26px]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

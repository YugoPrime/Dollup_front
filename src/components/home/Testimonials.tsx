const REVIEWS = [
  {
    name: "Camille R.",
    stars: 5,
    text: "Absolutely obsessed with my Satin Slip Dress! The quality is amazing and it arrived so fast. Will definitely order again.",
  },
  {
    name: "Bea Santos",
    stars: 5,
    text: "Doll Up never misses. I've been shopping here for 2 years and every single piece is worth it. The lingerie especially 🤍",
  },
  {
    name: "Trish V.",
    stars: 5,
    text: "I bought the Ruffle Bikini Set for a beach trip and got so many compliments. Fit was perfect for my size M.",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1000px] px-6 py-16 text-center md:px-10">
      <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-coral-500">
        What our dolls say
      </p>
      <h2 className="mb-10 font-display text-4xl font-bold text-ink">
        Loved by thousands
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <div
            key={i}
            className="rounded-xl border border-blush-400 bg-cream p-7 text-left"
          >
            <div className="mb-3 tracking-widest text-coral-500">
              {"★".repeat(r.stars)}
            </div>
            <p className="mb-3.5 font-display text-sm italic leading-relaxed text-ink">
              &ldquo;{r.text}&rdquo;
            </p>
            <div className="font-sans text-xs font-semibold tracking-wider text-ink-muted">
              — {r.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

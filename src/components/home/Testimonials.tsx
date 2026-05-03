import Image from "next/image";

type Review = {
  initial: string;
  name: string;
  date: string;
  quote: string;
  productName: string;
  productImage: string;
  productHref: string;
};

const REVIEWS: Review[] = [
  {
    initial: "P",
    name: "Priya S.",
    date: "Mar 2026",
    quote: "Quality blew me away — fits perfectly and arrived in 2 days. Already ordered the matching set.",
    productName: "Lace Bralette Set",
    productImage: "/reviews/r1.jpg",
    productHref: "/products/lace-bralette-set",
  },
  {
    initial: "A",
    name: "Anjali M.",
    date: "Mar 2026",
    quote: "Honestly the prettiest dress I own. Got compliments all night at the wedding 💕",
    productName: "Wrap Midi Dress",
    productImage: "/reviews/r2.jpg",
    productHref: "/products/wrap-midi-dress",
  },
  {
    initial: "M",
    name: "Maya R.",
    date: "Feb 2026",
    quote: "My go-to for everything beach. The fit on this bikini is unreal — even the bottoms run true to size.",
    productName: "Triangle Bikini Set",
    productImage: "/reviews/r3.jpg",
    productHref: "/products/triangle-bikini-set",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1080px] px-4 md:px-10">
        <div className="mb-6 text-center">
          <div className="font-display text-[18px] tracking-widest text-coral-500">★ ★ ★ ★ ★</div>
          <h2 className="mt-2 font-display text-[24px] text-ink md:text-[32px]">
            Loved by <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>1,200+</em> babes
          </h2>
          <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Based on 387 verified reviews
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {REVIEWS.map((r) => (
            <article key={r.name} className="rounded-2xl bg-blush-100 p-4">
              <header className="mb-2 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-coral-300 font-sans text-[13px] font-bold text-white">
                  {r.initial}
                </div>
                <div className="flex-1">
                  <div className="font-sans text-[12px] font-bold text-ink">{r.name}</div>
                  <div className="font-sans text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    ✓ Verified · {r.date}
                  </div>
                </div>
                <div className="font-sans text-[12px] tracking-wider text-coral-500">★★★★★</div>
              </header>
              <p className="mb-2 font-sans text-[13px] leading-[1.5] text-ink-soft">"{r.quote}"</p>
              <a href={r.productHref} className="flex items-center gap-2.5 rounded-lg bg-white p-2">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded">
                  <Image src={r.productImage} alt={r.productName} fill sizes="36px" className="object-cover" />
                </div>
                <div className="font-sans text-[10px] leading-tight text-ink">
                  <strong className="block font-bold">{r.productName}</strong>
                  <span className="text-ink-muted">Bought {r.date}</span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

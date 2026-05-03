import { getReviewsForProduct } from "@/lib/reviews";

export function ProductReviews({ handle }: { handle: string }) {
  const { average, count, reviews } = getReviewsForProduct(handle);

  return (
    <section id="reviews" className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <header className="mb-6 flex items-center gap-6">
          <div className="font-display text-[36px] leading-none text-ink md:text-[56px]">{average}</div>
          <div>
            <div className="font-sans text-[14px] tracking-widest text-coral-500 md:text-[18px]">★ ★ ★ ★ ★</div>
            <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted md:text-[11px]">
              Based on {count} verified reviews
            </p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {reviews.map((r) => (
            <article key={r.name} className="rounded-2xl bg-blush-100 p-4">
              <header className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-300 font-sans text-[12px] font-bold text-white">{r.initial}</div>
                <div>
                  <div className="font-sans text-[12px] font-bold text-ink">{r.name}</div>
                  <div className="font-sans text-[9px] font-bold uppercase tracking-wider text-emerald-700">✓ Verified · {r.date}</div>
                </div>
                <div className="ml-auto font-sans text-[11px] tracking-wider text-coral-500">{"★".repeat(r.stars)}</div>
              </header>
              <p className="mb-2 font-sans text-[13px] leading-[1.5] text-ink-soft">&ldquo;{r.quote}&rdquo;</p>
              {(r.size || r.color || r.fitNote) && (
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {[r.size && `Size ${r.size}`, r.color, r.fitNote].filter(Boolean).join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

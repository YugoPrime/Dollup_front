import Link from "next/link";
import { listPreorderProducts } from "@/lib/preorder";
import { PreorderProductCard } from "@/components/preorder/PreorderProductCard";

export const revalidate = 60;

export default async function PreorderHomePage() {
  const { products, count } = await listPreorderProducts({ limit: 8 });
  const hasProducts = products.length > 0;

  return (
    <main className="bg-cream">
      {/* Hero — editorial, sparse, ETA-forward */}
      <section className="border-b border-sage-100 bg-gradient-to-b from-sage-50 to-cream">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
            Pre-Order · Curated SHEIN finds
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-ink md:text-6xl">
            The pieces worth waiting for.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Hand-picked from SHEIN, reserved with a 75% deposit, delivered to
            Mauritius in about 15–20 days. No surprises, no markup games —
            just one transparent price.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/preorder/products"
              className="rounded-full bg-sage-700 px-5 py-3 text-[13px] font-semibold tracking-wide text-cream transition hover:bg-sage-900"
            >
              Browse pre-order catalog
            </Link>
            <Link
              href="/preorder/request"
              className="rounded-full border border-sage-300 px-5 py-3 text-[13px] font-medium tracking-wide text-sage-700 transition hover:bg-sage-100"
            >
              Request a SHEIN item →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — 3 simple steps, utility feel */}
      <section className="border-b border-sage-100">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl text-ink">How pre-order works</h2>
            <Link
              href="/preorder/how-it-works"
              className="text-[12px] font-medium uppercase tracking-[0.16em] text-sage-700 hover:text-sage-900"
            >
              Full details →
            </Link>
          </div>

          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick or request",
                body: "Browse the catalog or send us a SHEIN link of something you love.",
              },
              {
                step: "02",
                title: "Pay 75% deposit",
                body: "Reserve your piece via Juice transfer. Balance is due on arrival.",
              },
              {
                step: "03",
                title: "Arrives in ~15–20 days",
                body: "We track every order. You get a heads-up when it lands in Mauritius.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-lg border border-sage-100 bg-white p-5"
              >
                <p className="font-display text-[28px] leading-none text-sage-300">
                  {item.step}
                </p>
                <p className="mt-3 text-[14px] font-semibold text-ink">
                  {item.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Catalog preview */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink">Available now</h2>
            {hasProducts && (
              <p className="mt-1 text-[12px] text-ink-muted">
                {count} {count === 1 ? "piece" : "pieces"} ready to reserve
              </p>
            )}
          </div>
          {hasProducts && (
            <Link
              href="/preorder/products"
              className="text-[12px] font-medium uppercase tracking-[0.16em] text-sage-700 hover:text-sage-900"
            >
              View all →
            </Link>
          )}
        </div>

        {hasProducts ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <PreorderProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-sage-200 bg-sage-50 p-10 text-center">
            <p className="font-display text-xl text-ink">
              No pre-order pieces just yet.
            </p>
            <p className="mt-2 text-[14px] text-ink-muted">
              We're curating new SHEIN finds — check back soon, or request something specific.
            </p>
            <Link
              href="/preorder/request"
              className="mt-5 inline-block rounded-full bg-sage-700 px-5 py-2.5 text-[13px] font-semibold text-cream hover:bg-sage-900"
            >
              Request a SHEIN item →
            </Link>
          </div>
        )}
      </section>

      {/* Trust strip — calm reassurance, sage borders */}
      <section className="border-t border-sage-100 bg-sage-50">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
          {[
            {
              title: "75% deposit, 25% on arrival",
              body: "Pay the rest only when your piece lands. Cash, Juice or card.",
            },
            {
              title: "One transparent price",
              body: "Includes shipping, customs and our handling — no surprises at delivery.",
            },
            {
              title: "Mauritius-only, delivered locally",
              body: "Same delivery network as the in-stock store. COD island-wide.",
            },
          ].map((item) => (
            <div key={item.title}>
              <p className="text-[13px] font-semibold text-sage-700">
                {item.title}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

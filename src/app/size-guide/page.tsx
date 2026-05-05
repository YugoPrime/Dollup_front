import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Size Guide",
  description:
    "How to measure yourself and find your size on Doll Up Boutique. Each piece has its own chart on the product page — here's a general guide.",
  alternates: { canonical: "/size-guide" },
  openGraph: {
    title: "Size Guide",
    description: "How to measure yourself and find your size at Doll Up Boutique.",
    url: "/size-guide",
  },
};

type Row = { size: string; bust: string; waist: string; hips: string };

// General reference chart — actual chart on each PDP is the source of truth.
const GENERAL_CHART_CM: Row[] = [
  { size: "XS", bust: "78–82", waist: "60–64", hips: "84–88" },
  { size: "S",  bust: "82–86", waist: "64–68", hips: "88–92" },
  { size: "M",  bust: "86–90", waist: "68–72", hips: "92–96" },
  { size: "L",  bust: "90–96", waist: "72–78", hips: "96–102" },
  { size: "XL", bust: "96–102", waist: "78–84", hips: "102–108" },
  { size: "2XL", bust: "102–108", waist: "84–90", hips: "108–114" },
];

const GENERAL_CHART_IN: Row[] = [
  { size: "XS", bust: "30.5–32.3", waist: "23.6–25.2", hips: "33.1–34.6" },
  { size: "S",  bust: "32.3–33.9", waist: "25.2–26.8", hips: "34.6–36.2" },
  { size: "M",  bust: "33.9–35.4", waist: "26.8–28.3", hips: "36.2–37.8" },
  { size: "L",  bust: "35.4–37.8", waist: "28.3–30.7", hips: "37.8–40.2" },
  { size: "XL", bust: "37.8–40.2", waist: "30.7–33.1", hips: "40.2–42.5" },
  { size: "2XL", bust: "40.2–42.5", waist: "33.1–35.4", hips: "42.5–44.9" },
];

export default function SizeGuidePage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Find your size
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Size{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              guide
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            Sizing varies between dresses, lingerie and beachwear. Always check the chart on the actual product page first — this page is your general reference.
          </p>
        </div>
      </section>

      {/* Important note */}
      <section className="px-6 py-10 md:px-10 md:py-12">
        <div className="mx-auto max-w-[900px] rounded-2xl border-2 border-coral-300 bg-white p-7 md:p-10">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[18px] text-white">
              !
            </span>
            <div>
              <h2 className="mb-2 font-display text-[22px] leading-tight text-ink md:text-[26px]">
                Each product has its own chart
              </h2>
              <p className="font-sans text-[14px] leading-[1.65] text-ink-soft">
                Cuts and fabrics vary by piece, especially across <strong>dresses</strong>, <strong>lingerie</strong>, <strong>swimwear</strong> and <strong>jumpsuits</strong>. On every product page, scroll down to the <strong>Size Chart</strong> accordion — it has the exact measurements for that specific style. The general chart below is a starting point only.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to measure */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ How to measure
          </p>
          <h2 className="mb-10 font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
            Three measurements, one tape.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                t: "Bust",
                d: "Measure around the fullest part of your bust, keeping the tape level under your arms and across your shoulder blades.",
              },
              {
                t: "Waist",
                d: "Measure around the narrowest part of your natural waist — usually just above the belly button.",
              },
              {
                t: "Hips",
                d: "Stand with your feet together and measure around the fullest part of your hips, about 20cm below your waist.",
              },
            ].map((m, i) => (
              <div
                key={m.t}
                className="rounded-2xl border border-blush-300 bg-cream p-7"
              >
                <p className="mb-2 font-display text-[28px] text-coral-500">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-2 font-display text-[20px] text-ink">{m.t}</h3>
                <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">
                  {m.d}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-blush-100 p-6 md:p-8">
            <p className="font-sans text-[13px] leading-[1.7] text-ink-soft md:text-[14px]">
              <strong className="text-ink">A few tips:</strong> measure with a soft tailor&apos;s tape, in light clothing or your underwear. Don&apos;t pull the tape tight — it should sit flat against your skin. Numbers between two sizes? Size up for a relaxed fit, size down for a fitted look. Or simply DM us — we&apos;ll guide you on the exact piece.
            </p>
          </div>
        </div>
      </section>

      {/* General chart - cm */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ General chart
          </p>
          <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
            Reference measurements
          </h2>
          <p className="mt-3 font-sans text-[13px] text-ink-muted">
            Use this for orientation only. The product-page chart is always the source of truth.
          </p>

          {/* CM table */}
          <div className="mt-8">
            <h3 className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
              Centimetres (cm)
            </h3>
            <div className="overflow-hidden rounded-2xl border border-blush-300 bg-white">
              <table className="w-full text-left font-sans text-[13px] md:text-[14px]">
                <thead className="bg-blush-100 text-ink">
                  <tr>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Size</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Bust</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Waist</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Hips</th>
                  </tr>
                </thead>
                <tbody className="text-ink-soft">
                  {GENERAL_CHART_CM.map((r, i) => (
                    <tr
                      key={r.size}
                      className={i % 2 === 0 ? "border-t border-blush-300" : "border-t border-blush-300 bg-cream"}
                    >
                      <td className="px-5 py-3 font-display text-[16px] text-coral-500">{r.size}</td>
                      <td className="px-5 py-3">{r.bust}</td>
                      <td className="px-5 py-3">{r.waist}</td>
                      <td className="px-5 py-3">{r.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inches table */}
          <div className="mt-10">
            <h3 className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
              Inches
            </h3>
            <div className="overflow-hidden rounded-2xl border border-blush-300 bg-white">
              <table className="w-full text-left font-sans text-[13px] md:text-[14px]">
                <thead className="bg-blush-100 text-ink">
                  <tr>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Size</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Bust</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Waist</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Hips</th>
                  </tr>
                </thead>
                <tbody className="text-ink-soft">
                  {GENERAL_CHART_IN.map((r, i) => (
                    <tr
                      key={r.size}
                      className={i % 2 === 0 ? "border-t border-blush-300" : "border-t border-blush-300 bg-cream"}
                    >
                      <td className="px-5 py-3 font-display text-[16px] text-coral-500">{r.size}</td>
                      <td className="px-5 py-3">{r.bust}</td>
                      <td className="px-5 py-3">{r.waist}</td>
                      <td className="px-5 py-3">{r.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Category notes */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ Category notes
          </p>
          <h2 className="mb-8 font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
            What to watch for
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Dresses",
                d: "Bodycon and fitted dresses run small — size up if you're between sizes. Loose and tiered styles run true.",
              },
              {
                t: "Lingerie & bras",
                d: "Bras: check the cup + band size in the product chart. Bralettes and lingerie sets often run smaller than ready-to-wear sizes.",
              },
              {
                t: "Beachwear",
                d: "Bikinis and swimsuits run small around the bust. If you're a fuller cup, size up for the top.",
              },
              {
                t: "Jumpsuits",
                d: "Watch the inseam length on the product page — Mauritian heights vary, and tall styles need a hem.",
              },
              {
                t: "Tops & blouses",
                d: "Crop tops are cropped — check the length in the product chart if you prefer longer cover.",
              },
              {
                t: "Bottoms",
                d: "Stretchy waist and elastic styles run forgiving. Tailored pants — order the chart size.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-blush-300 bg-cream p-6"
              >
                <h3 className="mb-2 font-display text-[18px] text-ink">{c.t}</h3>
                <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">
                  {c.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(229,96,74,0.05)] md:p-12">
          <h2 className="font-display text-[24px] leading-[1.2] text-ink md:text-[32px]">
            Still unsure?
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
            Send us your measurements on WhatsApp with the product link — we&apos;ll tell you exactly which size to pick.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/23059416359"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Ask on WhatsApp →
            </a>
            <Link
              href="/shop"
              className="rounded-full border border-ink bg-white px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

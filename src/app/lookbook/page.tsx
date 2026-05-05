import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Lookbook",
  description:
    "Editorial shoots of our latest drops, styled and shot in Mauritius. Click through for the full look.",
};

// Lookbook images live in /public/lookbook/.
// Naming convention: <NN>-<slug>.<ext> e.g. 01-summer-rooftop.jpg
// The first segment (before the first dash) is the order; the rest becomes
// the alt text. Drop new files in the folder, they appear automatically.
type LookImage = {
  src: string;
  alt: string;
  span?: "wide" | "tall" | "square";
};

const SPAN_CYCLE: Array<LookImage["span"]> = ["square", "tall", "wide", "square", "wide", "tall"];

function loadLookbook(): LookImage[] {
  try {
    const dir = path.join(process.cwd(), "public", "lookbook");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f, i) => {
        const slug = f.replace(/^\d+[-_]?/, "").replace(/\.[a-z]+$/i, "");
        return {
          src: `/lookbook/${f}`,
          alt: slug ? slug.replace(/[-_]/g, " ") : "Doll Up Boutique lookbook image",
          span: SPAN_CYCLE[i % SPAN_CYCLE.length],
        };
      });
  } catch {
    return [];
  }
}

export default function LookbookPage() {
  const images = loadLookbook();
  const hasImages = images.length > 0;

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink px-6 py-16 text-white md:px-10 md:py-24">
        <div className="absolute right-[-100px] top-12 h-[260px] w-[260px] rounded-full bg-coral-500/30 blur-3xl" aria-hidden />
        <div className="absolute bottom-[-80px] left-[-60px] h-[200px] w-[200px] rounded-full bg-blush-300/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-300">
            ★ Shot in Mauritius
          </p>
          <h1 className="font-display text-[44px] leading-[0.95] tracking-[-1px] md:text-[80px]">
            Look<em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>book</em>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] font-sans text-[15px] leading-[1.55] text-white/85 md:text-[16px]">
            Editorial shoots of our latest drops — styled and photographed locally with our favourite Mauritian models.
          </p>
        </div>
      </section>

      {hasImages ? (
        // ─── Real lookbook grid ────────────────────────────────────────────
        <section className="px-3 py-10 md:px-6 md:py-16">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid auto-rows-[260px] grid-cols-2 gap-2 md:auto-rows-[320px] md:grid-cols-4 md:gap-3 lg:auto-rows-[360px]">
              {images.map((img, i) => {
                const cls =
                  img.span === "wide"
                    ? "col-span-2"
                    : img.span === "tall"
                    ? "row-span-2"
                    : "";
                return (
                  <figure
                    key={img.src}
                    className={`group relative overflow-hidden rounded-xl bg-blush-100 ${cls}`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      priority={i < 2}
                    />
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white capitalize">
                        {img.alt}
                      </p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="mt-6 text-center font-sans text-[12px] text-ink-muted">
              Photography by our team in collaboration with local Mauritian models.
            </p>
          </div>
        </section>
      ) : (
        // ─── Empty-state placeholder ────────────────────────────────────────
        <section className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[820px] rounded-3xl border border-blush-300 bg-white p-10 text-center md:p-16">
            <span className="mb-4 inline-block text-[60px] leading-none text-coral-500">📸</span>
            <h2 className="font-display text-[26px] leading-[1.1] text-ink md:text-[36px]">
              First shoot dropping{" "}
              <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                soon.
              </em>
            </h2>
            <p className="mx-auto mt-3 max-w-[480px] font-sans text-[14px] leading-[1.6] text-ink-soft">
              Our latest editorial is in post-production. Follow us on Instagram to see the previews first, or sign up to our newsletter for the full reveal.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="https://www.instagram.com/dollupboutique/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
              >
                Follow on Instagram →
              </a>
              <Link
                href="/shop"
                className="rounded-full border border-ink bg-white px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
              >
                Shop the latest
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-coral-500 px-6 py-14 text-white md:px-10 md:py-20">
        <div className="mx-auto max-w-[800px] text-center">
          <h2 className="font-display text-[28px] leading-[1.1] md:text-[40px]">
            Loved a look? Shop the pieces.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] font-sans text-[14px] leading-[1.55] text-white/90">
            Most pieces in the lookbook are still in stock — head to the shop to grab them.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-white px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-ink hover:text-white"
            >
              Shop the latest →
            </Link>
            <Link
              href="/events"
              className="rounded-full border border-white/40 bg-white/5 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-coral-500"
            >
              Events &amp; giveaways
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

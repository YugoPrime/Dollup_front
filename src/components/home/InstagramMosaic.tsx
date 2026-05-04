import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

const INSTAGRAM_URL = "https://www.instagram.com/dollupboutique/";
const INSTAGRAM_TAGGED_URL = "https://www.instagram.com/dollupboutique/tagged/";

// Auto-discover photos in `public/instagram/`. Drop files named anything (jpg/png/webp)
// and they appear here. Section auto-hides if the folder doesn't exist or is empty —
// avoids broken image tiles. Will be replaced by Instagram Graph API in V2.
function loadPhotos(): { src: string; alt: string }[] {
  try {
    const dir = path.join(process.cwd(), "public", "instagram");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .slice(0, 8)
      .map((f) => ({ src: `/instagram/${f}`, alt: "Doll Up Boutique customer photo" }));
  } catch {
    return [];
  }
}

export function InstagramMosaic() {
  const PHOTOS = loadPhotos();
  if (PHOTOS.length === 0) return null;
  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1200px] px-4 md:px-10">
        <header className="mb-6 text-center">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
            ★ As worn by you
          </p>
          <h2 className="font-display text-[26px] leading-none text-ink md:text-[36px]">
            Tagged on{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="not-italic text-coral-500 underline-offset-4 hover:underline"
            >
              @dollupboutique
            </a>
          </h2>
          <p className="mx-auto mt-2 max-w-[460px] font-sans text-[12px] leading-[1.5] text-ink-muted md:text-[14px]">
            Tag us in your fits to be featured here &mdash; we love seeing how you style every piece.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-2.5">
          {PHOTOS.map((p, i) => (
            <a
              key={p.src}
              href={INSTAGRAM_TAGGED_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-md bg-blush-100"
              aria-label={`View tagged photos on Instagram (${i + 1})`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity group-hover:opacity-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                </svg>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a
            href={INSTAGRAM_TAGGED_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-ink bg-white px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-coral-500 hover:bg-coral-500 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
            See more on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}

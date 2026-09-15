import { essentialsBundle, isEssentialsBundleLive } from "@/lib/essentials-bundle";
import { formatPrice } from "@/lib/format";
import { EssentialsBundleAdd } from "./EssentialsBundleAdd";

const DIR = "/events/essentials-bundle";

const ALT =
  "The Essentials Bundle: body adhesive, boob tape with 2 nipple covers and an invisible panty — Rs 1,190 instead of Rs 1,550, free delivery or free postage";

export function EssentialsBundleBanner() {
  // Home page revalidates every 5 min, so the banner is gone within 5 min of the end.
  if (!isEssentialsBundleLive()) return null;

  const endsDay = new Date(essentialsBundle.endsAt).toLocaleDateString("en-MU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Indian/Mauritius",
  });

  return (
    <section aria-labelledby="essentials-bundle-title" className="bg-cream px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[1216px] overflow-hidden rounded-2xl bg-blush-100 shadow-[0_10px_30px_rgba(229,96,74,0.12)] md:rounded-3xl">
        {/* Art direction: full wide artwork from md up; on phones a crop of the
            products + price, with headline and contents as real text below (the
            artwork's small text is unreadable at 400px). Pre-sized WebP files —
            the custom image loader serves local assets verbatim, no optimizer. */}
        <picture>
          <source
            media="(min-width: 768px)"
            srcSet={`${DIR}/banner-desktop-1200.webp 1200w, ${DIR}/banner-desktop-1920.webp 1916w`}
            sizes="(min-width: 1280px) 1216px, 100vw"
            width={1916}
            height={821}
          />
          <img
            src={`${DIR}/banner-mobile-800.webp`}
            srcSet={`${DIR}/banner-mobile-800.webp 800w, ${DIR}/banner-mobile-1185.webp 1185w`}
            sizes="100vw"
            width={1185}
            height={660}
            alt={ALT}
            decoding="async"
            className="block h-auto w-full"
          />
        </picture>

        <div className="flex flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between md:gap-8 md:px-10 md:py-7">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-coral-500">
              Until {endsDay} only
            </p>
            {/* Mobile carries the headline + contents the crop left out; desktop's artwork already shows them. */}
            <h2
              id="essentials-bundle-title"
              className="mt-2 font-display text-[28px] leading-[1.05] text-ink md:sr-only"
            >
              The Essentials Bundle
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2 md:hidden">
              {essentialsBundle.contents.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-[12px] font-medium text-ink-soft"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-sans text-[14px] text-ink-soft md:mt-1">
              {/* The desktop artwork already shows the price. */}
              <span className="md:hidden">
                <s className="text-ink-muted">{formatPrice(essentialsBundle.compareAt, "mur")}</s>{" "}
                <strong className="text-coral-700">{formatPrice(essentialsBundle.price, "mur")}</strong>
                {" · "}free delivery or postage.{" "}
              </span>
              Discount applied automatically in your bag.
            </p>
          </div>
          <EssentialsBundleAdd />
        </div>
      </div>
    </section>
  );
}

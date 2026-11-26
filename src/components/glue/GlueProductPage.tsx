import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { HttpTypes } from "@medusajs/types";
import { Banknote, Check, Package, Plus } from "lucide-react";
import { AdventCardPrice } from "@/components/advent/AdventPrice";
import { GlueBuy, GlueWishlistButton } from "@/components/glue/GlueBuy";
import { adventNowMs } from "@/lib/advent";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import {
  ALSO_HOLDS,
  FAQ,
  GLUE_COPY,
  GLUE_HERO_IMAGE,
  GLUE_VIDEO,
  HOLDS,
  OCCASIONS,
  PAIRS,
  STEPS,
  featuredCards,
  tickListLabels,
} from "@/lib/glue-page";
import { extractProductCode } from "@/lib/product-meta";
import { getProductByHandle } from "@/lib/products";
import { isPubliclyListedStoreProduct } from "@/lib/visibility";

type Product = HttpTypes.StoreProduct;

const WRAP = "mx-auto max-w-[1100px] px-5 md:px-8";

// A featured product a shopper can't open (missing, unlisted, fetch failed) is null.
async function loadLinked(handles: string[]): Promise<Record<string, Product | null>> {
  const entries = await Promise.all(
    handles.map(async (handle) => {
      try {
        const { product } = await getProductByHandle(handle);
        const listed = product && isPubliclyListedStoreProduct(product, { unlocked: false });
        return [handle, listed ? product : null] as const;
      } catch (err) {
        console.error(`Glue page: could not load ${handle}:`, err);
        return [handle, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-700">
      <span aria-hidden="true" className="h-px w-6 bg-champagne-gold" />
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-2 font-display text-[29px] leading-[1.15] text-ink md:text-[40px] [&_em]:italic [&_em]:text-coral-700">
      {children}
    </h2>
  );
}

/**
 * The body glue's product page (spec: docs/superpowers/specs/2026-11-26-glue-product-page-design.md).
 * Built to explain the product before asking for the sale: what it holds,
 * how to use it, when to wear it. Copy and featured products: src/lib/glue-page.ts.
 */
export async function GlueProductPage({
  product,
  freeShippingThreshold,
}: {
  product: Product;
  freeShippingThreshold: number;
}) {
  const linked = await loadLinked([...HOLDS, ...PAIRS].map((x) => x.handle));
  const holdCards = featuredCards(HOLDS, linked);
  const pairCards = featuredCards(PAIRS, linked);
  // One lonely dress looks like a mistake: show the photo grid from two up.
  const showHoldGrid = holdCards.length >= 2;
  const pictured = showHoldGrid ? holdCards.map((c) => c.handle) : [];
  const tickList = tickListLabels(HOLDS, pictured, ALSO_HOLDS);
  const initialNow = adventNowMs();
  const code = extractProductCode(product) ?? product.handle?.toUpperCase() ?? null;
  const category = product.categories?.[0];
  const freeFrom = freeShippingThreshold > 0 ? formatPrice(freeShippingThreshold, "MUR") : null;

  return (
    <div className="bg-cream">
      <nav
        aria-label="Breadcrumb"
        className="hidden px-4 py-3 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted md:block md:px-8 md:py-4"
      >
        <Link href="/" className="hover:text-coral-500">Home</Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <Link href="/shop" className="hover:text-coral-500">Shop</Link>
        {category ? (
          <>
            <span className="mx-1.5 text-blush-400">/</span>
            <Link href={`/shop?category=${encodeURIComponent(category.handle)}`} className="hover:text-coral-500">
              {category.name}
            </Link>
          </>
        ) : null}
        <span className="mx-1.5 text-blush-400">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>

      {/* Hero. Phone: headline, bottle, price. From md: bottle left, the rest right. */}
      <section className={`${WRAP} pb-8 pt-6 md:grid md:grid-cols-2 md:gap-x-14 md:pb-16 md:pt-8`}>
        <div className="text-center md:col-start-2 md:row-start-1 md:self-end md:text-left">
          <p className="flex items-center justify-center gap-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-700 md:justify-start">
            <span>{GLUE_COPY.kicker}</span>
            {code ? (
              <>
                <span aria-hidden="true" className="h-px w-[22px] bg-champagne-gold" />
                <span>{code}</span>
              </>
            ) : null}
          </p>
          <p className="mt-3 font-display text-[40px] leading-[1.08] tracking-[-0.01em] text-ink md:text-[60px]">
            {GLUE_COPY.headline[0]}
            <br />
            <em className="italic text-coral-700">{GLUE_COPY.headline[1]}</em>
          </p>
          <h1 className="mt-2.5 font-sans text-[15px] font-normal text-ink-soft md:mt-4 md:text-[17px]">
            {product.title}
          </h1>
        </div>

        <div className="relative mx-auto mt-7 h-[304px] w-[230px] md:col-start-1 md:row-span-2 md:row-start-1 md:mt-0 md:h-[423px] md:w-[320px] md:self-center lg:h-[476px] lg:w-[360px]">
          <div
            aria-hidden="true"
            className="absolute -inset-2.5 rounded-b-3xl rounded-t-[125px] border border-champagne-gold md:rounded-t-[170px] lg:rounded-t-[190px]"
          />
          <div className="relative h-full w-full overflow-hidden rounded-b-2xl rounded-t-[115px] bg-blush-100 md:rounded-t-[160px] lg:rounded-t-[180px]">
            <Image
              src={GLUE_HERO_IMAGE}
              alt="SHADOMAGIC Body Adhesive roll-on bottle, 50 ml"
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 768px) 320px, 230px"
              className="object-cover object-[center_30%]"
              preload
              fetchPriority="high"
            />
          </div>
          <div className="absolute -right-6 bottom-7 flex h-[76px] w-[76px] flex-col items-center justify-center gap-[3px] rounded-full border border-champagne-gold bg-cream md:-right-7 md:h-[88px] md:w-[88px] lg:-right-9 lg:h-[96px] lg:w-[96px]">
            <span className="font-display text-[17px] italic leading-none text-ink md:text-[21px]">
              {GLUE_COPY.seal[0]}
            </span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted md:text-[11px]">
              {GLUE_COPY.seal[1]}
            </span>
          </div>
          <div className="absolute -right-7 -top-1 md:-right-5 md:top-0">
            <GlueWishlistButton productId={product.id} />
          </div>
        </div>

        <div className="mt-7 md:col-start-2 md:row-start-2 md:mt-7 md:self-start">
          <GlueBuy product={product} initialNow={initialNow}>
            <p className="mt-3.5 max-w-[330px] text-center font-sans text-[15px] leading-[1.55] text-ink-soft md:max-w-[440px] md:text-left md:text-[16px]">
              {GLUE_COPY.lead}
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-sans text-[13px] text-ink-soft md:justify-start">
              <li className="flex items-center gap-1.5">
                <Check size={15} strokeWidth={2} className="text-coral-700" aria-hidden />
                Cash on delivery
              </li>
              {freeFrom ? (
                <li className="flex items-center gap-1.5">
                  <Check size={15} strokeWidth={2} className="text-coral-700" aria-hidden />
                  Free delivery from {freeFrom}
                </li>
              ) : null}
            </ul>
          </GlueBuy>
        </div>
      </section>

      <section className={`${WRAP} pb-9 md:pb-16`}>
        <dl className="mx-auto grid max-w-[640px] grid-cols-2 border-y border-champagne-200 py-3.5">
          {GLUE_COPY.stats.map(([value, caption], i) => (
            <div
              key={caption}
              className={`flex flex-col-reverse items-center justify-end px-2 text-center ${
                i === 0 ? "border-r border-champagne-200" : ""
              }`}
            >
              <dt className="mt-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted md:text-[11px]">
                {caption}
              </dt>
              <dd className="font-display text-[24px] leading-none text-ink md:text-[30px]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center font-sans text-[13px] text-ink-soft md:text-[14px]">{GLUE_COPY.extras}</p>
      </section>

      <section className="bg-blush-100">
        <div className={`${WRAP} py-10 md:py-16`}>
          <Eyebrow>Made for</Eyebrow>
          <SectionTitle>
            What it <em>holds</em> in place
          </SectionTitle>

          {showHoldGrid ? (
            <ul className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-4 md:gap-x-6">
              {holdCards.map((card) => (
                <li key={card.handle}>
                  <Link href={`/products/${card.handle}`} className="group flex flex-col text-ink">
                    <span className="relative block h-[214px] overflow-hidden rounded-b-xl rounded-t-[140px] bg-blush-400 md:h-[310px]">
                      <Image
                        src={card.product.thumbnail ?? ""}
                        alt={card.product.title ?? card.label}
                        fill
                        sizes="(min-width: 768px) 420px, 80vw"
                        className="object-cover object-top"
                        style={
                          card.crop
                            ? { transform: `scale(${card.crop.scale})`, transformOrigin: card.crop.origin }
                            : undefined
                        }
                      />
                    </span>
                    <span className="mt-3 font-display text-[19px] leading-tight md:text-[22px]">{card.label}</span>
                    <span className="mt-0.5 font-sans text-[13px] leading-[1.45] text-ink-soft md:text-[14px]">
                      {card.line}
                    </span>
                    <span className="mt-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-700 group-hover:underline">
                      Shop the dress <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <h3 className="mt-8 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            {showHoldGrid ? "It also holds" : "It holds"}
          </h3>
          <ul className="mt-3 flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-x-10">
            {tickList.map((text) => (
              <li key={text} className="flex items-start gap-2.5 font-sans text-[14px] leading-[1.45] text-ink md:text-[15px]">
                <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-coral-700" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${WRAP} pb-8 pt-10 md:py-16`}>
        <Eyebrow>How to use</Eyebrow>
        <SectionTitle>
          Roll, wait, <em>press.</em>
        </SectionTitle>
        <ol className="mt-6 flex flex-col md:mt-9 md:grid md:grid-cols-4 md:gap-x-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5 md:flex-col md:gap-3">
              <div className="flex w-10 shrink-0 flex-col items-center gap-2 md:w-auto md:flex-row md:gap-3">
                <span className="font-display text-[34px] italic leading-none text-coral-700 md:text-[44px]">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 ? (
                  <span aria-hidden="true" className="w-px grow bg-champagne-gold md:h-px md:w-auto" />
                ) : null}
              </div>
              <div className="pb-6 pt-1 md:p-0">
                <h3 className="font-sans text-[16px] font-bold leading-[1.35] text-ink">{step.title}</h3>
                <p className="mt-1 font-sans text-[14px] leading-[1.55] text-ink-soft">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="rounded-[14px] bg-blush-100 px-4 py-3.5 font-sans text-[14px] leading-[1.5] text-ink-soft md:mt-9 md:max-w-[560px]">
          <strong className="text-ink">{GLUE_COPY.tip[0]}</strong> {GLUE_COPY.tip[1]}
        </p>
      </section>

      {GLUE_VIDEO ? (
        <section className={`${WRAP} pb-10 md:pb-16`}>
          <div className="flex items-center gap-[18px] rounded-[20px] border border-champagne-200 bg-cream-50 p-4 md:max-w-[640px] md:gap-8 md:p-6">
            <video
              src={GLUE_VIDEO.src}
              poster={GLUE_VIDEO.poster}
              controls
              playsInline
              preload="none"
              className="aspect-[9/16] w-[122px] shrink-0 rounded-[14px] bg-blush-200 object-cover md:w-[200px]"
            />
            <div className="flex flex-col gap-1.5">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-700">See it hold</p>
              <h2 className="font-display text-[23px] leading-[1.15] text-ink md:text-[32px]">
                {GLUE_COPY.video.title[0]} <em className="italic text-coral-700">{GLUE_COPY.video.title[1]}</em>
              </h2>
              <p className="mt-0.5 font-sans text-[14px] leading-[1.5] text-ink-soft">{GLUE_COPY.video.text}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-blush-100">
        <div className={`${WRAP} py-10 md:py-16`}>
          <Eyebrow>Wear it to</Eyebrow>
          <SectionTitle>
            For <em>every</em> occasion
          </SectionTitle>
          <ul className="mt-5 flex flex-wrap gap-2 md:mt-7 md:max-w-[760px] md:gap-2.5">
            {OCCASIONS.map((occasion) => (
              <li
                key={occasion}
                className="rounded-full border border-champagne-gold bg-cream px-3.5 py-2 font-sans text-[13px] leading-[1.3] text-ink md:px-4 md:text-[14px]"
              >
                {occasion}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-display text-[19px] italic leading-[1.3] text-ink md:mt-7 md:text-[24px]">
            {GLUE_COPY.occasionLine}
          </p>
        </div>
      </section>

      <section className={`${WRAP} pb-9 pt-10 md:py-16`}>
        <div className="md:max-w-[720px]">
          <Eyebrow>Questions</Eyebrow>
          <SectionTitle>
            Good to <em>know</em>
          </SectionTitle>
          <div className="mt-4 border-t border-blush-200 md:mt-6">
            {FAQ.map((item, i) => (
              <details key={item.q} open={i === 0} className="group border-b border-blush-200">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-sans text-[15px] font-bold leading-[1.35] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-700 md:text-[16px] [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <Plus
                    size={18}
                    strokeWidth={1.6}
                    aria-hidden
                    className="shrink-0 text-coral-700 transition-transform duration-200 group-open:rotate-45"
                  />
                </summary>
                <p className="pb-4 font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[15px]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {pairCards.length > 0 ? (
        <section className="bg-blush-100">
          <div className={`${WRAP} py-10 md:py-16`}>
            <Eyebrow>Complete the look</Eyebrow>
            <SectionTitle>
              Pairs <em>well</em> with
            </SectionTitle>
            <ul className="mt-5 grid grid-cols-2 gap-3.5 md:mt-7 md:max-w-[560px] md:gap-6">
              {pairCards.map((card) => {
                const price = getDisplayPrice(card.product);
                return (
                  <li key={card.handle}>
                    <Link href={`/products/${card.handle}`} className="group flex flex-col text-ink">
                      <span className="relative block h-[196px] overflow-hidden rounded-[14px] bg-white md:h-[280px]">
                        <Image
                          src={card.product.thumbnail ?? ""}
                          alt={card.product.title ?? card.label}
                          fill
                          sizes="(min-width: 768px) 270px, 50vw"
                          className="object-cover"
                        />
                      </span>
                      <span className="mt-2.5 font-sans text-[15px] font-bold leading-[1.3] group-hover:text-coral-700">
                        {card.label}
                      </span>
                      <AdventCardPrice
                        amount={price.amount}
                        original={price.original}
                        currency={price.currency}
                        onSale={price.onSale}
                        soldOut={false}
                        categoryHandles={(card.product.categories ?? []).map((c) => c.handle)}
                        productId={card.product.id}
                        discountable={card.product.discountable}
                        initialNow={initialNow}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={`${WRAP} pb-10 pt-7 md:py-12`}>
        <ul className="flex flex-col gap-4 md:flex-row md:gap-14">
          <li className="flex items-center gap-3.5">
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-champagne-gold text-coral-700">
              <Banknote size={20} strokeWidth={1.5} aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="font-sans text-[15px] font-bold leading-[1.3] text-ink">Pay on delivery</span>
              <span className="font-sans text-[13px] text-ink-soft">Cash or Juice</span>
            </span>
          </li>
          <li className="flex items-center gap-3.5">
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-champagne-gold text-coral-700">
              <Package size={20} strokeWidth={1.5} aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="font-sans text-[15px] font-bold leading-[1.3] text-ink">Delivery across Mauritius</span>
              {freeFrom ? <span className="font-sans text-[13px] text-ink-soft">Free from {freeFrom}</span> : null}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

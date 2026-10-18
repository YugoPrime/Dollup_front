import Link from "next/link";
import type { Metadata } from "next";
import { Banknote, MessageCircle, Truck } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { FREE_POSTAGE_UNTIL_LABEL, freePostageActive } from "@/lib/checkout";
import { NAV_CATEGORY_HANDLES } from "@/lib/nav";
import {
  getLatestCollectionTag,
  listSaleProducts,
  type SaleListing,
} from "@/lib/products";
import {
  SALE_CAMPAIGN,
  SALE_ENDS_LABEL,
  SALE_PATH,
  SALE_STARTS_LABEL,
  hasSaleEnded,
  isSaleActive,
} from "@/lib/sale-campaign";
import { splitHeadline } from "@/lib/sales-of-month";
import { getStoreConfig } from "@/lib/store-config";
import { ChipRow } from "./ChipRow";
import { LinkPendingHint } from "./LinkPendingHint";
import { SaleCountdown } from "./SaleCountdown";

const TITLE = `${SALE_CAMPAIGN.name}: ${SALE_CAMPAIGN.headline}`;

export const metadata: Metadata = {
  title: TITLE,
  description: SALE_CAMPAIGN.description,
  alternates: { canonical: SALE_PATH },
  openGraph: {
    title: TITLE,
    description: SALE_CAMPAIGN.description,
    url: SALE_PATH,
  },
};

// The sale window is date-sensitive; never serve a stale cached shell.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  off?: string | string[];
  category?: string | string[];
  page?: string | string[];
}>;

const PER_PAGE = 24;

const EMPTY_LISTING: SaleListing = {
  products: [],
  count: 0,
  tiers: [],
  categories: [],
  tier: null,
  category: null,
};

export default async function SalePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const now = new Date();
  if (hasSaleEnded(now)) return <SaleEnded />;
  if (!isSaleActive(now)) return <SaleTeaser />;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(first(sp.page) ?? "1", 10) || 1);
  const postage = freePostageActive(now);

  const [listing, latestCollection, cfg] = await Promise.all([
    // Cumulative pages like /shop: ?page=3 renders products 1..72.
    listSaleProducts({
      tier: first(sp.off),
      category: first(sp.category),
      chipHandles: NAV_CATEGORY_HANDLES,
      limit: PER_PAGE * page,
    }).catch((err) => {
      console.error("Sale load failed:", err);
      return EMPTY_LISTING;
    }),
    getLatestCollectionTag().catch(() => null),
    getStoreConfig(),
  ]);
  const [lead, accent] = splitHeadline(SALE_CAMPAIGN.name);

  return (
    <div>
      <SaleHero>
        <h1 className="font-display text-[40px] leading-[0.95] md:text-[64px]">
          {lead}{" "}
          {accent && (
            <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
              {accent}
            </em>
          )}
        </h1>
        <p className="mt-2 font-display font-bold leading-none tracking-tight text-coral-450">
          <span className="text-[22px] text-coral-300 md:text-[30px]">Up to </span>
          <span className="text-[64px] md:text-[96px]">{SALE_CAMPAIGN.maxPercent}%</span>
          <span className="text-[30px] md:text-[46px]"> off</span>
        </p>
        {postage && (
          <p className="mt-2 font-sans text-[14px] font-medium text-[#E0CFCB] md:text-[17px]">
            + free postage on every order
          </p>
        )}
        <div className="mt-4 md:mt-6">
          <SaleCountdown
            endsAt={SALE_CAMPAIGN.endsAt}
            endedLabel={`The ${SALE_CAMPAIGN.name} has ended`}
          />
        </div>
        <p className="mt-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-coral-300">
          Ends {SALE_ENDS_LABEL}
        </p>
      </SaleHero>

      <div className="mx-auto max-w-[1280px] px-4 pb-4 pt-5 md:px-8 md:pb-8 md:pt-8">
        <SaleFilters listing={listing} />
        {listing.products.length === 0 ? (
          <SaleEmpty listing={listing} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
              {listing.products.map((p, index) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  latestCollectionTag={latestCollection?.value ?? null}
                  imagePriority={index < 2}
                />
              ))}
            </div>
            <LoadMore page={page} listing={listing} />
          </>
        )}
      </div>

      {/* After the grid so a phone sees products first; the hero already
          carries the free-postage line. */}
      <SalePerks
        postage={postage}
        whatsappUrl={cfg.store.whatsapp_url}
        instagramUrl={cfg.store.instagram_url}
      />
    </div>
  );
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// URL state, so ads and stories can deep-link: /sale?off=50&category=dresses
function saleHref({
  off,
  category,
  page,
}: {
  off?: number | null;
  category?: string | null;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (off != null) params.set("off", String(off));
  if (category) params.set("category", category);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${SALE_PATH}?${query}` : SALE_PATH;
}

// Same dark treatment as the homepage sale banner, which links here.
function SaleHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink via-[#3a1a16] to-[#5e2418] px-6 py-8 text-center text-white md:py-12">
      <div className="absolute -right-24 -top-16 h-[220px] w-[220px] rounded-full bg-coral-500/20" aria-hidden />
      <div className="absolute -bottom-12 -left-12 h-[140px] w-[140px] rounded-full bg-coral-300/15" aria-hidden />
      <div className="relative mx-auto max-w-[720px]">{children}</div>
    </section>
  );
}

function SalePerks({
  postage,
  whatsappUrl,
  instagramUrl,
}: {
  postage: boolean;
  whatsappUrl: string;
  instagramUrl: string;
}) {
  return (
    <section aria-label="Delivery and ordering" className="border-y border-blush-400 bg-white">
      <ul className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-4 gap-y-4 px-4 py-5 md:grid-cols-3 md:gap-x-8 md:px-8 md:py-6">
        {postage && (
          <Perk icon={<Truck className="h-5 w-5" aria-hidden />} title="Free postage on every order">
            Registered Postage, until {FREE_POSTAGE_UNTIL_LABEL}
          </Perk>
        )}
        {/* COD is only offered on in-person handoff (allowedPaymentMethods). */}
        <Perk icon={<Banknote className="h-5 w-5" aria-hidden />} title="Cash on delivery">
          On home delivery &amp; pick-up
        </Perk>
        <Perk
          icon={<MessageCircle className="h-5 w-5" aria-hidden />}
          title="Prefer to order by message?"
          className="col-span-2 md:col-span-1"
        >
          <span className="mt-1.5 flex flex-wrap gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center rounded-full border border-coral-500 px-3 font-sans text-[12px] font-bold text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
            >
              WhatsApp
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center rounded-full border border-coral-500 px-3 font-sans text-[12px] font-bold text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
            >
              Instagram DM
            </a>
          </span>
        </Perk>
      </ul>
    </section>
  );
}

function Perk({
  icon,
  title,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex items-start gap-2.5 ${className}`}>
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blush-100 text-coral-500">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-sans text-[13px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 font-sans text-[12px] leading-snug text-ink-muted">{children}</span>
      </span>
    </li>
  );
}

function SaleFilters({ listing }: { listing: SaleListing }) {
  // Nothing reduced yet: no filters, SaleEmpty explains.
  if (listing.tiers.length === 0) return null;
  const category = listing.category?.handle ?? null;
  // A deep link to a category below chip level (?category=bikini-sets) still
  // filters; give it its own active chip so the state is visible.
  const chips =
    listing.category && !listing.categories.some((c) => c.handle === category)
      ? [{ ...listing.category, count: listing.count }, ...listing.categories]
      : listing.categories;

  return (
    <div className="mb-4 space-y-2 md:mb-6">
      <ChipRow label="Filter by discount">
        <Chip href={saleHref({ category })} active={listing.tier == null} tone="coral">
          All
        </Chip>
        {listing.tiers.map((t) => (
          <Chip
            key={t}
            href={saleHref({ off: t, category })}
            active={listing.tier === t}
            tone="coral"
          >
            {t}% off
          </Chip>
        ))}
      </ChipRow>
      {chips.length > 0 && (
        <ChipRow label="Filter by category">
          <Chip href={saleHref({ off: listing.tier })} active={!category} tone="ink">
            All categories
          </Chip>
          {chips.map((c) => (
            <Chip
              key={c.handle}
              href={saleHref({ off: listing.tier, category: c.handle })}
              active={category === c.handle}
              tone="ink"
            >
              {c.name}
            </Chip>
          ))}
        </ChipRow>
      )}
      <p className="pt-1 font-sans text-[12px] text-ink-muted md:text-[13px]">
        {listing.count} {listing.count === 1 ? "style" : "styles"}
      </p>
    </div>
  );
}

// Same pill as the /shop filter chips: coral when a discount is picked, ink
// for a category.
function Chip({
  href,
  active,
  tone,
  children,
}: {
  href: string;
  active: boolean;
  tone: "coral" | "ink";
  children: React.ReactNode;
}) {
  const activeClass =
    tone === "coral" ? "border-coral-500 bg-coral-500 text-white" : "border-ink bg-ink text-white";
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`relative flex min-h-9 shrink-0 items-center rounded-full border px-3.5 py-2 font-sans text-[12px] font-semibold transition-colors ${
        active ? activeClass : "border-blush-400 bg-white text-ink hover:border-coral-500"
      }`}
    >
      {children}
      <LinkPendingHint />
    </Link>
  );
}

function SaleEmpty({ listing }: { listing: SaleListing }) {
  // Nothing reduced at all: the price list has only just started, and the
  // catalog snapshot takes a few minutes to pick up the new prices.
  const warmingUp = listing.tiers.length === 0;
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="mb-2 font-display text-lg text-ink">
        {warmingUp ? "Prices are dropping now" : "Nothing matches these filters"}
      </p>
      <p className="font-sans text-[14px] text-ink-muted">
        {warmingUp
          ? "Give it a few minutes and refresh, or browse the latest pieces meanwhile."
          : "Try another discount or category."}
      </p>
      <Link
        href={warmingUp ? "/shop" : SALE_PATH}
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-coral-500 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
      >
        {warmingUp ? "Shop new arrivals" : "See the whole sale"}
      </Link>
    </div>
  );
}

function LoadMore({ page, listing }: { page: number; listing: SaleListing }) {
  const shown = listing.products.length;
  const total = listing.count;
  return (
    <nav aria-label="More products" className="mt-10 flex flex-col items-center gap-4 pb-6">
      <p className="font-sans text-[13px] text-ink-soft" aria-live="polite">
        Showing {shown} of {total} {total === 1 ? "style" : "styles"}
      </p>
      {shown < total ? (
        <Link
          href={saleHref({
            off: listing.tier,
            category: listing.category?.handle,
            page: page + 1,
          })}
          scroll={false}
          className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-coral-500 bg-white px-8 font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-blush-100"
        >
          Load more
        </Link>
      ) : null}
    </nav>
  );
}

function SaleTeaser() {
  const [lead, accent] = splitHeadline(SALE_CAMPAIGN.name);
  return (
    <SaleHero>
      <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-coral-300">
        Coming soon
      </p>
      <h1 className="font-display text-[40px] leading-[0.95] md:text-[64px]">
        {lead}{" "}
        {accent && (
          <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
            {accent}
          </em>
        )}
      </h1>
      <p className="mt-4 font-display text-[28px] leading-tight text-coral-450 md:text-[40px]">
        Starts {SALE_STARTS_LABEL}
      </p>
      <p className="mx-auto mt-3 max-w-[420px] text-balance font-sans text-[14px] leading-[1.5] text-[#E0CFCB] md:text-[16px]">
        {SALE_CAMPAIGN.headline}, until {SALE_ENDS_LABEL}.
      </p>
      <Link
        href="/shop"
        className="mt-7 inline-block rounded-full bg-coral-500 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
      >
        Shop new arrivals →
      </Link>
    </SaleHero>
  );
}

function SaleEnded() {
  return (
    <SaleHero>
      <h1 className="text-balance font-display text-[36px] leading-[1] md:text-[56px]">
        The {SALE_CAMPAIGN.name} has ended
      </h1>
      <p className="mx-auto mt-4 max-w-[420px] text-balance font-sans text-[14px] leading-[1.5] text-[#E0CFCB] md:text-[16px]">
        Thank you for shopping the sale. New pieces land every week.
      </p>
      <Link
        href="/shop"
        className="mt-7 inline-block rounded-full bg-coral-500 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
      >
        Shop new arrivals →
      </Link>
    </SaleHero>
  );
}

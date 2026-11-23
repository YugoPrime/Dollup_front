import { Suspense } from "react";
import type { Metadata } from "next";
import {
  listFeatured,
  listProducts,
  listEssentials,
  listSaleProducts,
  getLatestCollectionTag,
} from "@/lib/products";
import { spotlightCopy } from "@/lib/sale-spotlight";
import {
  HeroBento,
  HeroBentoProducts,
  HeroBentoProductSkeleton,
} from "@/components/home/HeroBento";
import { AdventHero } from "@/components/advent/AdventHero";
import { adventNowMs } from "@/lib/advent";
import { TrendingRail } from "@/components/home/TrendingRail";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { SalesOfTheMonth } from "@/components/home/SalesOfTheMonth";
import { EssentialsBundleBanner } from "@/components/home/EssentialsBundleBanner";
import { salesOfMonthConfig } from "@/lib/sales-of-month";
import { salePhase } from "@/lib/sale-campaign";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { NewArrivalsRail } from "@/components/home/NewArrivalsRail";
import { LoyaltyTeaser } from "@/components/home/LoyaltyTeaser";
import { MysteryBoxTeaser } from "@/components/home/MysteryBoxTeaser";
import { InstagramMosaic } from "@/components/home/InstagramMosaic";
import { BabeEssentials } from "@/components/home/BabeEssentials";
import {
  CategoryIconSkeleton,
  EssentialsSkeleton,
  InstagramSkeleton,
  ProductRailSkeleton,
} from "@/components/home/HomeSkeletons";

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return {
    title: "Doll Up Boutique",
    description:
      "Shop dresses, lingerie, beachwear and accessories curated in Mauritius, with cash on delivery available island-wide.",
    alternates: { canonical: "/" },
    openGraph: {
      title: "Doll Up Boutique",
      description:
        "Shop dresses, lingerie, beachwear and accessories curated in Mauritius.",
      url: "/",
    },
  };
}

type LatestCollection = Awaited<ReturnType<typeof getLatestCollectionTag>>;
type LatestCollectionPromise = Promise<LatestCollection>;

export default function HomePage() {
  const latestCollectionPromise = getLatestCollectionTag().catch(() => null);

  return (
    <>
      <AdventHero initialNow={adventNowMs()} />
      <HeroBento initialNow={adventNowMs()}>
        <Suspense fallback={<HeroBentoProductSkeleton />}>
          <HeroProductMosaic />
        </Suspense>
      </HeroBento>
      <EssentialsBundleBanner />
      <Suspense fallback={<ProductRailSkeleton />}>
        <TrendingRailSection latestCollectionPromise={latestCollectionPromise} />
      </Suspense>
      <Suspense fallback={<CategoryIconSkeleton />}>
        <CategoryIcons />
      </Suspense>
      <Suspense fallback={<ProductRailSkeleton />}>
        <NewArrivalsSection latestCollectionPromise={latestCollectionPromise} />
      </Suspense>
      <SalesOfTheMonth
        descriptionHtml={sanitizeRichText(salesOfMonthConfig.description)}
        peakDescriptionHtml={sanitizeRichText(salesOfMonthConfig.peak.description)}
        initialActive={salePhase(new Date(), salesOfMonthConfig) === "active"}
        initialPeak={salePhase(new Date(), salesOfMonthConfig.peak) === "active"}
      />
      <Suspense fallback={<EssentialsSkeleton />}>
        <BabeEssentialsSection />
      </Suspense>
      <MysteryBoxTeaser />
      <LoyaltyTeaser />
      <Suspense fallback={<InstagramSkeleton />}>
        <InstagramMosaic />
      </Suspense>
    </>
  );
}

async function HeroProductMosaic() {
  // While a "mono" sale runs, the tiles are the sale's pinned picks (the ad
  // carousel cards, in /sale order, sold-out ones skipped) with their % off,
  // so the hero never shows full-price new stock under "up to 50% off".
  // Decided at render time: at the very end of the sale the ISR page may keep
  // the picks a few minutes longer; their chips vanish with the prices.
  if (spotlightCopy(adventNowMs())) {
    const picks = await listSaleProducts({ chipHandles: [], limit: 5 })
      .then((listing) => listing.products)
      .catch((err) => {
        console.error("listSaleProducts (hero) failed:", err);
        return [];
      });
    if (picks.length >= 3) return <HeroBentoProducts products={picks} saleChips />;
  }
  const featured = await listFeatured().catch((err) => {
    console.error("listFeatured failed:", err);
    return [];
  });
  return <HeroBentoProducts products={featured} />;
}

async function TrendingRailSection({
  latestCollectionPromise,
}: {
  latestCollectionPromise: LatestCollectionPromise;
}) {
  const [latestCollection, trendingRes] = await Promise.all([
    latestCollectionPromise,
    listProducts({ tag: "trending", limit: 10 }).catch(() =>
      listProducts({ order: "-created_at", limit: 10 }).catch(() => ({
        products: [],
        count: 0,
        region: null!,
      })),
    ),
  ]);
  return (
    <TrendingRail
      products={trendingRes.products}
      latestCollectionTag={latestCollection?.value ?? null}
    />
  );
}

async function NewArrivalsSection({
  latestCollectionPromise,
}: {
  latestCollectionPromise: LatestCollectionPromise;
}) {
  // New Arrivals is recency-driven, not gated on a collectionN tag. The store's
  // import pipeline doesn't always apply a `collectionN` tag to a fresh drop, so
  // gating on the "latest collection tag" left the homepage stuck on the previous
  // tagged collection while /shop (which sorts by created_at) showed the new one.
  // Sorting by created_at mirrors /shop?sort=new, so whatever is genuinely newest
  // surfaces here with no per-launch code edit. The latest collection tag is still
  // resolved for the "New" badge on products that do carry it.
  const [latestCollection, newArrivalsRes] = await Promise.all([
    latestCollectionPromise,
    listProducts({ order: "-created_at", limit: 16 }).catch(() => ({
      products: [],
      count: 0,
      region: null!,
    })),
  ]);

  return (
    <NewArrivalsRail
      products={newArrivalsRes.products}
      latestCollectionTag={latestCollection?.value ?? null}
    />
  );
}

async function BabeEssentialsSection() {
  const essentials = await listEssentials().catch((err) => {
    console.error("listEssentials failed:", err);
    return [];
  });
  return <BabeEssentials products={essentials} />;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { listFeatured, listProducts, listEssentials, getLatestCollectionTag } from "@/lib/products";
import {
  HeroBento,
  HeroBentoProducts,
  HeroBentoProductSkeleton,
} from "@/components/home/HeroBento";
import { TrendingRail } from "@/components/home/TrendingRail";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { SalesOfTheMonth } from "@/components/home/SalesOfTheMonth";
import { salesOfMonthConfig } from "@/lib/sales-of-month";
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

export const revalidate = 60;

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
      <HeroBento>
        <Suspense fallback={<HeroBentoProductSkeleton />}>
          <HeroProductMosaic />
        </Suspense>
      </HeroBento>
      <Suspense fallback={<ProductRailSkeleton />}>
        <TrendingRailSection latestCollectionPromise={latestCollectionPromise} />
      </Suspense>
      <Suspense fallback={<CategoryIconSkeleton />}>
        <CategoryIcons />
      </Suspense>
      <Suspense fallback={<ProductRailSkeleton />}>
        <NewArrivalsSection latestCollectionPromise={latestCollectionPromise} />
      </Suspense>
      <SalesOfTheMonth descriptionHtml={sanitizeRichText(salesOfMonthConfig.description)} />
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
  const latestCollection = await latestCollectionPromise;
  const newArrivalsRes = latestCollection
    ? await listProducts({ tag: latestCollection.id, order: "-created_at", limit: 16 }).catch(() => ({
        products: [],
        count: 0,
        region: null!,
      }))
    : await listProducts({ order: "-created_at", limit: 16 }).catch(() => ({
        products: [],
        count: 0,
        region: null!,
      }));

  return (
    <NewArrivalsRail
      products={newArrivalsRes.products}
      totalCount={newArrivalsRes.count ?? 0}
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

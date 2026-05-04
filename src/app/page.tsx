import { listFeatured, listProducts, listEssentials, getLatestCollectionTag } from "@/lib/products";
import { HeroBento } from "@/components/home/HeroBento";
import { TrendingRail } from "@/components/home/TrendingRail";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { SalesOfTheMonth } from "@/components/home/SalesOfTheMonth";
import { NewArrivalsRail } from "@/components/home/NewArrivalsRail";
import { LoyaltyTeaser } from "@/components/home/LoyaltyTeaser";
import { InstagramMosaic } from "@/components/home/InstagramMosaic";
import { BabeEssentials } from "@/components/home/BabeEssentials";

export const revalidate = 60;

export default async function HomePage() {
  // Resolve the latest collection tag first — needed both as a filter for the
  // New Arrivals rail (only show collection28 products) and as a value for
  // ProductCard's NEW badge.
  const latestCollection = await getLatestCollectionTag().catch(() => null);
  const latestTag = latestCollection?.value ?? null;

  // Fan-out fetch the data sources we need on home in parallel
  const [featured, trendingRes, newArrivalsRes, essentials] = await Promise.all([
    listFeatured().catch((err) => {
      console.error("listFeatured failed:", err);
      return [];
    }),
    listProducts({ tag: "trending", limit: 10 }).catch(() =>
      listProducts({ order: "-created_at", limit: 10 }).catch(() => ({ products: [], count: 0, region: null! })),
    ),
    latestCollection
      ? listProducts({ tag: latestCollection.id, order: "-created_at", limit: 16 }).catch(() => ({ products: [], count: 0, region: null! }))
      : listProducts({ order: "-created_at", limit: 16 }).catch(() => ({ products: [], count: 0, region: null! })),
    listEssentials().catch((err) => {
      console.error("listEssentials failed:", err);
      return [];
    }),
  ]);

  return (
    <>
      <HeroBento products={featured} />
      <TrendingRail products={trendingRes.products} latestCollectionTag={latestTag} />
      <CategoryIcons />
      <NewArrivalsRail
        products={newArrivalsRes.products}
        totalCount={newArrivalsRes.count ?? 0}
        latestCollectionTag={latestTag}
      />
      <SalesOfTheMonth />
      <BabeEssentials products={essentials} />
      <LoyaltyTeaser />
      <InstagramMosaic />
    </>
  );
}

import { listFeatured, listProducts, listEssentials } from "@/lib/products";
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
  // Fan-out fetch the four data sources we need on home in parallel
  const [featured, trendingRes, newArrivalsRes, essentials] = await Promise.all([
    listFeatured().catch((err) => {
      console.error("listFeatured failed:", err);
      return [];
    }),
    listProducts({ tag: "trending", limit: 10 }).catch(() =>
      listProducts({ order: "-created_at", limit: 10 }).catch(() => ({ products: [], count: 0, region: null! })),
    ),
    listProducts({ order: "-created_at", limit: 10 }).catch(() => ({ products: [], count: 0, region: null! })),
    listEssentials().catch((err) => {
      console.error("listEssentials failed:", err);
      return [];
    }),
  ]);

  return (
    <>
      <HeroBento products={featured} />
      <TrendingRail products={trendingRes.products} />
      <CategoryIcons />
      <SalesOfTheMonth />
      <NewArrivalsRail products={newArrivalsRes.products.slice(0, 4)} totalCount={newArrivalsRes.count ?? 0} />
      <LoyaltyTeaser />
      <InstagramMosaic />
      <BabeEssentials products={essentials} />
    </>
  );
}

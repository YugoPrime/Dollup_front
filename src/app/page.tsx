import { listProducts } from "@/lib/products";
import { HeroA } from "@/components/home/HeroA";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { NewArrivals } from "@/components/home/NewArrivals";
import { EditorialBanner } from "@/components/home/EditorialBanner";
import { LoyaltyTeaser } from "@/components/home/LoyaltyTeaser";
import { Testimonials } from "@/components/home/Testimonials";

export const revalidate = 60;

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  try {
    const res = await listProducts({ limit: 8 });
    products = res.products;
  } catch (err) {
    console.error("Failed to load products:", err);
  }

  return (
    <>
      <HeroA />
      <CategoryStrip />
      <NewArrivals products={products} />
      <EditorialBanner />
      <LoyaltyTeaser />
      <Testimonials />
    </>
  );
}

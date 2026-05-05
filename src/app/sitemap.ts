import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/products";

const SITE_URL = "https://dollupboutique.com";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/contact",
  "/faq",
  "/shipping",
  "/returns",
  "/terms",
  "/privacy",
  "/loyalty",
  "/size-guide",
  "/lookbook",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/" || path === "/shop" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.6,
  })) satisfies MetadataRoute.Sitemap;

  const [products, categories] = await Promise.all([
    getAllProducts(),
    listCategories().catch(() => []),
  ]);

  const productEntries = products
    .filter((product) => product.handle)
    .map((product) => ({
      url: `${SITE_URL}/products/${product.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryEntries = categories
    .filter((category) => category.handle)
    .map((category) => ({
      url: `${SITE_URL}/shop?category=${encodeURIComponent(category.handle)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}

async function getAllProducts() {
  const products: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  const limit = 100;

  for (let offset = 0; offset < 1200; offset += limit) {
    const page = await listProducts({ limit, offset, order: "-created_at" }).catch(
      () => null,
    );
    if (!page?.products.length) break;
    products.push(...page.products);
    if (page.products.length < limit) break;
  }

  return products;
}

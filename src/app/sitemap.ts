import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/products";
import {
  INTIMATES_CATEGORY_HANDLE,
  isPubliclyListedStoreProduct,
} from "@/lib/visibility";

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
  "/privacy/cookies",
  "/loyalty",
  "/size-guide",
  "/lookbook",
  "/events",
  "/events/mystery-box",
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
    // Exclude unlisted + Intimates products from sitemap. Their PDPs also
    // emit `noindex` headers, but omitting the sitemap entry keeps Google
    // from discovering them in the first place.
    .filter((product) =>
      isPubliclyListedStoreProduct(product, {
        unlocked: false,
        excludeIntimates: true,
      }),
    )
    .map((product) => ({
      url: `${SITE_URL}/products/${product.handle}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryEntries = categories
    .filter((category) => category.handle)
    .filter((category) => category.handle !== INTIMATES_CATEGORY_HANDLE)
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

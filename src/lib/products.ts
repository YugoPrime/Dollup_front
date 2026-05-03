import "server-only";
import { sdk } from "./medusa";
import { getRegion } from "./region";
import type { HttpTypes } from "@medusajs/types";

const PRODUCT_FIELDS =
  "*variants,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,*options,*options.values,*images,*tags,*collection,*categories";

export type ListProductsArgs = {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string;
  collection?: string;
  tag?: string;
  order?: string;
};

export async function listProducts(args: ListProductsArgs = {}) {
  const region = await getRegion();
  const query: HttpTypes.StoreProductListParams = {
    limit: args.limit ?? 24,
    offset: args.offset ?? 0,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
  };
  if (args.q) query.q = args.q;
  if (args.category) query.category_id = [args.category];
  if (args.collection) query.collection_id = [args.collection];
  if (args.tag) query.tag_id = [args.tag];
  if (args.order) query.order = args.order;

  const { products, count } = await sdk.store.product.list(query);
  return { products, count, region };
}

export async function getProductByHandle(handle: string) {
  const region = await getRegion();
  const { products } = await sdk.store.product.list({
    handle,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 1,
  });
  return { product: products?.[0] ?? null, region };
}

export async function listCategories() {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,parent_category_id",
    limit: 100,
  });
  return product_categories ?? [];
}

export async function listCollections() {
  const { collections } = await sdk.store.collection.list({
    fields: "id,title,handle",
    limit: 100,
  });
  return collections ?? [];
}

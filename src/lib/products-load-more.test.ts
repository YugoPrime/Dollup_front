import { beforeEach, describe, expect, it, vi } from "vitest";

// /shop "Load more" re-renders products 1..(24 × page) on the server. Page 1
// and page 2 must therefore come from the same catalog, or everything above
// the shopper's scroll position is swapped out when she clicks.
//
// Next's data cache keeps one entry per argument set and serves it until it
// is revalidated, so a page size nobody has opened since the catalog changed
// answers its first visit with the old catalog (stale-while-revalidate).
// This stub models exactly that first visit: once a key has a value, it is
// returned again unchanged.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts?: string[],
  ) => {
    const entries = new Map<string, R>();
    return async (...args: A) => {
      const key = JSON.stringify([keyParts, args]);
      if (!entries.has(key)) entries.set(key, await fn(...args));
      return entries.get(key) as R;
    };
  },
  revalidateTag: () => {},
}));

type FakeProduct = {
  id: string;
  title: string;
  created_at: string;
  metadata: Record<string, unknown>;
  categories: { id: string; handle: string }[];
  tags: { id: string; value: string }[];
  variants: { id: string; manage_inventory: boolean; inventory_quantity: number }[];
};

const catalog: { products: FakeProduct[] } = { products: [] };

vi.mock("./medusa", () => ({
  listStoreProducts: async ({ limit = 100, offset = 0 }: { limit?: number; offset?: number }) => ({
    products: catalog.products.slice(offset, offset + limit),
    count: catalog.products.length,
  }),
  sdk: {},
  DEFAULT_REGION: "mu",
}));
vi.mock("./region", () => ({ getRegion: async () => ({ id: "reg_mu" }) }));

function makeProducts(prefix: string, count: number, firstDay: number): FakeProduct[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}_${i}`,
    title: `${prefix} ${i}`,
    created_at: new Date(Date.UTC(2026, 0, firstDay + i)).toISOString(),
    metadata: {},
    categories: [{ id: "cat_dresses", handle: "dresses" }],
    tags: [],
    variants: [{ id: `${prefix}_${i}_v`, manage_inventory: true, inventory_quantity: 2 }],
  }));
}

function resetCatalogSnapshot() {
  const state = (globalThis as { __dubCatalogState?: { snapshots: Map<string, unknown> } })
    .__dubCatalogState;
  state?.snapshots.clear();
}

describe("listProducts cumulative pages (/shop Load more)", () => {
  beforeEach(() => {
    vi.resetModules();
    resetCatalogSnapshot();
  });

  it("page 2 starts with page 1's products after the catalog gains new arrivals", async () => {
    const { listProducts } = await import("./products");
    const shopArgs = (page: number) => ({ order: "-created_at", limit: 24 * page, offset: 0 });

    // Morning: someone opens /shop?page=2 while the old range is the newest.
    catalog.products = makeProducts("old", 60, 1);
    await listProducts(shopArgs(2));

    // A new collection is published, and the catalog snapshot refreshes.
    catalog.products = [...catalog.products, ...makeProducts("new", 40, 200)];
    resetCatalogSnapshot();

    // A shopper lands on /shop, then clicks "Load more".
    const page1 = await listProducts(shopArgs(1));
    const page2 = await listProducts(shopArgs(2));

    expect(page1.products[0].id).toMatch(/^new_/);
    expect(page2.count).toBe(page1.count);
    expect(page2.products.slice(0, 24).map((p) => p.id)).toEqual(
      page1.products.map((p) => p.id),
    );
  });
});

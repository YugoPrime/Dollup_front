import Medusa from "@medusajs/js-sdk";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const preorderPublishableKey =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER;
const PRODUCT_LIST_TIMEOUT_MS = 15_000;

if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL");
if (!preorderPublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER — required for preorder.dollupboutique.com storefront",
  );
}

/**
 * Dedicated SDK instance for the pre-order storefront. Scoped via a separate
 * publishable API key whose only sales channel is "Pre-Order" — so every
 * request through this client is naturally isolated:
 *
 *  - /store/products only returns products in the Pre-Order channel
 *  - cart.create assigns the Pre-Order sales_channel_id to the new cart
 *  - fulfillment.listCartOptions only returns the 4 pre-order shipping options
 *    (because they're scoped to the Pre-Order channel via the Pre-Order
 *    stock-location / fulfillment-set chain)
 *
 * Apex (in-stock) traffic continues to use the original sdk in ./medusa.ts.
 * Never mix the two — using the apex SDK for a preorder cart would create the
 * cart in the wrong channel and shipping options would be wrong at checkout.
 */
export const preorderSdk = new Medusa({
  baseUrl,
  publishableKey: preorderPublishableKey,
});

export const PREORDER_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "mu";

type StoreProductListQuery = NonNullable<
  Parameters<typeof preorderSdk.store.product.list>[0]
>;
type StoreProductListResponse = Awaited<
  ReturnType<typeof preorderSdk.store.product.list>
>;

export async function listPreorderStoreProducts(
  query: StoreProductListQuery,
  timeoutMs = PRODUCT_LIST_TIMEOUT_MS,
): Promise<StoreProductListResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await preorderSdk.client.fetch<StoreProductListResponse>(
      "/store/products",
      {
        method: "GET",
        query,
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

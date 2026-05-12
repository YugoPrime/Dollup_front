import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { sdk, DEFAULT_REGION } from "./medusa";
import type { HttpTypes } from "@medusajs/types";

const getCachedRegion = unstable_cache(async (): Promise<HttpTypes.StoreRegion> => {
  const { regions } = await sdk.store.region.list();
  if (!regions?.length) throw new Error("No Medusa regions configured");

  const match = regions.find((r) =>
    r.countries?.some(
      (c) => c.iso_2?.toLowerCase() === DEFAULT_REGION.toLowerCase(),
    ),
  );
  return match ?? regions[0];
}, ["store-region-v1"], { revalidate: 3600 });

export const getRegion = cache(getCachedRegion);

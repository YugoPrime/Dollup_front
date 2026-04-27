import "server-only";
import { cache } from "react";
import { sdk, DEFAULT_REGION } from "./medusa";
import type { HttpTypes } from "@medusajs/types";

export const getRegion = cache(async (): Promise<HttpTypes.StoreRegion> => {
  const { regions } = await sdk.store.region.list();
  if (!regions?.length) throw new Error("No Medusa regions configured");

  const match = regions.find((r) =>
    r.countries?.some(
      (c) => c.iso_2?.toLowerCase() === DEFAULT_REGION.toLowerCase(),
    ),
  );
  return match ?? regions[0];
});

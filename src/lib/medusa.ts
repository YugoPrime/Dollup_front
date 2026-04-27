import Medusa from "@medusajs/js-sdk";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL");
if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

export const sdk = new Medusa({
  baseUrl,
  publishableKey,
});

export const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "mu";

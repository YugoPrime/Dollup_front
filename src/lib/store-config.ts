import "server-only";

import { unstable_cache } from "next/cache";

export type PublicStoreConfig = {
  shipping: {
    free_shipping_threshold_mur: number;
    return_fee_mur: number;
    preorder_eta_copy: string;
  };
  store: {
    contact_phone: string;
    contact_email: string;
    contact_hours: string;
    instagram_url: string;
    facebook_url: string;
    tiktok_url: string;
    whatsapp_url: string;
    footer_copyright: string;
  };
};

export const FALLBACK_STORE_CONFIG: PublicStoreConfig = {
  shipping: {
    free_shipping_threshold_mur: 1500,
    return_fee_mur: 70,
    preorder_eta_copy:
      "Confirm before noon to receive your order the next day across Mauritius.",
  },
  store: {
    contact_phone: "+230 5941 6359",
    contact_email: "hello@dollupboutique.com",
    contact_hours: "Mon-Sat 09:00-18:00 (Mauritius time)",
    instagram_url: "https://www.instagram.com/dollupboutique/",
    facebook_url: "https://www.facebook.com/dollupboutique/",
    tiktok_url: "https://www.tiktok.com/@dollupboutique",
    whatsapp_url: "https://wa.me/23059416359",
    footer_copyright:
      "Doll Up Boutique Limited. BRN C18159019 - VAT 27646277.",
  },
};

const fetchStoreConfig = unstable_cache(
  async (): Promise<PublicStoreConfig> => {
    const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

    if (!baseUrl || !publishableKey) {
      return FALLBACK_STORE_CONFIG;
    }

    try {
      const res = await fetch(`${baseUrl}/store/store-config`, {
        headers: {
          "x-publishable-api-key": publishableKey,
        },
      });
      if (!res.ok) {
        return FALLBACK_STORE_CONFIG;
      }

      const json = (await res.json()) as { config?: PublicStoreConfig };
      return json.config ?? FALLBACK_STORE_CONFIG;
    } catch {
      return FALLBACK_STORE_CONFIG;
    }
  },
  ["store-config-v1"],
  { revalidate: 300, tags: ["store-config"] },
);

export function getStoreConfig(): Promise<PublicStoreConfig> {
  return fetchStoreConfig();
}

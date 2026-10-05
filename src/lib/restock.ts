import { FALLBACK_STORE_CONFIG } from "@/lib/store-config";

/**
 * Restock request = a pre-filled WhatsApp message. Medusa has no restock
 * subscription endpoint and customers already use WhatsApp with the shop, so
 * this captures demand today without a backend change.
 */
export function restockWhatsAppUrl(productTitle: string, selection: string): string {
  const base = FALLBACK_STORE_CONFIG.store.whatsapp_url.split("?")[0];
  const text = `Hi Doll Up! Please let me know when "${productTitle}"${
    selection ? ` (${selection})` : ""
  } is back in stock.`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

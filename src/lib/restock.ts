// Client-safe: imported by MobilePdpHero / ProductBuy ("use client"), so it
// must not pull in store-config (server-only). Keep this number in sync with
// FALLBACK_STORE_CONFIG.store.whatsapp_url in src/lib/store-config.ts.
const WHATSAPP_BASE = "https://wa.me/23059416359";

/**
 * Restock request = a pre-filled WhatsApp message. Medusa has no restock
 * subscription endpoint and customers already use WhatsApp with the shop, so
 * this captures demand today without a backend change.
 */
export function restockWhatsAppUrl(productTitle: string, selection: string): string {
  const text = `Hi Doll Up! Please let me know when "${productTitle}"${
    selection ? ` (${selection})` : ""
  } is back in stock.`;
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(text)}`;
}

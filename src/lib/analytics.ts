// Analytics dataLayer helpers. Safe to call when GTM is not configured —
// pushes still go to a local dataLayer array; if no GTM container is loaded,
// nothing fires. Designed so we can ship the wiring before the user has
// provisioned GA4/GTM/Pixel accounts.

import type { HttpTypes } from "@medusajs/types";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  currency?: string;
};

const BRAND = "Doll Up Boutique";
const CURRENCY_FALLBACK = "MUR";

function ensureDataLayer(): Record<string, unknown>[] | null {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

// Push a raw event to the dataLayer. Always reset `ecommerce` to null first so
// stale items from a previous event don't bleed into the next one (GA4 best
// practice).
export function pushEvent(
  event: string,
  ecommerce: Record<string, unknown> | null = null,
  extra: Record<string, unknown> = {},
) {
  const dl = ensureDataLayer();
  if (!dl) return;
  if (ecommerce !== null) dl.push({ ecommerce: null });
  dl.push({ event, ...(ecommerce !== null ? { ecommerce } : {}), ...extra });
}

export function pushPageView(url: string, title?: string) {
  const dl = ensureDataLayer();
  if (!dl) return;
  dl.push({
    event: "page_view",
    page_location: url,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
  });
}

// Map a Medusa cart line item to GA4 ecommerce item shape.
export function lineItemToAnalytics(
  line: HttpTypes.StoreCartLineItem,
  currency = CURRENCY_FALLBACK,
): AnalyticsItem {
  return {
    item_id: line.variant_id ?? line.product_id ?? line.id,
    item_name: line.product_title ?? line.title ?? "",
    item_brand: BRAND,
    item_variant: line.variant_title ?? undefined,
    price: typeof line.unit_price === "number" ? line.unit_price : undefined,
    quantity: line.quantity ?? 1,
    currency,
  };
}

export function orderItemToAnalytics(
  item: HttpTypes.StoreOrderLineItem,
  currency = CURRENCY_FALLBACK,
): AnalyticsItem {
  return {
    item_id: item.variant_id ?? item.product_id ?? item.id,
    item_name: item.product_title ?? item.title ?? "",
    item_brand: BRAND,
    item_variant: item.variant_title ?? undefined,
    price: typeof item.unit_price === "number" ? item.unit_price : undefined,
    quantity: item.quantity ?? 1,
    currency,
  };
}

// ---------- GA4 e-commerce events ----------

export function trackViewItem(args: {
  productId: string;
  productHandle: string;
  productTitle: string;
  variantId?: string;
  variantTitle?: string;
  category?: string;
  price: number;
  currency?: string;
}) {
  const currency = args.currency ?? CURRENCY_FALLBACK;
  pushEvent("view_item", {
    currency,
    value: args.price,
    items: [
      {
        item_id: args.variantId ?? args.productId,
        item_name: args.productTitle,
        item_brand: BRAND,
        item_category: args.category,
        item_variant: args.variantTitle,
        price: args.price,
        quantity: 1,
        currency,
      },
    ],
  });
}

export function trackAddToCart(args: {
  variantId: string;
  productId?: string;
  productTitle: string;
  variantTitle?: string;
  category?: string;
  price: number;
  quantity: number;
  currency?: string;
}) {
  const currency = args.currency ?? CURRENCY_FALLBACK;
  pushEvent("add_to_cart", {
    currency,
    value: args.price * args.quantity,
    items: [
      {
        item_id: args.variantId,
        item_name: args.productTitle,
        item_brand: BRAND,
        item_category: args.category,
        item_variant: args.variantTitle,
        price: args.price,
        quantity: args.quantity,
        currency,
      },
    ],
  });
}

export function trackViewCart(cart: HttpTypes.StoreCart | null) {
  if (!cart) return;
  const currency = cart.currency_code ?? CURRENCY_FALLBACK;
  pushEvent("view_cart", {
    currency,
    value: cart.subtotal ?? cart.item_total ?? 0,
    items: (cart.items ?? []).map((i) => lineItemToAnalytics(i, currency)),
  });
}

export function trackBeginCheckout(cart: HttpTypes.StoreCart | null) {
  if (!cart) return;
  const currency = cart.currency_code ?? CURRENCY_FALLBACK;
  pushEvent("begin_checkout", {
    currency,
    value: cart.subtotal ?? cart.item_total ?? 0,
    items: (cart.items ?? []).map((i) => lineItemToAnalytics(i, currency)),
  });
}

export function trackAddShippingInfo(
  cart: HttpTypes.StoreCart | null,
  shippingTier: string | null,
) {
  if (!cart) return;
  const currency = cart.currency_code ?? CURRENCY_FALLBACK;
  pushEvent("add_shipping_info", {
    currency,
    value: cart.subtotal ?? cart.item_total ?? 0,
    shipping_tier: shippingTier ?? undefined,
    items: (cart.items ?? []).map((i) => lineItemToAnalytics(i, currency)),
  });
}

export function trackAddPaymentInfo(
  cart: HttpTypes.StoreCart | null,
  paymentType: string | null,
) {
  if (!cart) return;
  const currency = cart.currency_code ?? CURRENCY_FALLBACK;
  pushEvent("add_payment_info", {
    currency,
    value: cart.subtotal ?? cart.item_total ?? 0,
    payment_type: paymentType ?? undefined,
    items: (cart.items ?? []).map((i) => lineItemToAnalytics(i, currency)),
  });
}

export function trackPurchase(order: HttpTypes.StoreOrder) {
  const currency = order.currency_code ?? CURRENCY_FALLBACK;
  pushEvent("purchase", {
    transaction_id: order.display_id?.toString() ?? order.id,
    currency,
    value: order.total ?? 0,
    tax: order.tax_total ?? 0,
    shipping: order.shipping_total ?? 0,
    items: (order.items ?? []).map((i) => orderItemToAnalytics(i, currency)),
  });
}

// ---------- Consent ----------

export type ConsentChoice = "accepted" | "rejected";
export const CONSENT_STORAGE_KEY = "dub_consent_v1";

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // localStorage disabled — tags will stay in default (denied) state.
  }
}

export function applyConsent(choice: ConsentChoice) {
  const granted = choice === "accepted" ? "granted" : "denied";
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: granted,
      analytics_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted,
      personalization_storage: granted,
      functionality_storage: granted,
      security_storage: "granted",
    });
  }
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("consent", choice === "accepted" ? "grant" : "revoke");
  }
  pushEvent(choice === "accepted" ? "consent_accepted" : "consent_rejected");
}

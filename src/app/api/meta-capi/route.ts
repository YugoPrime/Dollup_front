import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Meta Conversions API forwarder. Server-to-server backup for the Purchase
// event so iOS / ad-blocker users still attribute. Meta dedupes against the
// browser pixel via matching `event_id`.
//
// Configuration (Coolify env, NOT NEXT_PUBLIC_):
//   META_CAPI_ACCESS_TOKEN  - long-lived access token from Events Manager
//   NEXT_PUBLIC_META_PIXEL_ID - same pixel ID used in the GTM browser tag
//                               (NEXT_PUBLIC_ because the client bundle also
//                               sends the dedup event_id alongside the pixel
//                               push; only the token is server-secret)
//
// Both unset => the route returns 204 quickly and does nothing. This lets the
// frontend always call the endpoint without conditionals.

const META_GRAPH_VERSION = "v19.0";

type Address = {
  city?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  province?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type CapiPayload = {
  event_id: string;
  event_time: number;
  event_source_url: string;
  email?: string | null;
  phone?: string | null;
  address?: Address | null;
  client_user_agent?: string | null;
  currency: string;
  value: number;
  contents: {
    id: string;
    quantity: number;
    item_price?: number;
  }[];
  content_ids: string[];
  num_items: number;
};

export async function POST(req: NextRequest) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Either env unset -> no-op so the client doesn't have to feature-detect.
  if (!accessToken || !pixelId) {
    return new Response(null, { status: 204 });
  }

  let payload: CapiPayload;
  try {
    payload = (await req.json()) as CapiPayload;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!payload?.event_id || !payload?.event_time || !payload?.currency) {
    return new Response(JSON.stringify({ error: "missing_required_fields" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Pull the client IP from the standard forwarding headers — Meta uses it
  // for match quality. Coolify sits behind Cloudflare so x-forwarded-for is
  // the relevant header; fall back to other variants.
  const clientIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent =
    payload.client_user_agent ?? req.headers.get("user-agent") ?? undefined;

  const userData: Record<string, string | string[]> = {};
  if (payload.email) userData.em = [hash(normalizeEmail(payload.email))];
  if (payload.phone) userData.ph = [hash(normalizePhone(payload.phone))];
  if (payload.address?.first_name)
    userData.fn = [hash(normalize(payload.address.first_name))];
  if (payload.address?.last_name)
    userData.ln = [hash(normalize(payload.address.last_name))];
  if (payload.address?.city) userData.ct = [hash(normalize(payload.address.city))];
  if (payload.address?.province)
    userData.st = [hash(normalize(payload.address.province))];
  if (payload.address?.postal_code)
    userData.zp = [hash(normalize(payload.address.postal_code))];
  if (payload.address?.country_code)
    userData.country = [hash(normalize(payload.address.country_code))];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const event = {
    event_name: "Purchase",
    event_time: payload.event_time,
    event_id: payload.event_id,
    event_source_url: payload.event_source_url,
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency: payload.currency,
      value: payload.value,
      content_type: "product",
      content_ids: payload.content_ids,
      contents: payload.contents,
      num_items: payload.num_items,
    },
  };

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: accessToken }),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      console.warn("[meta-capi] upstream error", upstream.status, text);
      return new Response(
        JSON.stringify({ error: "upstream_error", status: upstream.status }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return new Response(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.warn("[meta-capi] network error", err);
    return new Response(JSON.stringify({ error: "network_error" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  // Meta wants digits only, with country code if available. We strip every
  // non-digit and trust the storefront to capture E.164-ish numbers.
  return value.replace(/\D+/g, "");
}

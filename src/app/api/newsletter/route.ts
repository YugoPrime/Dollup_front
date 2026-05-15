import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Newsletter subscribe endpoint. Two side-effects on success:
//   1. Create a Resend contact (POST /contacts in the new API — Audiences are
//      deprecated). If RESEND_SEGMENT_ID is set, the contact is also tagged
//      into that segment so broadcasts can target newsletter subs only.
//   2. Fire a Meta CAPI "Lead" event with hashed email so Meta can build a
//      custom audience / lookalike from newsletter subscribers.
//
// Env (Coolify, NOT NEXT_PUBLIC_ for secrets):
//   RESEND_API_KEY            - Resend secret key
//   RESEND_SEGMENT_ID         - segment UUID (create once in Resend dashboard).
//                               Optional — if unset, contact still gets created
//                               at the project level, just not segmented.
//   META_CAPI_ACCESS_TOKEN    - shared with /api/meta-capi
//   NEXT_PUBLIC_META_PIXEL_ID - shared with /api/meta-capi
//
// If RESEND_API_KEY is unset, the route reports success but logs a warning so
// the storefront form keeps working before Resend is provisioned. If Meta env
// is unset, the CAPI step is skipped silently.

const META_GRAPH_VERSION = "v19.0";
const CONSENT_COOKIE_NAME = "dub_consent_v1";

type Body = {
  email?: string;
  // Honeypot — bots tend to fill every field. Real users leave blank.
  website?: string;
};

export async function POST(req: NextRequest) {
  // DIAGNOSTIC WRAPPER — surfaces the real error instead of crashing into a
  // Cloudflare 502. Revert this whole try/catch once we've identified the
  // underlying failure.
  try {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (body.website && body.website.trim().length > 0) {
      return json({ ok: true });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return json({ error: "invalid_email" }, 400);
    }

    const resendResult = await createResendContact(email);

    const consent = req.cookies.get(CONSENT_COOKIE_NAME)?.value;
    if (consent === "accepted") {
      fireMetaCapiLead(req, email).catch((err) => {
        console.warn("[newsletter] meta capi background error", err);
      });
    }

    if (!resendResult.ok && resendResult.code !== "duplicate") {
      return json(
        {
          error: "subscribe_failed",
          debug: resendResult.debug ?? null,
        },
        502,
      );
    }

    return json({ ok: true, duplicate: resendResult.code === "duplicate" });
  } catch (err) {
    const e = err as Error;
    console.error("[newsletter] handler crashed", e);
    return json(
      {
        error: "handler_crashed",
        message: e?.message ?? String(err),
        name: e?.name ?? null,
        stack: e?.stack?.split("\n").slice(0, 5) ?? null,
      },
      500,
    );
  }
}

type ResendResult = {
  ok: boolean;
  code?: "duplicate" | "disabled";
  debug?: Record<string, unknown>;
};

async function createResendContact(email: string): Promise<ResendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!apiKey) {
    console.warn(
      "[newsletter] RESEND_API_KEY not set — subscribe is a no-op",
    );
    return { ok: true, code: "disabled" };
  }

  const createBody: Record<string, unknown> = {
    email,
    unsubscribed: false,
  };
  if (segmentId) {
    createBody.segments = [{ id: segmentId }];
  }

  let isDuplicate = false;
  try {
    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    if (res.ok) return { ok: true };

    const text = await res.text();
    if (
      res.status === 409 ||
      /already\s*exist/i.test(text) ||
      /duplicate/i.test(text)
    ) {
      isDuplicate = true;
    } else {
      console.warn("[newsletter] resend create rejected", res.status, text);
      return {
        ok: false,
        debug: {
          step: "create",
          status: res.status,
          body: text.slice(0, 500),
          segment_id_set: Boolean(segmentId),
        },
      };
    }
  } catch (err) {
    const e = err as Error;
    console.warn("[newsletter] resend create network error", err);
    return {
      ok: false,
      debug: {
        step: "create_network",
        message: e?.message ?? String(err),
        name: e?.name ?? null,
        cause: (e as Error & { cause?: unknown })?.cause
          ? String((e as Error & { cause?: unknown }).cause)
          : null,
      },
    };
  }

  // Step 2: contact already exists. Make sure they're in our segment so
  // re-subscribing from the storefront still adds them to the broadcast list.
  if (isDuplicate && segmentId) {
    try {
      const res = await fetch(
        `https://api.resend.com/contacts/${encodeURIComponent(
          email,
        )}/segments/${segmentId}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}` },
        },
      );
      // 409 here means already in the segment — also fine.
      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        console.warn(
          "[newsletter] resend segment-add rejected",
          res.status,
          text,
        );
      }
    } catch (err) {
      console.warn("[newsletter] resend segment-add network error", err);
    }
  }

  return { ok: true, code: "duplicate" };
}

async function fireMetaCapiLead(req: NextRequest, email: string) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!accessToken || !pixelId) return;

  const clientIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const referer = req.headers.get("referer") ?? undefined;

  const emailHash = sha256(email);
  const userData: Record<string, string | string[]> = {
    em: [emailHash],
  };
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    // Hour-bucketed id so a re-submission within ~an hour dedupes in Meta,
    // but a legit re-subscribe weeks later isn't dropped.
    event_id: `dub-newsletter-${emailHash.slice(0, 16)}-${Math.floor(
      Date.now() / 3_600_000,
    )}`,
    event_source_url: referer,
    action_source: "website",
    user_data: userData,
    custom_data: {
      content_category: "newsletter_signup",
      content_name: "Footer newsletter form",
    },
  };

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: [event], access_token: accessToken }),
  });
  if (!upstream.ok) {
    const text = await upstream.text();
    console.warn("[newsletter] meta capi rejected", upstream.status, text);
  }
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

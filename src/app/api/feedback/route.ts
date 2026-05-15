import type { NextRequest } from "next/server";

// Site feedback endpoint. Captures user reports (bugs, suggestions, complaints)
// from the floating feedback bubble and emails them via Resend.
//
// Env (Coolify, NOT NEXT_PUBLIC_ for secrets):
//   RESEND_API_KEY        - shared with /api/newsletter
//   FEEDBACK_FROM_EMAIL   - optional, default "Doll Up Boutique <hello@dollupboutique.com>"
//   FEEDBACK_TO_EMAIL     - optional, default "hello@dollupboutique.com"
//                           (which forwards to dollup230@gmail.com)
//
// If RESEND_API_KEY is unset, the route logs the feedback and reports success
// so the bubble keeps working before Resend is provisioned.

const DEFAULT_FROM = "Doll Up Boutique <hello@dollupboutique.com>";
const DEFAULT_TO = "hello@dollupboutique.com";
const MESSAGE_MIN = 5;
const MESSAGE_MAX = 4000;

type Body = {
  message?: string;
  email?: string;
  page?: string;
  userAgent?: string;
  // Honeypot — bots tend to fill every field. Real users leave blank.
  website?: string;
};

export async function POST(req: NextRequest) {
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

    const message = (body.message ?? "").trim();
    if (message.length < MESSAGE_MIN) {
      return json({ error: "message_too_short" }, 400);
    }
    if (message.length > MESSAGE_MAX) {
      return json({ error: "message_too_long" }, 400);
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (email && !isValidEmail(email)) {
      return json({ error: "invalid_email" }, 400);
    }

    const page = sanitize(body.page ?? "", 500);
    const userAgent = sanitize(body.userAgent ?? "", 500);
    const referer = sanitize(req.headers.get("referer") ?? "", 500);
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    const sendResult = await sendFeedbackEmail({
      message,
      email,
      page: page || referer,
      userAgent,
      clientIp,
    });

    if (!sendResult.ok) {
      // Don't block the user — log it so we can dig in later.
      console.warn("[feedback] send failed", sendResult.debug);
    }

    return json({ ok: true });
  } catch (err) {
    const e = err as Error;
    console.error("[feedback] handler crashed", e);
    return json(
      {
        error: "handler_crashed",
        message: e?.message ?? String(err),
      },
      500,
    );
  }
}

type SendArgs = {
  message: string;
  email: string;
  page: string;
  userAgent: string;
  clientIp: string;
};

async function sendFeedbackEmail(
  args: SendArgs,
): Promise<{ ok: boolean; debug?: Record<string, unknown> }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[feedback] RESEND_API_KEY not set — feedback only logged", {
      messagePreview: args.message.slice(0, 120),
      email: args.email || "(anonymous)",
      page: args.page,
    });
    return { ok: true };
  }

  const from = process.env.FEEDBACK_FROM_EMAIL ?? DEFAULT_FROM;
  const to = process.env.FEEDBACK_TO_EMAIL ?? DEFAULT_TO;

  const subject = `Site feedback${args.email ? ` from ${args.email}` : ""}`;
  const html = renderEmailHtml(args);
  const text = renderEmailText(args);

  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
    text,
  };
  if (args.email) payload.reply_to = args.email;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    const responseText = await res.text();
    return {
      ok: false,
      debug: {
        step: "send",
        status: res.status,
        body: responseText.slice(0, 500),
      },
    };
  } catch (err) {
    const e = err as Error;
    return {
      ok: false,
      debug: {
        step: "send_network",
        message: e?.message ?? String(err),
      },
    };
  }
}

function renderEmailHtml(args: SendArgs): string {
  const safeMessage = escapeHtml(args.message).replace(/\n/g, "<br>");
  const rows: Array<[string, string]> = [
    ["From", args.email || "(anonymous)"],
    ["Page", args.page || "(unknown)"],
    ["User agent", args.userAgent || "(unknown)"],
    ["IP", args.clientIp || "(unknown)"],
    ["Received", new Date().toISOString()],
  ];
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:12px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:13px;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1f1a17;line-height:1.5;">
<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#e5604a;">New site feedback</h2>
<div style="background:#fdf6f3;border-left:3px solid #e5604a;padding:14px 16px;margin:0 0 18px;white-space:pre-wrap;font-size:14px;">${safeMessage}</div>
<table style="border-collapse:collapse;">${rowsHtml}</table>
</body></html>`;
}

function renderEmailText(args: SendArgs): string {
  return [
    "New site feedback",
    "",
    args.message,
    "",
    "---",
    `From: ${args.email || "(anonymous)"}`,
    `Page: ${args.page || "(unknown)"}`,
    `User agent: ${args.userAgent || "(unknown)"}`,
    `IP: ${args.clientIp || "(unknown)"}`,
    `Received: ${new Date().toISOString()}`,
  ].join("\n");
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(value: string, max: number): string {
  // Strip control chars (incl. CR/LF) and trim to max length.
  return value.replace(/[\x00-\x1f\x7f]/g, "").slice(0, max);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

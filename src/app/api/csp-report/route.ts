import type { NextRequest } from "next/server";

// CSP violation receiver. Logs to stdout so Coolify captures it during the
// Report-Only soak. Returns 204 to avoid retries / extra browser noise.
//
// Browsers send one of two payload shapes depending on whether `report-uri`
// or `report-to` is configured:
//   - report-uri: { "csp-report": { "blocked-uri": ..., "violated-directive": ... } }
//   - report-to:  [ { type: "csp-violation", body: { ... } } ]
// We accept both and log a compact summary, dropping noisy fields.
export async function POST(req: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    // Some browsers send `application/csp-report` with a plain JSON body the
    // standard `req.json()` parser still handles, but if it fails we fall back
    // to text so we at least see *something*.
    try {
      const text = await req.text();
      payload = { raw: text };
    } catch {
      payload = { raw: "<unparsable>" };
    }
  }

  const summary = summarize(payload);
  console.warn("[csp-report]", JSON.stringify(summary));

  return new Response(null, { status: 204 });
}

function summarize(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return { raw: payload };

  // report-uri shape
  const cspReport = (payload as { "csp-report"?: unknown })["csp-report"];
  if (cspReport && typeof cspReport === "object") {
    const r = cspReport as Record<string, unknown>;
    return {
      blocked: r["blocked-uri"],
      directive: r["violated-directive"] ?? r["effective-directive"],
      docUri: r["document-uri"],
      sourceFile: r["source-file"],
      lineNumber: r["line-number"],
    };
  }

  // report-to shape
  if (Array.isArray(payload)) {
    return {
      reports: payload.map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const e = entry as Record<string, unknown>;
        const body = (e.body as Record<string, unknown> | undefined) ?? {};
        return {
          type: e.type,
          blocked: body["blockedURL"] ?? body["blocked-uri"],
          directive: body["effectiveDirective"] ?? body["violated-directive"],
          docUri: body["documentURL"],
          sourceFile: body["sourceFile"],
          lineNumber: body["lineNumber"],
        };
      }),
    };
  }

  return { raw: payload };
}

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { verifyTokenAgainstBackend } from "@/lib/private-unlock";
import { PRIVATE_UNLOCK_COOKIE } from "@/lib/visibility";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// GET /private/<token> — if the token validates against Medusa, set the
// unlock cookie and redirect to /private. Otherwise 404 — don't reveal
// whether the token is wrong vs the catalog being locked.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || typeof token !== "string") {
    return new NextResponse("Not found", { status: 404 });
  }

  const ok = await verifyTokenAgainstBackend(token).catch(() => false);
  if (!ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const store = await cookies();
  store.set(PRIVATE_UNLOCK_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_SECONDS,
  });

  // Build the redirect target from the proxy-forwarded host/proto rather than
  // `req.url`. Behind Coolify/Traefik, `req.url` can resolve to the internal
  // container origin (`http://localhost:3000`) which sends the browser
  // somewhere it can't reach — and drops the unlock cookie on the wrong origin.
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const forwardedProto =
    req.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : req.nextUrl.origin;
  // 303 so a refresh of /private doesn't re-run this token-setting GET.
  const url = new URL("/private", origin);
  return NextResponse.redirect(url, { status: 303 });
}

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
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_SECONDS,
  });

  // 303 so a refresh of /private doesn't re-run this token-setting GET.
  const url = new URL("/private", req.url);
  return NextResponse.redirect(url, { status: 303 });
}

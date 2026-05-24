import { NextResponse, type NextRequest } from "next/server";

const PREORDER_HOSTS = new Set([
  "preorder.dollupboutique.com",
  "preorder.localhost:3000",
]);

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;

  if (PREORDER_HOSTS.has(host) && !url.pathname.startsWith("/preorder")) {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = "/preorder" + url.pathname;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals + static files; rewrite everything else.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/|.*\\..*).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { isPreorderHost } from "./lib/host";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host");
  const url = req.nextUrl;

  if (isPreorderHost(host) && !url.pathname.startsWith("/preorder")) {
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

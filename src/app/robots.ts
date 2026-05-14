import type { MetadataRoute } from "next";

const ALLOW_INDEXING = process.env.ALLOW_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    // Allow /feed/ even pre-launch so the Meta Commerce + Google Merchant
    // scheduled feed crawlers can reach /feed/meta.xml. Everything else stays
    // blocked from indexing.
    return {
      rules: [{ userAgent: "*", allow: "/feed/", disallow: ["/"] }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/api/",
          "/auth/",
          "/checkout",
          "/forgot-password",
          "/login",
          "/private/",
          "/register",
          "/reset-password",
          "/track-order",
          "/wishlist",
        ],
      },
    ],
    sitemap: "https://dollupboutique.com/sitemap.xml",
  };
}

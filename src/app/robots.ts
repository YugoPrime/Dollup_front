import type { MetadataRoute } from "next";

const ALLOW_INDEXING = process.env.ALLOW_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return {
      rules: [{ userAgent: "*", disallow: ["/"] }],
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

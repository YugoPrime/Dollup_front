import type { MetadataRoute } from "next";

// Pre-launch: block all crawlers until the catalog is finalised.
// To open the site for indexing, change rules to `{ userAgent: "*", allow: "/" }`
// and remove the `disallow` from the layout metadata.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

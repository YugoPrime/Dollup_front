import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Chrome on Android offers "Install app" once
// this manifest is valid AND public/sw.js (which has a fetch handler) controls
// the page — see src/components/pwa/PwaSetup.tsx. Icons come from
// scripts/generate-pwa-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Doll Up Boutique",
    short_name: "Doll Up",
    description:
      "Dresses, lingerie, beachwear and accessories in Mauritius, with cash on delivery island-wide.",
    lang: "en-MU",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FDF8F7",
    theme_color: "#FFFFFF",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

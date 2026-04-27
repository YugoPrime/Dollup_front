import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const backendHost = backendUrl ? new URL(backendUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(backendHost ? [{ protocol: "https" as const, hostname: backendHost }] : []),
      { protocol: "https", hostname: "**.dollupboutique.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;

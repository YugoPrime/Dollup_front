import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const backendHost = backendUrl ? new URL(backendUrl).hostname : undefined;
const backendOrigin = backendHost ? `https://${backendHost}` : undefined;

const imgSrc = [
  "'self'",
  "https://cdn.dollupboutique.com",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com",
  ...(backendOrigin ? [backendOrigin] : []),
  "data:",
  "blob:",
].join(" ");

const connectSrc = [
  "'self'",
  "https://api.dollupboutique.com",
  "https://cdn.dollupboutique.com",
  ...(backendOrigin && backendOrigin !== "https://api.dollupboutique.com"
    ? [backendOrigin]
    : []),
].join(" ");

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline' kept because Next.js inlines hydration scripts; revisit
  // post-launch with a nonce-based strategy.
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' kept for Tailwind/Next inline styles; no third-party stylesheets.
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-src 'self'",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
          },
          // TODO: After 24-48h of clean Report-Only logs, rename to "Content-Security-Policy" (enforcing mode). See plan 2026-05-09-launch-01-security.md Step 6.
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(backendHost ? [{ protocol: "https" as const, hostname: backendHost }] : []),
      { protocol: "https", hostname: "cdn.dollupboutique.com" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const backendHost = backendUrl ? new URL(backendUrl).hostname : undefined;
const backendOrigin = backendHost ? `https://${backendHost}` : undefined;

// Analytics origins — needed for GTM bootstrap, GA4 collection, Meta Pixel
// (browser side), and the Meta Pixel image beacon. Kept in CSP whether or not
// NEXT_PUBLIC_GTM_ID is set, so flipping the env var doesn't require another
// CSP soak. Domains-only — no inline scripts allowed beyond Next's own.
const analyticsScriptSrc = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://connect.facebook.net",
];
const analyticsConnectSrc = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://connect.facebook.net",
  "https://*.facebook.com",
];
const analyticsImgSrc = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.facebook.com",
  "https://*.fbcdn.net",
];
const analyticsFrameSrc = [
  "https://www.googletagmanager.com",
];

const imgSrc = [
  "'self'",
  "https://cdn.dollupboutique.com",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com",
  ...analyticsImgSrc,
  ...(backendOrigin ? [backendOrigin] : []),
  "data:",
  "blob:",
].join(" ");

const connectSrc = [
  "'self'",
  "https://api.dollupboutique.com",
  "https://cdn.dollupboutique.com",
  ...analyticsConnectSrc,
  ...(backendOrigin && backendOrigin !== "https://api.dollupboutique.com"
    ? [backendOrigin]
    : []),
].join(" ");

const scriptSrc = [
  "'self'",
  // 'unsafe-inline' kept because Next.js inlines hydration scripts; revisit
  // post-launch with a nonce-based strategy.
  "'unsafe-inline'",
  ...analyticsScriptSrc,
].join(" ");

const frameSrc = ["'self'", ...analyticsFrameSrc].join(" ");

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // 'unsafe-inline' kept for Tailwind/Next inline styles; no third-party stylesheets.
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  `frame-src ${frameSrc}`,
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

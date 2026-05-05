import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const backendHost = backendUrl ? new URL(backendUrl).hostname : undefined;

const contentSecurityPolicyReportOnly = [
  "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'",
  "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' https: 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "media-src 'self' https: data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
  "report-uri /api/csp-report",
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
            value: "camera=(), microphone=(), geolocation=()",
          },
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

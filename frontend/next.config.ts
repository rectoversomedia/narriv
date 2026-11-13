import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

const withNextIntl = nextIntl();

// App URL for CSP — set via env var so any deployment domain works
const appUrl = process.env.NEXT_PUBLIC_API_URL || "https://narriv.digital";

const nextConfig: NextConfig = {
  // Enable strict mode for better debugging
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["localhost:3001"], // dev only — in production, set ALLOWED_ORIGINS env var
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // Production source maps
  productionBrowserSourceMaps: false,

  // Headers for security - comprehensive CSP added
  async headers() {
    return [
      // Brand images and icons change rarely: cache a day, then refresh in the background.
      // The product host is never listed in search results; the website (www.narriv.digital) is.
      {
        source: "/:path*",
        has: [{ type: "host", value: "app.narriv.digital" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:dir(brand|icons|icon)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/(.*)",
        headers: [
          // SECURITY: Content Security Policy
          // Note: unsafe-inline is required for Next.js, consider using Nonce for stricter CSP in production
          {
            key: "Content-Security-Policy",
            value: [
              `default-src 'self' ${appUrl}`,
              // Script sources — 'unsafe-eval' is required in development for Next.js dev server/webpack/source-maps
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com http://unpkg.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com"
                : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com",
              // Style sources
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${appUrl}`,
              // Font sources
              `font-src 'self' https://fonts.gstatic.com ${appUrl}`,
              // Image sources
              `img-src 'self' data: https: blob: ${appUrl}`,
              // Connect/API sources
              `connect-src 'self' ${appUrl} https://*.supabase.co https://www.google-analytics.com https://analytics.google.com`,
              // Frame sources — deny all
              "frame-src 'none'",
              // Object sources — deny all
              "object-src 'none'",
              // Base URI restriction
              "base-uri 'self'",
              // Form action restriction
              "form-action 'self'",
              // Frame ancestors — prevent clickjacking
              "frame-ancestors 'none'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join("; "),
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
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions Policy - restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Strict Transport Security (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Redirects for legacy and shorthand workspace routes
  async redirects() {
    return [
      // The simplified /v2 screens were tried and removed; old links land on the overview.
      { source: "/v2", destination: "/", permanent: false },
      { source: "/v2/:path*", destination: "/", permanent: false },
      {
        source: "/cases",
        destination: "/workspace/cases",
        permanent: false,
      },
      {
        source: "/integrations",
        destination: "/workspace/integrations",
        permanent: false,
      },
      {
        source: "/sources",
        destination: "/workspace/sources",
        permanent: false,
      },
      {
        source: "/data-sources",
        destination: "/workspace/sources",
        permanent: false,
      },
      {
        source: "/activity",
        destination: "/workspace/activity",
        permanent: false,
      },
    ];
  },
};

// @ts-ignore
export default withNextIntl(nextConfig);

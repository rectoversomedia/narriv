import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

const withNextIntl = nextIntl();

const nextConfig: NextConfig = {
  // Enable strict mode for better debugging
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["localhost:3001"],
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
      {
        source: "/(.*)",
        headers: [
          // SECURITY: Content Security Policy
          // Note: unsafe-inline is required for Next.js, consider using Nonce for stricter CSP in production
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Script sources - restrict to self and trusted domains
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
              // Style sources
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Font sources
              "font-src 'self' https://fonts.gstatic.com",
              // Image sources
              "img-src 'self' data: https: blob:",
              // Connect/API sources
              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://analytics.google.com",
              // Frame sources - deny all
              "frame-src 'none'",
              // Object sources - deny all
              "object-src 'none'",
              // Base URI restriction
              "base-uri 'self'",
              // Form action restriction
              "form-action 'self'",
              // Frame ancestors - prevent clickjacking
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
};

export default withNextIntl(nextConfig);

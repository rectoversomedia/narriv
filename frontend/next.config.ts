import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = nextIntl();

const nextConfig: NextConfig = {
  // Enable strict mode for better debugging
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ["localhost:3001"],
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

  // Logging for debugging
  logPrefix: "[Narriv]",

  // Production source maps
  productionBrowserSourceMaps: false,

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
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
        ],
      },
    ];
  },
};

// Sentry configuration
const sentryConfig = withSentryConfig(nextConfig, {
  // Auto-instrument server-side code
  autoInstrumentServer: true,

  // Silent mode for development
  silent: process.env.NODE_ENV === "development",

  // Source map upload options
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/__monitoring",
});

export default withNextIntl(sentryConfig);

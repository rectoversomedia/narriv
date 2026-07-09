import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN from environment
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Error sampling
  sampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.npm_package_version || "1.0.0",

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Replay for session recording (optional)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Enable session replay
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ignore common browser errors
  ignoreErrors: [
    "NetworkError",
    "FetchError",
    "ECONNRESET",
    // Ignore browser extension errors
    "Extension context invalidated",
    "SecurityError",
  ],

  // Don't capture certain events
  denyUrls: [
    // Don't capture errors from browser extensions
    /extensions/i,
    // Don't capture errors from chrome-extension
    /chrome-extension/i,
    // Don't capture errors from firefox-extension
    /firefox-extension/i,
  ],

  // Context tags
  initialScope: {
    tags: {
      service: "narriv-frontend",
      version: process.env.npm_package_version || "1.0.0",
    },
  },
});

export default Sentry;

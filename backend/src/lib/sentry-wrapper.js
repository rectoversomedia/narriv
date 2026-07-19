// Sentry wrapper with static import and graceful fallback
import * as SentryLib from "@sentry/node";

const SENTRY_DSN = process.env.SENTRY_DSN;

// Initialize Sentry if DSN is provided
if (SENTRY_DSN) {
  SentryLib.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "1.0.0",
    ignoreErrors: [
      "NetworkError",
      "FetchError",
      "ECONNRESET",
      "ETIMEDOUT",
      "Socket hang up",
    ],
    attachStacktrace: true,
    includeSourceMaps: process.env.NODE_ENV === "production",
    initialScope: {
      tags: {
        service: "narriv-backend",
        version: process.env.npm_package_version || "1.0.0",
      },
    },
  });
  console.log("[SENTRY] Initialized with DSN:", SENTRY_DSN.replace(/\/\/.*@/, "//***@"));
}

const Sentry = {
  ...SentryLib,
  Handlers: SentryLib.Handlers,
};

const flushSentry = async () => {
  if (SENTRY_DSN) {
    try {
      await SentryLib.flush(2000);
      console.log("[SENTRY] Flushed successfully");
    } catch (error) {
      console.error("[SENTRY] Flush failed:", error);
    }
  }
};

export { Sentry, flushSentry };

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Import Sentry only when DSN is available
    await import("@sentry/nextjs").then((SentryModule) => {
      SentryModule.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        environment: process.env.NODE_ENV || "development",
        enabled: true,
      });
    });
  }
}

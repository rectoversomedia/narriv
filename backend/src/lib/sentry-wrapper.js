// Sentry wrapper with dynamic import and graceful fallback (no crash if @sentry/node not installed)
const SENTRY_DSN = process.env.SENTRY_DSN;

let SentryLib = null;

async function ensureSentry() {
  if (SentryLib !== null) return SentryLib;
  if (!SENTRY_DSN) { SentryLib = null; return null; }

  try {
    const mod = await import("@sentry/node");
    SentryLib = mod;
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
    return SentryLib;
  } catch (err) {
    console.warn("[SENTRY] Failed to load @sentry/node:", err.message);
    SentryLib = null;
    return null;
  }
}

// Synchronous stub for handlers (only works after ensureSentry resolves)
const noop = () => {};
const stubSentry = {
  init: noop,
  captureException: noop,
  captureMessage: noop,
  addBreadcrumb: noop,
  setContext: noop,
  setUser: noop,
  withScope: (fn) => fn({ setTag: noop, setContext: noop, captureException: noop }),
  Handlers: {
    requestHandler: () => (req, res, next) => next(),
    errorHandler: () => (err, req, res, next) => next(err),
    tracingHandler: () => (req, res, next) => next(),
  },
  startSpan: noop,
  span: { setStatus: noop, end: noop },
};

const Sentry = new Proxy(stubSentry, {
  get(target, prop) {
    if (SentryLib) return SentryLib[prop];
    return target[prop];
  },
});

const flushSentry = async () => {
  if (SENTRY_DSN) {
    try {
      const lib = await ensureSentry();
      if (lib) await lib.flush(2000);
    } catch (error) {
      console.warn("[SENTRY] Flush failed:", error);
    }
  }
};

export { Sentry, flushSentry, ensureSentry };

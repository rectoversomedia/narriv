import * as Sentry from "@sentry/node";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");

if (existsSync(envPath)) {
    config({ path: envPath });
}

// Initialize Sentry if DSN is provided
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Error sampling
        sampleRate: 1.0,

        // Environment
        environment: process.env.NODE_ENV || "development",

        // Release tracking
        release: process.env.npm_package_version || "1.0.0",

        // Ignore common errors
        ignoreErrors: [
            "NetworkError",
            "FetchError",
            "ECONNRESET",
            "ETIMEDOUT",
            "Socket hang up",
        ],

        // Filter breadcrumbs
        beforeBreadcrumb(breadcrumb) {
            // Filter out health check logs from breadcrumbs
            if (breadcrumb.message?.includes("health")) {
                return null;
            }
            return breadcrumb;
        },

        // Attach stacktrace to all thrown errors
        attachStacktrace: true,

        // Include node_modules frames in stack traces (disabled by default)
        includeSourceMaps: process.env.NODE_ENV === "production",

        // Context extra
        initialScope: {
            tags: {
                service: "narriv-backend",
                version: process.env.npm_package_version || "1.0.0",
            },
        },
    });

    console.log("[SENTRY] Initialized with DSN:", SENTRY_DSN.replace(/\/\/.*@/, "//***@"));
}

export default Sentry;

/**
 * Capture an exception with additional context
 */
export function captureError(error, context = {}) {
    if (!SENTRY_DSN) {
        console.error("[SENTRY] Not initialized - error not captured:", error.message);
        return;
    }

    Sentry.withScope((scope) => {
        // Add custom tags
        if (context.workspaceId) {
            scope.setTag("workspace_id", context.workspaceId);
        }
        if (context.userId) {
            scope.setTag("user_id", context.userId);
        }
        if (context.endpoint) {
            scope.setTag("endpoint", context.endpoint);
        }

        // Add custom extra data
        if (context.extra) {
            scope.setExtra("custom_data", context.extra);
        }

        // Set user context
        if (context.user) {
            scope.setUser({
                id: context.user.id,
                email: context.user.email,
            });
        }

        Sentry.captureException(error);
    });
}

/**
 * Capture a message with level
 */
export function captureMessage(message, level = "info", context = {}) {
    if (!SENTRY_DSN) {
        console.log(`[SENTRY] Not initialized - message not captured:`, message);
        return;
    }

    Sentry.withScope((scope) => {
        if (context.workspaceId) {
            scope.setTag("workspace_id", context.workspaceId);
        }
        if (context.userId) {
            scope.setTag("user_id", context.userId);
        }

        if (context.extra) {
            scope.setExtra("custom_data", context.extra);
        }

        Sentry.captureMessage(message, level);
    });
}

/**
 * Add breadcrumb for tracing user actions
 */
export function addBreadcrumb(message, data = {}, category = "custom") {
    if (!SENTRY_DSN) return;

    Sentry.addBreadcrumb({
        message,
        data,
        category,
        timestamp: Date.now() / 1000,
    });
}

/**
 * Set transaction name for performance monitoring
 */
export function setTransactionName(name) {
    if (!SENTRY_DSN) return;
    Sentry.setTag("transaction", name);
}

/**
 * Express middleware to capture errors and performance
 */
export function sentryMiddleware(req, res, next) {
    if (!SENTRY_DSN) return next();

    // Set transaction name
    Sentry.setTag("http.method", req.method);
    Sentry.setTag("http.url", req.url);

    // Track request start time
    const startTime = Date.now();

    // Capture response when finished
    res.on("finish", () => {
        const duration = Date.now() - startTime;

        // Only capture slow requests (>1s) in production
        if (process.env.NODE_ENV === "production" && duration > 1000) {
            captureMessage(`Slow request: ${req.method} ${req.url}`, "warning", {
                extra: {
                    duration,
                    statusCode: res.statusCode,
                },
            });
        }
    });

    next();
}

/**
 * Wrap an async function to capture errors
 */
export function wrapAsync(fn) {
    if (!SENTRY_DSN) return fn;

    return (...args) => {
        return fn(...args).catch((error) => {
            captureError(error, {
                extra: {
                    args: args.map((arg) =>
                        typeof arg === "object" ? JSON.stringify(arg).slice(0, 200) : arg
                    ),
                },
            });
            throw error;
        });
    };
}

/**
 * Graceful shutdown handler for Sentry
 */
export async function flushSentry() {
    if (!SENTRY_DSN) return;

    try {
        await Sentry.flush(2000);
        console.log("[SENTRY] Flushed successfully");
    } catch (error) {
        console.error("[SENTRY] Flush failed:", error);
    }
}

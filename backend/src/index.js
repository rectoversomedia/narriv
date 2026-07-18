import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";

// Import Sentry for error tracking
import Sentry from "./lib/sentry.js";
import { flushSentry } from "./lib/sentry.js";

// Import Routes
import authRoutes from "./modules/auth/auth.routes.js";
import signalsRoutes from "./modules/signals/signals.routes.js";
import sourcesRoutes from "./modules/sources/sources.routes.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
import escalationMatrixRoutes from "./modules/alerts/escalation-matrix.routes.js";
import narrativesRoutes from "./modules/narratives/narratives.routes.js";
import geoRoutes from "./modules/geo/geo.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import actionsRoutes from "./modules/actions/actions.routes.js";
import actionPlansRoutes from "./modules/action-plans/action-plans.routes.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import workspaceSettingsRoutes from "./modules/workspace-settings/workspace-settings.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import casesRoutes from "./modules/cases/cases.routes.js";
import integrationsRoutes from "./modules/integrations/integrations.routes.js";
import appNotificationsRoutes from "./modules/app-notifications/app-notifications.routes.js";
import costRoutes from "./modules/cost/cost.routes.js";
import bulkRoutes from "./modules/bulk/bulk.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import realtimeRoutes from "./modules/realtime/realtime.routes.js";
import subscriptionsRoutes from "./modules/subscriptions/subscriptions.routes.js";

// Import Libs
import { scheduleAlertDetection, scheduleAlertEscalation, scheduleVisibilityScans } from "./lib/queue.js";
import { getRuntimeHealth } from "./lib/runtime-health.js";
import { requestLogger, logStructured } from "./lib/logger.js";
import { getMetricsSnapshot } from "./lib/metrics.js";

// Import Middlewares
import { globalErrorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { requestTimeout, TIMEOUTS } from "./middlewares/request-timeout.js";
import { rateLimit, RATE_LIMITS } from "./middlewares/rate-limit.js";
import { verifyToken } from "./middlewares/auth.middleware.js";
import { buildCorsOriginChecker, enforceHttps } from "./middlewares/security.js";
import { securityHeaders, sensitiveDataHeaders, apiSecurityHeaders } from "./middlewares/security-headers.js";
import { sanitizeInput, validateContentType } from "./middlewares/sanitize.js";
import { flushAllAuditLogs } from "./lib/audit-enhanced.js";

dotenv.config();

// Initialize Scheduled Jobs
scheduleAlertDetection();
scheduleAlertEscalation();
scheduleVisibilityScans();

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY || "loopback");

// Security headers (apply early)
app.use(securityHeaders);

// Sentry request handler (must be before routes)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler({
        ip: true,
        user: ["id", "email"],
        serverName: "narriv-backend",
    }));
}

// Compression (gzip) for responses > 1KB
app.use(compression({
    threshold: 1024,
    level: 6,
}));

// HTTPS enforcement in production
app.use(enforceHttps);

// CORS configuration
const isCorsOriginAllowed = buildCorsOriginChecker();
app.use(cors({
    origin: (origin, callback) => {
        if (isCorsOriginAllowed(origin)) return callback(null, true);
        logStructured("warn", "cors_origin_denied", { origin });
        return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    credentials: true,
    maxAge: 86400,
}));

// Body parsing with size limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Input sanitization
app.use(sanitizeInput);

// Content type validation
app.use(validateContentType);

// Request logging
app.use(requestLogger);

// Request timeout
app.use(requestTimeout(TIMEOUTS.default));

// Health endpoints (public, no auth needed)
app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health/runtime", async (req, res) => {
    const health = await getRuntimeHealth();
    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
});

// Metrics endpoint (protected)
app.get("/metrics", verifyToken, (req, res) => {
    res.status(200).json(getMetricsSnapshot());
});

// Use Routes (with rate limiting on sensitive endpoints)
app.use("/auth", rateLimit(RATE_LIMITS.auth), authRoutes);
app.use("/ai", rateLimit(RATE_LIMITS.ai_generation), apiSecurityHeaders, aiRoutes);
app.use("/ingestion", rateLimit(RATE_LIMITS.ingestion), ingestionRoutes);
app.use("/api/actions", rateLimit(RATE_LIMITS.ai_generation), apiSecurityHeaders, actionsRoutes);
app.use("/api/feedback", rateLimit(RATE_LIMITS.feedback), apiSecurityHeaders, feedbackRoutes);
app.use("/signals", signalsRoutes);
app.use("/sources", sourcesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", escalationMatrixRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/narratives", narrativesRoutes);
app.use("/api/visibility", geoRoutes);
app.use("/api/reports", rateLimit(RATE_LIMITS.export), apiSecurityHeaders, reportsRoutes);
app.use("/api/action-plans", actionPlansRoutes);
app.use("/api/workspace", sensitiveDataHeaders, workspaceSettingsRoutes);
app.use("/api/workspace/activity", activityRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/workspace/cases", casesRoutes);
app.use("/api/workspace/integrations", integrationsRoutes);
app.use("/api/notifications", appNotificationsRoutes);
app.use("/api/workspace", costRoutes);
app.use("/api/bulk", bulkRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);

// Sentry error handler (must be before error handler)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            // Handle all errors
            return true;
        },
    }));
}

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logStructured("info", "graceful_shutdown_start", { signal });

    // Flush pending audit logs
    await flushAllAuditLogs();

    // Flush Sentry before exit
    await flushSentry();

    logStructured("info", "graceful_shutdown_complete", { signal });
    process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Vercel serverless handler - export app
export default app;

// Start server locally if run directly
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logStructured("info", "server_started", { port: PORT, env: process.env.NODE_ENV });
    });
}

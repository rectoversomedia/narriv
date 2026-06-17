import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";

// Import Routes
import authRoutes from "./modules/auth/auth.routes.js";
import signalsRoutes from "./modules/signals/signals.routes.js";
import sourcesRoutes from "./modules/sources/sources.routes.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
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
import "./workers/ai-analysis.worker.js";
import "./workers/alert.worker.js";
import "./workers/ingestion.worker.js";
import "./workers/notification.worker.js";
import { scheduleAlertDetection, scheduleAlertEscalation, scheduleVisibilityScans } from "./lib/queue.js";
import { getRuntimeHealth } from "./lib/runtime-health.js";
import { requestLogger, logStructured } from "./lib/logger.js";
import { getMetricsSnapshot } from "./lib/metrics.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { requestTimeout, TIMEOUTS } from "./middlewares/request-timeout.js";
import { rateLimit, RATE_LIMITS } from "./middlewares/rate-limit.js";
import { verifyToken } from "./middlewares/auth.middleware.js";
import { buildCorsOriginChecker, enforceHttps } from "./middlewares/security.js";

dotenv.config();

// Initialize Scheduled Jobs
scheduleAlertDetection();
scheduleAlertEscalation();
scheduleVisibilityScans();

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY || "loopback");

// Compression (gzip) for responses > 1KB
app.use(compression({
    threshold: 1024,
    level: 6,
}));

app.use(enforceHttps);

const isCorsOriginAllowed = buildCorsOriginChecker();

app.use(cors({
    origin: (origin, callback) => {
        if (isCorsOriginAllowed(origin)) return callback(null, true);
        logStructured("warn", "cors_origin_denied", { origin });
        return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(requestLogger);
app.use(requestTimeout(TIMEOUTS.default));

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

app.get("/metrics", verifyToken, (req, res) => {
    res.status(200).json(getMetricsSnapshot());
});

// Use Routes (with rate limiting on sensitive endpoints)
app.use("/auth", rateLimit(RATE_LIMITS.auth), authRoutes);
app.use("/ai", rateLimit(RATE_LIMITS.ai_generation), aiRoutes);
app.use("/ingestion", rateLimit(RATE_LIMITS.ingestion), ingestionRoutes);
app.use("/api/actions", rateLimit(RATE_LIMITS.ai_generation), actionsRoutes);
app.use("/api/feedback", rateLimit(RATE_LIMITS.feedback), feedbackRoutes);
app.use("/signals", signalsRoutes);
app.use("/sources", sourcesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/narratives", narrativesRoutes);
app.use("/api/visibility", geoRoutes);
app.use("/api/reports", rateLimit(RATE_LIMITS.export), reportsRoutes);
app.use("/api/action-plans", actionPlansRoutes);
app.use("/api/workspace", workspaceSettingsRoutes);
app.use("/api/workspace/activity", activityRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/workspace/cases", casesRoutes);
app.use("/api/workspace/integrations", integrationsRoutes);
app.use("/api/notifications", appNotificationsRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
        logStructured("info", "server_started", { port, url: `http://localhost:${port}` });
    });
}

export default app;

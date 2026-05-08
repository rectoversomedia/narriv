import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import Routes
import signalsRoutes from "./modules/signals/signals.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
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
import "./workers/ai-analysis.worker.js";
import "./workers/alert.worker.js";
import "./workers/ingestion.worker.js";
import { scheduleAlertDetection } from "./lib/queue.js";

dotenv.config();

// Initialize Scheduled Jobs
scheduleAlertDetection();

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients without Origin (curl/Postman/server-to-server)
        if (!origin) return callback(null, true);

        const allowlist = [
            "http://localhost:3000",
            "http://localhost:3001",
            /^http:\/\/localhost:\d+$/,
            /^http:\/\/127\.0\.0\.1:\d+$/,
            /\.vercel\.app$/,
        ];

        const isAllowed = allowlist.some((rule) => {
            if (typeof rule === "string") return rule === origin;
            return rule.test(origin);
        });

        if (isAllowed) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Use Routes
app.use("/signals", signalsRoutes);
app.use("/auth", authRoutes);
app.use("/sources", sourcesRoutes);
app.use("/ingestion", ingestionRoutes);
app.use("/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/narratives", narrativesRoutes);
app.use("/api/visibility", geoRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/actions", actionsRoutes);
app.use("/api/action-plans", actionPlansRoutes);
app.use("/api/feedback", feedbackRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

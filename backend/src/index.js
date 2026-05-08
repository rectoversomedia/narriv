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
import "./workers/ai-analysis.worker.js";
import "./workers/alert.worker.js";
import { scheduleAlertDetection } from "./lib/queue.js";

dotenv.config();

// Initialize Scheduled Jobs
scheduleAlertDetection();

const app = express();
app.use(cors({
    origin: [
        "http://localhost:3001",   // Next.js dev server
        "http://localhost:3000",   // same-origin fallback
        /\.vercel\.app$/,          // Vercel preview deployments
    ],
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

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
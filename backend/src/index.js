import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import Routes
import signalsRoutes from "./modules/signals/signals.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import sourcesRoutes from "./modules/sources/sources.routes.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import "./workers/ai-analysis.worker.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

// Use Routes
app.use("/signals", signalsRoutes);
app.use("/auth", authRoutes);
app.use("/sources", sourcesRoutes);
app.use("/ingestion", ingestionRoutes);
app.use("/ai", aiRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
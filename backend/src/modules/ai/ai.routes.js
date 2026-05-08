import express from "express";
import { analyzeSignal } from "./ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

/**
 * POST /ai/analyze
 * Analyzes a signal's title + content using OpenAI.
 * Body: { title?: string, content: string }
 */
router.post("/analyze", async (req, res) => {
    try {
        const { title, content, text } = req.body;
        const inputContent = content || text;

        if (!inputContent) {
            return res.status(400).json({ error: "'content' field is required." });
        }

        const result = await analyzeSignal(title || null, inputContent);
        res.json({ result });
    } catch (error) {
        console.error("[AI MODULE] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;

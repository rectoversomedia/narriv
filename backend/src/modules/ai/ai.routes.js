import express from "express";
import { analyzeText } from "./ai.service.js";

const router = express.Router();

/**
 * POST /ai/analyze
 * Test endpoint for the AI analyzeText function.
 * Body: { text: string, systemPrompt?: string }
 */
router.post("/analyze", async (req, res) => {
    try {
        const { text, systemPrompt } = req.body;

        if (!text) {
            return res.status(400).json({ error: "'text' field is required." });
        }

        const result = await analyzeText(text, systemPrompt);
        res.json({ result });
    } catch (error) {
        console.error("[AI MODULE] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;

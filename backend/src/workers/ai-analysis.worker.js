import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { analyzeSignal } from "../modules/ai/ai.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calls analyzeSignal with one automatic retry on failure.
 * Waits RETRY_DELAY_MS between attempts.
 */
const RETRY_DELAY_MS = 3000;

async function analyzeWithRetry(title, content, signalId) {
    // Attempt 1
    try {
        return await analyzeSignal(title, content);
    } catch (err) {
        console.warn(`[WORKER] analyzeSignal attempt 1 failed for signal ${signalId}:`, err.message);
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    // Attempt 2
    return await analyzeSignal(title, content);
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
    "ai-analysis",
    async (job) => {
        const { signal_id: signalId } = job.data;
        console.log(`[WORKER] Processing job ${job.id} for signal: ${signalId}`);

        // 1. Fetch signal
        const signal = await prisma.signal.findUnique({
            where: { id: signalId },
        });

        if (!signal) {
            console.warn(`[WORKER] Signal ${signalId} not found. Skipping.`);
            return;
        }

        // 2. Run analysis with one retry
        let analysisResult;
        try {
            console.log(`[WORKER] Analyzing signal: "${signal.title || "(no title)"}"`);
            analysisResult = await analyzeWithRetry(signal.title, signal.content, signalId);
        } catch (error) {
            // Both attempts failed — log and mark signal as errored; do NOT throw
            console.error(
                `[WORKER] Both analysis attempts failed for signal ${signalId}. Error:`,
                error.message
            );

            try {
                await prisma.signal.update({
                    where: { id: signalId },
                    data: { sentiment: "error" },
                });
            } catch (dbErr) {
                console.error(`[WORKER] Failed to mark signal ${signalId} as errored in DB:`, dbErr.message);
            }

            return; // Resolve cleanly — job done, no crash
        }

        // 3. Save result to DB
        try {
            await prisma.$transaction([
                prisma.signalAnalysis.create({
                    data: {
                        signalId: signal.id,
                        sentiment: analysisResult.sentiment,
                        narrativeType: analysisResult.narrative_type,
                        stakeholder: analysisResult.stakeholder,
                        impact: analysisResult.impact,
                        summary: analysisResult.summary,
                        recommendedAction: analysisResult.recommended_action,
                        confidenceScore: analysisResult.confidence_score,
                    },
                }),
                prisma.signal.update({
                    where: { id: signal.id },
                    data: { sentiment: analysisResult.sentiment },
                }),
            ]);

            console.log(`[WORKER] Job ${job.id} completed successfully for signal: ${signalId}`);
        } catch (dbError) {
            // DB write failed — log but don't crash
            console.error(`[WORKER] Failed to save analysis for signal ${signalId}:`, dbError.message);
        }
    },
    { connection }
);

worker.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed (BullMQ):`, err.message);
});

worker.on("error", (err) => {
    // Suppress ECONNREFUSED spam - Redis will reconnect automatically
    if (err.code === "ECONNREFUSED") return;
    console.error("[WORKER] Worker error:", err.message);
});

console.log("[WORKER] AI Analysis Worker initialized");

export default worker;

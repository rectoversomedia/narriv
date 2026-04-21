import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { analyzeSignal } from "../modules/ai/ai.service.js";

const worker = new Worker(
    "ai-analysis",
    async (job) => {
        const { signalId } = job.data;
        console.log(`[WORKER] Processing job ${job.id} for signal: ${signalId}`);

        // 1. Fetch signal
        const signal = await prisma.signal.findUnique({
            where: { id: signalId },
        });

        if (!signal) {
            console.warn(`[WORKER] Signal ${signalId} not found. Skipping.`);
            return;
        }

        try {
            // 2. Run analysis
            console.log(`[WORKER] Analyzing signal: ${signal.title}`);
            const analysisResult = await analyzeSignal(signal.title, signal.content);

            // 3. Save result
            await prisma.$transaction([
                // Create detailed analysis record
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
                // Update signal sentiment for backward compatibility
                prisma.signal.update({
                    where: { id: signal.id },
                    data: { sentiment: analysisResult.sentiment },
                }),
            ]);

            console.log(`[WORKER] Job ${job.id} completed successfully for signal: ${signalId}`);
        } catch (error) {
            console.error(`[WORKER] Error analyzing signal ${signalId}:`, error.message);
            throw error; // Rethrow to trigger BullMQ retry
        }
    },
    { connection }
);

worker.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed:`, err.message);
});

worker.on("error", (err) => {
    console.error("[WORKER] Worker encountered an error:", err.message);
});

console.log("[WORKER] AI Analysis Worker initialized");

export default worker;

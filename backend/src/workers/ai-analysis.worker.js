import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { analyzeSignal } from "../modules/ai/ai.service.js";

const RETRY_DELAY_MS = 3000;

async function analyzeWithRetry(title, content, signalId) {
    try {
        return await analyzeSignal(title, content);
    } catch (err) {
        console.warn(`[WORKER] analyzeSignal attempt 1 failed for signal ${signalId}:`, err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return await analyzeSignal(title, content);
}

function buildSafeFallbackAnalysis() {
    return {
        sentiment: "neutral",
        narrative_type: "Unclassified Signal",
        stakeholder: "General Public",
        impact: "low",
        summary: "Automated analysis is temporarily unavailable. This signal was saved with a safe fallback summary.",
        recommended_action: "Review this signal manually and re-run AI analysis when service is stable.",
        confidence_score: 0.2,
    };
}

const worker = new Worker(
    "ai-analysis",
    async (job) => {
        const { signal_id: signalId } = job.data;
        console.log(`[WORKER] Processing job ${job.id} for signal: ${signalId}`);

        const signal = await prisma.signal.findUnique({
            where: { id: signalId },
        });

        if (!signal) {
            console.warn(`[WORKER] Signal ${signalId} not found. Skipping.`);
            return;
        }

        let analysisResult;
        let failureError = null;

        try {
            console.log(`[WORKER] Analyzing signal: "${signal.title || "(no title)"}"`);
            analysisResult = await analyzeWithRetry(signal.title, signal.content, signalId);
        } catch (error) {
            failureError = error;
            console.error(`[WORKER] Analysis failed for signal ${signalId}. Using safe fallback.`, error.message);
            analysisResult = buildSafeFallbackAnalysis();
        }

        try {
            const tx = [
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
                })
            ];

            if (failureError) {
                tx.push(
                    prisma.aiAnalysisFailureLog.create({
                        data: {
                            workspaceId: signal.workspaceId,
                            signalId: signal.id,
                            errorMessage: failureError.message || "AI analysis failed",
                            rawAttempt1: failureError.details?.rawAttempt1 || null,
                            rawAttempt2: failureError.details?.rawAttempt2 || null,
                        }
                    })
                );
            }

            await prisma.$transaction(tx);
            console.log(`[WORKER] Job ${job.id} completed successfully for signal: ${signalId}`);
        } catch (dbError) {
            console.error(`[WORKER] Failed to save analysis for signal ${signalId}:`, dbError.message);
        }
    },
    { connection }
);

worker.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed (BullMQ):`, err.message);
});

worker.on("error", (err) => {
    if (err.code === "ECONNREFUSED") return;
    console.error("[WORKER] Worker error:", err.message);
});

console.log("[WORKER] AI Analysis Worker initialized");

export default worker;

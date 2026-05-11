import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { analyzeSignal } from "../modules/ai/ai.service.js";
import { logStructured } from "../lib/logger.js";

const RETRY_DELAY_MS = 3000;

async function analyzeWithRetry(title, content, signalId) {
    try {
        return await analyzeSignal(title, content);
    } catch (err) {
        logStructured("warn", "ai_analysis_retry_attempt", {
            worker: "ai-analysis-worker",
            signalId,
            attempt: 1,
            error: err.message,
        });
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
        logStructured("info", "worker_job_started", {
            worker: "ai-analysis-worker",
            queue: "ai-analysis",
            jobId: job.id,
            signalId,
        });

        const signal = await prisma.signal.findUnique({
            where: { id: signalId },
        });

        if (!signal) {
            logStructured("warn", "worker_signal_not_found", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
            });
            return;
        }

        let analysisResult;
        let failureError = null;

        try {
            logStructured("info", "worker_signal_analysis_started", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
            });
            analysisResult = await analyzeWithRetry(signal.title, signal.content, signalId);
        } catch (error) {
            failureError = error;
            logStructured("error", "worker_signal_analysis_failed_fallback", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
                error: error.message,
            });
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
            logStructured("info", "worker_job_completed", {
                worker: "ai-analysis-worker",
                queue: "ai-analysis",
                jobId: job.id,
                signalId,
            });
        } catch (dbError) {
            logStructured("error", "worker_save_failed", {
                worker: "ai-analysis-worker",
                queue: "ai-analysis",
                jobId: job.id,
                signalId,
                error: dbError.message,
            });
        }
    },
    { connection }
);

worker.on("failed", (job, err) => {
    logStructured("error", "worker_job_failed", {
        worker: "ai-analysis-worker",
        queue: "ai-analysis",
        jobId: job?.id,
        error: err.message,
    });
});

worker.on("error", (err) => {
    if (err.code === "ECONNREFUSED") return;
    logStructured("error", "worker_error", {
        worker: "ai-analysis-worker",
        queue: "ai-analysis",
        error: err.message,
    });
});

logStructured("info", "worker_initialized", {
    worker: "ai-analysis-worker",
    queue: "ai-analysis",
});

export default worker;

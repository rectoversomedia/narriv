import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import supabase from "../lib/supabase.js";
import { analyzeSignal } from "../modules/ai/ai.service.js";
import { logStructured } from "../lib/logger.js";
import { calibrateConfidence } from "../lib/confidence-calibration.js";
import { generateContentHash, getCachedAnalysis } from "../lib/analysis-cache.js";
import { workerMetrics } from "../lib/worker-metrics.js";
import { checkAutoThrottle, estimateBatchCost } from "../lib/cost-management.js";

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

        const { data: signal, error: signalError } = await supabase
            .from("signals")
            .select("*")
            .eq("id", signalId)
            .single();

        if (signalError || !signal) {
            logStructured("warn", "worker_signal_not_found", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
            });
            return;
        }

        // Check budget before processing
        const estimatedCost = estimateBatchCost(1); // Single signal analysis
        const budgetCheck = await checkAutoThrottle(signal.workspace_id);

        if (!budgetCheck.allowed) {
            logStructured("warn", "worker_budget_exceeded_skip", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
                workspaceId: signal.workspace_id,
                reason: budgetCheck.reason,
            });

            // Create a deferred analysis record
            await supabase
                .from("signal_analyses")
                .insert({
                    signal_id: signal.id,
                    sentiment: "neutral",
                    summary: "Analysis pending - budget limit reached. Will resume when budget resets.",
                    confidence_score: 0,
                    deferred: true,
                    deferred_reason: "budget_exceeded",
                });

            return { deferred: true, reason: budgetCheck.reason };
        }

        let analysisResult;
        let failureError = null;

        // Check analysis cache first
        const contentHash = generateContentHash(signal.title, signal.content);
        const cached = await getCachedAnalysis(contentHash);

        if (cached) {
            logStructured("info", "worker_cache_hit", {
                worker: "ai-analysis-worker",
                signalId,
                cachedAnalysisId: cached.id,
            });

            // Create a new analysis record for this signal, copying cached data
            analysisResult = {
                sentiment: cached.sentiment,
                narrative_type: cached.narrativeType,
                stakeholder: cached.stakeholder,
                impact: cached.impact,
                summary: cached.summary,
                recommended_action: cached.recommendedAction,
                confidence_score: cached.confidenceScore,
            };
        } else {
        try {
            logStructured("info", "worker_signal_analysis_started", {
                worker: "ai-analysis-worker",
                jobId: job.id,
                signalId,
            });
            analysisResult = await analyzeWithRetry(signal.title, signal.content, signalId);

            // Calibrate confidence based on historical feedback
            const calibratedConfidence = await calibrateConfidence(
                signal.workspace_id,
                analysisResult.narrative_type,
                analysisResult.confidence_score
            );
            analysisResult.confidence_score = calibratedConfidence;
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
        }

        try {
            // Create signal analysis record
            const { error: analysisError } = await supabase
                .from("signal_analyses")
                .insert({
                    signal_id: signal.id,
                    sentiment: analysisResult.sentiment,
                    narrative_type: analysisResult.narrative_type,
                    stakeholder: analysisResult.stakeholder,
                    impact: analysisResult.impact,
                    summary: analysisResult.summary,
                    recommended_action: analysisResult.recommended_action,
                    confidence_score: analysisResult.confidence_score,
                });

            if (analysisError) {
                throw new Error(`Failed to create signal analysis: ${analysisError.message}`);
            }

            // Update signal with sentiment
            const { error: signalUpdateError } = await supabase
                .from("signals")
                .update({ sentiment: analysisResult.sentiment })
                .eq("id", signal.id);

            if (signalUpdateError) {
                throw new Error(`Failed to update signal: ${signalUpdateError.message}`);
            }

            // Log failure if there was one
            if (failureError) {
                const { error: failureLogError } = await supabase
                    .from("ai_analysis_failure_logs")
                    .insert({
                        workspace_id: signal.workspace_id,
                        signal_id: signal.id,
                        error_message: failureError.message || "AI analysis failed",
                        raw_attempt_1: failureError.details?.rawAttempt1 || null,
                        raw_attempt_2: failureError.details?.rawAttempt2 || null,
                    });

                if (failureLogError) {
                    logStructured("warn", "worker_failure_log_failed", {
                        worker: "ai-analysis-worker",
                        signalId,
                        error: failureLogError.message,
                    });
                }
            }

            logStructured("info", "worker_job_completed", {
                worker: "ai-analysis-worker",
                queue: "ai-analysis",
                jobId: job.id,
                signalId,
            });

            workerMetrics.recordJob("ai-analysis", {
                success: true,
                durationMs: Date.now() - job.timestamp,
                jobId: job.id,
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

    workerMetrics.recordJob("ai-analysis", {
        success: false,
        durationMs: Date.now() - (job?.timestamp || Date.now()),
        jobId: job?.id,
        error: err.message,
    });
});

worker.on("error", (err) => {
    if (err.code === "ECONNREFUSED" || (err.message && err.message.includes("ECONNRESET"))) return;
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

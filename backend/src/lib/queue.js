import { Queue } from "bullmq";
import connection from "./redis.js";

export const aiAnalysisQueue = new Queue("ai-analysis", {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

/**
 * Adds a signal analysis job to the queue.
 * Uses signalId as the jobId to prevent duplicate jobs —
 * BullMQ will skip adding a job if one with the same ID already exists.
 *
 * @param {string} signalId - The ID of the signal to analyze.
 */
export const addAnalysisJob = async (signalId) => {
    try {
        const job = await aiAnalysisQueue.add(
            "analyze",
            { signal_id: signalId },
            { jobId: `signal_${signalId}` }  // NOTE: BullMQ tidak izinkan ':' di job ID
        );

        if (job) {
            console.log(`[QUEUE] Job enqueued for signal: ${signalId} (jobId: ${job.id})`);
        } else {
            console.log(`[QUEUE] Duplicate job skipped for signal: ${signalId}`);
        }
    } catch (error) {
        console.error(`[QUEUE] Failed to add job for signal ${signalId}:`, error.message);
    }
};

// ── Alert Detection Queue ─────────────────────────────────────────────────────

export const alertDetectionQueue = new Queue("alert-detection", {
    connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

/**
 * Schedules the recurring alert detection job.
 * By default, this runs every 1 hour.
 */
export const scheduleAlertDetection = async () => {
    try {
        await alertDetectionQueue.add(
            "detect-alerts",
            {}, // no specific payload needed; worker fetches workspaces
            {
                repeat: {
                    pattern: "0 * * * *", // Every hour on the hour
                },
                jobId: "recurring-alert-detection"
            }
        );
        console.log("[QUEUE] Scheduled recurring alert detection job (Hourly).");
    } catch (error) {
        console.error("[QUEUE] Failed to schedule alert detection:", error.message);
    }
};

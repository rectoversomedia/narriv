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
            { jobId: `signal:${signalId}` }
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

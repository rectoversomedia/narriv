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
 * @param {string} signalId - The ID of the signal to analyze.
 */
export const addAnalysisJob = async (signalId) => {
    try {
        await aiAnalysisQueue.add("analyze", { signalId });
        console.log(`[QUEUE] Analysis job added for signal: ${signalId}`);
    } catch (error) {
        console.error(`[QUEUE] Failed to add job for signal ${signalId}:`, error.message);
    }
};

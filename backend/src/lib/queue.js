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
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 10000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

/**
 * Schedules the recurring alert detection job.
 * By default, this runs every 15 minutes.
 */
export const scheduleAlertDetection = async () => {
    try {
        await alertDetectionQueue.add(
            "detect-alerts",
            {}, // no specific payload needed; worker fetches workspaces
            {
                repeat: {
                    pattern: "*/15 * * * *", // Every 15 minutes
                },
                jobId: "recurring-alert-detection"
            }
        );
        console.log("[QUEUE] Scheduled recurring alert detection job (Every 15 minutes).");
    } catch (error) {
        console.error("[QUEUE] Failed to schedule alert detection:", error.message);
    }
};

// ── Ingestion Queue ───────────────────────────────────────────────────────────

export const ingestionQueue = new Queue("ingestion", {
    connection,
    defaultJobOptions: {
        attempts: Number(process.env.INGESTION_MAX_RETRIES || 3),
        backoff: {
            type: "exponential",
            delay: Number(process.env.INGESTION_BACKOFF_MS || 5000),
        },
        timeout: Number(process.env.INGESTION_JOB_TIMEOUT_MS || 300000),
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const addIngestionJob = async (jobId, sourceId) => {
    try {
        const job = await ingestionQueue.add(
            "run-ingestion",
            { jobId, sourceId },
            { jobId: `ingest_${jobId}` }
        );
        console.log(`[QUEUE] Job enqueued for ingestion: ${jobId}`);
    } catch (error) {
        console.error(`[QUEUE] Failed to add ingestion job ${jobId}:`, error.message);
    }
};

/**
 * Schedules recurring alert escalation automation.
 * By default, this runs every 10 minutes.
 */
export const scheduleAlertEscalation = async () => {
    try {
        await alertDetectionQueue.add(
            "escalate-alerts",
            {},
            {
                repeat: {
                    pattern: "*/10 * * * *",
                },
                jobId: "recurring-alert-escalation"
            }
        );
        console.log("[QUEUE] Scheduled recurring alert escalation job (Every 10 minutes).");
    } catch (error) {
        console.error("[QUEUE] Failed to schedule alert escalation:", error.message);
    }
};

export const cancelIngestionQueueJob = async (ingestionJobId) => {
    try {
        const queueJobId = `ingest_${ingestionJobId}`;
        const job = await ingestionQueue.getJob(queueJobId);
        if (!job) {
            return { removed: false, reason: "job_not_found_in_queue" };
        }

        const state = await job.getState();
        if (state === "active") {
            return { removed: false, reason: "job_active_cannot_remove" };
        }

        await job.remove();
        return { removed: true, reason: "job_removed_from_queue" };
    } catch (error) {
        console.error(`[QUEUE] Failed to cancel ingestion job ${ingestionJobId}:`, error.message);
        return { removed: false, reason: error.message || "cancel_failed" };
    }
};

// Notification Queue
export const notificationQueue = new Queue("notifications", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

/**
 * Enqueue notification dispatch job with dedupe protection.
 * @param {string} eventName
 * @param {object} payload
 * @param {object} options
 * @param {string} [options.dedupeKey] - Deterministic key to prevent duplicate sends.
 * @param {number} [options.delayMs]
 */
export const addNotificationJob = async (eventName, payload, options = {}) => {
    try {
        const dedupeKey = options.dedupeKey || `${eventName}_${payload?.workspaceId || "global"}_${payload?.targetId || payload?.alertId || "na"}`;
        const safeKey = String(dedupeKey).replace(/[^a-zA-Z0-9_-]/g, "_");

        const job = await notificationQueue.add(
            "dispatch-notification",
            { eventName, payload },
            {
                jobId: `notif_${safeKey}`,
                delay: options.delayMs || 0,
            }
        );

        if (job) {
            console.log(`[QUEUE] Notification job enqueued: ${eventName} (jobId: ${job.id})`);
        } else {
            console.log(`[QUEUE] Duplicate notification skipped: ${eventName}`);
        }
    } catch (error) {
        console.error(`[QUEUE] Failed to add notification job (${eventName}):`, error.message);
    }
};

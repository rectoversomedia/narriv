import { Queue } from "bullmq";
import { logStructured } from "./logger.js";

// Check if Redis is available
const isRedisDisabled = process.env.ENABLE_WORKERS !== 'true' || !process.env.REDIS_URL;

// Lazy-loaded queues
let _aiAnalysisQueue = null;
let _alertDetectionQueue = null;
let _ingestionQueue = null;
let _notificationQueue = null;
let _visibilityScanQueue = null;
let _connection = null;

async function getConnection() {
    if (_connection) return _connection;
    if (isRedisDisabled) return null;

    try {
        const redisModule = await import("./redis.js");
        _connection = redisModule.default;
        return _connection;
    } catch (err) {
        logStructured("error", "queue_redis_import_failed", { error: err.message });
        return null;
    }
}

async function getQueue(name, defaultOptions = {}) {
    if (isRedisDisabled) return null;

    const conn = await getConnection();
    if (!conn) return null;

    const queues = {
        "ai-analysis": () => _aiAnalysisQueue || new Queue("ai-analysis", { connection: conn, ...defaultOptions }),
        "alert-detection": () => _alertDetectionQueue || new Queue("alert-detection", { connection: conn, ...defaultOptions }),
        "ingestion": () => _ingestionQueue || new Queue("ingestion", { connection: conn, ...defaultOptions }),
        "notifications": () => _notificationQueue || new Queue("notifications", { connection: conn, ...defaultOptions }),
        "visibility-scan": () => _visibilityScanQueue || new Queue("visibility-scan", { connection: conn, ...defaultOptions }),
    };

    const factory = queues[name];
    if (!factory) return null;

    return factory();
}

/**
 * Adds a signal analysis job to the queue.
 */
export const addAnalysisJob = async (signalId) => {
    if (isRedisDisabled) {
        logStructured("info", "queue_disabled_skip", { queue: "ai-analysis", signalId });
        return;
    }

    try {
        const queue = await getQueue("ai-analysis", {
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return;

        const job = await queue.add(
            "analyze",
            { signal_id: signalId },
            { jobId: `signal_${signalId}` }
        );

        if (job) {
            logStructured("info", "queue_job_enqueued", { queue: "ai-analysis", signalId, queueJobId: job.id });
        } else {
            logStructured("info", "queue_job_duplicate_skipped", { queue: "ai-analysis", signalId });
        }
    } catch (error) {
        logStructured("error", `[QUEUE] Failed to add job for signal ${signalId}:`, { error: error.message });
    }
};

/**
 * Schedules the recurring alert detection job.
 */
export const scheduleAlertDetection = async () => {
    if (isRedisDisabled) return;

    try {
        const queue = await getQueue("alert-detection", {
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 10000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return;

        await queue.add(
            "detect-alerts",
            {},
            {
                repeat: { pattern: "*/15 * * * *" },
                jobId: "recurring-alert-detection"
            }
        );
        logStructured("info", "queue_alert_detection_scheduled", { interval: "15min" });
    } catch (error) {
        logStructured("error", "[QUEUE] Failed to schedule alert detection:", { error: error.message });
    }
};

/**
 * Schedules recurring alert escalation automation.
 */
export const scheduleAlertEscalation = async () => {
    if (isRedisDisabled) return;

    try {
        const queue = await getQueue("alert-detection");
        if (!queue) return;

        await queue.add(
            "escalate-alerts",
            {},
            {
                repeat: { pattern: "*/10 * * * *" },
                jobId: "recurring-alert-escalation"
            }
        );
        logStructured("info", "queue_alert_escalation_scheduled", { interval: "10min" });
    } catch (error) {
        logStructured("error", "[QUEUE] Failed to schedule alert escalation:", { error: error.message });
    }
};

/**
 * Schedule periodic visibility scans (daily at 2:00 AM).
 */
export const scheduleVisibilityScans = async () => {
    if (isRedisDisabled) return;

    try {
        const queue = await getQueue("visibility-scan", {
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: "exponential", delay: 10000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return;

        await queue.add(
            "daily-visibility-scan",
            {},
            {
                repeat: { pattern: "0 2 * * *" },
                jobId: "recurring-visibility-scan",
            }
        );
        logStructured("info", "queue_visibility_scan_scheduled", { interval: "daily-2am" });
    } catch (error) {
        logStructured("error", "[QUEUE] Failed to schedule visibility scans:", { error: error.message });
    }
};

export const addIngestionJob = async (jobId, sourceId) => {
    if (isRedisDisabled) return;

    try {
        const queue = await getQueue("ingestion", {
            defaultJobOptions: {
                attempts: Number(process.env.INGESTION_MAX_RETRIES || 3),
                backoff: { type: "exponential", delay: Number(process.env.INGESTION_BACKOFF_MS || 5000) },
                timeout: Number(process.env.INGESTION_JOB_TIMEOUT_MS || 300000),
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return;

        const job = await queue.add("run-ingestion", { jobId, sourceId }, { jobId: `ingest_${jobId}` });
        logStructured("info", "queue_ingestion_enqueued", { queue: "ingestion", jobId });
    } catch (error) {
        logStructured("error", `[QUEUE] Failed to add ingestion job ${jobId}:`, { error: error.message });
    }
};

export const cancelIngestionQueueJob = async (ingestionJobId) => {
    if (isRedisDisabled) return { removed: false, reason: "workers_disabled" };

    try {
        const queue = await getQueue("ingestion");
        if (!queue) return { removed: false, reason: "no_queue" };

        const queueJobId = `ingest_${ingestionJobId}`;
        const job = await queue.getJob(queueJobId);
        if (!job) return { removed: false, reason: "job_not_found_in_queue" };

        const state = await job.getState();
        if (state === "active") return { removed: false, reason: "job_active_cannot_remove" };

        await job.remove();
        return { removed: true, reason: "job_removed_from_queue" };
    } catch (error) {
        logStructured("error", `[QUEUE] Failed to cancel ingestion job ${ingestionJobId}:`, { error: error.message });
        return { removed: false, reason: error.message };
    }
};

export const addNotificationJob = async (eventName, payload, options = {}) => {
    if (isRedisDisabled) return;

    try {
        const queue = await getQueue("notifications", {
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return;

        const dedupeKey = options.dedupeKey || `${eventName}_${payload?.workspaceId || "global"}_${payload?.targetId || payload?.alertId || "na"}`;
        const safeKey = String(dedupeKey).replace(/[^a-zA-Z0-9_-]/g, "_");

        const job = await queue.add(
            "dispatch-notification",
            { eventName, payload },
            { jobId: `notif_${safeKey}`, delay: options.delayMs || 0 }
        );

        if (job) {
            logStructured("info", "queue_notification_enqueued", { queue: "notification", eventName, queueJobId: job.id });
        }
    } catch (error) {
        logStructured("error", `[QUEUE] Failed to add notification job (${eventName}):`, { error: error.message });
    }
};

export const addVisibilityScanJob = async (workspaceId, scanConfig) => {
    if (isRedisDisabled) return null;

    try {
        const queue = await getQueue("visibility-scan", {
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: "exponential", delay: 10000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });

        if (!queue) return null;

        const job = await queue.add(
            "run-visibility-scan",
            { workspaceId, ...scanConfig },
            { jobId: `vis_${workspaceId}_${Date.now()}` }
        );
        logStructured("info", "queue_visibility_scan_enqueued", { workspaceId, jobId: job?.id });
        return job?.id || null;
    } catch (error) {
        logStructured("error", `[QUEUE] Failed to add visibility scan job:`, { error: error.message });
        return null;
    }
};

import { logStructured } from "./logger.js";

/**
 * Worker metrics tracker.
 * Tracks job counts, success rates, and durations for each worker type.
 */
class WorkerMetrics {
    constructor() {
        this.workers = new Map();
    }

    /**
     * Record a job completion.
     */
    recordJob(workerName, { success, durationMs, jobId, error }) {
        if (!this.workers.has(workerName)) {
            this.workers.set(workerName, {
                total: 0,
                success: 0,
                failed: 0,
                totalDurationMs: 0,
                lastJobAt: null,
            });
        }

        const stats = this.workers.get(workerName);
        stats.total++;
        if (success) stats.success++;
        else stats.failed++;
        stats.totalDurationMs += durationMs || 0;
        stats.lastJobAt = new Date().toISOString();

        // Log every 10 jobs for monitoring
        if (stats.total % 10 === 0) {
            this.logMetrics(workerName);
        }
    }

    /**
     * Get metrics for a specific worker.
     */
    getMetrics(workerName) {
        const stats = this.workers.get(workerName);
        if (!stats) return null;

        return {
            worker: workerName,
            totalJobs: stats.total,
            successJobs: stats.success,
            failedJobs: stats.failed,
            successRate: stats.total > 0 ? Number((stats.success / stats.total * 100).toFixed(1)) : 0,
            averageDurationMs: stats.total > 0 ? Math.round(stats.totalDurationMs / stats.total) : 0,
            lastJobAt: stats.lastJobAt,
        };
    }

    /**
     * Get all worker metrics.
     */
    getAllMetrics() {
        const metrics = {};
        for (const [name] of this.workers) {
            metrics[name] = this.getMetrics(name);
        }
        return metrics;
    }

    /**
     * Log metrics for a worker.
     */
    logMetrics(workerName) {
        const metrics = this.getMetrics(workerName);
        if (metrics) {
            logStructured("info", "worker_metrics", metrics);
        }
    }
}

export const workerMetrics = new WorkerMetrics();

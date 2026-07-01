import { Worker } from "bullmq";
import crypto from "crypto";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { runActorAndFetchDataset } from "../modules/apify/apify.service.js";
import { APIFY_ACTOR_PRESETS } from "../modules/ingestion/actor-presets.js";
import { buildDeterministicDocHash, normalizeDatasetItem, parseDateOrNull } from "../modules/ingestion/apify-normalizer.js";
import { addAnalysisJob } from "../lib/queue.js";
import { incrementIngestionFailure } from "../lib/metrics.js";
import { logStructured } from "../lib/logger.js";

class IngestionCancelledError extends Error {
    constructor(message) {
        super(message);
        this.name = "IngestionCancelledError";
    }
}

async function assertNotCancelled(ingestionJobId) {
    const row = await prisma.ingestionJob.findUnique({
        where: { id: ingestionJobId },
        select: { status: true, errorMessage: true }
    });
    if (row?.status === "cancelled") {
        throw new IngestionCancelledError(row.errorMessage || "Cancelled by user");
    }
}

function defaultActorConfigsForSource(source) {
    const keyword = source.name;
    const presetsByType = APIFY_ACTOR_PRESETS.filter((preset) => {
        if (source.type === "news") return preset.key === "indonesia-news" || preset.key === "google-search";
        if (source.type === "web") return preset.key === "google-search";
        if (source.type === "forum") return preset.key === "google-search";
        return preset.type === source.type && (preset.tier <= 2 || source.type === "podcast");
    });

    return presetsByType.map((preset) => ({
        actorTarget: preset.actorId,
        apifyInput: preset.buildInput(source.type === "forum" ? `${keyword} forum lokal kaskus` : keyword),
    }));
}

const ingestionWorker = new Worker(
    "ingestion",
    async (job) => {
        const { jobId, sourceId } = job.data;
        const maxAttempts = Number(job.opts?.attempts || 1);
        const attemptNumber = Number(job.attemptsMade || 0) + 1;
        logStructured("info", "ingestion_job_started", {
            queueJobId: job.id,
            ingestionJobId: jobId,
            sourceId,
            attemptNumber,
            maxAttempts,
        });

        try {
            await assertNotCancelled(jobId);
        } catch (error) {
            if (error instanceof IngestionCancelledError) {
                logStructured("warn", "ingestion_job_cancelled", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    sourceId,
                    attemptNumber,
                    reason: error.message,
                });
                return { processedCount: 0, cancelled: true };
            }
            throw error;
        }
        await prisma.ingestionJob.update({
            where: { id: jobId },
            data: { status: "running" },
        });

        const source = await prisma.source.findFirst({
            where: { id: sourceId, isActive: true, type: { not: "deleted" } },
        });

        if (!source) {
            throw new Error(`Source not found, inactive, or deleted: ${sourceId}`);
        }

        // Check for incremental ingestion — find last successful ingestion time
        let lastIngestionAt = null;
        try {
            const lastJob = await prisma.ingestionJob.findFirst({
                where: {
                    sourceId,
                    status: "completed",
                    id: { not: jobId },
                },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            });
            lastIngestionAt = lastJob?.createdAt || null;
        } catch {
            // Ignore — full ingestion if we can't determine last run
        }

        try {
            await assertNotCancelled(jobId);
            let actorConfigs = [];

            // Map Apify actors and specific configs based on source type chosen in frontend.
            if (source.actorId) {
                // If a specific actorId was provided, use just that one
                actorConfigs.push({
                    actorTarget: source.actorId,
                    apifyInput: { ...(source.inputConfig || {}) },
                });
            } else {
                actorConfigs = defaultActorConfigsForSource(source);
            }

            actorConfigs = actorConfigs.map((config) => {
                const input = { ...(config.apifyInput || {}), sourceType: source.type };

                // Incremental ingestion: modify input based on last ingestion time
                if (lastIngestionAt && config.apifyInput) {
                    const hoursSince = Math.floor((Date.now() - lastIngestionAt.getTime()) / (1000 * 60 * 60));
                    if (hoursSince > 0 && hoursSince <= 168) { // Within 7 days
                        // For Google News: set dateFilter to hours since last run
                        if (config.actorTarget === "futurizerush/google-news-scraper") {
                            input.dateFilter = `${Math.min(hoursSince, 168)}h`;
                        }
                        // For Google Search: reduce results since we already have old ones
                        if (config.actorTarget === "apify/google-search-scraper") {
                            input.resultsPerPage = Math.min(input.resultsPerPage || 10, 10);
                        }
                    }
                }

                return { ...config, apifyInput: input };
            });

            let allDatasets = [];

            for (const config of actorConfigs) {
                await assertNotCancelled(jobId);
                logStructured("info", "ingestion_actor_started", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    sourceId,
                    actorTarget: config.actorTarget,
                    attemptNumber,
                });
                try {
                    const dataset = await runActorAndFetchDataset(
                        config.actorTarget,
                        config.apifyInput,
                    );
                    if (dataset && dataset.length > 0) {
                        allDatasets = allDatasets.concat(dataset);
                    }
                } catch (err) {
                    logStructured("warn", "ingestion_actor_failed", {
                        queueJobId: job.id,
                        ingestionJobId: jobId,
                        sourceId,
                        actorTarget: config.actorTarget,
                        attemptNumber,
                        error: err.message || String(err),
                    });
                }
            }

            if (allDatasets.length === 0) {
                throw new Error("Ingestion returned no data from configured actors.");
            }

            let processedCount = 0;
            const flatItems = [];
            for (const item of allDatasets) {
                flatItems.push(...normalizeDatasetItem(item));
            }

            for (const item of flatItems) {
                await assertNotCancelled(jobId);
                const content = item.text || item.description || item.snippet || item.title || "";
                if (!content) continue;

                const deterministicDocHash = buildDeterministicDocHash({
                    workspaceId: source.workspaceId,
                    sourceId: source.id,
                    sourceType: source.type,
                    item,
                });
                const externalId = item.id
                    ? `ext_${String(item.id).trim()}`
                    : `hash_${deterministicDocHash}`;

                const existingDoc = await prisma.rawDocument.findFirst({
                    where: {
                        workspaceId: source.workspaceId,
                        sourceId: source.id,
                        externalId: externalId,
                    },
                });

                if (existingDoc) continue;

                const createdDoc = await prisma.rawDocument.create({
                    data: {
                        workspaceId: source.workspaceId,
                        sourceId: source.id,
                        externalId: externalId,
                        title: item.title || null,
                        content: content,
                        url: item.url || null,
                        author: item.author || null,
                        sourceName: source.name,
                        sourceType: source.type,
                        platform: item.platform || source.type || null,
                        publishedAt: parseDateOrNull(item.publishedDate),
                        metadata: {
                            ...item,
                            actorMetadata: item.actorMetadata || null,
                            language: item.language || null,
                            locationHint: item.actorMetadata?.locationHint || null,
                            dedupeHash: deterministicDocHash,
                        },
                    },
                });

                const dedupeHash = crypto
                    .createHash("sha256")
                    .update(`${source.workspaceId}:${source.id}:${externalId}`)
                    .digest("hex");

                const existingSignal = await prisma.signal.findFirst({
                    where: {
                        workspaceId: source.workspaceId,
                        dedupeHash,
                    },
                    select: { id: true },
                });
                if (existingSignal) {
                    continue;
                }

                const createdSignal = await prisma.signal.create({
                    data: {
                        workspaceId: createdDoc.workspaceId,
                        rawDocumentId: createdDoc.id,
                        title: createdDoc.title,
                        content: createdDoc.content,
                        sourceName: createdDoc.sourceName,
                        sourceType: createdDoc.sourceType,
                        platform: createdDoc.platform || createdDoc.sourceType || source.type || null,
                        url: createdDoc.url,
                        publishedAt: createdDoc.publishedAt,
                        region: item.region || null,
                        language: item.language || null,
                        dedupeHash: dedupeHash,
                        sentiment: "neutral",
                    },
                });

                await addAnalysisJob(createdSignal.id);
                processedCount++;
            }

            await prisma.ingestionJob.update({
                where: { id: jobId },
                data: { status: "completed", errorMessage: null, finishedAt: new Date() },
            });

            logStructured("info", "ingestion_job_completed", {
                queueJobId: job.id,
                ingestionJobId: jobId,
                sourceId,
                attemptNumber,
                maxAttempts,
                processedCount,
            });

            return { processedCount };

        } catch (backgroundError) {
            if (backgroundError instanceof IngestionCancelledError) {
                logStructured("warn", "ingestion_job_cancelled", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    sourceId,
                    attemptNumber,
                    reason: backgroundError.message,
                });
                return { processedCount: 0, cancelled: true };
            }

            const willRetry = attemptNumber < maxAttempts;
            logStructured(willRetry ? "warn" : "error", "ingestion_job_failed", {
                queueJobId: job.id,
                ingestionJobId: jobId,
                sourceId,
                attemptNumber,
                maxAttempts,
                willRetry,
                error: backgroundError.message || String(backgroundError),
            });

            await prisma.ingestionJob.update({
                where: { id: jobId },
                data: willRetry
                    ? {
                        status: "queued",
                        errorMessage: backgroundError.message || "Ingestion retry scheduled",
                    }
                    : {
                        status: "failed",
                        errorMessage: backgroundError.message,
                        finishedAt: new Date(),
                    },
            });
            throw backgroundError;
        }
    },
    { connection }
);

ingestionWorker.on("completed", (job, returnvalue) => {
    logStructured("info", "ingestion_worker_completed_event", {
        queueJobId: job.id,
        processedCount: returnvalue?.processedCount || 0,
    });
});

ingestionWorker.on("failed", async (job, err) => {
    incrementIngestionFailure();
    logStructured("error", "ingestion_worker_failed_event", {
        queueJobId: job?.id,
        ingestionJobId: job?.data?.jobId,
        attemptsMade: job?.attemptsMade,
        error: err.message,
    });

    try {
        const ingestionJobId = job?.data?.jobId;
        if (!ingestionJobId) return;

        const existing = await prisma.ingestionJob.findUnique({
            where: { id: ingestionJobId },
            select: { status: true }
        });
        if (!existing || existing.status === "cancelled" || existing.status === "completed") return;

        const normalizedReason = String(err?.message || "Ingestion failed");
        const timeoutReason = normalizedReason.toLowerCase().includes("timed out")
            ? `Timed out: ${normalizedReason}`
            : normalizedReason;

        await prisma.ingestionJob.update({
            where: { id: ingestionJobId },
            data: {
                status: "failed",
                errorMessage: timeoutReason,
                finishedAt: new Date(),
            }
        });
    } catch (persistError) {
        logStructured("error", "ingestion_failure_persist_error", {
            queueJobId: job?.id,
            ingestionJobId: job?.data?.jobId,
            error: persistError.message,
        });
    }
});

export default ingestionWorker;

import { Worker } from "bullmq";
import crypto from "crypto";
import connection from "../lib/redis.js";
import supabase from "../lib/supabase.js";
import { runActorAndFetchDataset } from "../modules/apify/apify.service.js";
import { APIFY_ACTOR_PRESETS } from "../modules/ingestion/actor-presets.js";
import { buildDeterministicDocHash, normalizeDatasetItem, parseDateOrNull } from "../modules/ingestion/apify-normalizer.js";
import { addAnalysisJob } from "../lib/queue.js";
import { incrementIngestionFailure } from "../lib/metrics.js";
import { logStructured } from "../lib/logger.js";
import { canSyncSource } from "../lib/source-cost-controls.js";
import { checkAutoThrottle } from "../lib/cost-management.js";
import { SOURCE_LIMITS } from "../lib/source-cost-controls.js";

class IngestionCancelledError extends Error {
    constructor(message) {
        super(message);
        this.name = "IngestionCancelledError";
    }
}

async function assertNotCancelled(ingestionJobId) {
    const { data: row, error } = await supabase
        .from("ingestion_jobs")
        .select("status, error_message")
        .eq("id", ingestionJobId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to check ingestion job status: ${error.message}`);
    }

    if (row?.status === "cancelled") {
        throw new IngestionCancelledError(row.error_message || "Cancelled by user");
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
            // Check if source can be synced (frequency check)
            const syncCheck = await canSyncSource(sourceId);
            if (!syncCheck.allowed) {
                logStructured("warn", "ingestion_skipped_rate_limit", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    sourceId,
                    reason: syncCheck.reason,
                });

                // Mark job as cancelled/skipped due to rate limit
                await supabase
                    .from("ingestion_jobs")
                    .update({
                        status: "cancelled",
                        error_message: `Rate limited: ${syncCheck.reason}`,
                        finished_at: new Date().toISOString(),
                    })
                    .eq("id", jobId);

                return { processedCount: 0, skipped: true, reason: syncCheck.reason };
            }
        } catch (error) {
            // Continue if frequency check fails (best effort)
            logStructured("warn", "ingestion_frequency_check_failed", {
                queueJobId: job.id,
                ingestionJobId: jobId,
                sourceId,
                error: error.message,
            });
        }

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

        const { error: updateError } = await supabase
            .from("ingestion_jobs")
            .update({ status: "running" })
            .eq("id", jobId);

        if (updateError) {
            throw new Error(`Failed to update ingestion job status: ${updateError.message}`);
        }

        const { data: source, error: sourceError } = await supabase
            .from("sources")
            .select("*")
            .eq("id", sourceId)
            .eq("is_active", true)
            .neq("type", "deleted")
            .maybeSingle();

        if (sourceError) {
            throw new Error(`Failed to fetch source: ${sourceError.message}`);
        }

        if (!source) {
            throw new Error(`Source not found, inactive, or deleted: ${sourceId}`);
        }

        // Check for incremental ingestion — find last successful ingestion time
        let lastIngestionAt = null;
        try {
            const { data: lastJob } = await supabase
                .from("ingestion_jobs")
                .select("created_at")
                .eq("source_id", sourceId)
                .eq("status", "completed")
                .neq("id", jobId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            lastIngestionAt = lastJob?.created_at ? new Date(lastJob.created_at) : null;
        } catch {
            // Ignore — full ingestion if we can't determine last run
        }

        try {
            await assertNotCancelled(jobId);
            let actorConfigs = [];

            // Map Apify actors and specific configs based on source type chosen in frontend.
            if (source.actor_id) {
                // If a specific actorId was provided, use just that one
                actorConfigs.push({
                    actorTarget: source.actor_id,
                    apifyInput: { ...(source.input_config || {}) },
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

                // Apply max results limit from source config
                const sourceConfig = SOURCE_LIMITS[source.type] || SOURCE_LIMITS.social;
                const maxResults = source.max_results || sourceConfig.maxResults;

                try {
                    const dataset = await runActorAndFetchDataset(
                        config.actorTarget,
                        config.apifyInput,
                        maxResults, // Pass max results limit
                    );
                    if (dataset && dataset.length > 0) {
                        // Limit dataset to maxResults
                        const limitedDataset = dataset.slice(0, maxResults);
                        allDatasets = allDatasets.concat(limitedDataset);
                        logStructured("info", "ingestion_actor_data_limited", {
                            sourceId,
                            actorTarget: config.actorTarget,
                            totalReceived: dataset.length,
                            limitedTo: limitedDataset.length,
                            maxResults,
                        });
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
                    workspaceId: source.workspace_id,
                    sourceId: source.id,
                    sourceType: source.type,
                    item,
                });
                const externalId = item.id
                    ? `ext_${String(item.id).trim()}`
                    : `hash_${deterministicDocHash}`;

                const { data: existingDoc } = await supabase
                    .from("raw_documents")
                    .select("id")
                    .eq("workspace_id", source.workspace_id)
                    .eq("source_id", source.id)
                    .eq("external_id", externalId)
                    .maybeSingle();

                if (existingDoc) continue;

                const { data: createdDoc, error: docError } = await supabase
                    .from("raw_documents")
                    .insert({
                        workspace_id: source.workspace_id,
                        source_id: source.id,
                        external_id: externalId,
                        title: item.title || null,
                        content: content,
                        url: item.url || null,
                        author: item.author || null,
                        source_name: source.name,
                        source_type: source.type,
                        platform: item.platform || source.type || null,
                        published_at: parseDateOrNull(item.publishedDate),
                        metadata: {
                            ...item,
                            actorMetadata: item.actorMetadata || null,
                            language: item.language || null,
                            locationHint: item.actorMetadata?.locationHint || null,
                            dedupeHash: deterministicDocHash,
                        },
                    })
                    .select()
                    .single();

                if (docError) {
                    logStructured("error", "raw_document_create_failed", {
                        queueJobId: job.id,
                        ingestionJobId: jobId,
                        sourceId,
                        externalId,
                        error: docError.message,
                    });
                    continue;
                }

                const dedupeHash = crypto
                    .createHash("sha256")
                    .update(`${source.workspace_id}:${source.id}:${externalId}`)
                    .digest("hex");

                const { data: existingSignal } = await supabase
                    .from("signals")
                    .select("id")
                    .eq("workspace_id", source.workspace_id)
                    .eq("dedupe_hash", dedupeHash)
                    .maybeSingle();

                if (existingSignal) {
                    continue;
                }

                const { data: createdSignal, error: signalError } = await supabase
                    .from("signals")
                    .insert({
                        workspace_id: createdDoc.workspace_id,
                        raw_document_id: createdDoc.id,
                        title: createdDoc.title,
                        content: createdDoc.content,
                        source_name: createdDoc.source_name,
                        source_type: createdDoc.source_type,
                        platform: createdDoc.platform || createdDoc.source_type || source.type || null,
                        url: createdDoc.url,
                        published_at: createdDoc.published_at,
                        region: item.region || null,
                        language: item.language || null,
                        dedupe_hash: dedupeHash,
                        sentiment: "neutral",
                    })
                    .select()
                    .single();

                if (signalError) {
                    logStructured("error", "signal_create_failed", {
                        queueJobId: job.id,
                        ingestionJobId: jobId,
                        sourceId,
                        externalId,
                        error: signalError.message,
                    });
                    continue;
                }

                await addAnalysisJob(createdSignal.id);
                processedCount++;
            }

            const { error: completionError } = await supabase
                .from("ingestion_jobs")
                .update({ status: "completed", error_message: null, finished_at: new Date().toISOString() })
                .eq("id", jobId);

            if (completionError) {
                logStructured("warn", "ingestion_completion_update_failed", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    error: completionError.message,
                });
            }

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

            const { error: failureUpdateError } = await supabase
                .from("ingestion_jobs")
                .update(willRetry
                    ? {
                        status: "queued",
                        error_message: backgroundError.message || "Ingestion retry scheduled",
                    }
                    : {
                        status: "failed",
                        error_message: backgroundError.message,
                        finished_at: new Date().toISOString(),
                    })
                .eq("id", jobId);

            if (failureUpdateError) {
                logStructured("error", "ingestion_failure_update_failed", {
                    queueJobId: job.id,
                    ingestionJobId: jobId,
                    error: failureUpdateError.message,
                });
            }

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

        const { data: existing } = await supabase
            .from("ingestion_jobs")
            .select("status")
            .eq("id", ingestionJobId)
            .maybeSingle();

        if (!existing || existing.status === "cancelled" || existing.status === "completed") return;

        const normalizedReason = String(err?.message || "Ingestion failed");
        const timeoutReason = normalizedReason.toLowerCase().includes("timed out")
            ? `Timed out: ${normalizedReason}`
            : normalizedReason;

        const { error: persistError } = await supabase
            .from("ingestion_jobs")
            .update({
                status: "failed",
                error_message: timeoutReason,
                finished_at: new Date().toISOString(),
            })
            .eq("id", ingestionJobId);

        if (persistError) {
            logStructured("error", "ingestion_failure_persist_error", {
                queueJobId: job?.id,
                ingestionJobId: job?.data?.jobId,
                error: persistError.message,
            });
        }
    } catch (persistError) {
        logStructured("error", "ingestion_failure_persist_error", {
            queueJobId: job?.id,
            ingestionJobId: job?.data?.jobId,
            error: persistError.message,
        });
    }
});

export default ingestionWorker;

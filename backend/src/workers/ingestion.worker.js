import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { runActorAndFetchDataset } from "../modules/apify/apify.service.js";
import { addAnalysisJob } from "../lib/queue.js";

function logStructured(level, event, payload = {}) {
    const entry = {
        level,
        event,
        worker: "ingestion-worker",
        timestamp: new Date().toISOString(),
        ...payload,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
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

        await prisma.ingestionJob.update({
            where: { id: jobId },
            data: { status: "running" },
        });

        const source = await prisma.source.findUnique({
            where: { id: sourceId },
        });

        if (!source) {
            throw new Error(`Source not found: ${sourceId}`);
        }

        try {
            let actorConfigs = [];

            // Map multiple actors and specific configs based on source type chosen in frontend
            if (source.actorId) {
                // If a specific actorId was provided, use just that one
                actorConfigs.push({
                    actorTarget: source.actorId,
                    apifyInput: { ...(source.inputConfig || {}) },
                });
            } else {
                switch (source.type) {
                    case "social":
                        actorConfigs = [
                            {
                                actorTarget: "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                                apifyInput: {
                                    search_inputs: [`#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`],
                                    max_posts: 3,
                                    platform: "INSTAGRAM",
                                },
                            },
                            {
                                actorTarget: "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                                apifyInput: {
                                    search_inputs: [`#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`],
                                    max_posts: 3,
                                    platform: "TIKTOK",
                                },
                            },
                            {
                                actorTarget: "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                                apifyInput: {
                                    search_inputs: [`#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`],
                                    max_posts: 3,
                                    platform: "TWITTER",
                                },
                            },
                            {
                                actorTarget: "watcher.data/search-threads-by-keywords",
                                apifyInput: {
                                    keywords: [
                                        `${source.name}`,
                                        `${source.name} trending`,
                                        `${source.name} update`,
                                        `${source.name} news`,
                                    ],
                                    maxItemsPerKeyword: 3,
                                    proxyConfiguration: { useApifyProxy: false },
                                    sortByRecent: true,
                                },
                            },
                        ];
                        break;
                    case "news":
                        actorConfigs = [
                            {
                                actorTarget: "futurizerush/google-news-scraper",
                                apifyInput: {
                                    dateFilter: "1d",
                                    language: "id",
                                    maxResults: 10,
                                    region: "id",
                                    searchQueries: `${source.name} trending`,
                                },
                            },
                            {
                                actorTarget: "apify/google-search-scraper",
                                apifyInput: {
                                    queries: `${source.name} trending`,
                                    maxPagesPerQuery: 1,
                                    resultsPerPage: 10,
                                },
                            },
                        ];
                        break;
                    case "forum":
                        actorConfigs = [
                            {
                                actorTarget: "crawlerbros/reddit-keywords-pro",
                                apifyInput: {
                                    excludeNsfw: false,
                                    keywordRequireAll: false,
                                    keywords: [
                                        `${source.name}`,
                                        `${source.name} trending`,
                                        `${source.name} update`,
                                        `${source.name} news`,
                                    ],
                                    resultLimit: 3,
                                },
                            },
                            {
                                actorTarget: "crawlerbros/quora-search-scraper",
                                apifyInput: {
                                    maxResults: 3,
                                    proxyConfiguration: {
                                        useApifyProxy: true,
                                        apifyProxyGroups: ["RESIDENTIAL"],
                                    },
                                    searchQueries: [
                                        `${source.name}`,
                                        `${source.name} trending`,
                                        `${source.name} update`,
                                        `${source.name} news`,
                                    ],
                                },
                            },
                            {
                                actorTarget: "apify/google-search-scraper",
                                apifyInput: {
                                    queries: `${source.name} forum discussions`,
                                    maxPagesPerQuery: 1,
                                    resultsPerPage: 2,
                                },
                            },
                        ];
                        break;
                    case "web":
                    default:
                        actorConfigs = [
                            {
                                actorTarget: "apify/google-search-scraper",
                                apifyInput: {
                                    queries: `${source.name} trending`,
                                    maxPagesPerQuery: 1,
                                    resultsPerPage: 20,
                                },
                            },
                        ];
                        break;
                }
            }

            actorConfigs = actorConfigs.map((config) => ({
                ...config,
                apifyInput: { ...(config.apifyInput || {}), sourceType: source.type },
            }));

            let allDatasets = [];

            for (const config of actorConfigs) {
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
                if (Array.isArray(item.organicResults) && item.organicResults.length > 0) {
                    for (const result of item.organicResults) {
                        flatItems.push({
                            title: result.title,
                            url: result.url,
                            text: result.description || result.snippet || result.title,
                            description: result.description,
                            author: null,
                            publishedDate: null,
                            _searchQuery: item.searchQuery?.query || "",
                        });
                    }
                } else {
                    flatItems.push(item);
                }
            }

            for (const item of flatItems) {
                const content = item.text || item.description || item.snippet || item.title || "";
                if (!content) continue;

                const externalId = item.id || item.url || (item.text ? item.text.substring(0, 20) : "") + Date.now().toString();

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
                        publishedAt: item.publishedDate ? new Date(item.publishedDate) : null,
                        metadata: item,
                    },
                });

                const dedupeHash = Buffer.from(`${source.id}-${externalId}`).toString("base64");
                const createdSignal = await prisma.signal.create({
                    data: {
                        workspaceId: createdDoc.workspaceId,
                        rawDocumentId: createdDoc.id,
                        title: createdDoc.title,
                        content: createdDoc.content,
                        sourceName: createdDoc.sourceName,
                        sourceType: createdDoc.sourceType,
                        platform: createdDoc.sourceType || source.type || null,
                        url: createdDoc.url,
                        publishedAt: createdDoc.publishedAt,
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

ingestionWorker.on("failed", (job, err) => {
    logStructured("error", "ingestion_worker_failed_event", {
        queueJobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err.message,
    });
});

export default ingestionWorker;

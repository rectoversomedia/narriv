import prisma from "../../prisma.js";
import { runActorAndFetchDataset } from "../apify/apify.service.js";
import { addAnalysisJob } from "../../lib/queue.js";

export const triggerIngestion = async (req, res) => {
  try {
    const { sourceId } = req.params;

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }

    // 1. Create IngestionJob
    const job = await prisma.ingestionJob.create({
      data: {
        workspaceId: source.workspaceId,
        sourceId: source.id,
        status: "RUNNING",
      },
    });

    // Respond immediately, processing continues in background
    res.status(202).json({ message: "Ingestion started", jobId: job.id });

    // --- BACKGROUND PROCESSING ---
    (async () => {
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
                  // TODO: Fill with Apify Actor ID for Instagram/Facebook
                  actorTarget:
                    "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                  apifyInput: {
                    search_inputs: [
                      `#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`,
                    ],
                    max_posts: 3,
                    platform: "INSTAGRAM",
                  },
                },
                {
                  // TODO: Fill with Apify Actor ID for Instagram/Facebook
                  actorTarget:
                    "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                  apifyInput: {
                    search_inputs: [
                      `#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`,
                    ],
                    max_posts: 3,
                    platform: "TIKTOK",
                  },
                },
                {
                  // TODO: Fill with Apify Actor ID for Instagram/Facebook
                  actorTarget:
                    "caprolok/all-social-media-posts-extractor-by-hashtag-and-username",
                  apifyInput: {
                    search_inputs: [
                      `#${source.name.trim().toLowerCase().replace(/\s+/g, "")}`,
                    ],
                    max_posts: 3,
                    platform: "TWITTER",
                  },
                },
                {
                  // TODO: Fill with Apify Actor ID for Twitter/X
                  actorTarget: "watcher.data/search-threads-by-keywords",
                  apifyInput: {
                    /* e.g., searchTerms: [source.name] */
                    keywords: [
                      `${source.name}`,
                      `${source.name} trending`,
                      `${source.name} update`,
                      `${source.name} news`,
                    ],
                    maxItemsPerKeyword: 3,
                    proxyConfiguration: {
                      useApifyProxy: false,
                    },
                    sortByRecent: true,
                  },
                },
              ];
              break;
            case "news":
              actorConfigs = [
                {
                  // TODO: Fill with Apify Actor ID for News Source 1
                  actorTarget: "futurizerush/google-news-scraper",
                  apifyInput: {
                    /* e.g., keywords: [source.name] */
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
                  // TODO: Fill with Apify Actor ID for Reddit
                  actorTarget: "crawlerbros/reddit-keywords-pro",
                  apifyInput: {
                    /* e.g., search: source.name */
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
                  // TODO: Fill with Apify Actor ID for Quora/Other
                  actorTarget: "crawlerbros/quora-search-scraper",
                  apifyInput: {
                    /* e.g., query: source.name */
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
              // Fallback to a general web search scraper
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

        // Append sourceType to all inputs and ensure apifyInput is defined
        actorConfigs = actorConfigs.map((config) => ({
          ...config,
          apifyInput: { ...(config.apifyInput || {}), sourceType: source.type },
        }));

        let allDatasets = [];

        // 2. Call Apify Service for each actor configured
        for (const config of actorConfigs) {
          console.log(`[INGESTION] Starting actor: ${config.actorTarget}`);
          console.log(`[INGESTION] Input:`, JSON.stringify(config.apifyInput));

          try {
            const dataset = await runActorAndFetchDataset(
              config.actorTarget,
              config.apifyInput,
            );
            if (dataset && dataset.length > 0) {
              console.log(
                `[INGESTION] Dataset items received from ${config.actorTarget}: ${dataset.length}`,
              );
              allDatasets = allDatasets.concat(dataset);
            } else {
              console.log(
                `[INGESTION] No items received from ${config.actorTarget}`,
              );
            }
          } catch (err) {
            console.error(
              `[INGESTION] Error running actor ${config.actorTarget}:`,
              err.message || err,
            );
            // Continue to next actor even if this one fails
          }
        }

        if (allDatasets.length === 0) {
          await prisma.ingestionJob.update({
            where: { id: job.id },
            data: { status: "COMPLETED", finishedAt: new Date() },
          });
          return;
        }

        // 3. Normalization: Flatten dataset into individual items
        //    google-search-scraper returns { organicResults: [...] } per query
        //    We need to flatten into individual results
        let processedCount = 0;
        const flatItems = [];
        for (const item of allDatasets) {
          if (
            Array.isArray(item.organicResults) &&
            item.organicResults.length > 0
          ) {
            // Flatten organic results and attach query context
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
            // Fallback: treat item directly (mock mode or other actors)
            flatItems.push(item);
          }
        }

        console.log(`[INGESTION] Flat items to process: ${flatItems.length}`);

        for (const item of flatItems) {
          const content =
            item.text || item.description || item.snippet || item.title || "";
          if (!content) {
            console.log(
              `[INGESTION] Skipping item with no content:`,
              JSON.stringify(item).substring(0, 100),
            );
            continue;
          }

          // Use item.id, item.url, or content hash as external ID
          const externalId =
            item.id ||
            item.url ||
            (item.text ? item.text.substring(0, 20) : "") +
              Date.now().toString();

          // Check if already exists in RawDocument for this source
          const existingDoc = await prisma.rawDocument.findFirst({
            where: {
              sourceId: source.id,
              externalId: externalId,
            },
          });

          if (existingDoc) {
            continue; // Skip duplicates
          }

          // Insert new RawDocument
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
              publishedAt: item.publishedDate
                ? new Date(item.publishedDate)
                : null,
              metadata: item,
            },
          });

          // Also set dedupeHash for Signal
          const dedupeHash = Buffer.from(`${source.id}-${externalId}`).toString(
            "base64",
          );
          console.log(
            `[INGESTION] Saving signal #${processedCount + 1}: ${createdDoc.title}`,
          );
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

          // Queue for AI Analysis
          await addAnalysisJob(createdSignal.id);

          processedCount++;
        }

        // 4. Mark Job as Completed
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", finishedAt: new Date() },
        });
      } catch (backgroundError) {
        console.error("[INGESTION] Background error:", backgroundError);
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage: backgroundError.message,
            finishedAt: new Date(),
          },
        });
      }
    })();
  } catch (error) {
    console.error("Error triggering ingestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getIngestionStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await prisma.ingestionJob.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.json({ status: job.status, errorMessage: job.errorMessage });
    } catch (error) {
        console.error("Error fetching job status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

import prisma from "../../prisma.js";
import { runActorAndFetchDataset } from "../apify/apify.service.js";

export const triggerIngestion = async (req, res) => {
    try {
        const { sourceId } = req.params;

        const source = await prisma.source.findUnique({
            where: { id: sourceId }
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
            }
        });

        // Respond immediately, processing continues in background
        res.status(202).json({ message: "Ingestion started", jobId: job.id });

        // --- BACKGROUND PROCESSING ---
        (async () => {
             try {
                 // Determine Default Actor if none provided (e.g. for Web/News)
                 // In real MVP we might map Type -> Actor. For now fallback to a mock ID
                 const actorTarget = source.actorId || "apify/google-search-scraper";
                 
                 // Map config for Apify. Default to searching the source's name if empty
                 const apifyInput = {
                     queries: `${source.name} news trending`,
                     maxPagesPerQuery: 1,
                     resultsPerPage: 5,
                     ...(source.inputConfig || {})
                 };

                 console.log(`[INGESTION] Starting actor: ${actorTarget}`);
                 console.log(`[INGESTION] Input:`, JSON.stringify(apifyInput));

                 // 2. Call Apify Service
                 const dataset = await runActorAndFetchDataset(actorTarget, apifyInput);
                 console.log(`[INGESTION] Dataset items received: ${dataset?.length ?? 0}`);

                 if (!dataset || dataset.length === 0) {
                     await prisma.ingestionJob.update({
                         where: { id: job.id },
                         data: { status: "COMPLETED", finishedAt: new Date() }
                     });
                     return;
                 }

                 // 3. Normalization: Flatten dataset into individual items
                 //    google-search-scraper returns { organicResults: [...] } per query
                 //    We need to flatten into individual results
                 let processedCount = 0;
                 const flatItems = [];
                 for (const item of dataset) {
                     if (Array.isArray(item.organicResults) && item.organicResults.length > 0) {
                         // Flatten organic results and attach query context
                         for (const result of item.organicResults) {
                             flatItems.push({
                                 title: result.title,
                                 url: result.url,
                                 text: result.description || result.snippet || result.title,
                                 description: result.description,
                                 author: null,
                                 publishedDate: null,
                                 _searchQuery: item.searchQuery?.query || ""
                             });
                         }
                     } else {
                         // Fallback: treat item directly (mock mode or other actors)
                         flatItems.push(item);
                     }
                 }

                 console.log(`[INGESTION] Flat items to process: ${flatItems.length}`);

                 for (const item of flatItems) {
                      const content = item.text || item.description || item.snippet || item.title || "";
                      if (!content) {
                          console.log(`[INGESTION] Skipping item with no content:`, JSON.stringify(item).substring(0, 100));
                          continue;
                      }

                      // Use item.id, item.url, or content hash as external ID
                      const externalId = item.id || item.url || ((item.text ? item.text.substring(0,20) : "") + Date.now().toString());

                      // Check if already exists in RawDocument for this source
                      const existingDoc = await prisma.rawDocument.findFirst({
                          where: {
                              sourceId: source.id,
                              externalId: externalId
                          }
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
                               publishedAt: item.publishedDate ? new Date(item.publishedDate) : null,
                               metadata: item
                           }
                      });
                      
                      // Also set dedupeHash for Signal
                      const dedupeHash = Buffer.from(`${source.id}-${externalId}`).toString('base64');
                      console.log(`[INGESTION] Saving signal #${processedCount + 1}: ${createdDoc.title}`);
                      await prisma.signal.create({
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
                              sentiment: "neutral" 
                          }
                      });
                      
                      processedCount++;
                 }

                 // 4. Mark Job as Completed
                 await prisma.ingestionJob.update({
                    where: { id: job.id },
                    data: { status: "COMPLETED", finishedAt: new Date() }
                });

             } catch (backgroundError) {
                 console.error("[INGESTION] Background error:", backgroundError);
                 await prisma.ingestionJob.update({
                     where: { id: job.id },
                     data: { 
                         status: "FAILED", 
                         errorMessage: backgroundError.message,
                         finishedAt: new Date() 
                    }
                 });
             }
        })();

    } catch (error) {
        console.error("Error triggering ingestion:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

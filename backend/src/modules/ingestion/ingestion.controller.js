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

                 // 2. Call Apify Service
                 const dataset = await runActorAndFetchDataset(actorTarget, source.inputConfig);

                 if (!dataset || dataset.length === 0) {
                     await prisma.ingestionJob.update({
                         where: { id: job.id },
                         data: { status: "COMPLETED", finishedAt: new Date() }
                     });
                     return;
                 }

                 // 3. Normalization: Save to RawDocuments & Signals
                 let rawDocsToInsert = [];
                 let signalsToInsert = [];

                 for (const item of dataset) {
                      const content = item.text || item.description || item.snippet || item.title || "";
                      if (!content) continue;

                      // For simplicity, we create relations manually, or we can use nested creates.
                      const externalId = item.id || item.url || Date.now().toString();

                      const rawDoc = {
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
                      };
                      rawDocsToInsert.push(rawDoc);
                 }

                 // Create RawDocuments
                 const createdDocs = await prisma.$transaction(
                     rawDocsToInsert.map(doc => prisma.rawDocument.create({ data: doc }))
                 );

                 // Create Signals from RawDocuments
                 for (const doc of createdDocs) {
                     signalsToInsert.push({
                         workspaceId: doc.workspaceId,
                         rawDocumentId: doc.id,
                         title: doc.title,
                         content: doc.content,
                         sourceName: doc.sourceName,
                         sourceType: doc.sourceType,
                         url: doc.url,
                         publishedAt: doc.publishedAt,
                         // Default baseline sentiment before AI analysis
                         sentiment: "neutral" 
                     });
                 }

                 await prisma.signal.createMany({ data: signalsToInsert });

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

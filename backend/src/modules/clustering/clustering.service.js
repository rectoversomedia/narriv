import prisma from "../../prisma.js";
import { analyzeCluster } from "../ai/ai.service.js";

// Helper to extract basic keywords (lowercase, basic stop words removed)
function extractKeywords(text) {
    if (!text) return new Set();
    const stopWords = new Set(["the", "and", "a", "an", "is", "in", "to", "of", "for", "on", "with", "as", "at", "by", "this", "that", "it", "are", "was", "were", "be", "been", "from", "has", "have", "had", "will", "would", "can", "could", "about"]);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    return new Set(words.filter(w => w.length > 3 && !stopWords.has(w)));
}

// Helper to calculate Jaccard Similarity between two sets
function calculateSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

export const runClustering = async (workspaceId) => {
    console.log(`[CLUSTERING] Starting clustering for workspace: ${workspaceId}`);
    
    // 1. Fetch unclustered signals (or all recent signals)
    // For simplicity, let's fetch all signals in the last 7 days for the workspace
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const signals = await prisma.signal.findMany({
        where: {
            workspaceId,
            capturedAt: { gte: sevenDaysAgo }
        },
        include: {
            narrativeClusterSignals: true,
            analyses: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    // Filter out signals that are already fully clustered (optional, but let's re-cluster or only use unclustered)
    const unclusteredSignals = signals.filter(s => s.narrativeClusterSignals.length === 0);

    if (unclusteredSignals.length === 0) {
        console.log(`[CLUSTERING] No unclustered signals to process.`);
        return { message: "No signals to cluster", clustersCreated: 0 };
    }

    // 2. Prepare data for clustering
    const signalData = unclusteredSignals.map(s => {
        const textToAnalyze = `${s.title || ""} ${s.content || ""}`;
        return {
            ...s,
            keywords: extractKeywords(textToAnalyze),
            sentiment: s.analyses[0]?.sentiment || s.sentiment || "neutral"
        };
    });

    // 3. Cluster signals based on keyword similarity
    const clusters = []; // Array of arrays of signals
    const threshold = 0.15; // Jaccard similarity threshold
    const clusteredIds = new Set();

    for (let i = 0; i < signalData.length; i++) {
        if (clusteredIds.has(signalData[i].id)) continue;

        const currentCluster = [signalData[i]];
        clusteredIds.add(signalData[i].id);

        for (let j = i + 1; j < signalData.length; j++) {
            if (clusteredIds.has(signalData[j].id)) continue;
            
            const similarity = calculateSimilarity(signalData[i].keywords, signalData[j].keywords);
            
            if (similarity >= threshold) {
                currentCluster.push(signalData[j]);
                clusteredIds.add(signalData[j].id);
            }
        }

        // Only keep clusters with at least 2 signals to avoid single-signal "clusters"
        if (currentCluster.length > 1) {
            clusters.push(currentCluster);
        }
    }

    console.log(`[CLUSTERING] Found ${clusters.length} potential narrative clusters.`);

    // 4. Save narrative groups to database
    let createdCount = 0;
    for (const cluster of clusters) {
        // Compile signals context for AI
        const signalsContext = cluster
            .slice(0, 10) // Limit to top 10 to fit in context window
            .map(s => `[${s.sentiment || 'UNKNOWN'}] ${s.title || 'No Title'}\n${s.content.substring(0, 150)}...`)
            .join("\n\n");

        console.log(`[CLUSTERING] Asking AI to analyze cluster of ${cluster.length} signals...`);
        const aiAnalysis = await analyzeCluster(signalsContext);

        let title = "General Narrative Cluster";
        let description = `Automatically generated cluster containing ${cluster.length} signals.`;
        let mainNarrative = "This narrative was clustered by keyword similarity but AI analysis failed.";
        let dominantSentiment = "neutral";
        let impact = "LOW";

        if (aiAnalysis) {
            title = aiAnalysis.title || title;
            description = aiAnalysis.description || description;
            mainNarrative = aiAnalysis.description || mainNarrative;
            dominantSentiment = aiAnalysis.dominant_sentiment || dominantSentiment;
            
            // Map AI string directly to uppercase enum values if valid
            const safeImpact = aiAnalysis.impact ? aiAnalysis.impact.toUpperCase() : "LOW";
            if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(safeImpact)) {
                impact = safeImpact;
            }
        }

        // Create the NarrativeCluster in the DB
        const dbCluster = await prisma.narrativeCluster.create({
            data: {
                workspaceId,
                title: title,
                description: description,
                mainNarrative: mainNarrative,
                sentiment: dominantSentiment,
                impact: impact,
                signalCount: cluster.length
            }
        });

        // Link the signals to the cluster
        const signalLinks = cluster.map(s => ({
            narrativeClusterId: dbCluster.id,
            signalId: s.id
        }));

        await prisma.narrativeClusterSignal.createMany({
            data: signalLinks,
            skipDuplicates: true
        });
        
        createdCount++;
    }

    console.log(`[CLUSTERING] Successfully created ${createdCount} narrative groups.`);
    return { 
        message: "Clustering complete", 
        clustersFound: clusters.length, 
        clustersCreated: createdCount 
    };
};

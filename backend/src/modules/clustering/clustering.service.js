import prisma from "../../prisma.js";
import { analyzeCluster } from "../ai/ai.service.js";
import { logStructured } from "../../lib/logger.js";

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
    logStructured("info", "clustering_started", { workspaceId });
    
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
        logStructured("info", "clustering_no_unclustered_signals", { workspaceId });
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

    logStructured("info", "clustering_clusters_found", { clusterCount: clusters.length });

    // 4. Save narrative groups to database
    let createdCount = 0;
    for (const cluster of clusters) {
        // Compile signals context for AI
        const signalsContext = cluster
            .slice(0, 10) // Limit to top 10 to fit in context window
            .map(s => `[${s.sentiment || 'UNKNOWN'}] ${s.title || 'No Title'}\n${s.content.substring(0, 150)}...`)
            .join("\n\n");

        logStructured("info", "clustering_analyzing_cluster", { signalCount: cluster.length });
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

    logStructured("info", "clustering_completed", { createdCount });
    return { 
        message: "Clustering complete", 
        clustersFound: clusters.length, 
        clustersCreated: createdCount 
    };
};

/**
 * Update cluster lifecycle status based on signal velocity.
 * - emerging: new cluster (< 7 days old, growing)
 * - active: established cluster (7-30 days, steady signals)
 * - declining: losing momentum (> 30 days or declining signals)
 * - archived: no recent signals (> 60 days)
 */
export async function updateClusterLifecycles(workspaceId) {
    const clusters = await prisma.narrativeCluster.findMany({
        where: { workspaceId },
        include: {
            signals: {
                select: { signal: { select: { capturedAt: true } } },
                orderBy: { signal: { capturedAt: "desc" } },
            },
        },
    });

    const now = new Date();
    let updated = 0;

    for (const cluster of clusters) {
        const signalDates = cluster.signals
            .map((cs) => cs.signal?.capturedAt)
            .filter(Boolean)
            .sort((a, b) => b - a);

        if (signalDates.length === 0) continue;

        const lastSignalDate = new Date(signalDates[0]);
        const firstSignalDate = new Date(signalDates[signalDates.length - 1]);
        const daysSinceLast = Math.floor((now - lastSignalDate) / (1000 * 60 * 60 * 24));
        const daysSinceFirst = Math.floor((now - firstSignalDate) / (1000 * 60 * 60 * 24));

        // Calculate velocity (signals per day in last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
        const recentCount = signalDates.filter((d) => d >= sevenDaysAgo).length;
        const previousCount = signalDates.filter((d) => d >= fourteenDaysAgo && d < sevenDaysAgo).length;
        const velocity = previousCount > 0
            ? ((recentCount - previousCount) / previousCount * 100).toFixed(1)
            : recentCount > 0 ? "100.0" : "0.0";

        let lifecycle;
        if (daysSinceLast > 60) {
            lifecycle = "archived";
        } else if (daysSinceLast > 30 || Number(velocity) < -10) {
            lifecycle = "declining";
        } else if (daysSinceFirst < 7 && recentCount > 0) {
            lifecycle = "emerging";
        } else {
            lifecycle = "active";
        }

        await prisma.narrativeCluster.update({
            where: { id: cluster.id },
            data: {
                signalCount: cluster.signals.length,
            },
        });

        updated++;
    }

    logStructured("info", "cluster_lifecycles_updated", { updated });
    return { updated };
}

/**
 * Merge overlapping clusters with high keyword similarity.
 */
export async function mergeOverlappingClusters(workspaceId, similarityThreshold = 0.5) {
    const clusters = await prisma.narrativeCluster.findMany({
        where: { workspaceId },
        include: {
            signals: {
                select: { signal: { select: { title: true, content: true } } },
            },
        },
    });

    if (clusters.length < 2) return { merged: 0 };

    // Build keyword sets for each cluster
    const clusterKeywords = clusters.map((c) => {
        const allText = c.signals
            .map((cs) => `${cs.signal?.title || ""} ${cs.signal?.content || ""}`)
            .join(" ");
        return { id: c.id, keywords: extractKeywords(allText) };
    });

    // Find pairs with high similarity
    const toMerge = [];
    for (let i = 0; i < clusterKeywords.length; i++) {
        for (let j = i + 1; j < clusterKeywords.length; j++) {
            const similarity = calculateSimilarity(
                clusterKeywords[i].keywords,
                clusterKeywords[j].keywords
            );
            if (similarity >= similarityThreshold) {
                toMerge.push({
                    keepId: clusterKeywords[i].id,
                    mergeId: clusterKeywords[j].id,
                    similarity,
                });
            }
        }
    }

    let merged = 0;
    const processed = new Set();

    for (const { keepId, mergeId } of toMerge) {
        if (processed.has(mergeId)) continue;

        // Move signals from mergeId to keepId
        const mergeCluster = await prisma.narrativeCluster.findUnique({
            where: { id: mergeId },
            select: { signalCount: true },
        });

        const keepCluster = await prisma.narrativeCluster.findUnique({
            where: { id: keepId },
            select: { signalCount: true },
        });

        if (!mergeCluster || !keepCluster) continue;

        // Update signal links
        await prisma.narrativeClusterSignal.updateMany({
            where: { narrativeClusterId: mergeId },
            data: { narrativeClusterId: keepId },
        });

        // Update keep cluster signal count
        await prisma.narrativeCluster.update({
            where: { id: keepId },
            data: { signalCount: keepCluster.signalCount + mergeCluster.signalCount },
        });

        // Delete the merged cluster
        await prisma.narrativeCluster.delete({ where: { id: mergeId } });

        processed.add(mergeId);
        merged++;
    }

    logStructured("info", "clusters_merged", { merged });
    return { merged };
}

/**
 * Compare cluster metrics across two time periods.
 * Returns per-cluster signal count, sentiment distribution, and impact changes.
 */
export async function compareClusterPeriods(workspaceId, period1Start, period1End, period2Start, period2End) {
    async function getClusterStats(start, end) {
        const clusters = await prisma.narrativeCluster.findMany({
            where: {
                workspaceId,
                createdAt: { gte: start, lte: end },
            },
            include: {
                signals: {
                    select: {
                        signal: { select: { sentiment: true, capturedAt: true } },
                    },
                },
            },
        });

        return clusters.map((cluster) => {
            const sentiments = cluster.signals.map((cs) => cs.signal?.sentiment).filter(Boolean);
            const sentimentCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
            sentiments.forEach((s) => {
                const key = s.toLowerCase();
                if (sentimentCounts[key] !== undefined) sentimentCounts[key]++;
            });

            return {
                id: cluster.id,
                title: cluster.title,
                signalCount: cluster.signals.length,
                sentiment: cluster.sentiment,
                impact: cluster.impact,
                sentimentDistribution: sentimentCounts,
            };
        });
    }

    const [period1, period2] = await Promise.all([
        getClusterStats(period1Start, period1End),
        getClusterStats(period2Start, period2End),
    ]);

    // Build comparison
    const comparison = period1.map((p1) => {
        const p2 = period2.find((p) => p.id === p1.id);
        return {
            clusterId: p1.id,
            title: p1.title,
            period1: { signalCount: p1.signalCount, sentiment: p1.sentiment, impact: p1.impact, sentimentDistribution: p1.sentimentDistribution },
            period2: p2 ? { signalCount: p2.signalCount, sentiment: p2.sentiment, impact: p2.impact, sentimentDistribution: p2.sentimentDistribution } : null,
            signalCountChange: p2 ? p2.signalCount - p1.signalCount : null,
        };
    });

    // New clusters in period2 that weren't in period1
    const newClusters = period2.filter((p2) => !period1.find((p1) => p1.id === p2.id));

    return {
        period1: { from: period1Start, to: period1End, clusterCount: period1.length },
        period2: { from: period2Start, to: period2End, clusterCount: period2.length },
        comparison,
        newClusters,
    };
}

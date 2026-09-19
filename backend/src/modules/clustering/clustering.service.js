import supabase from "../../lib/supabase.js";
import { analyzeCluster } from "../ai/ai.service.js";
import { logStructured } from "../../lib/logger.js";

// Helper to extract basic keywords (lowercase, basic stop words removed, bilingual EN + ID)
function extractKeywords(text) {
    if (!text) return new Set();
    const stopWords = new Set([
        // English stop words
        "the", "and", "a", "an", "is", "in", "to", "of", "for", "on", "with", "as", "at", "by", "this", "that", "it", "are", "was", "were", "be", "been", "from", "has", "have", "had", "will", "would", "can", "could", "about", "news", "update",
        // Indonesian stop words
        "yang", "dan", "di", "dari", "ke", "ini", "itu", "untuk", "pada", "adalah", "dengan", "akan", "juga", "oleh", "dalam", "bisa", "lebih", "tidak", "ada", "saya", "kami", "mereka", "anda", "saat", "setelah", "karena", "bagi", "sampai", "antara", "hanya", "namun", "bukan", "tetapi", "serta", "tersebut", "sudah", "banyak", "harus", "agar", "supaya", "seperti", "tentang", "masih", "belum", "atas", "bila", "jika", "lagi", "lalu", "olehnya", "secara", "sebuah", "seorang", "suatu", "tanpa", "telah", "tentu", "terus", "terhadap", "berita", "indonesia", "hari"
    ]);
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
    return new Set(words.filter(w => w.length >= 3 && !stopWords.has(w)));
}

// Helper to calculate Jaccard Similarity between two sets
function calculateSimilarity(setA, setB) {
    if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

export const runClustering = async (workspaceId) => {
    logStructured("info", "clustering_started", { workspaceId });

    // 1. Fetch recent signals for the workspace (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const { data: signals, error: signalsError } = await supabase
        .from("signals")
        .select(`
            id,
            workspace_id,
            title,
            content,
            sentiment,
            severity,
            topics,
            captured_at,
            metadata,
            analyses:signal_analyses(*)
        `)
        .eq("workspace_id", workspaceId)
        .gte("captured_at", fourteenDaysAgo.toISOString())
        .order("captured_at", { ascending: false });

    if (signalsError) {
        logStructured("error", "clustering_fetch_signals_error", { error: signalsError.message });
        throw signalsError;
    }

    if (!signals || signals.length === 0) {
        logStructured("info", "clustering_no_signals", { workspaceId });
        return { message: "No signals found to cluster", clustersCreated: 0, clustersUpdated: 0 };
    }

    // 2. Fetch existing cluster-signal links to find already-clustered signals
    const signalIds = signals.map(s => s.id);
    const { data: existingLinks } = await supabase
        .from("narrative_cluster_signals")
        .select("cluster_id, signal_id")
        .in("signal_id", signalIds);

    const clusteredSignalIds = new Set(existingLinks?.map(l => l.signal_id) || []);
    const unclusteredSignals = signals.filter(s => !clusteredSignalIds.has(s.id));

    logStructured("info", "clustering_signals_evaluated", {
        totalSignals: signals.length,
        unclusteredCount: unclusteredSignals.length,
    });

    if (unclusteredSignals.length === 0) {
        logStructured("info", "clustering_all_signals_already_clustered", { workspaceId });
        return { message: "All signals already clustered", clustersCreated: 0, clustersUpdated: 0 };
    }

    // 3. Fetch existing active clusters to see if unclustered signals match them
    const { data: existingClusters } = await supabase
        .from("narrative_clusters")
        .select("id, title, description, keywords, signal_count, sentiment, impact")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(20);

    // Prepare keywords for existing clusters
    const activeClustersWithKeywords = (existingClusters || []).map(cluster => {
        const clusterKwText = `${cluster.title || ""} ${cluster.description || ""} ${(cluster.keywords || []).join(" ")}`;
        return {
            ...cluster,
            keywordSet: extractKeywords(clusterKwText),
        };
    });

    // Prepare data for unclustered signals
    const signalData = unclusteredSignals.map(s => {
        const textToAnalyze = `${s.title || ""} ${s.content || ""} ${(s.topics || []).join(" ")}`;
        const latestAnalysis = Array.isArray(s.analyses) && s.analyses.length > 0
            ? s.analyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;
        return {
            ...s,
            keywords: extractKeywords(textToAnalyze),
            sentiment: latestAnalysis?.sentiment || s.sentiment || "neutral"
        };
    });

    let attachedCount = 0;
    const remainingSignals = [];

    // 4. Try attaching unclustered signals to existing active clusters if similarity is high (>= 0.20)
    for (const signal of signalData) {
        let bestCluster = null;
        let bestScore = 0;

        for (const cluster of activeClustersWithKeywords) {
            const similarity = calculateSimilarity(signal.keywords, cluster.keywordSet);
            if (similarity > bestScore && similarity >= 0.20) {
                bestScore = similarity;
                bestCluster = cluster;
            }
        }

        if (bestCluster) {
            // Attach to existing cluster
            const { error: linkErr } = await supabase
                .from("narrative_cluster_signals")
                .upsert(
                    { cluster_id: bestCluster.id, signal_id: signal.id },
                    { onConflict: "cluster_id,signal_id" }
                );

            if (!linkErr) {
                // Increment cluster signal count
                const newCount = (bestCluster.signal_count || 0) + 1;
                bestCluster.signal_count = newCount;
                await supabase
                    .from("narrative_clusters")
                    .update({
                        signal_count: newCount,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", bestCluster.id);
                attachedCount++;
            } else {
                remainingSignals.push(signal);
            }
        } else {
            remainingSignals.push(signal);
        }
    }

    logStructured("info", "clustering_attached_to_existing", { attachedCount, remainingCount: remainingSignals.length });

    // 5. Cluster remaining unclustered signals among themselves
    const clusters = [];
    const threshold = 0.15; // Jaccard threshold for new clusters
    const clusteredIds = new Set();

    for (let i = 0; i < remainingSignals.length; i++) {
        if (clusteredIds.has(remainingSignals[i].id)) continue;

        const currentCluster = [remainingSignals[i]];
        clusteredIds.add(remainingSignals[i].id);

        for (let j = i + 1; j < remainingSignals.length; j++) {
            if (clusteredIds.has(remainingSignals[j].id)) continue;

            const similarity = calculateSimilarity(remainingSignals[i].keywords, remainingSignals[j].keywords);
            if (similarity >= threshold) {
                currentCluster.push(remainingSignals[j]);
                clusteredIds.add(remainingSignals[j].id);
            }
        }

        // Form clusters: allow clusters of 2+ signals, or 1 signal if it has high severity
        if (currentCluster.length > 1 || (currentCluster.length === 1 && String(currentCluster[0].severity).toLowerCase() === "high")) {
            clusters.push(currentCluster);
        }
    }

    logStructured("info", "clustering_new_clusters_identified", { clusterCount: clusters.length });

    // 6. Generate AI labels and save new narrative clusters to DB
    let createdCount = 0;
    for (const cluster of clusters) {
        const signalsContext = cluster
            .slice(0, 8)
            .map(s => `[${s.sentiment || 'UNKNOWN'}] ${s.title || 'No Title'}\n${(s.content || "").substring(0, 150)}...`)
            .join("\n\n");

        logStructured("info", "clustering_analyzing_cluster", { signalCount: cluster.length });
        let aiAnalysis = null;
        try {
            aiAnalysis = await analyzeCluster(signalsContext);
        } catch (aiErr) {
            logStructured("warn", "clustering_ai_analysis_fallback", { error: aiErr.message });
        }

        // Fallback heuristics if AI analysis is null
        const allClusterKeywords = Array.from(new Set(cluster.flatMap(s => Array.from(s.keywords)))).slice(0, 8);
        const dominantSentiment = aiAnalysis?.dominant_sentiment || cluster[0].sentiment?.toLowerCase() || "neutral";
        const impact = aiAnalysis?.impact ? aiAnalysis.impact.toUpperCase() : (cluster[0].severity ? cluster[0].severity.toUpperCase() : "MEDIUM");
        const safeImpact = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(impact) ? impact : "MEDIUM";
        
        const fallbackTitle = cluster[0]?.title 
            ? `${cluster[0].title.split(" - ")[0].substring(0, 45)}`
            : (allClusterKeywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Emerging Topic");
        const title = aiAnalysis?.title || fallbackTitle;
        const description = aiAnalysis?.description || `Cluster of ${cluster.length} signals regarding ${allClusterKeywords.slice(0, 5).join(", ")}.`;
        const mainNarrative = aiAnalysis?.description || description;

        // Insert new cluster into DB
        const { data: dbCluster, error: clusterError } = await supabase
            .from("narrative_clusters")
            .insert({
                workspace_id: workspaceId,
                title: title,
                description: description,
                main_narrative: mainNarrative,
                sentiment: dominantSentiment,
                impact: safeImpact,
                priority: safeImpact,
                signal_count: cluster.length,
                keywords: allClusterKeywords,
                lifecycle: "emerging",
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (clusterError || !dbCluster) {
            logStructured("error", "clustering_create_cluster_error", { error: clusterError?.message });
            continue;
        }

        // Link signals to new cluster
        const signalLinks = cluster.map(s => ({
            cluster_id: dbCluster.id,
            signal_id: s.id
        }));

        const { error: linkError } = await supabase
            .from("narrative_cluster_signals")
            .upsert(signalLinks, { onConflict: "cluster_id,signal_id" });

        if (linkError) {
            logStructured("warn", "clustering_link_signals_error", { error: linkError.message });
        }

        createdCount++;
    }

    // 7. Update lifecycles of all clusters in workspace
    try {
        await updateClusterLifecycles(workspaceId);
    } catch (lcErr) {
        logStructured("warn", "clustering_lifecycle_update_failed", { error: lcErr.message });
    }

    logStructured("info", "clustering_completed", { createdCount, attachedCount });
    return {
        message: "Clustering complete",
        signalsProcessed: unclusteredSignals.length,
        clustersFound: clusters.length,
        clustersCreated: createdCount,
        signalsAttached: attachedCount
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
    // Fetch clusters with their signals
    const { data: clusters, error } = await supabase
        .from("narrative_clusters")
        .select(`
            *,
            signals:narrative_cluster_signals(
                signal:signals(captured_at)
            )
        `)
        .eq("workspace_id", workspaceId);

    if (error) {
        logStructured("error", "update_cluster_lifecycles_error", { error: error.message });
        throw error;
    }

    const now = new Date();
    let updated = 0;

    for (const cluster of clusters) {
        // Extract captured_at dates from nested signals
        const signalDates = cluster.signals
            .map((cs) => cs.signal?.captured_at)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a));

        if (signalDates.length === 0) continue;

        const lastSignalDate = new Date(signalDates[0]);
        const firstSignalDate = new Date(signalDates[signalDates.length - 1]);
        const daysSinceLast = Math.floor((now - lastSignalDate) / (1000 * 60 * 60 * 24));
        const daysSinceFirst = Math.floor((now - firstSignalDate) / (1000 * 60 * 60 * 24));

        // Calculate velocity (signals per day in last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
        const recentCount = signalDates.filter((d) => new Date(d) >= sevenDaysAgo).length;
        const previousCount = signalDates.filter((d) => new Date(d) >= fourteenDaysAgo && new Date(d) < sevenDaysAgo).length;
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

        await supabase
            .from("narrative_clusters")
            .update({
                signal_count: cluster.signals.length,
            })
            .eq("id", cluster.id);

        updated++;
    }

    logStructured("info", "cluster_lifecycles_updated", { updated });
    return { updated };
}

/**
 * Merge overlapping clusters with high keyword similarity.
 */
export async function mergeOverlappingClusters(workspaceId, similarityThreshold = 0.5) {
    // Fetch clusters with their signals
    const { data: clusters, error } = await supabase
        .from("narrative_clusters")
        .select(`
            *,
            signals:narrative_cluster_signals(
                signal:signals(title, content)
            )
        `)
        .eq("workspace_id", workspaceId);

    if (error) {
        logStructured("error", "merge_clusters_error", { error: error.message });
        throw error;
    }

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

        // Get signal counts for both clusters
        const { data: mergeCluster } = await supabase
            .from("narrative_clusters")
            .select("signal_count")
            .eq("id", mergeId)
            .single();

        const { data: keepCluster } = await supabase
            .from("narrative_clusters")
            .select("signal_count")
            .eq("id", keepId)
            .single();

        if (!mergeCluster || !keepCluster) continue;

        // Update signal links - move signals from mergeId to keepId
        await supabase
            .from("narrative_cluster_signals")
            .update({ cluster_id: keepId })
            .eq("cluster_id", mergeId);

        // Update keep cluster signal count
        await supabase
            .from("narrative_clusters")
            .update({ signal_count: keepCluster.signal_count + mergeCluster.signal_count })
            .eq("id", keepId);

        // Delete the merged cluster
        await supabase
            .from("narrative_clusters")
            .delete()
            .eq("id", mergeId);

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
        const { data: clusters, error } = await supabase
            .from("narrative_clusters")
            .select(`
                *,
                signals:narrative_cluster_signals(
                    signal:signals(sentiment, captured_at)
                )
            `)
            .eq("workspace_id", workspaceId)
            .gte("created_at", start)
            .lte("created_at", end);

        if (error) {
            throw error;
        }

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

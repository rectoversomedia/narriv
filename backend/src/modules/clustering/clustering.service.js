import { isRoutineContent } from "../../lib/routine-content.js";
import supabase from "../../lib/supabase.js";
import { analyzeCluster } from "../ai/ai.service.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { logStructured } from "../../lib/logger.js";
import { runAiTask } from "../../lib/ai-gateway.js";

// Helper to extract basic keywords (lowercase, basic stop words removed, bilingual EN + ID)
export function extractKeywords(text) {
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
export function calculateSimilarity(setA, setB) {
    if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

const MEMBERSHIP_LOG_LIMIT = 100;

/**
 * Why a signal belongs with a cluster (or seed signal): Jaccard similarity of
 * keyword sets plus the shared keywords. Stored in narrative_clusters.metadata
 * so cluster membership stays explainable without a schema change.
 */
export function explainMembership(signal, keywordSet, method, threshold) {
    const shared = [...(signal.keywords || [])].filter((k) => keywordSet?.has(k)).sort().slice(0, 8);
    return {
        signalId: signal.id,
        method,
        similarity: Number(calculateSimilarity(signal.keywords, keywordSet).toFixed(3)),
        threshold,
        sharedKeywords: shared,
        at: new Date().toISOString(),
    };
}

/** Title key for spotting twin issues: lower case, letters and digits only. */
export const normalizeTitle = (t) => String(t || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

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

    // Daily FX tables and stock-pick lists are mentions, not issues: keep them out of clustering.
    const routine = (signals || []).filter(isRoutineContent).length;
    if (routine) signals.splice(0, signals.length, ...signals.filter((sig) => !isRoutineContent(sig)));
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
        .select("id, title, description, keywords, signal_count, sentiment, impact, metadata")
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
            // AI sentiment lives in signal_analyses.analysis.
            sentiment: latestAnalysis?.analysis?.sentiment || s.sentiment || "neutral"
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
                const membership = [
                    ...((bestCluster.metadata?.membership) || []),
                    explainMembership(signal, bestCluster.keywordSet, "keyword_jaccard_attach", 0.20),
                ].slice(-MEMBERSHIP_LOG_LIMIT);
                bestCluster.metadata = { ...(bestCluster.metadata || {}), membership };
                await supabase
                    .from("narrative_clusters")
                    .update({
                        signal_count: newCount,
                        metadata: bestCluster.metadata,
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
    const titledThisRun = new Map();
    // Issue titles are stored and shared by every member, so they follow the workspace's content language.
    const lang = clusters.length ? await workspaceLanguage(workspaceId) : "id";
    for (const cluster of clusters) {
        const signalsContext = cluster
            .slice(0, 8)
            .map(s => `[${s.sentiment || 'UNKNOWN'}] ${s.title || 'No Title'}\n${(s.content || "").substring(0, 150)}...`)
            .join("\n\n");

        logStructured("info", "clustering_analyzing_cluster", { signalCount: cluster.length });
        let aiAnalysis = null;
        try {
            aiAnalysis = await analyzeCluster(signalsContext, lang);
        } catch (aiErr) {
            logStructured("warn", "clustering_ai_analysis_fallback", { error: aiErr.message });
        }

        // Fallback heuristics if AI analysis is null
        const allClusterKeywords = Array.from(new Set(cluster.flatMap(s => Array.from(s.keywords)))).slice(0, 8);
        const dominantSentiment = aiAnalysis?.dominant_sentiment || cluster[0].sentiment?.toLowerCase() || "neutral";
        const impact = aiAnalysis?.impact ? aiAnalysis.impact.toUpperCase() : (cluster[0].severity ? cluster[0].severity.toUpperCase() : "MEDIUM");
        const safeImpact = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(impact) ? impact : "MEDIUM";
        
        const fallbackTitle = cluster[0]?.title 
            ? `${shortTitle(cluster[0].title.split(" - ")[0], 45)}`
            : (allClusterKeywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || (lang === "en" ? "Emerging Topic" : "Topik baru"));
        const title = aiAnalysis?.title || fallbackTitle;
        const description = aiAnalysis?.description || (lang === "en"
            ? `Cluster of ${cluster.length} signals regarding ${allClusterKeywords.slice(0, 5).join(", ")}.`
            : `${cluster.length} percakapan tentang ${allClusterKeywords.slice(0, 5).join(", ")}.`);
        const mainNarrative = aiAnalysis?.description || description;

        // Two ingest runs can cluster the same new records at once (both read them as unclustered while the AI
        // label call is in flight), which made twin issues. Re-check right before insert and skip if another run
        // already took these records.
        const { data: takenLinks } = await supabase
            .from("narrative_cluster_signals")
            .select("signal_id")
            .in("signal_id", cluster.map((s) => s.id));
        if ((takenLinks || []).length) {
            logStructured("info", "clustering_skip_taken", { taken: takenLinks.length, size: cluster.length });
            continue;
        }

        // The AI often gives two keyword groups of one story the same title, which showed as twin issues.
        // An issue with the same title (this run or an existing one) takes these records instead.
        const titleKey = normalizeTitle(title);
        const twin = titleKey ? (titledThisRun.get(titleKey) || activeClustersWithKeywords.find((c) => normalizeTitle(c.title) === titleKey)) : null;
        if (twin) {
            await supabase
                .from("narrative_cluster_signals")
                .upsert(cluster.map((s) => ({ cluster_id: twin.id, signal_id: s.id })), { onConflict: "cluster_id,signal_id" });
            twin.signal_count = (twin.signal_count || 0) + cluster.length;
            await supabase.from("narrative_clusters").update({ signal_count: twin.signal_count, updated_at: new Date().toISOString() }).eq("id", twin.id);
            attachedCount += cluster.length;
            logStructured("info", "clustering_joined_same_title", { clusterId: twin.id, size: cluster.length });
            continue;
        }

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
                metadata: {
                    labeledBy: aiAnalysis ? "ai" : "heuristic_fallback",
                    membership: cluster.length === 1
                        ? [{ signalId: cluster[0].id, method: "single_high_severity_signal", similarity: null, threshold: null, sharedKeywords: [], at: new Date().toISOString() }]
                        : cluster.map((m, idx) => idx === 0
                            ? { signalId: m.id, method: "seed", similarity: 1, threshold, sharedKeywords: [...m.keywords].sort().slice(0, 8), at: new Date().toISOString() }
                            : explainMembership(m, cluster[0].keywords, "keyword_jaccard_seed", threshold)),
                },
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

        titledThisRun.set(titleKey, dbCluster);
        createdCount++;
    }

    // 6b. Issues with different titles can still be one story ("Sponsor IMOS" and "Promo booth di IMOS").
    let mergedSimilar = 0;
    if (createdCount > 0) {
        try { mergedSimilar = (await mergeSimilarIssues(workspaceId)).merged; } catch (e) { logStructured("warn", "merge_similar_failed", { error: e?.message || e }); }
    }

    // 7. Update lifecycles of all clusters in workspace
    try {
        await updateClusterLifecycles(workspaceId);
    } catch (lcErr) {
        logStructured("warn", "clustering_lifecycle_update_failed", { error: lcErr.message });
    }

    logStructured("info", "clustering_completed", { createdCount, attachedCount, mergedSimilar });
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

/** Cut a headline at a word boundary (no "Pilihan Pemba"), adding an ellipsis only when something was cut. */
function shortTitle(text, max) {
    const t = String(text || "").trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max + 1);
    const space = cut.lastIndexOf(" ");
    return `${(space > max * 0.5 ? cut.slice(0, space) : t.slice(0, max)).replace(/[\s,.:;-]+$/, "")}…`;
}


/** Move every record (and any action plan) of `fromIds` onto `keepId`, then delete the emptied issues. */
export async function mergeIssuesInto(keepId, fromIds) {
    for (const fromId of fromIds) {
        const { data: links } = await supabase.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", fromId);
        if (links?.length) {
            await supabase.from("narrative_cluster_signals").upsert(links.map((l) => ({ cluster_id: keepId, signal_id: l.signal_id })), { onConflict: "cluster_id,signal_id" });
        }
        await supabase.from("narrative_cluster_signals").delete().eq("cluster_id", fromId);
        await supabase.from("actions").update({ cluster_id: keepId }).eq("cluster_id", fromId);
        await supabase.from("narrative_clusters").delete().eq("id", fromId);
    }
    const { count } = await supabase.from("narrative_cluster_signals").select("*", { count: "exact", head: true }).eq("cluster_id", keepId);
    await supabase.from("narrative_clusters").update({ signal_count: count || 0, updated_at: new Date().toISOString() }).eq("id", keepId);
}

/**
 * One AI call groups the workspace's recent issues that tell the same story, and each group becomes one issue
 * (the one with the most records keeps its title). Conservative: only the same event or the same complaint is
 * merged, never two stories that merely share a brand or a topic. Skipped when AI is unavailable.
 */
export async function mergeSimilarIssues(workspaceId, { days = 14, apply = true } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: issues } = await supabase
        .from("narrative_clusters")
        .select("id, title, description, signal_count, sentiment")
        .eq("workspace_id", workspaceId)
        .gte("updated_at", since)
        .order("signal_count", { ascending: false })
        .limit(40);
    if (!issues || issues.length < 2) return { merged: 0, groups: [] };

    const list = issues.map((c, i) => `${i}. ${c.title} — ${String(c.description || "").slice(0, 160)}`).join("\n");
    const ask = () => runAiTask({
        task: "classification",
        workspaceId,
        json: true,
        system: "You deduplicate a list of news/social issues for a monitoring dashboard. Group issues ONLY when they are clearly the same story: the same event, campaign, incident or complaint, described differently. Do not group issues that merely share a company name, a product, a threat actor type or a general topic. When unsure, do not group.",
        user: `${list}\n\nReturn JSON {"groups": number[][]} listing only groups of 2 or more indices that are the same story. Return {"groups": []} if none.`,
        validate: (d) => Array.isArray(d?.groups),
    });
    // Two independent reads; only pairs both reads put together are merged (one read alone varied between runs).
    const [a, b] = await Promise.all([ask(), ask()]);
    if (!a?.ok || !b?.ok) return { merged: 0, groups: [], skipped: a?.error || b?.error || "ai_unavailable" };
    const pairsOf = (groupsIn) => {
        const set = new Set();
        for (const g of groupsIn) {
            const idx = [...new Set((Array.isArray(g) ? g : []).map(Number))].filter((i) => Number.isInteger(i) && issues[i]);
            for (let x = 0; x < idx.length; x++) for (let y = x + 1; y < idx.length; y++) set.add([Math.min(idx[x], idx[y]), Math.max(idx[x], idx[y])].join("-"));
        }
        return set;
    };
    const pb = pairsOf(b.data.groups);
    const agreed = [...pairsOf(a.data.groups)].filter((p) => pb.has(p)).map((p) => p.split("-").map(Number));
    // Agreed pairs joined into groups.
    const parent = issues.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (const [x, y] of agreed) parent[find(x)] = find(y);
    const byRoot = new Map();
    for (const [x, y] of agreed) for (const i of [x, y]) (byRoot.get(find(i)) || byRoot.set(find(i), new Set()).get(find(i))).add(i);
    const groups = [...byRoot.values()].map((set) => {
        const members = [...set].map((i) => issues[i]).sort((p, q) => (q.signal_count || 0) - (p.signal_count || 0));
        return { keep: members[0], merge: members.slice(1) };
    });
    if (apply) for (const g of groups) await mergeIssuesInto(g.keep.id, g.merge.map((m) => m.id));
    const merged = groups.reduce((n, g) => n + g.merge.length, 0);
    if (merged) logStructured("info", "issues_merged_similar", { workspaceId, merged, groups: groups.map((g) => [g.keep.title, ...g.merge.map((m) => m.title)]) });
    return { merged, groups: groups.map((g) => ({ keep: g.keep.title, merge: g.merge.map((m) => m.title) })) };
}

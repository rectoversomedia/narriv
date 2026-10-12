// Counts only signals linked to a cluster (the stored counter can disagree, e.g.
// seeded clusters with no members), drops clusters without evidence, and keeps
// one entry per title so re-clustered duplicates are not listed twice.
export function rankClustersByEvidence(clusters) {
    const byTitle = new Map();
    for (const cluster of clusters) {
        const linked = Array.isArray(cluster.narrative_cluster_signals) ? cluster.narrative_cluster_signals.length : 0;
        if (linked === 0) continue;
        const key = (cluster.title || "Unknown").trim().toLowerCase();
        const existing = byTitle.get(key);
        if (!existing || linked > existing.signal_count) {
            byTitle.set(key, { title: cluster.title, sentiment: cluster.sentiment ?? null, signal_count: linked });
        }
    }
    return [...byTitle.values()].sort((a, b) => b.signal_count - a.signal_count).slice(0, 10);
}

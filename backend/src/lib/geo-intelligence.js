/**
 * GEO Intelligence Foundation
 *
 * Reads existing GEO/AI-visibility data (if any) and surfaces a
 * high-level summary. Does NOT fabricate query coverage or AI search
 * results — only reports on real data the user has already collected.
 *
 * If no GEO data exists yet, returns a "no_data" status with
 * guidance on what to ingest first.
 */

import { baseSupabaseAdmin } from "./supabase.js";

export async function computeGeoIntelligence({ workspaceId, windowHours = 168 }) {
    if (!workspaceId) return { status: "insufficient_data", reason: "workspaceId required" };

    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const tables = ["ai_visibility_checks", "geo_queries", "geo_responses", "ai_citations"];
    const found = {};
    for (const t of tables) {
        try {
            const r = await baseSupabaseAdmin.from(t).select("id").eq("workspace_id", workspaceId).gte("created_at", sinceIso).limit(1);
            if (!r.error) found[t] = (r.data || []).length;
        } catch {
            found[t] = 0;
        }
    }
    const total = Object.values(found).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return {
            status: "no_data",
            label: "geo_intelligence",
            generatedAt: new Date().toISOString(),
            windowHours,
            message: "No GEO/AI visibility data has been collected in this workspace yet. Run a GEO check or ingest AI search results before intelligence can be derived.",
            tablesChecked: tables,
            evidence: [],
        };
    }
    return {
        status: "ok",
        label: "geo_intelligence",
        generatedAt: new Date().toISOString(),
        windowHours,
        counts: found,
        message: "GEO data present; deeper analysis requires the geo module to be populated.",
        evidence: Object.keys(found).filter((k) => found[k] > 0).map((k) => ({ type: "geo_table", table: k })),
    };
}

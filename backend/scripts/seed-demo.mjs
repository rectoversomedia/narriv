// node --env-file=.env scripts/seed-demo.mjs [--backup <file>] [--dry]
// Backs up the demo workspace's rows to a JSON file, then replaces its content with the demo dataset.
import fs from "node:fs";
import { baseSupabaseAdmin as db } from "../src/lib/supabase.js";
import { DEMO_WORKSPACE_ID } from "../src/lib/workspace-access.js";
import { seedDemoWorkspace } from "../src/modules/demo/demo-seed.js";

const args = process.argv.slice(2);
const backupPath = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const ws = DEMO_WORKSPACE_ID;

if (backupPath) {
    const dump = {};
    const all = async (table, build) => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
            const { data, error } = await build(db.from(table).select("*")).range(from, from + 999);
            if (error) { dump[table] = { error: error.message }; return; }
            rows.push(...data); if (data.length < 1000) break;
        }
        dump[table] = rows;
    };
    for (const t of ["signals", "narrative_clusters", "alerts", "action_plans", "cases", "reports", "report_schedules", "report_templates", "ai_visibility_results", "prompt_test_runs", "sources", "monitoring_keywords", "raw_documents", "workspace_settings", "audit_logs", "ingestion_jobs", "ai_feedback", "app_notifications", "generated_assets"]) {
        await all(t, (q) => q.eq("workspace_id", ws));
    }
    const signalIds = (dump.signals || []).map((s) => s.id);
    const clusterIds = (dump.narrative_clusters || []).map((c) => c.id);
    dump.signal_analyses = []; dump.narrative_cluster_signals = [];
    for (let i = 0; i < signalIds.length; i += 200) { const { data } = await db.from("signal_analyses").select("*").in("signal_id", signalIds.slice(i, i + 200)); dump.signal_analyses.push(...(data || [])); }
    for (let i = 0; i < clusterIds.length; i += 200) { const { data } = await db.from("narrative_cluster_signals").select("*").in("cluster_id", clusterIds.slice(i, i + 200)); dump.narrative_cluster_signals.push(...(data || [])); }
    fs.writeFileSync(backupPath, JSON.stringify({ workspace_id: ws, taken_at: new Date().toISOString(), tables: dump }, null, 1));
    console.log("backup:", backupPath, Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, Array.isArray(v) ? v.length : v.error])));
}

if (!args.includes("--dry")) console.log("seeded:", await seedDemoWorkspace());

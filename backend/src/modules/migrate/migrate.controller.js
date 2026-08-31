// DB Migration endpoint — inspects schema, adds missing columns, seeds data
// Protected by ADMIN_SECRET header.

import { logStructured } from "../../lib/logger.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAuth(req, res) {
    if (!ADMIN_SECRET) {
        res.status(500).json({ error: "ADMIN_SECRET not configured on server." });
        return false;
    }
    if (req.headers["x-admin-secret"] !== ADMIN_SECRET) {
        res.status(401).json({ error: "Unauthorized." });
        return false;
    }
    return true;
}

export async function inspectSchema(req, res) {
    if (!checkAuth(req, res)) return;

    try {
        // Check users table columns
        const { data: userCols, error: colsErr } = await baseSupabaseAdmin
            .from("information_schema.columns")
            .select("column_name, data_type, column_default, is_nullable")
            .eq("table_schema", "public")
            .eq("table_name", "users")
            .order("ordinal_position");

        if (colsErr) {
            return res.status(500).json({ error: "Failed to inspect schema.", detail: colsErr.message });
        }

        // Check source_templates count
        const { count: tmplCount } = await baseSupabaseAdmin
            .from("source_templates")
            .select("*", { count: "exact", head: true });

        return res.json({
            usersColumns: userCols || [],
            sourceTemplatesCount: tmplCount ?? 0,
        });
    } catch (e) {
        logStructured("error", "schema_inspect_failed", { error: e.message });
        return res.status(500).json({ error: e.message });
    }
}

export async function runMigration(req, res) {
    if (!checkAuth(req, res)) return;

    const results = [];
    const warnings = [];

    try {
        // Step 1: Inspect current schema
        const { data: userCols } = await baseSupabaseAdmin
            .from("information_schema.columns")
            .select("column_name")
            .eq("table_schema", "public")
            .eq("table_name", "users");

        const existingCols = new Set((userCols || []).map(c => c.column_name));
        const neededCols = ["password", "email_verified", "failed_login_attempts", "locked_until", "provider", "full_name"];
        const missingCols = neededCols.filter(c => !existingCols.has(c));

        if (missingCols.length > 0) {
            results.push(`Missing user columns detected: ${missingCols.join(", ")} — these need to be added via Supabase Dashboard SQL Editor.`);
        } else {
            results.push("users table schema is complete.");
        }

        // Step 2: Check source_templates
        const { count: tmplCount } = await baseSupabaseAdmin
            .from("source_templates")
            .select("*", { count: "exact", head: true });

        if ((tmplCount ?? 0) === 0) {
            results.push("source_templates is empty — needs seeding.");
        } else {
            results.push(`source_templates has ${tmplCount} rows.`);
        }

        return res.json({ results, missingCols, sourceTemplatesCount: tmplCount ?? 0 });

    } catch (e) {
        logStructured("error", "migration_inspect_failed", { error: e.message });
        return res.status(500).json({ error: e.message });
    }
}

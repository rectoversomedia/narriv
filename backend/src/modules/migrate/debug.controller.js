// DB Debug endpoint — tests user insert column by column
// No auth needed (read operations + controlled insert)

import { logStructured } from "../../lib/logger.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";

export async function debugSchema(req, res) {
    const results = {};
    const testEmail = `debug_${Date.now()}@test.local`;

    // 1. Check users table columns via information_schema
    try {
        const { data: cols, error: colsErr } = await baseSupabaseAdmin
            .from("information_schema.columns")
            .select("column_name, data_type, is_nullable")
            .eq("table_schema", "public")
            .eq("table_name", "users")
            .order("ordinal_position");

        if (colsErr) {
            results.informationSchema = { error: colsErr.message };
        } else {
            results.usersColumns = cols || [];
        }
    } catch (e) {
        results.informationSchema = { error: e.message };
    }

    // 2. Check source_templates
    try {
        const { data: templates, count, error: tmplErr } = await baseSupabaseAdmin
            .from("source_templates")
            .select("id, name, slug, category", { count: "exact" })
            .limit(5);

        if (tmplErr) {
            results.sourceTemplates = { error: tmplErr.message };
        } else {
            results.sourceTemplates = { count: count ?? 0, sample: templates || [] };
        }
    } catch (e) {
        results.sourceTemplates = { error: e.message };
    }

    // 3. Test user insert with minimal columns (id + email + name)
    try {
        const testId = crypto.randomUUID();
        const { data: minimalUser, error: minimalErr } = await baseSupabaseAdmin
            .from("users")
            .insert({ id: testId, email: testEmail, name: "DBG Test" })
            .select("id, email")
            .single();

        if (minimalErr) {
            results.minimalInsert = { success: false, error: minimalErr.message, code: minimalErr.code };
        } else {
            results.minimalInsert = { success: true, id: minimalUser?.id };
            // Clean up test user
            await baseSupabaseAdmin.from("users").delete().eq("id", testId);
        }
    } catch (e) {
        results.minimalInsert = { success: false, error: e.message };
    }

    // 4. Test user insert with full columns (id + email + name + all auth columns)
    try {
        const testId2 = crypto.randomUUID();
        const testEmail2 = `debug2_${Date.now()}@test.local`;
        const { data: fullUser, error: fullErr } = await baseSupabaseAdmin
            .from("users")
            .insert({
                id: testId2,
                email: testEmail2,
                name: "DBG Full Test",
                password: "test",
                email_verified: false,
                failed_login_attempts: 0,
                locked_until: null,
                provider: "password",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select("id, email")
            .single();

        if (fullErr) {
            results.fullInsert = { success: false, error: fullErr.message, code: fullErr.code, details: fullErr.details };
        } else {
            results.fullInsert = { success: true, id: fullUser?.id };
            // Clean up test user
            await baseSupabaseAdmin.from("users").delete().eq("id", testId2);
        }
    } catch (e) {
        results.fullInsert = { success: false, error: e.message };
    }

    // 5. Summary
    const userColSet = new Set((results.usersColumns || []).map(c => c.column_name));
    results.summary = {
        hasPassword: userColSet.has("password"),
        hasEmailVerified: userColSet.has("email_verified"),
        hasFailedLogin: userColSet.has("failed_login_attempts"),
        hasLockedUntil: userColSet.has("locked_until"),
        hasProvider: userColSet.has("provider"),
        missingAuthColumns: ["password", "email_verified", "failed_login_attempts", "locked_until", "provider"]
            .filter(c => !userColSet.has(c)),
        sourceTemplatesCount: results.sourceTemplates?.count ?? 0,
    };

    return res.json(results);
}

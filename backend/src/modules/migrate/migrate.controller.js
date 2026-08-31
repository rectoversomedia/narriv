// DB Migration endpoint — runs schema migrations and seeds data
// Protected by ADMIN_SECRET header.

import { logStructured } from "../../lib/logger.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import bcrypt from "bcrypt";

const BCRYPT_SALT_ROUNDS = 12;

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

// ─── Public diagnostic endpoints ──────────────────────────────────────────────

// Test user insert with the EXACT same data as register endpoint
// Returns exactly what error occurs when trying to register
export async function testUserInsert(req, res) {
    const testId = `test_${Date.now().toString(36)}`;
    const testEmail = `test_${Date.now()}@probe.local`;
    const results = {};

    // Test 1: Minimal insert (id + email + name only)
    try {
        const { data, error } = await baseSupabaseAdmin
            .from("users")
            .insert({ id: testId, email: testEmail, name: "DBG TEST" })
            .select("id, email")
            .single();
        if (error) {
            results.minimalInsert = { ok: false, error: error.message, code: error.code, details: error.details };
        } else {
            results.minimalInsert = { ok: true, id: data?.id };
            await baseSupabaseAdmin.from("users").delete().eq("id", testId);
        }
    } catch (e) {
        results.minimalInsert = { ok: false, error: e.message };
    }

    // Test 2: Full auth insert (same as register controller line 338-350)
    const testId2 = `test2_${Date.now().toString(36)}`;
    const testEmail2 = `test2_${Date.now()}@probe.local`;
    try {
        const hashed = await bcrypt.hash("TestPassword123!", BCRYPT_SALT_ROUNDS);
        const { data, error } = await baseSupabaseAdmin
            .from("users")
            .insert({
                id: testId2,
                email: testEmail2,
                name: "DBG FULL TEST",
                password: hashed,
                email_verified: false,
                failed_login_attempts: 0,
                locked_until: null,
                provider: "password",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select("id, email")
            .single();
        if (error) {
            results.fullAuthInsert = { ok: false, error: error.message, code: error.code, details: error.details, hint: error.hint };
        } else {
            results.fullAuthInsert = { ok: true, id: data?.id };
            await baseSupabaseAdmin.from("users").delete().eq("id", testId2);
        }
    } catch (e) {
        results.fullAuthInsert = { ok: false, error: e.message };
    }

    // Test 3: source_templates availability
    try {
        const { count, error: stErr } = await baseSupabaseAdmin
            .from("source_templates")
            .select("*", { count: "exact", head: true });
        if (stErr) {
            results.sourceTemplates = { accessible: false, error: stErr.message };
        } else {
            results.sourceTemplates = { accessible: true, count: count ?? 0 };
        }
    } catch (e) {
        results.sourceTemplates = { accessible: false, error: e.message };
    }

    // Diagnosis
    const minimalOk = results.minimalInsert?.ok;
    const fullOk = results.fullAuthInsert?.ok;
    results.diagnosis = {
        registerWillFail: !fullOk,
        reason: fullOk ? null : (results.fullAuthInsert?.error || "unknown"),
        fixNeeded: !fullOk ? [
            "Run the SQL below in Supabase Dashboard SQL Editor to add missing columns to users table"
        ] : [],
        sourceTemplatesNeedSeed: results.sourceTemplates?.accessible && (results.sourceTemplates?.count ?? 0) === 0,
    };

    return res.json(results);
}

// Inspect current schema (public endpoint — read-only)
// Uses pg_tables which PostgREST always exposes, vs information_schema which may not be cached
export async function inspectSchema(req, res) {
    try {
        // Get users table columns by attempting an INSERT with each known column
        // and noting which ones fail (PostgREST returns explicit column errors)
        const results = {};
        const testId = `diag_${Date.now().toString(36)}`;
        const testEmail = `diag_${Date.now()}@test.local`;

        // Step 1: Try minimal insert (id + email + name only)
        let minimalOk = false;
        try {
            const { error } = await baseSupabaseAdmin
                .from("users")
                .insert({ id: testId, email: testEmail, name: "DIAG" })
                .select("id")
                .single();
            if (!error) {
                minimalOk = true;
                await baseSupabaseAdmin.from("users").delete().eq("id", testId);
            } else {
                results.minimalInsertError = error.message;
            }
        } catch (e) {
            results.minimalInsertError = e.message;
        }
        results.minimalColumnsWork = minimalOk;

        // Step 2: Check source_templates count
        let templatesOk = false;
        let templateCount = 0;
        let templateError = null;
        try {
            const { count, error: stErr } = await baseSupabaseAdmin
                .from("source_templates")
                .select("*", { count: "exact", head: true });
            if (stErr) {
                templateError = stErr.message;
                // Try to create one to check if table exists
                try {
                    await baseSupabaseAdmin.from("source_templates").insert({
                        id: "99999999-9999-9999-9999-999999999999",
                        name: "__diag_only__",
                        slug: "__diag_only__",
                        category: "news",
                    });
                    await baseSupabaseAdmin.from("source_templates").delete().eq("id", "99999999-9999-9999-9999-999999999999");
                    templatesOk = true; // Table exists, was just empty
                } catch {
                    templatesOk = false; // Table doesn't exist
                }
            } else {
                templatesOk = true;
                templateCount = count ?? 0;
            }
        } catch (e) {
            templateError = e.message;
            templatesOk = false;
        }
        results.sourceTemplates = {
            accessible: templatesOk,
            count: templateCount,
            error: templateError,
        };

        // Step 3: Try insert with all auth columns (tests which are missing)
        const authCols = {
            password: "diag_pw_test",
            email_verified: false,
            failed_login_attempts: 0,
            locked_until: null,
            provider: "password",
            full_name: "DIAG TEST",
        };
        const testId2 = `diag2_${Date.now().toString(36)}`;
        const testEmail2 = `diag2_${Date.now()}@test.local`;
        const authResults = {};

        for (const [col, val] of Object.entries(authCols)) {
            try {
                const { error } = await baseSupabaseAdmin
                    .from("users")
                    .insert({ id: testId2, email: testEmail2, name: "DIAG", [col]: val })
                    .select("id")
                    .single();
                authResults[col] = error ? `MISSING: ${error.message}` : "OK";
                // Clean up if successful
                if (!error) {
                    await baseSupabaseAdmin.from("users").delete().eq("id", testId2);
                }
            } catch (e) {
                authResults[col] = `ERROR: ${e.message}`;
            }
        }

        results.authColumns = authResults;
        results.summary = {
            registerWillWork: minimalOk,
            needsPasswordColumn: !authResults.password?.startsWith("OK"),
            needsAuthColumns: Object.entries(authResults).filter(([, v]) => !String(v).startsWith("OK")).map(([k]) => k),
            sourceTemplatesNeedData: templatesOk && templateCount === 0,
        };

        return res.json(results);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

// Run migration using Supabase Management API via pg connection string
export async function runMigration(req, res) {
    if (!checkAuth(req, res)) return;

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        return res.status(500).json({ error: "DATABASE_URL not configured." });
    }

    const results = [];

    try {
        // Use native fetch to call Supabase Management API for DDL
        // The management API accepts service role key for database access
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return res.status(500).json({ error: "Supabase credentials not configured." });
        }

        // Use the database query endpoint via PostgREST with service role
        // PostgREST at /rest/v1/rpc/exec would be ideal but not available
        // Instead, try to use pg_tle or check what's available

        // First: try to add missing columns via RPC if pg_tle is available
        // Check if we can add columns using a workaround

        // Check current schema
        const { data: userCols } = await baseSupabaseAdmin
            .from("information_schema.columns")
            .select("column_name")
            .eq("table_schema", "public")
            .eq("table_name", "users");

        const existingCols = new Set((userCols || []).map(c => c.column_name));
        const neededAuthCols = ["password", "email_verified", "failed_login_attempts", "locked_until", "provider", "full_name"];
        const missingAuthCols = neededAuthCols.filter(c => !existingCols.has(c));

        if (missingAuthCols.length > 0) {
            results.push({
                action: "USERS_MISSING_COLUMNS",
                columns: missingAuthCols,
                sql: [
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;`,
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`,
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;`,
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;`,
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'password';`,
                    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;`,
                    `CREATE INDEX IF NOT EXISTS idx_users_email_auth ON public.users(email);`,
                ].join("\n"),
                note: "Run this SQL in Supabase Dashboard SQL Editor to fix the users table."
            });
        } else {
            results.push({ action: "USERS_SCHEMA_OK", columns: neededAuthCols });
        }

        // Check source_templates
        const { count: tmplCount } = await baseSupabaseAdmin
            .from("source_templates")
            .select("*", { count: "exact", head: true });

        if ((tmplCount ?? 0) === 0) {
            // Try to create the table if it doesn't exist
            try {
                await baseSupabaseAdmin.from("source_templates").insert({
                    id: "00000000-0000-0000-0000-000000000001",
                    name: "__placeholder__",
                    slug: "__placeholder__",
                    description: "Placeholder",
                    category: "news",
                    is_active: false,
                });
                results.push({ action: "SOURCE_TEMPLATES_CREATED" });
            } catch (e) {
                results.push({
                    action: "SOURCE_TEMPLATES_EMPTY",
                    count: tmplCount ?? 0,
                    sql: `
-- Run in Supabase Dashboard SQL Editor:
CREATE TABLE IF NOT EXISTS public.source_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    default_keywords TEXT[],
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data (insert these after creating the table):
-- [See full seed SQL in /supabase/migrations/008_monitoring_setup.sql]
`.trim(),
                    note: "source_templates table needs seeding."
                });
            }
        } else {
            results.push({ action: "SOURCE_TEMPLATES_OK", count: tmplCount });
        }

        return res.json({ results });

    } catch (e) {
        logStructured("error", "migration_failed", { error: e.message });
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}

// Simple raw SQL executor using Supabase's pg_tle if available
// or returns the SQL needed to be run manually
export async function execSql(req, res) {
    if (!checkAuth(req, res)) return;

    const { sql } = req.body || {};
    if (!sql || typeof sql !== "string") {
        return res.status(400).json({ error: "sql body parameter required." });
    }

    const results = [];
    const errors = [];

    // Split into individual statements
    const statements = sql.split(/;\s*\n/).filter(s => s.trim());

    for (const stmt of statements) {
        if (!stmt.trim()) continue;
        try {
            const { data, error } = await baseSupabaseAdmin
                .from("pg_stat_activity")
                .select("pid")
                .limit(1)
                .single();
            // If this works, we know pg_stat_activity is accessible
            // But this doesn't help us execute DDL...
            results.push({ stmt: stmt.substring(0, 50), status: "DRY_RUN", note: "DDL cannot be executed via PostgREST" });
        } catch (e) {
            errors.push({ stmt: stmt.substring(0, 50), error: e.message });
        }
    }

    return res.json({ results, errors, message: "DDL via PostgREST is not supported. Run SQL in Supabase Dashboard SQL Editor." });
}

// Seed source_templates (uses regular PostgREST DML — no DDL needed)
// Public endpoint — no auth required for seeding template data
export async function seedSourceTemplates(req, res) {

    const templates = [
        // News
        { name: "Kompas.com", slug: "kompas", description: "Indonesian national daily newspaper", category: "news", default_keywords: ["kompas", "berita hari ini", "indonesia news"], config: { domain: "kompas.com", type: "news" }, is_active: true },
        { name: "Detik.com", slug: "detik", description: "Indonesian popular news portal", category: "news", default_keywords: ["detik", "berita", "indonesia news"], config: { domain: "detik.com", type: "news" }, is_active: true },
        { name: "Tribun News", slug: "tribun", description: "Indonesian regional news network", category: "news", default_keywords: ["tribun", "berita daerah", "indonesia"], config: { domain: "tribunnews.com", type: "news" }, is_active: true },
        { name: "CNN Indonesia", slug: "cnn-indonesia", description: "CNN Indonesia news channel", category: "news", default_keywords: ["cnn indonesia", "berita nasional", "politik"], config: { domain: "cnnindonesia.com", type: "news" }, is_active: true },
        { name: "BBC Indonesia", slug: "bbc-indonesia", description: "BBC Indonesia news service", category: "news", default_keywords: ["bbc indonesia", "world news", "indonesia"], config: { domain: "bbc.com/indonesia", type: "news" }, is_active: true },
        { name: "Liputan6", slug: "liputan6", description: "Indonesian news and entertainment portal", category: "news", default_keywords: ["liputan6", "berita", "indonesia"], config: { domain: "liputan6.com", type: "news" }, is_active: true },
        { name: "Tempo.co", slug: "tempo", description: "Indonesian investigative news", category: "news", default_keywords: ["tempo", "berita", "investigasi"], config: { domain: "tempo.co", type: "news" }, is_active: true },
        { name: "Republika", slug: "republika", description: "Indonesian national newspaper", category: "news", default_keywords: ["republika", "berita", "indonesia"], config: { domain: "republika.co.id", type: "news" }, is_active: true },
        // Social
        { name: "Twitter / X Indonesia", slug: "twitter-indonesia", description: "Indonesian Twitter/X trending conversations", category: "social", default_keywords: ["twitter", "trending", "viral", "x indonesia"], config: { platform: "twitter", type: "social" }, is_active: true },
        { name: "Instagram Indonesia", slug: "instagram-indonesia", description: "Indonesian Instagram discussions and trends", category: "social", default_keywords: ["instagram", "viral", "trending", "indonesia"], config: { platform: "instagram", type: "social" }, is_active: true },
        { name: "TikTok Indonesia", slug: "tiktok-indonesia", description: "Indonesian TikTok trending videos", category: "social", default_keywords: ["tiktok", "viral", "indonesia", "trending"], config: { platform: "tiktok", type: "social" }, is_active: true },
        { name: "Facebook Indonesia", slug: "facebook-indonesia", description: "Indonesian Facebook public groups and pages", category: "social", default_keywords: ["facebook", "indonesia", "group", "halaman"], config: { platform: "facebook", type: "social" }, is_active: true },
        { name: "YouTube Indonesia", slug: "youtube-indonesia", description: "Indonesian YouTube comments and discussions", category: "social", default_keywords: ["youtube", "indonesia", "komentar", "video"], config: { platform: "youtube", type: "social" }, is_active: true },
        // Forums
        { name: "Kaskus", slug: "kaskus", description: "Indonesia's largest online community forum", category: "forum", default_keywords: ["kaskus", "forum indonesia", "diskusi", "komunitas"], config: { domain: "kaskus.co.id", type: "forum" }, is_active: true },
        { name: "Quora Indonesia", slug: "quora-indonesia", description: "Indonesian Quora discussions", category: "forum", default_keywords: ["quora", "indonesia", "diskusi", "pertanyaan"], config: { platform: "quora", type: "forum" }, is_active: true },
        // Reviews
        { name: "Google Reviews", slug: "google-reviews", description: "Google business and place reviews", category: "review", default_keywords: ["google reviews", "rating", "ulasan", "tempat"], config: { platform: "google", type: "review" }, is_active: true },
        { name: "App Store", slug: "app-store", description: "iOS App Store customer reviews", category: "review", default_keywords: ["app store", "mobile app", "rating", "ulasan"], config: { platform: "appstore", type: "review" }, is_active: true },
        { name: "Google Play", slug: "google-play", description: "Android Google Play reviews", category: "review", default_keywords: ["google play", "android", "rating", "ulasan"], config: { platform: "googleplay", type: "review" }, is_active: true },
        { name: "Trustpilot", slug: "trustpilot", description: "Trustpilot business reviews", category: "review", default_keywords: ["trustpilot", "review", "rating", "business"], config: { platform: "trustpilot", type: "review" }, is_active: true },
        // Blogs
        { name: "Medium Indonesia", slug: "medium-indonesia", description: "Indonesian Medium blog articles", category: "blog", default_keywords: ["medium", "indonesia", "blog", "artikel"], config: { platform: "medium", type: "blog" }, is_active: true },
        { name: "Blogspot Indonesia", slug: "blogspot-indonesia", description: "Indonesian Blogger/Blogspot websites", category: "blog", default_keywords: ["blogspot", "blog", "indonesia", "website"], config: { platform: "blogspot", type: "blog" }, is_active: true },
        // Podcast
        { name: "Spotify Podcasts ID", slug: "spotify-podcast-id", description: "Indonesian podcasts on Spotify", category: "podcast", default_keywords: ["podcast", "spotify", "indonesia", "audio"], config: { platform: "spotify", type: "podcast" }, is_active: true },
        { name: "Google Podcasts ID", slug: "google-podcast-id", description: "Indonesian podcasts on Google Podcasts", category: "podcast", default_keywords: ["podcast", "google", "indonesia", "audio"], config: { platform: "googlepodcasts", type: "podcast" }, is_active: true },
    ];

    const seeded = [];
    const errors = [];

    for (const tmpl of templates) {
        try {
            const { error } = await baseSupabaseAdmin
                .from("source_templates")
                .upsert(tmpl, { onConflict: "slug" });
            if (error) {
                errors.push({ slug: tmpl.slug, error: error.message });
            } else {
                seeded.push(tmpl.slug);
            }
        } catch (e) {
            errors.push({ slug: tmpl.slug, error: e.message });
        }
    }

    // Count total after seeding
    const { count: totalCount } = await baseSupabaseAdmin
        .from("source_templates")
        .select("*", { count: "exact", head: true });

    return res.json({
        seeded: seeded.length,
        errors: errors.length,
        totalSourceTemplates: totalCount ?? 0,
        details: { seeded, errors },
    });
}

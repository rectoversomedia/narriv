/**
 * Demo Database Seed Script
 *
 * Creates realistic sample data for:
 * - Product demos
 * - Sales presentations
 * - Training environments
 * - Testing scenarios
 */

import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";

// Demo workspace configuration
const DEMO_CONFIG = {
    workspace: {
        name: "Kementerian Komunikasi dan Digital",
        slug: "kominfo-demo",
        industry: "Government",
        brandName: "KOMINFODIGITAL",
    },
    users: [
        {
            email: "demo@narriv.digital",
            password: "Demo@2026!",
            name: "Admin Demo",
            role: "admin",
        },
        {
            email: "operator@narriv.digital",
            password: "Demo@2026!",
            name: "Operator Demo",
            role: "editor",
        },
        {
            email: "viewer@narriv.digital",
            password: "Demo@2026!",
            name: "Viewer Demo",
            role: "viewer",
        },
    ],
    sources: [
        {
            name: "Twitter/X Indonesia",
            type: "social",
            platform: "twitter",
            keywords: ["kominfo", "digital", "kemkominfo", "internet", "data"],
            enabled: true,
        },
        {
            name: "Facebook Indonesia",
            type: "social",
            platform: "facebook",
            keywords: ["kominfo", "digital", "pemerintah"],
            enabled: true,
        },
        {
            name: "Portal Berita Online",
            type: "news",
            platform: "web",
            keywords: ["kementerian", "digital", "teknologi", "internet"],
            enabled: true,
        },
        {
            name: "Instagram Resmi",
            type: "social",
            platform: "instagram",
            keywords: ["kominfo", "digitalisasi"],
            enabled: true,
        },
        {
            name: "YouTube Channels",
            type: "social",
            platform: "youtube",
            keywords: ["kominfo", "digital", "indonesia"],
            enabled: false,
        },
    ],
    signalTemplates: [
        {
            title: "讨论: Revisi Permenkominfo Kontroversi",
            content: "Banyak warganet yang mempermasalahkan rencana revisi Peraturan Menteri Komunikasi dan Informatika yang dinilai dapat membatasi kebebasan berekspresi di ruang digital.热议: #Mhenkomenkominfo menjadi trending topic dengan lebih dari 50.000 percakapan.",
            sentiment: "negative",
            source: "Twitter/X Indonesia",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Berita: Program Digitalisasi Sekolah Maju",
            content: "Kementerian Komunikasi dan Digital mengumumkan keberhasilan program digitalisasi sekolah di 1000 sekolah yang tersebar di berbagai daerah. Program ini menyediakan infrastruktur internet dan pelatihan guru untuk pembelajaran digital.",
            sentiment: "positive",
            source: "Portal Berita Online",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Posting: hoaks vaccine information spread",
            content: "Warning: Multiple accounts spreading false information about vaccines. Our monitoring detected coordinated inauthentic behavior spreading health misinformation in Indonesian language groups.",
            sentiment: "negative",
            source: "Facebook Indonesia",
            region: "Indonesia",
            language: "en",
            publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Thread: Concerns about data privacy Bill",
            content: "Warga masyarakat sipil menyampaikan keprihatinan terhadap UU Pelindungan Data Pribadi yang baru disahkan. Mereka berharap implementasi dapat dilakukan dengan transparan dan memperhatikan hak-hak warga negara.",
            sentiment: "neutral",
            source: "Twitter/X Indonesia",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Artikel: Startup Digital Indonesia Tumbuh 30%",
            content: "Sektor startup digital di Indonesia menunjukkan pertumbuhan signifikan sebesar 30% YoY. Kemenkominfo mendukung pertumbuhan ini melalui berbagai program pendukung ekosistem digital nasional.",
            sentiment: "positive",
            source: "Portal Berita Online",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Viral: Government website downtime complaint",
            content: "Banyak keluhan dari masyarakat karena layanan pemerintah berbasis digital mengalami gangguan. Warga kesulitan mengakses layanan karena website tidak bisa dibuka sejak kemarin malam.",
            sentiment: "negative",
            source: "Twitter/X Indonesia",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Update: Cybersecurity awareness campaign launched",
            content: "Kemenkominfo luncurkan kampanye nasional kesadaran keamanan siber. Kampanye ini bertujuan meningkatkan pemahaman masyarakat tentang pentingnya keamanan data pribadi di era digital.",
            sentiment: "positive",
            source: "Instagram Resmi",
            region: "Indonesia",
            language: "id",
            publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            title: "Discussion: Social media blackout protest",
            content: " coordinated protest calling for social media blackout to protest new regulations. Online mobilization detected across multiple platforms organizing for next week.",
            sentiment: "neutral",
            source: "Twitter/X Indonesia",
            region: "Indonesia",
            language: "en",
            publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        },
    ],
    alertTemplates: [
        {
            title: "Krisis Reputasi: hoaks vaccine",
            description: "Penyebaran hoaks vaccine meningkat 300% dalam 24 jam terakhir.Perlu respons cepat untuk mitigasi dampak negatif terhadap program vaccination nasional.",
            severity: "critical",
            type: "reputational",
            status: "open",
        },
        {
            title: "Gangguan Layanan Digital",
            description: "Keluhan masyarakat tentang ketidaktersediaan layanan digital pemerintah meningkat. Time to resolution target: 4 jam.",
            severity: "high",
            type: "operational",
            status: "acknowledged",
        },
        {
            title: "Sentimen Negatif: Regulasi Baru",
            description: "Net sentiment untuk regulasi terbaru menunjukkan -15% dalam seminggu. Deteksi meningkatnya percakapan negatif di media sosial.",
            severity: "medium",
            type: "reputational",
            status: "open",
        },
        {
            title: "Ancaman Keamanan Siber Terdeteksi",
            description: "Tim keamanan mendeteksi percobaan intrusion pada sistem. Immediate action required untuk prevent data breach.",
            severity: "critical",
            type: "security",
            status: "investigating",
        },
    ],
    narrativeClusterTemplates: [
        {
            title: "Digitalisasi Layanan Publik",
            description: "Klaster narasi tentang transformasi digital layanan pemerintah, termasuk antrean online, e-government, dan smart city initiatives.",
            priority: "high",
            velocity: "accelerating",
            signalCount: 156,
            sentiment: 0.72,
        },
        {
            title: "Keamanan Data Pribadi",
            description: "Diskusi publik tentang perlindungan data pribadi, UU PDP, dan praktik keamanan siber di kalangan masyarakat.",
            priority: "high",
            velocity: "stable",
            signalCount: 89,
            sentiment: 0.45,
        },
        {
            title: "Literasi Digital",
            description: "Upaya pemerintah dan masyarakat dalam meningkatkan kemampuan digital, termasuk pendidikan teknologi dan akses internet.",
            priority: "medium",
            velocity: "growing",
            signalCount: 234,
            sentiment: 0.68,
        },
        {
            title: "Regulasi Platform Digital",
            description: "Perdebatan tentang peran pemerintah dalam mengatur platform digital, media sosial, dan ekonomi gig.",
            priority: "high",
            velocity: "accelerating",
            signalCount: 312,
            sentiment: 0.32,
        },
    ],
    reportTemplates: [
        {
            name: "Briefing Harian",
            type: "daily_briefing",
            description: "Ringkasan harian monitoring narasi digital",
            sections: ["summary", "top_signals", "sentiment_trend", "recommendations"],
        },
        {
            name: "Weekly Intelligence Report",
            type: "weekly_intelligence",
            description: "Laporan mingguan intelligence narrative",
            sections: ["executive_summary", "key_themes", "sentiment_analysis", "emerging_risks", "action_items"],
        },
        {
            name: "Crisis Alert Report",
            type: "crisis_report",
            description: "Laporan darurat untuk krisis yang terdeteksi",
            sections: ["incident_overview", "impact_assessment", "stakeholder_map", "response_plan"],
        },
    ],
};

/**
 * Generate random ID
 */
function generateId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hash password
 */
async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

/**
 * Seed demo data
 */
async function seedDemoData(supabaseUrl, supabaseKey) {
    console.log("🚀 Starting demo data seed...\n");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const workspaceId = generateId();
    const results = {
        workspace: null,
        users: [],
        sources: [],
        signals: [],
        alerts: [],
        narratives: [],
        reports: [],
    };

    try {
        // 1. Create demo workspace
        console.log("📦 Creating demo workspace...");
        const { data: workspace, error: wsError } = await supabase
            .from("workspaces")
            .insert({
                id: workspaceId,
                name: DEMO_CONFIG.workspace.name,
                slug: DEMO_CONFIG.workspace.slug,
            })
            .select()
            .single();

        if (wsError) {
            console.error("Workspace creation error:", wsError);
            throw wsError;
        }
        results.workspace = workspace;
        console.log(`   ✅ Workspace: ${workspace.name} (${workspaceId})\n`);

        // 2. Create demo users
        console.log("👥 Creating demo users...");
        for (const userTemplate of DEMO_CONFIG.users) {
            const passwordHash = await hashPassword(userTemplate.password);

            const { data: user, error: userError } = await supabase
                .from("users")
                .insert({
                    email: userTemplate.email,
                    name: userTemplate.name,
                    password_hash: passwordHash,
                    email_verified: true,
                })
                .select()
                .single();

            if (userError) {
                console.warn(`   ⚠️ User ${userTemplate.email}:`, userError.message);
                continue;
            }

            // Add to workspace
            await supabase.from("workspace_members").insert({
                user_id: user.id,
                workspace_id: workspaceId,
                role: userTemplate.role,
            });

            results.users.push({ ...user, role: userTemplate.role });
            console.log(`   ✅ ${user.name} (${userTemplate.role})`);
        }
        console.log("");

        // 3. Create data sources
        console.log("📡 Creating data sources...");
        for (const sourceTemplate of DEMO_CONFIG.sources) {
            const { data: source, error: srcError } = await supabase
                .from("sources")
                .insert({
                    workspace_id: workspaceId,
                    name: sourceTemplate.name,
                    type: sourceTemplate.type,
                    platform: sourceTemplate.platform,
                    keywords: sourceTemplate.keywords,
                    enabled: sourceTemplate.enabled,
                    status: "active",
                })
                .select()
                .single();

            if (srcError) {
                console.warn(`   ⚠️ Source ${sourceTemplate.name}:`, srcError.message);
                continue;
            }

            results.sources.push(source);
            console.log(`   ✅ ${source.name} (${sourceTemplate.platform})`);
        }
        console.log("");

        // 4. Create signals
        console.log("📰 Creating sample signals...");
        for (let i = 0; i < DEMO_CONFIG.signalTemplates.length; i++) {
            const signalTemplate = DEMO_CONFIG.signalTemplates[i];
            const signalId = generateId();

            const { data: signal, error: sigError } = await supabase
                .from("signals")
                .insert({
                    id: signalId,
                    workspace_id: workspaceId,
                    source_id: results.sources[i % results.sources.length]?.id,
                    title: signalTemplate.title,
                    content: signalTemplate.content,
                    sentiment: signalTemplate.sentiment,
                    source: signalTemplate.source,
                    region: signalTemplate.region,
                    language: signalTemplate.language,
                    published_at: signalTemplate.publishedAt,
                    captured_at: new Date().toISOString(),
                    status: "captured",
                })
                .select()
                .single();

            if (sigError) {
                console.warn(`   ⚠️ Signal:`, sigError.message);
                continue;
            }

            results.signals.push(signal);

            // Create AI analysis for some signals
            if (i % 2 === 0) {
                await supabase.from("signal_analyses").insert({
                    signal_id: signalId,
                    sentiment_score: signalTemplate.sentiment === "positive" ? 0.8 : signalTemplate.sentiment === "negative" ? 0.2 : 0.5,
                    impact_level: signalTemplate.sentiment === "negative" ? "high" : "medium",
                    summary: `AI-generated analysis for: ${signalTemplate.title.substring(0, 50)}...`,
                    confidence: 0.85,
                    created_at: new Date().toISOString(),
                });
            }

            console.log(`   ✅ Signal #${i + 1}: ${signalTemplate.title.substring(0, 40)}...`);
        }
        console.log("");

        // 5. Create alerts
        console.log("🚨 Creating sample alerts...");
        for (let i = 0; i < DEMO_CONFIG.alertTemplates.length; i++) {
            const alertTemplate = DEMO_CONFIG.alertTemplates[i];
            const alertId = generateId();

            const { data: alert, error: alertError } = await supabase
                .from("alerts")
                .insert({
                    id: alertId,
                    workspace_id: workspaceId,
                    title: alertTemplate.title,
                    description: alertTemplate.description,
                    severity: alertTemplate.severity,
                    type: alertTemplate.type,
                    status: alertTemplate.status,
                    signal_count: Math.floor(Math.random() * 50) + 10,
                    created_at: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (alertError) {
                console.warn(`   ⚠️ Alert:`, alertError.message);
                continue;
            }

            results.alerts.push(alert);
            console.log(`   ✅ [${alert.severity.toUpperCase()}] ${alert.title}`);
        }
        console.log("");

        // 6. Create narrative clusters
        console.log("🧠 Creating narrative clusters...");
        for (const narrativeTemplate of DEMO_CONFIG.narrativeClusterTemplates) {
            const { data: narrative, error: narrError } = await supabase
                .from("narrative_clusters")
                .insert({
                    workspace_id: workspaceId,
                    title: narrativeTemplate.title,
                    description: narrativeTemplate.description,
                    priority: narrativeTemplate.priority,
                    velocity: narrativeTemplate.velocity,
                    signal_count: narrativeTemplate.signalCount,
                    sentiment: narrativeTemplate.sentiment,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (narrError) {
                console.warn(`   ⚠️ Narrative:`, narrError.message);
                continue;
            }

            results.narratives.push(narrative);
            console.log(`   ✅ ${narrative.title} (${narrative.signalCount} signals)`);
        }
        console.log("");

        // 7. Create report templates
        console.log("📊 Creating report templates...");
        for (const reportTemplate of DEMO_CONFIG.reportTemplates) {
            const { data: template, error: tmplError } = await supabase
                .from("report_templates")
                .insert({
                    workspace_id: workspaceId,
                    name: reportTemplate.name,
                    type: reportTemplate.type,
                    description: reportTemplate.description,
                    sections: reportTemplate.sections,
                    is_system: false,
                    created_by: results.users[0]?.id,
                })
                .select()
                .single();

            if (tmplError) {
                console.warn(`   ⚠️ Template:`, tmplError.message);
                continue;
            }

            results.reports.push(template);
            console.log(`   ✅ ${template.name}`);
        }
        console.log("");

        // Summary
        console.log("=".repeat(60));
        console.log("✅ Demo data seeded successfully!\n");
        console.log("📊 Summary:");
        console.log(`   • Workspace: ${results.workspace?.name || "N/A"}`);
        console.log(`   • Users: ${results.users.length}`);
        console.log(`   • Sources: ${results.sources.length}`);
        console.log(`   • Signals: ${results.signals.length}`);
        console.log(`   • Alerts: ${results.alerts.length}`);
        console.log(`   • Narratives: ${results.narratives.length}`);
        console.log(`   • Templates: ${results.reports.length}`);
        console.log("");
        console.log("🔑 Demo Credentials:");
        console.log("   Admin: demo@narriv.digital / Demo@2026!");
        console.log("   Operator: operator@narriv.digital / Demo@2026!");
        console.log("   Viewer: viewer@narriv.digital / Demo@2026!");
        console.log("=".repeat(60));

        return results;
    } catch (error) {
        console.error("❌ Seed failed:", error);
        throw error;
    }
}

/**
 * Clean demo data
 */
async function cleanDemoData(supabaseUrl, supabaseKey) {
    console.log("🧹 Cleaning demo data...\n");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete in reverse order of creation (respecting foreign keys)
    const tables = [
        "report_schedules",
        "report_exports",
        "reports",
        "report_templates",
        "narrative_cluster_signals",
        "narrative_clusters",
        "alert_assignments",
        "alerts",
        "signal_analyses",
        "signals",
        "sources",
        "workspace_notification_settings",
        "workspace_settings",
        "workspace_members",
        "workspaces",
        "users",
    ];

    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
            if (error) {
                console.log(`   ⚠️ ${table}: ${error.message}`);
            } else {
                console.log(`   ✅ ${table}`);
            }
        } catch (err) {
            console.log(`   ⚠️ ${table}: ${err.message}`);
        }
    }

    console.log("\n✅ Demo data cleaned!");
}

// Export for use
export { seedDemoData, cleanDemoData, DEMO_CONFIG };

// CLI execution
const args = process.argv.slice(2);
const command = args[0];
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!command) {
    console.log("Usage: node seed-demo.js [seed|clean]");
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required");
    process.exit(1);
}

if (command === "seed") {
    seedDemoData(supabaseUrl, supabaseKey)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else if (command === "clean") {
    cleanDemoData(supabaseUrl, supabaseKey)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    console.log("Unknown command:", command);
    console.log("Usage: node seed-demo.js [seed|clean]");
    process.exit(1);
}

/**
 * Demo workspace datasets. Each scenario (brand, government, CVE) is a definition of fictional content seeded by
 * one routine, seedScenarioWorkspace. The brand scenario is a fictional bank ("Bank Arunika"), fictional
 * competitors and fictional media, so crises, complaints and critical alerts can be shown without attributing
 * anything to a real company or outlet; the other scenarios live in demo-scenarios.js. Records carry no links.
 * Every date is relative to `now`, so a reseed makes a demo current again; the daily cron reseeds a scenario when
 * its newest record is older than a day.
 *
 * Only demo workspaces are touched. Members and the escalation matrix are kept.
 */

import { baseSupabaseAdmin as defaultDb } from "../../lib/supabase.js";
import { DEMO_WORKSPACE_ID, DEMO_WORKSPACES } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

export const DEMO_BRAND = "Bank Arunika";
const COMPETITORS = ["Bank Seroja", "KoinKu"];

// The demo team. Fictional people with no password (they cannot sign in); they own the demo's alerts,
// plans and cases so a presentation shows names and roles instead of test accounts.
export const DEMO_PERSONAS = [
    { key: "rina", email: "rina.wulandari@demo.narriv.digital", name: "Rina Wulandari", title: "Head of Corporate Communications", role: "owner" },
    { key: "bayu", email: "bayu.pratama@demo.narriv.digital", name: "Bayu Pratama", title: "PR Manager", role: "admin" },
    { key: "sari", email: "sari.kusuma@demo.narriv.digital", name: "Sari Kusuma", title: "Social Media Analyst", role: "analyst" },
    { key: "dimas", email: "dimas.hartono@demo.narriv.digital", name: "Dimas Hartono", title: "Customer Care Lead", role: "analyst" },
];

/** Make the personas the demo workspace's only members; returns persona key → user id. */
export async function ensureDemoPersonas(db = defaultDb, ws = DEMO_WORKSPACE_ID, personas = DEMO_PERSONAS) {
    const ids = {};
    for (const p of personas) {
        const { data: existing } = await db.from("users").select("id").eq("email", p.email).maybeSingle();
        if (existing?.id) {
            await db.from("users").update({ name: `${p.name} · ${p.title}`, full_name: p.name }).eq("id", existing.id);
            ids[p.key] = existing.id;
        } else {
            const created = await must(db.from("users").insert({ email: p.email, name: `${p.name} · ${p.title}`, full_name: p.name, provider: "demo-persona", email_verified: true, password: null }).select("id").single(), "persona user");
            ids[p.key] = created.id;
        }
    }
    const personaIds = Object.values(ids);
    const { data: members } = await db.from("workspace_members").select("id, user_id").eq("workspace_id", ws);
    const stale = (members || []).filter((m) => !personaIds.includes(m.user_id)).map((m) => m.id);
    if (stale.length) await must(db.from("workspace_members").delete().in("id", stale), "remove old members");
    for (const p of personas) {
        if (!(members || []).some((m) => m.user_id === ids[p.key])) {
            await must(db.from("workspace_members").insert({ workspace_id: ws, user_id: ids[p.key], role: p.role }), "persona member");
        }
    }
    return ids;
}

const H = 3600 * 1000;
const D = 24 * H;

// Deterministic randomness so a reseed is stable within a day and varied across days.
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const NEWS = ["Warta Finansial", "Kabar Ekonomi Nusantara", "Portal Bisnis Indonesia", "Harian Pasar Modal", "Suara Konsumen", "Fintech Harian", "Media Perbankan", "Nusantara Daily"];
const X_ACCOUNTS = ["@nadia_rk", "@budi.santoso", "@rina_finance", "@fajar.dev", "@ibu_umkm", "@kopi_pagi", "@ari.trader", "@sasa.kuliner", "@hendra_it", "@lia.travel"];
const IG_ACCOUNTS = ["@umkm.naikkelas", "@kulinerjakarta", "@infokeuangan.id", "@ceritaibuibu", "@startup.lokal"];
const TT_ACCOUNTS = ["@finfluencer.id", "@cuanbareng", "@melekfinansial", "@kreator.umkm"];
const YT_ACCOUNTS = ["Ngobrol Finansial", "Review Bank Indonesia", "Kanal Ekonomi"];
const FB_ACCOUNTS = ["Komunitas Nasabah Arunika", "Grup UMKM Jawa Timur", "Info Promo Indonesia"];

const BRAND_AUTHORS = { news: NEWS, twitter: X_ACCOUNTS, instagram: IG_ACCOUNTS, tiktok: TT_ACCOUNTS, youtube: YT_ACCOUNTS, facebook: FB_ACCOUNTS };

function authorFor(platform, r, authors = BRAND_AUTHORS) {
    const pick = (list) => list[Math.floor(r() * list.length)];
    return pick(authors[platform] || authors.facebook);
}

/**
 * Narratives: what the demo is about. `shape` sets when the records happen (hours ago):
 * spike = mostly the last 36h, rising = more each day, steady = spread over 30 days, fading = mostly 2-4 weeks ago.
 */
const NARRATIVES = [
    {
        key: "outage", title: "Gangguan Arunika Mobile di jam sibuk", sentiment: "negative", impact: "HIGH", lifecycle: "accelerating", shape: "rising", count: 46,
        keyword: "Arunika Mobile", platforms: ["twitter", "twitter", "news", "tiktok", "facebook", "instagram"],
        titles: [
            "Arunika Mobile tidak bisa login sejak pagi, nasabah mengeluh di media sosial",
            "Transfer gagal tapi saldo terpotong, pengguna Arunika Mobile minta kejelasan",
            "Aplikasi Arunika Mobile lambat saat jam makan siang",
            "Gangguan Arunika Mobile berulang, nasabah pertanyakan keandalan sistem",
            "Bank Arunika akui gangguan layanan digital, janji pulih hari ini",
            "Pengguna laporkan error 503 di Arunika Mobile saat gajian",
            "Antrean call center Bank Arunika panjang akibat gangguan aplikasi",
            "Video keluhan aplikasi Arunika Mobile viral di TikTok",
        ],
        summary: "Keluhan gangguan login dan transfer gagal di Arunika Mobile meningkat tiap hari, terutama saat jam sibuk dan tanggal gajian.",
    },
    {
        key: "dataleak", title: "Isu kebocoran data nasabah (belum terkonfirmasi)", sentiment: "negative", impact: "HIGH", lifecycle: "emerging", shape: "spike", count: 22,
        keyword: "Bank Arunika", platforms: ["twitter", "twitter", "news", "facebook"],
        titles: [
            "Beredar klaim data nasabah Bank Arunika dijual di forum gelap",
            "Bank Arunika diminta klarifikasi soal dugaan kebocoran data",
            "Pakar keamanan siber: klaim kebocoran data Bank Arunika perlu diverifikasi",
            "Nasabah khawatir, minta Bank Arunika umumkan langkah perlindungan data",
            "Tangkapan layar diduga data nasabah Bank Arunika menyebar di X",
        ],
        summary: "Klaim kebocoran data nasabah menyebar cepat dalam 36 jam terakhir dan belum ada klarifikasi resmi.",
    },
    {
        key: "fees", title: "Keluhan kenaikan biaya transfer antarbank", sentiment: "negative", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 24,
        keyword: "Bank Arunika", platforms: ["twitter", "news", "facebook", "instagram"],
        titles: [
            "Nasabah protes biaya transfer antarbank Bank Arunika naik",
            "Biaya admin bulanan Bank Arunika dibandingkan bank lain",
            "Konsumen minta Bank Arunika tinjau ulang biaya transfer",
            "Lembaga konsumen soroti transparansi biaya layanan bank digital",
        ],
        summary: "Keluhan soal biaya transfer dan biaya admin stabil tinggi selama sebulan, sering dibandingkan dengan pesaing.",
    },
    {
        key: "umkm", title: "Program UMKM Naik Kelas dapat respons positif", sentiment: "positive", impact: "MEDIUM", lifecycle: "accelerating", shape: "rising", count: 34,
        keyword: "Bank Arunika", platforms: ["news", "instagram", "instagram", "youtube", "facebook", "tiktok"],
        titles: [
            "Program UMKM Naik Kelas Bank Arunika bantu 5.000 pelaku usaha",
            "Pelaku UMKM Surabaya ceritakan manfaat pelatihan Bank Arunika",
            "Bank Arunika salurkan kredit usaha mikro dengan bunga ringan",
            "Testimoni penjual kuliner setelah ikut UMKM Naik Kelas",
            "Bank Arunika gandeng pemerintah daerah perluas pelatihan UMKM",
        ],
        summary: "Liputan dan testimoni positif soal program UMKM terus bertambah, terutama di Instagram dan media daerah.",
    },
    {
        key: "promo", title: "Promo cashback ArunikaPay ramai dibahas", sentiment: "mixed", impact: "LOW", lifecycle: "peaking", shape: "steady", count: 26,
        keyword: "ArunikaPay", platforms: ["instagram", "tiktok", "twitter", "facebook"],
        titles: [
            "Promo cashback 50% ArunikaPay bikin antre di kasir",
            "Cashback ArunikaPay belum masuk, pengguna tanya syarat promo",
            "Cara dapat cashback maksimal ArunikaPay akhir pekan ini",
            "Promo ArunikaPay disebut lebih menarik dari dompet digital lain",
        ],
        summary: "Promo cashback ramai dibicarakan; sebagian besar antusias, tapi ada keluhan cashback telat masuk.",
    },
    {
        key: "earnings", title: "Laba kuartal III Bank Arunika tumbuh", sentiment: "positive", impact: "MEDIUM", lifecycle: "declining", shape: "fading", count: 18,
        keyword: "Bank Arunika", platforms: ["news", "news", "youtube"],
        titles: [
            "Laba bersih Bank Arunika kuartal III naik 18%",
            "Kredit Bank Arunika tumbuh dua digit, kualitas aset terjaga",
            "Analis: kinerja Bank Arunika di atas rata-rata industri",
            "Saham Bank Arunika menguat usai rilis laporan keuangan",
        ],
        summary: "Pemberitaan kinerja keuangan positif, kini mulai mereda setelah puncaknya dua pekan lalu.",
    },
    {
        key: "competitor", title: "Perbandingan layanan digital dengan Bank Seroja", sentiment: "mixed", impact: "MEDIUM", lifecycle: "emerging", shape: "rising", count: 20,
        keyword: "Bank Arunika", platforms: ["twitter", "youtube", "tiktok", "news"],
        titles: [
            "Adu fitur aplikasi Bank Arunika dan Bank Seroja",
            "Nasabah bandingkan kecepatan transfer Bank Arunika vs Bank Seroja",
            "Review jujur: pindah dari Bank Seroja ke Bank Arunika",
            "KoinKu dan Bank Arunika bersaing rebut pengguna muda",
        ],
        summary: "Konten perbandingan dengan Bank Seroja dan KoinKu meningkat, nadanya campur: unggul di promo, kalah di stabilitas aplikasi.",
    },
    {
        key: "branch", title: "Antrean panjang di kantor cabang Surabaya", sentiment: "negative", impact: "LOW", lifecycle: "declining", shape: "fading", count: 12,
        keyword: "Bank Arunika", platforms: ["twitter", "facebook", "news"],
        titles: [
            "Antrean kantor cabang Bank Arunika Surabaya mengular",
            "Nasabah keluhkan pelayanan lambat di cabang Bank Arunika",
            "Bank Arunika tambah loket di cabang Surabaya",
        ],
        summary: "Keluhan antrean di cabang Surabaya sempat ramai tiga pekan lalu dan sudah menurun setelah loket ditambah.",
    },
    {
        key: "literacy", title: "Kolaborasi kreator soal literasi keuangan", sentiment: "positive", impact: "LOW", lifecycle: "emerging", shape: "rising", count: 18,
        keyword: "Bank Arunika", platforms: ["tiktok", "tiktok", "instagram", "youtube"],
        titles: [
            "Kreator TikTok dan Bank Arunika ajak anak muda menabung",
            "Seri video literasi keuangan Bank Arunika ditonton jutaan kali",
            "Tips atur gaji ala kolaborasi Bank Arunika",
        ],
        summary: "Konten edukasi keuangan bersama kreator mendapat respons positif dan terus bertambah.",
    },
];

function hoursAgo(shape, r) {
    if (shape === "spike") return r() < 0.8 ? r() * 36 : 36 + r() * 72;
    if (shape === "rising") return Math.pow(r(), 1.8) * 30 * 24; // dense near now
    if (shape === "fading") return 7 * 24 + r() * 23 * 24; // 1-4 weeks ago
    return r() * 30 * 24; // steady
}

const SENTIMENT_OF = { negative: "NEGATIVE", positive: "POSITIVE", mixed: "MIXED", neutral: "NEUTRAL" };

function signalSentiment(narrative, r) {
    // The narrative's tone with some neutral voices. Never the opposite tone: the headlines are written in the
    // narrative's tone, and a complaint headline labelled "positive" reads as a broken analysis in a demo.
    const x = r();
    if (narrative.sentiment === "mixed") return x < 0.3 ? "POSITIVE" : x < 0.55 ? "NEGATIVE" : x < 0.85 ? "MIXED" : "NEUTRAL";
    if (x < 0.82) return SENTIMENT_OF[narrative.sentiment];
    return x < 0.94 ? "NEUTRAL" : "MIXED";
}

async function must(promise, what) {
    const { data, error } = await promise;
    if (error) throw new Error(`${what}: ${error.message}`);
    return data;
}

async function chunkedInsert(db, table, rows, select = "id") {
    const out = [];
    for (let i = 0; i < rows.length; i += 200) {
        const part = await must(db.from(table).insert(rows.slice(i, i + 200)).select(select), `insert ${table}`);
        out.push(...part);
    }
    return out;
}

/** Remove the demo workspace's content (members and escalation matrix stay). */
export async function clearDemoWorkspace(db = defaultDb, ws = DEMO_WORKSPACE_ID) {
    const ids = async (table, col = "id", filter = (q) => q.eq("workspace_id", ws)) => (await must(filter(db.from(table).select(col)), `read ${table}`)).map((r) => r[col]);
    const signalIds = await ids("signals");
    const clusterIds = await ids("narrative_clusters");
    const reportIds = await ids("reports");
    const resultIds = await ids("ai_visibility_results");
    for (let i = 0; i < signalIds.length; i += 200) await must(db.from("signal_analyses").delete().in("signal_id", signalIds.slice(i, i + 200)), "clear analyses");
    for (let i = 0; i < clusterIds.length; i += 200) await must(db.from("narrative_cluster_signals").delete().in("cluster_id", clusterIds.slice(i, i + 200)), "clear cluster links");
    if (reportIds.length) await must(db.from("report_exports").delete().in("report_id", reportIds), "clear exports");
    if (resultIds.length) await must(db.from("prompt_test_runs").delete().in("visibility_result_id", resultIds), "clear prompt runs");
    for (const table of ["prompt_test_runs", "ai_visibility_results", "ai_feedback", "generated_assets", "report_schedules", "reports", "report_templates", "cases", "action_plans", "alerts", "narrative_clusters", "signals", "raw_documents", "ingestion_jobs", "sources", "monitoring_keywords", "app_notifications", "audit_logs"]) {
        await must(db.from(table).delete().eq("workspace_id", ws), `clear ${table}`);
    }
}

/**
 * The brand scenario: Bank Arunika. Everything that differs between scenarios is here; seedScenarioWorkspace
 * reads it. Functions receive the seeded people, the narrative membership and the clock.
 */
export const BRAND_SCENARIO = {
    key: "brand",
    version: 2,
    // Workspace logo (workspaces.logo_url), served by the frontend from public/brand/demo-logos.
    logo: "/brand/demo-logos/arunika.png",
    ws: DEMO_WORKSPACE_ID,
    brand: DEMO_BRAND,
    industry: "Perbankan",
    competitors: COMPETITORS,
    personas: DEMO_PERSONAS,
    keywords: ["Bank Arunika", "Arunika Mobile", "ArunikaPay"],
    authors: BRAND_AUTHORS,
    narratives: NARRATIVES,
    region: (platform, r) => (platform === "news" ? "Nasional" : ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar"][Math.floor(r() * 5)]),
    criticalKey: "dataleak",
    alerts: (people, owner) => [
        { key: "dataleak", title: "Lonjakan isu kebocoran data: Bank Arunika", type: "risk", severity: "critical", status: "open", team: null, to: null, deadlineIn: 2 * H, ago: 5 * H, level: "critical",
          what: "Klaim kebocoran data nasabah menyebar di X dan forum dalam 36 jam terakhir; mayoritas bernada negatif.", why: "Isu keamanan data cepat merusak kepercayaan dan bisa menarik perhatian regulator.", todo: "Siapkan pernyataan sementara dalam 2 jam, minta tim IT memverifikasi klaim, dan tunjuk juru bicara." },
        { key: "outage", title: "Lonjakan sentimen negatif: Arunika Mobile", type: "risk", severity: "high", status: "acknowledged", team: "Operasional & IT", to: people.bayu, deadlineIn: -3 * H, ago: 30 * H, level: "high",
          what: "Keluhan login dan transfer gagal di Arunika Mobile naik tajam saat jam sibuk.", why: "Gangguan berulang menurunkan kepercayaan pada layanan digital dan memicu perpindahan ke pesaing.", todo: "Publikasikan status pemulihan, perbarui setiap 2 jam, dan balas keluhan teratas di X." },
        { key: "fees", title: "Keluhan biaya transfer meningkat: Bank Arunika", type: "risk", severity: "medium", status: "open", team: "Layanan Pelanggan", to: null, deadlineIn: 2 * D, ago: 3 * D, level: "medium",
          what: "Keluhan biaya transfer antarbank konsisten tinggi selama sebulan.", why: "Isu harga mudah dibandingkan dengan pesaing dan memengaruhi loyalitas.", todo: "Siapkan FAQ biaya yang jelas dan pertimbangkan promo gratis transfer untuk segmen tertentu." },
        { key: "competitor", title: "Narasi perbandingan dengan Bank Seroja naik", type: "positioning", severity: "medium", status: "open", team: "Pemasaran", to: people.sari, deadlineIn: 4 * D, ago: 2 * D, level: "medium",
          what: "Konten perbandingan layanan dengan Bank Seroja dan KoinKu bertambah di YouTube dan TikTok.", why: "Perbandingan membentuk persepsi calon nasabah muda.", todo: "Siapkan konten pembanding yang menonjolkan keunggulan promo dan perbaikan stabilitas aplikasi." },
        { key: "umkm", title: "Peluang: respons positif program UMKM", type: "opportunity", severity: "low", status: "open", team: "Komunikasi & PR", to: null, deadlineIn: 7 * D, ago: 1 * D, level: "low",
          what: "Testimoni dan liputan positif program UMKM Naik Kelas terus bertambah.", why: "Momentum positif bisa mengimbangi isu negatif yang sedang berjalan.", todo: "Perkuat dengan cerita pelaku UMKM dan ajak media daerah meliput." },
        { key: "promo", title: "Keluhan cashback ArunikaPay belum masuk", type: "risk", severity: "low", status: "acknowledged", team: "Layanan Pelanggan", to: people.dimas, deadlineIn: 1 * D, ago: 2 * D, level: "low",
          what: "Sebagian pengguna mengeluhkan cashback promo yang telat masuk.", why: "Promo yang mengecewakan bisa berbalik menjadi sentimen negatif.", todo: "Umumkan jadwal pencairan cashback dan balas keluhan yang belum terjawab." },
        { key: "branch", title: "Antrean cabang Surabaya", type: "risk", severity: "low", status: "resolved", team: "Operasional & IT", to: owner, deadlineIn: -10 * D, ago: 20 * D, level: "low",
          what: "Keluhan antrean panjang di cabang Surabaya.", why: "Pengalaman di cabang memengaruhi persepsi layanan secara umum.", todo: "Tambah loket dan informasikan jam layanan yang lebih sepi." },
        { key: "earnings", title: "Liputan positif kinerja kuartal III", type: "opportunity", severity: "low", status: "resolved", team: "Komunikasi & PR", to: owner, deadlineIn: -12 * D, ago: 15 * D, level: "low",
          what: "Pemberitaan laba kuartal III positif di media bisnis.", why: "Kabar kinerja baik memperkuat kepercayaan investor dan nasabah.", todo: "Bagikan ringkasan kinerja ke pemangku kepentingan." },
    ],
    plans: (people, owner) => [
        { key: "dataleak", type: "crisis_response", title: "Respons krisis: isu kebocoran data", priority: "critical", status: "in_progress", to: owner,
          summary: "Verifikasi klaim, keluarkan pernyataan sementara, dan siapkan Q&A untuk media dan nasabah.",
          steps: ["Keluarkan pernyataan sementara di kanal resmi", "Minta tim IT memverifikasi klaim kebocoran", "Siapkan Q&A untuk call center", "Briefing juru bicara untuk media"] },
        { key: "outage", type: "social_response", title: "Balasan publik untuk gangguan Arunika Mobile", priority: "high", status: "done", to: people.sari,
          summary: "Template balasan dan jadwal pembaruan status selama gangguan.",
          steps: ["Unggah status gangguan di X dan Instagram", "Balas 20 keluhan teratas", "Perbarui status setiap 2 jam", "Umumkan pemulihan dan permintaan maaf"] },
        { key: "outage", type: "stakeholder_update", title: "Kabar untuk direksi: dampak gangguan aplikasi", priority: "high", status: "pending", to: owner,
          summary: "Ringkasan dampak gangguan untuk direksi beserta rencana perbaikan.",
          steps: ["Rangkum volume keluhan dan sentimen", "Jelaskan penyebab dan perbaikan teknis", "Usulkan kompensasi untuk nasabah terdampak"] },
        { key: "fees", type: "pr_response", title: "Klarifikasi biaya transfer", priority: "medium", status: "blocked", to: people.bayu,
          summary: "Materi penjelasan biaya transfer yang transparan; menunggu persetujuan tim produk.",
          steps: ["Susun FAQ biaya", "Bandingkan dengan biaya pesaing secara jujur", "Siapkan infografis untuk media sosial"] },
        { key: "umkm", type: "content_strategy", title: "Seri cerita sukses UMKM Naik Kelas", priority: "medium", status: "in_progress", to: people.sari,
          summary: "Seri konten mingguan cerita pelaku UMKM untuk memperkuat narasi positif.",
          steps: ["Pilih 6 pelaku UMKM untuk diliput", "Produksi video pendek", "Jadwalkan unggahan mingguan", "Ajak media daerah meliput"] },
        { key: "literacy", type: "influencer_strategy", title: "Perluas kolaborasi kreator literasi keuangan", priority: "low", status: "pending", to: null,
          summary: "Tambah kreator dengan audiens muda untuk konten edukasi keuangan.",
          steps: ["Petakan 10 kreator relevan", "Siapkan brief pesan utama", "Ukur jangkauan setiap konten"] },
        { key: "competitor", type: "data_driven", title: "Analisis posisi terhadap Bank Seroja", priority: "medium", status: "pending", to: null,
          summary: "Bandingkan sentimen dan topik dengan pesaing untuk menentukan pesan pembeda.",
          steps: ["Kumpulkan konten perbandingan 30 hari", "Petakan keunggulan dan kelemahan yang disebut", "Rekomendasikan 3 pesan pembeda"] },
    ],
    feedback: [
        { plan: 0, feedback_type: "accepted", rating: 5, comment: "Langsung dipakai tim komunikasi." },
        { plan: 1, feedback_type: "accepted", rating: 4, comment: null },
        { plan: 1, feedback_type: "edited", rating: 4, comment: "Nada dibuat lebih empatik." },
        { plan: 3, feedback_type: "rejected", rating: 2, comment: "Fakta biaya perlu dicek ulang." },
        { plan: 4, feedback_type: "accepted", rating: 5, comment: null },
    ],
    cases: (people, owner) => [
        { key: "dataleak", title: "Investigasi klaim kebocoran data nasabah", status: "open", priority: "critical", assignee_id: owner, due: D, ago: 6 * H },
        { key: "outage", title: "Akar masalah gangguan Arunika Mobile", status: "in_progress", priority: "high", assignee_id: people.bayu, due: 2 * D, ago: 2 * D },
        { key: "fees", title: "Evaluasi struktur biaya transfer", status: "open", priority: "medium", assignee_id: people.dimas, due: 7 * D, ago: 4 * D },
        { key: "branch", title: "Antrean cabang Surabaya", status: "resolved", priority: "low", assignee_id: owner, due: -10 * D, ago: 20 * D, resolution: "Loket ditambah dan jam layanan diperpanjang; keluhan turun." },
    ],
    reports: [
        { title: "Ringkasan Eksekutif Mingguan", type: "executive_brief", status: "ready", ago: 1 * D, span: 7 * D,
          summary: "Sentimen negatif naik karena gangguan aplikasi dan isu kebocoran data; program UMKM menjadi penyeimbang positif.",
          sections: [["Yang terjadi", "Gangguan Arunika Mobile dan klaim kebocoran data mendominasi percakapan."], ["Risiko", "Isu data berpotensi menarik perhatian regulator."], ["Peluang", "Program UMKM mendapat liputan positif."], ["Rekomendasi", "Pernyataan resmi soal data dalam 24 jam."]] },
        { title: "Laporan Insiden: Isu Kebocoran Data", type: "incident", status: "draft", ago: 4 * H, span: 2 * D,
          summary: "Draf laporan insiden untuk direksi; menunggu hasil verifikasi tim IT.", sections: [["Kronologi", "Klaim pertama muncul 36 jam lalu di forum."], ["Sebaran", "Didominasi X dan grup Facebook."]] },
        { title: "Ringkasan Bulanan Oktober", type: "monthly", status: "ready", ago: 4 * D, span: 30 * D,
          summary: "Volume percakapan naik 38%; sentimen positif terutama dari kinerja keuangan dan UMKM.", sections: [["Volume", "Naik 38% dibanding bulan lalu."], ["Isu utama", "Biaya transfer dan stabilitas aplikasi."]] },
        { title: "Tinjauan Risiko Reputasi", type: "risk_review", status: "review", ago: 2 * D, span: 14 * D,
          summary: "Tiga risiko utama: keamanan data, stabilitas aplikasi, dan biaya layanan.", sections: [["Risiko utama", "Keamanan data, stabilitas aplikasi, biaya layanan."]] },
        { title: "Visibilitas di AI: Oktober", type: "intelligence", status: "ready", ago: 6 * D, span: 30 * D,
          summary: "Bank Arunika disebut di 55% jawaban AI; Perplexity paling sering menyebut, DeepSeek paling jarang.", sections: [["Skor per AI", "Perplexity 71, ChatGPT 62, Claude 55, Gemini 48, DeepSeek 34."]] },
    ],
    weeklyScheduleName: "Ringkasan mingguan untuk direksi",
    engines: [["perplexity", 71, 0.8, 0.6], ["chatgpt", 62, 0.67, 0.67], ["claude", 55, 0.6, 0.4], ["gemini", 48, 0.47, 0.73], ["deepseek", 34, 0.33, 0.53]],
    prompts: [
        "Bank digital apa yang paling direkomendasikan untuk UMKM di Indonesia?",
        "Bagaimana perbandingan aplikasi Bank Arunika dan Bank Seroja?",
        "Bank mana yang biaya transfernya paling murah?",
    ],
    answer: (mentioned) => (mentioned
        ? `Beberapa pilihan yang sering disebut adalah ${DEMO_BRAND} dan ${COMPETITORS[0]}. ${DEMO_BRAND} unggul di program UMKM, sementara ${COMPETITORS[0]} dikenal karena aplikasinya stabil.`
        : `Pilihan populer antara lain ${COMPETITORS[0]} dan ${COMPETITORS[1]}, terutama karena biaya transfer yang rendah.`),
    notifications: [
        { title: "Peringatan kritis baru", message: "Lonjakan isu kebocoran data: Bank Arunika", type: "alert", is_read: false, ago: 5 * H },
        { title: "Laporan siap", message: "Ringkasan Eksekutif Mingguan sudah bisa diunduh.", type: "report", is_read: false, ago: 1 * D },
        { title: "Rencana aksi selesai", message: "Balasan publik untuk gangguan Arunika Mobile ditandai selesai.", type: "action", is_read: true, ago: 2 * D },
    ],
    events: [
        ["alert_created", 5 * H, { title: "Lonjakan isu kebocoran data" }], ["case_created", 6 * H, { title: "Investigasi klaim kebocoran data nasabah" }],
        ["action_plan_generated", 7 * H, { title: "Respons krisis: isu kebocoran data" }], ["assignment_change", 28 * H, { title: "Lonjakan sentimen negatif: Arunika Mobile" }],
        ["report_generated_from_template", 1 * D, { title: "Ringkasan Eksekutif Mingguan" }], ["report_export_created", 1 * D - H, { format: "pdf" }],
        ["monitoring_keyword_created", 12 * D, { keyword: "ArunikaPay" }],
        ["workspace_member_added", 20 * D, { role: "analyst" }], ["workspace_settings_updated", 25 * D, { brand_name: DEMO_BRAND }],
    ],
};

/**
 * Fill a scenario's workspace with its dataset, dated relative to `now`. Returns counts. A scenario with
 * `workspace` set also has its workspace row created or updated (name, settings such as the CVE profile).
 */
export async function seedScenarioWorkspace(def, { now = new Date(), db = defaultDb } = {}) {
    const ws = def.ws;
    const t0 = now.getTime();
    const r = rng(Math.floor(t0 / D));
    const at = (msAgo) => new Date(t0 - msAgo).toISOString();
    if (def.workspace) {
        const { data: existing } = await db.from("workspaces").select("id, settings").eq("id", ws).maybeSingle();
        const row = { name: def.workspace.name, onboarding_completed: true, logo_url: def.logo ?? null, settings: { ...(existing?.settings || {}), ...(def.workspace.settings || {}), demoVersion: def.version ?? 1 } };
        if (existing) await must(db.from("workspaces").update(row).eq("id", ws), "workspace");
        else await must(db.from("workspaces").insert({ id: ws, ...row }), "workspace");
    } else {
        // An existing workspace (the brand demo) keeps its name and settings; only the dataset version is noted.
        const { data: existing } = await db.from("workspaces").select("settings").eq("id", ws).maybeSingle();
        if (existing) await must(db.from("workspaces").update({ logo_url: def.logo ?? null, settings: { ...(existing.settings || {}), demoVersion: def.version ?? 1 } }).eq("id", ws), "workspace version");
    }
    await clearDemoWorkspace(db, ws);

    const people = await ensureDemoPersonas(db, ws, def.personas);
    const owner = people[def.personas[0].key];

    // Workspace identity and what it monitors
    await must(db.from("workspace_settings").upsert({ workspace_id: ws, brand_name: def.brand, industry: def.industry, timezone: "Asia/Jakarta", language: "id" }, { onConflict: "workspace_id" }), "settings");
    await must(db.from("monitoring_keywords").insert(def.keywords.map((keyword) => ({ workspace_id: ws, keyword, is_active: true, created_at: at(40 * D) }))), "keywords");

    const SOURCES = [
        ["Berita online", "news"], ["X (Twitter)", "twitter"], ["Instagram", "instagram"], ["TikTok", "tiktok"], ["YouTube", "youtube"], ["Facebook", "facebook"],
    ];
    const sources = await chunkedInsert(db, "sources", SOURCES.map(([name, type], i) => ({
        workspace_id: ws, name, type, category: type, config: { platform: type, demo: true }, is_active: true,
        last_sync_at: at((2 + i * 7) * 60 * 1000), last_status: "success", created_at: at(40 * D), updated_at: at(H),
    })), "id, type");
    const sourceOf = Object.fromEntries(sources.map((s) => [s.type, s.id]));

    // Records
    const signalRows = [];
    const owners = [];
    for (const n of def.narratives) {
        for (let i = 0; i < n.count; i++) {
            const platform = n.platforms[Math.floor(r() * n.platforms.length)];
            const ago = hoursAgo(n.shape, r) * H;
            const title = n.titles[i % n.titles.length];
            const sentiment = signalSentiment(n, r);
            const author = authorFor(platform, r, def.authors);
            signalRows.push({
                workspace_id: ws, source_id: sourceOf[platform] ?? null, title,
                content: `${title}. ${n.summary}`, platform, url: null, author,
                published_at: at(ago + 20 * 60 * 1000), captured_at: at(ago), created_at: at(ago),
                sentiment, sentiment_score: sentiment === "NEGATIVE" ? -(0.6 + r() * 0.35) : sentiment === "POSITIVE" ? 0.6 + r() * 0.35 : 0,
                severity: n.impact === "HIGH" && sentiment === "NEGATIVE" ? (n.key === def.criticalKey ? "critical" : "high") : sentiment === "NEGATIVE" ? "medium" : "low",
                region: def.region(platform, r, n),
                language: "id", topics: [n.keyword, n.key],
                metadata: { keyword: n.keyword, demo: true, narrative: n.key, ai_summary: n.summary, mentions_brand: true, ...(def.signalMetadata ? def.signalMetadata(n, r, i) : {}) },
            });
            owners.push(n.key);
        }
    }
    const signals = await chunkedInsert(db, "signals", signalRows, "id, sentiment, captured_at, platform");
    const byNarrative = {};
    signals.forEach((s, i) => { (byNarrative[owners[i]] ||= []).push(s); });

    // AI analyses for most records; a few recent ones (not the very top of the list) stay "not analysed yet"
    const newestFirst = [...signals].sort((a, b) => b.captured_at.localeCompare(a.captured_at));
    const pending = new Set([4, 9, 15].map((i) => newestFirst[i]?.id).filter(Boolean));
    await chunkedInsert(db, "signal_analyses", signals.filter((s) => !pending.has(s.id)).map((s, i) => ({
        signal_id: s.id, model: "demo", confidence: 0.7 + ((i * 37) % 25) / 100, created_at: s.captured_at,
        analysis: { sentiment: s.sentiment.toLowerCase(), confidence_score: 0.7 + ((i * 37) % 25) / 100, narrative_type: owners[signals.indexOf(s)], summary: "Contoh analisis untuk demo." },
    })));

    // Collection history: one job per source per day for a week
    const jobs = [];
    for (let d = 0; d < 7; d++) for (const s of sources) jobs.push({ workspace_id: ws, source_id: s.id, status: "completed", started_at: at(d * D + 20 * 60 * 1000), completed_at: at(d * D + 18 * 60 * 1000), items_processed: 4 + Math.floor(r() * 30), created_at: at(d * D + 18 * 60 * 1000) });
    await chunkedInsert(db, "ingestion_jobs", jobs);
    await chunkedInsert(db, "raw_documents", newestFirst.slice(0, 30).map((s, i) => ({ workspace_id: ws, source_id: sourceOf[s.platform] ?? null, external_id: `demo-${def.key}-${t0}-${i}`, title: "Demo", content: "Demo", url: null, author: null, published_at: s.captured_at, metadata: { demo: true }, created_at: s.captured_at })));

    // Narratives with their member records
    const clusters = await chunkedInsert(db, "narrative_clusters", def.narratives.map((n) => {
        const members_ = byNarrative[n.key] || [];
        const latest = members_.map((s) => s.captured_at).sort().at(-1) || at(D);
        return {
            workspace_id: ws, title: n.title, description: n.summary, main_narrative: n.summary, summary: { text: n.summary },
            priority: n.impact, impact: n.impact, lifecycle: n.lifecycle, sentiment: n.sentiment, signal_count: members_.length,
            keywords: n.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 6), metadata: { demo: true, key: n.key, labeledBy: "demo" },
            created_at: at(30 * D), updated_at: latest,
        };
    }), "id, title");
    const clusterOf = Object.fromEntries(def.narratives.map((n, i) => [n.key, clusters[i].id]));
    await chunkedInsert(db, "narrative_cluster_signals", def.narratives.flatMap((n) => (byNarrative[n.key] || []).map((s) => ({ cluster_id: clusterOf[n.key], signal_id: s.id, created_at: s.captured_at }))));

    const negIds = (key, k = 6) => (byNarrative[key] || []).filter((s) => s.sentiment === "NEGATIVE").slice(0, k).map((s) => s.id);
    const counts = (key) => {
        const list = byNarrative[key] || [];
        const neg = list.filter((s) => s.sentiment === "NEGATIVE").length;
        return { negative_count: neg, total_count: list.length, negative_ratio: list.length ? Math.round((neg / list.length) * 100) : 0 };
    };

    // Alerts: every severity and status, owned and unowned, on time and overdue
    const ALERTS = def.alerts(people, owner);
    const alerts = await chunkedInsert(db, "alerts", ALERTS.map((a) => ({
        workspace_id: ws, title: a.title, description: a.what, type: a.type, severity: a.severity, status: a.status, source: "news", sources: ["news", "twitter"],
        assigned_to: a.to, assigned_team: a.team, escalation_level: a.level, deadline: new Date(t0 - a.ago + (a.ago + a.deadlineIn)).toISOString(),
        acknowledged_at: a.status !== "open" ? at(a.ago - 2 * H) : null, resolved_at: a.status === "resolved" ? at(a.ago - 3 * D) : null,
        what_happened: a.what, why_it_matters: a.why, what_to_do: a.todo,
        metadata: { keyword: def.narratives.find((n) => n.key === a.key)?.keyword, signal_ids: a.evidence === "all" ? (byNarrative[a.key] || []).slice(0, 6).map((s) => s.id) : negIds(a.key), demo: true, ...counts(a.key) },
        created_at: at(a.ago), updated_at: at(Math.max(0, a.ago - 2 * H)),
    })), "id, title");
    const alertOf = Object.fromEntries(ALERTS.map((a, i) => [a.key, alerts[i].id]));

    // Action plans across statuses and strategies
    const PLANS = def.plans(people, owner);
    const plans = await chunkedInsert(db, "action_plans", PLANS.map((p, i) => ({
        workspace_id: ws, title: p.title, description: p.summary, type: p.type, priority: p.priority, status: p.status, assigned_to: p.to, created_by: owner,
        alert_id: alertOf[p.key] ?? null, cluster_id: clusterOf[p.key] ?? null,
        strategy: { executive_summary: p.summary, immediate_actions: p.steps, talking_points: [], severity_assessment: p.priority },
        created_at: at((i + 1) * 9 * H), updated_at: at(i * 5 * H),
    })), "id");
    await chunkedInsert(db, "ai_feedback", def.feedback.map(({ plan, ...f }, i) => ({ workspace_id: ws, action_plan_id: plans[plan].id, ...f, created_at: at((i + 1) * 6 * H) })));

    // Cases
    const CASES = def.cases(people, owner);
    await chunkedInsert(db, "cases", CASES.map(({ key, due, ago, ...c }) => ({
        workspace_id: ws, description: null, resolution: null, ...c, deadline: new Date(t0 + due).toISOString(), signal_id: byNarrative[key]?.[0]?.id ?? null, created_at: at(ago), updated_at: at(Math.max(0, ago - H)),
    })));

    // Reports and schedules
    await chunkedInsert(db, "reports", def.reports.map(({ ago, span, summary, sections, ...rep }) => ({
        workspace_id: ws, created_by: owner, ...rep,
        content: { summary, sections: sections.map(([title, content]) => ({ title, content })), period_start: at(ago + span), period_end: at(ago) },
        created_at: at(ago), updated_at: at(ago),
    })));
    const [weeklyTpl] = await chunkedInsert(db, "report_templates", [{ workspace_id: ws, name: "Ringkasan Eksekutif", type: "executive_brief", is_system: true, content: { systemKey: "executive_brief" } }]);
    await chunkedInsert(db, "report_schedules", [
        { workspace_id: ws, template_id: weeklyTpl.id, name: def.weeklyScheduleName, cadence: "weekly", day_of_week: 1, time_of_day: "08:00", is_active: true, next_run_at: new Date(t0 + 3 * D).toISOString(), last_run_at: at(4 * D) },
        { workspace_id: ws, template_id: weeklyTpl.id, name: "Ringkasan bulanan", cadence: "monthly", day_of_week: null, time_of_day: "09:00", is_active: false, next_run_at: new Date(t0 + 20 * D).toISOString(), last_run_at: null },
    ]);

    // GEO: the five assistants, with the prompts they were asked
    for (const [engine, score, presence, comp] of def.engines) {
        const [result] = await chunkedInsert(db, "ai_visibility_results", [{
            workspace_id: ws, engine, score, query: JSON.stringify(def.prompts), created_at: at(2 * D + def.engines.findIndex((e) => e[0] === engine) * H),
            result: { visibility_score: score, brand_presence_rate: presence, competitor_mention_rate: comp, citations: [], metadata: { brand_name: def.brand, competitors: def.competitors, total_queries: def.prompts.length, total_responses: def.prompts.length, engine, methodology: "Demo data" } },
        }]);
        await chunkedInsert(db, "prompt_test_runs", def.prompts.map((prompt, i) => {
            const mentioned = i < Math.round(presence * def.prompts.length);
            return {
                workspace_id: ws, visibility_result_id: result.id, prompt, engine,
                response: def.answer(mentioned, i),
                response_id: null, sentiment: mentioned ? "positive" : "neutral", relevance_score: mentioned ? 0.8 : 0.3, citations: [],
                metadata: { engine, brand: mentioned ? "mentioned" : "unmentioned", competitor: i === 2 ? def.competitors.join(", ") : def.competitors[0], brand_tone: mentioned ? "positive" : "neutral", comp_tone: "neutral", demo: true },
                created_at: at(2 * D),
            };
        }));
    }

    // In-app notifications and an activity trail
    await chunkedInsert(db, "app_notifications", def.notifications.map(({ ago, ...n }) => ({ workspace_id: ws, user_id: owner, data: { demo: true }, ...n, created_at: at(ago) })));
    await chunkedInsert(db, "audit_logs", def.events.map(([event, ago, metadata]) => ({ workspace_id: ws, user_id: owner, event, metadata: { ...metadata, demo: true }, created_at: at(ago) })));

    const summary = { scenario: def.key, signals: signals.length, narratives: clusters.length, alerts: alerts.length, plans: plans.length, cases: CASES.length, reports: def.reports.length, engines: def.engines.length };
    logStructured("info", "demo_workspace_seeded", summary);
    return summary;
}

/** Fill the original (brand) demo workspace. */
export async function seedDemoWorkspace({ now = new Date(), db = defaultDb } = {}) {
    return seedScenarioWorkspace(BRAND_SCENARIO, { now, db });
}

/** Every scenario, brand first. */
export async function demoScenarios() {
    const { GOV_SCENARIO, CVE_SCENARIO } = await import("./demo-scenarios.js");
    return [BRAND_SCENARIO, GOV_SCENARIO, CVE_SCENARIO].filter((d) => Object.values(DEMO_WORKSPACES).includes(d.ws));
}

/** Seed every scenario (the nightly refresh). */
export async function seedAllDemoWorkspaces({ now = new Date(), db = defaultDb } = {}) {
    const out = [];
    for (const def of await demoScenarios()) out.push(await seedScenarioWorkspace(def, { now, db }));
    return out;
}

/** Reseed each scenario whose newest record is older than `maxAgeHours` (keeps "last 24 hours" populated). */
export async function refreshDemoWorkspaceIfStale({ now = new Date(), maxAgeHours = 20, db = defaultDb } = {}) {
    const results = {};
    for (const def of await demoScenarios()) {
        const { data } = await db.from("signals").select("captured_at").eq("workspace_id", def.ws).order("captured_at", { ascending: false }).limit(1);
        const newest = data?.[0]?.captured_at ? new Date(data[0].captured_at).getTime() : 0;
        results[def.key] = now.getTime() - newest < maxAgeHours * H ? { reseeded: false } : { reseeded: true, ...(await seedScenarioWorkspace(def, { now, db })) };
    }
    return results;
}

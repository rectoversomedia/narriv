import express from "express";
import crypto from "node:crypto";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { runRecon } from "../../lib/recon.js";
import { checkClaimInput } from "../../lib/claim-box.js";
import { investigationBrief, simulateResponse } from "../../lib/issue-ai.js";
import { radarReply } from "../../lib/narrative-radar.js";
import { futureIssues, saveFutureProgress } from "../../lib/future-issues.js";

/**
 * Analyst tools on top of the monitored data:
 *   POST /tools/recon               Cek Influencer / Akun (risk check on a person or organisation)
 *   GET  /tools/recon               past checks of the workspace
 *   POST /tools/claim-check         Kotak Cek Klaim (claim or link → verdict with sources)
 *   POST /tools/issues/:id/brief    investigation report on one issue
 *   POST /tools/issues/:id/simulate 24-hour scenario for a planned response
 *   GET/POST /tools/telegram/link   link code for the Telegram bot; linked chats
 * Public (secret-checked) inbound webhooks for replies to Narriv Radar:
 *   POST /tools/telegram/webhook    (Telegram bot; header X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET)
 *   POST /tools/wa/webhook?secret=  (Fonnte inbound; secret = FONNTE_WEBHOOK_SECRET)
 */
const router = express.Router();

const BOT = () => process.env.TELEGRAM_BOT_TOKEN;
async function tgSend(chatId, text) {
    if (!BOT()) return;
    await fetch(`https://api.telegram.org/bot${BOT()}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000), disable_web_page_preview: true }), signal: AbortSignal.timeout(10000) }).catch(() => null);
}
const brandOf = async (ws) => (await supabase.from("workspace_settings").select("brand_name").eq("workspace_id", ws).maybeSingle()).data?.brand_name || "Narriv";

// ---- Public webhooks (before auth) ----
router.post("/telegram/webhook", express.json(), async (req, res) => {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).end();
    res.json({ ok: true });
    try {
        const msg = req.body?.message;
        const chatId = msg?.chat?.id;
        const text = String(msg?.text || "").trim();
        if (!chatId || !text) return;
        const code = text.match(/^\/start\s+([A-Za-z0-9]{6,12})/)?.[1];
        const { data: wss } = await supabase.from("workspaces").select("id, settings").limit(500);
        if (code) {
            const ws = (wss || []).find((w) => w.settings?.telegram?.code === code.toUpperCase());
            if (!ws) return tgSend(chatId, "Kode tidak dikenal. Ambil kode baru di Narriv: Pengaturan › Saluran Notifikasi.");
            const chats = (ws.settings.telegram.chats || []).filter((c) => c.id !== chatId).concat({ id: chatId, name: msg.chat.title || msg.chat.username || msg.chat.first_name || "chat", at: new Date().toISOString() }).slice(-10);
            await supabase.from("workspaces").update({ settings: { ...ws.settings, telegram: { ...ws.settings.telegram, chats } } }).eq("id", ws.id);
            return tgSend(chatId, `Terhubung ke Narriv (${await brandOf(ws.id)}). Narriv Radar dan peringatan akan dikirim ke sini.\nBalas *radar* untuk ringkasan terbaru.`);
        }
        const ws = (wss || []).find((w) => (w.settings?.telegram?.chats || []).some((c) => c.id === chatId));
        if (!ws) return tgSend(chatId, "Chat ini belum terhubung. Kirim /start <kode> dari Narriv: Pengaturan › Saluran Notifikasi.");
        await tgSend(chatId, await radarReply(ws.id, text, { brand: await brandOf(ws.id) }));
    } catch (error) {
        logStructured("warn", "telegram_webhook_failed", { error: error?.message });
    }
});

const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^0/, "62");
router.post("/wa/webhook", express.json(), express.urlencoded({ extended: false }), async (req, res) => {
    if (!process.env.FONNTE_WEBHOOK_SECRET || req.query.secret !== process.env.FONNTE_WEBHOOK_SECRET) return res.status(401).end();
    res.json({ ok: true });
    try {
        const sender = digits(req.body?.sender);
        const text = String(req.body?.message || "").trim();
        if (!sender || !text) return;
        const { data: rows } = await supabase.from("workspace_settings").select("workspace_id, whatsapp_pic, brand_name").not("whatsapp_pic", "is", null).limit(500);
        const row = (rows || []).find((r) => String(r.whatsapp_pic).split(/[,;\s]+/).some((n) => digits(n) === sender));
        if (!row || !process.env.FONNTE_TOKEN) return;
        const reply = await radarReply(row.workspace_id, text, { brand: row.brand_name || "Narriv" });
        await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: process.env.FONNTE_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ target: sender, message: reply, countryCode: "62" }), signal: AbortSignal.timeout(15000) }).catch(() => null);
    } catch (error) {
        logStructured("warn", "wa_webhook_failed", { error: error?.message });
    }
});

// ---- Authenticated tools ----
router.use(verifyToken);
const ws = async (req, res) => {
    const id = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId || req.body?.workspaceId);
    if (!id) res.status(403).json({ error: "Workspace access denied" });
    return id;
};

router.post("/recon", rateLimiters.aiGeneration(), async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const subject = String(req.body?.subject || "").trim().slice(0, 80);
    if (subject.length < 3) return res.status(400).json({ error: "Isi nama atau akun minimal 3 huruf." });
    try {
        res.json(await runRecon({ workspaceId: id, subject, days: Math.min(730, Number(req.body?.days) || 365) }));
    } catch (error) {
        logStructured("error", "recon_failed", { error: error?.message });
        res.status(500).json({ error: "Pengecekan gagal. Coba lagi." });
    }
});

router.get("/recon", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { data } = await supabase.from("raw_documents").select("id, title, created_at, metadata").eq("workspace_id", id).like("external_id", "recon:%").order("created_at", { ascending: false }).limit(30);
    res.json({ data: (data || []).map((d) => ({ id: d.id, ...d.metadata?.recon })) });
});

router.post("/claim-check", rateLimiters.aiGeneration(), async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const input = String(req.body?.input || "").trim().slice(0, 1000);
    if (input.length < 8) return res.status(400).json({ error: "Tempel klaim atau tautan yang ingin dicek." });
    try {
        res.json(await checkClaimInput({ workspaceId: id, input }));
    } catch (error) {
        logStructured("error", "claim_box_failed", { error: error?.message });
        res.status(500).json({ error: "Pengecekan gagal. Coba lagi." });
    }
});

router.post("/issues/:id/brief", rateLimiters.aiGeneration(), async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const out = await investigationBrief({ workspaceId: id, clusterId: req.params.id }).catch(() => null);
    if (!out) return res.status(503).json({ error: "Laporan belum bisa dibuat. Coba lagi sebentar." });
    res.json(out);
});

router.post("/issues/:id/simulate", rateLimiters.aiGeneration(), async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const out = await simulateResponse({ workspaceId: id, clusterId: req.params.id, response: String(req.body?.response || "").slice(0, 400) }).catch(() => null);
    if (!out) return res.status(503).json({ error: "Simulasi belum bisa dibuat. Coba lagi sebentar." });
    res.json(out);
});

// Future Issues (Analysis page): forecasts from all of the workspace's data; stored, reused for 12 hours.
router.get("/future-issues", rateLimiters.aiGeneration(), async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    try {
        res.json(await futureIssues(id, { refresh: req.query.refresh === "1" }));
    } catch (error) {
        logStructured("error", "future_issues_failed", { error: error?.message });
        res.status(503).json({ error: "Prediksi isu belum bisa dibuat. Coba lagi sebentar." });
    }
});

// The team's progress on a forecast's "prepare now" steps.
router.put("/future-issues/progress", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { title, done } = req.body || {};
    if (!title || !Array.isArray(done)) return res.status(400).json({ error: "title and done are required." });
    try {
        res.json({ progress: await saveFutureProgress(id, title, done) });
    } catch (error) {
        logStructured("error", "future_progress_failed", { error: error?.message });
        res.status(500).json({ error: "Progres belum tersimpan." });
    }
});

// Whose voice (lib/tone-learning.js): the team's list of internal and partner accounts, and per-record corrections.
router.get("/voice-accounts", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { voiceAccounts } = await import("../../lib/tone-learning.js");
    res.json({ accounts: await voiceAccounts(id) });
});
router.put("/voice-accounts", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { getWorkspaceRole } = await import("../../lib/workspace-access.js");
    if (!["owner", "admin"].includes(await getWorkspaceRole(req.user.id, id))) return res.status(403).json({ error: "Hanya owner dan admin yang bisa mengubah daftar akun." });
    try {
        const { saveVoiceAccounts } = await import("../../lib/tone-learning.js");
        res.json(await saveVoiceAccounts(id, req.body?.accounts));
    } catch (error) {
        logStructured("error", "voice_accounts_failed", { error: error?.message });
        res.status(500).json({ error: "Daftar akun belum tersimpan." });
    }
});
router.post("/voice-review", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    try {
        const { reviewVoice } = await import("../../lib/tone-learning.js");
        const review = await reviewVoice(id, String(req.body?.signalId || ""), req.body?.voice, req.user.id);
        if (!review) return res.status(404).json({ error: "Catatan tidak ditemukan." });
        res.status(201).json(review);
    } catch (error) {
        logStructured("error", "voice_review_failed", { error: error?.message });
        res.status(500).json({ error: "Belum tersimpan." });
    }
});

router.get("/telegram/link", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { data: w } = await supabase.from("workspaces").select("settings").eq("id", id).maybeSingle();
    const tg = w?.settings?.telegram || {};
    res.json({ configured: Boolean(BOT()), bot: process.env.TELEGRAM_BOT_USERNAME || null, code: tg.code || null, chats: (tg.chats || []).map((c) => ({ name: c.name, at: c.at })) });
});

router.post("/telegram/link", async (req, res) => {
    const id = await ws(req, res); if (!id) return;
    const { data: w } = await supabase.from("workspaces").select("settings").eq("id", id).maybeSingle();
    const settings = w?.settings || {};
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    await supabase.from("workspaces").update({ settings: { ...settings, telegram: { ...(settings.telegram || {}), code } } }).eq("id", id);
    res.json({ code, bot: process.env.TELEGRAM_BOT_USERNAME || null });
});

export default router;

/**
 * Public Telegram channels, free: every public channel has a web preview at https://t.me/s/<channel> that also
 * searches the channel (?q=). No API key, no account. Private groups and channels are not reachable, by design.
 *
 * Channels: a default list of active Indonesian channels (TELEGRAM_CHANNELS overrides it) plus the workspace's own
 * list (workspaces.settings.telegramChannels). A channel that is gone or silent simply yields nothing.
 */

import { logStructured } from "../../lib/logger.js";
import { mentionsKeyword } from "../../lib/keyword-match.js";

const TIMEOUT_MS = 10_000;
const LOOKBACK_DAYS = 7;
// Checked 2026-11-19: Indonesian news channels on Telegram are few and many are dormant; these post daily.
export const DEFAULT_TELEGRAM_CHANNELS = ["cnbcid"];

export function telegramChannels(workspaceSettings) {
    const fromEnv = String(process.env.TELEGRAM_CHANNELS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const own = Array.isArray(workspaceSettings?.telegramChannels) ? workspaceSettings.telegramChannels : [];
    return [...new Set([...(fromEnv.length ? fromEnv : DEFAULT_TELEGRAM_CHANNELS), ...own]
        .map((c) => String(c).replace(/^@|^https?:\/\/t\.me\/(s\/)?/i, "").replace(/\/.*$/, "").trim().toLowerCase())
        .filter((c) => /^[a-z0-9_]{4,64}$/.test(c)))];
}

const decode = (s) => String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();

function parseViews(s) {
    const m = String(s || "").trim().match(/^([\d.,]+)\s*([KM]?)$/i);
    if (!m) return 0;
    const n = parseFloat(m[1].replace(",", "."));
    return Math.round(n * (m[2].toUpperCase() === "M" ? 1e6 : m[2].toUpperCase() === "K" ? 1e3 : 1));
}

/** Messages on a t.me/s/<channel> page: { post: "channel/123", text, publishedAt, views }. */
export function parseTelegramPage(html) {
    const out = [];
    const blocks = String(html || "").split('class="tgme_widget_message_wrap').slice(1);
    for (const block of blocks) {
        const post = block.match(/data-post="([^"]+)"/)?.[1];
        const textHtml = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
        const publishedAt = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1] || null;
        const views = parseViews(block.match(/<span class="tgme_widget_message_views">([^<]*)<\/span>/)?.[1]);
        if (!post || !textHtml) continue;
        out.push({ post, text: decode(textHtml), publishedAt, views });
    }
    return out;
}

/** Recent public-channel posts that name the keyword, as persistable records. */
export async function fetchTelegramPosts(keyword, { channels = telegramChannels(), fetchImpl = fetch, now = Date.now(), limit = 8 } = {}) {
    const since = now - LOOKBACK_DAYS * 86400000;
    const records = [];
    for (const channel of channels) {
        try {
            const res = await fetchImpl(`https://t.me/s/${channel}?q=${encodeURIComponent(keyword)}`, {
                headers: { "user-agent": "Mozilla/5.0 (compatible; NarrivMonitor/1.0)" },
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            if (!res.ok) continue;
            for (const m of parseTelegramPage(await res.text())) {
                if (m.publishedAt && Date.parse(m.publishedAt) < since) continue;
                if (!mentionsKeyword(m.text, keyword)) continue;
                const title = m.text.split("\n").find((l) => l.trim())?.slice(0, 160) || m.text.slice(0, 160);
                records.push({
                    externalId: `telegram:${m.post}`,
                    title,
                    content: m.text.slice(0, 4000),
                    url: `https://t.me/${m.post}`,
                    author: `@${channel}`,
                    publishedAt: m.publishedAt,
                    metadata: { publisher: `Telegram @${channel}`, channel, engagement: { views: m.views } },
                });
            }
        } catch (error) {
            logStructured("warn", "telegram_channel_failed", { channel, error: error.message });
        }
        if (records.length >= limit) break;
    }
    return records.slice(0, limit);
}

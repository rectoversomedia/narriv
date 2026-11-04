/**
 * Google Chat and WhatsApp delivery for alerts.
 *   Google Chat — an incoming webhook of a space (https://chat.googleapis.com/v1/spaces/…/messages?key=…&token=…),
 *                 which takes a plain {text} message.
 *   WhatsApp    — the WhatsApp Business Cloud API (Meta): a phone number ID, an access token and one or more
 *                 recipient numbers. Free-form text reaches a recipient only inside WhatsApp's 24-hour window, so a
 *                 refusal from Meta is reported as it comes back rather than hidden.
 */

import { assertPublicHttpUrl } from "../url-safety.js";

const SEVERITY_WORD = { critical: "KRITIS", high: "TINGGI", medium: "SEDANG", low: "RENDAH" };
const WHATSAPP_API = "https://graph.facebook.com/v21.0";

/** One short message an on-call person can act on: severity, title, what happened, the next step, the link. */
export function formatAlertText(alert, { bold = (s) => `*${s}*` } = {}) {
    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || "https://www.narriv.digital";
    const lines = [
        bold(`[Narriv] ${SEVERITY_WORD[alert?.severity] || "PERINGATAN"}: ${alert?.title || "Peringatan baru"}`),
        alert?.what_happened || alert?.whatHappened || alert?.message || "",
        alert?.what_to_do || alert?.whatToDo ? `Langkah: ${alert.what_to_do || alert.whatToDo}` : "",
        alert?.id ? `${appUrl.replace(/\/$/, "")}/alerts/${alert.id}` : "",
    ];
    return lines.filter(Boolean).join("\n");
}

export async function sendGoogleChatMessage(url, text) {
    const safeUrl = await assertPublicHttpUrl(url);
    if (!/^https:\/\/chat\.googleapis\.com\//.test(String(safeUrl))) {
        throw new Error("Google Chat webhook URL must start with https://chat.googleapis.com/");
    }
    const response = await fetch(safeUrl, {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`Google Chat returned HTTP ${response.status}`);
    return true;
}

/** Recipient numbers in international form without "+", e.g. "62812…". */
export function whatsappRecipients(config = {}) {
    return String(config.to || config.recipients || "")
        .split(/[,;\n]+/)
        .map((n) => n.replace(/[^\d]/g, ""))
        .map((n) => (n.startsWith("0") ? `62${n.slice(1)}` : n))
        .filter((n) => n.length >= 8);
}

export async function sendWhatsAppMessage(config, text) {
    const phoneNumberId = String(config?.phoneNumberId || "").trim();
    const accessToken = String(config?.accessToken || "").trim();
    const recipients = whatsappRecipients(config);
    if (!phoneNumberId || !accessToken || recipients.length === 0) {
        throw new Error("WhatsApp needs a phone number ID, an access token and at least one recipient number");
    }
    const failures = [];
    for (const to of recipients) {
        const response = await fetch(`${WHATSAPP_API}/${encodeURIComponent(phoneNumberId)}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text.slice(0, 4000) } }),
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            failures.push(`${to}: ${body?.error?.message || `HTTP ${response.status}`}`);
        }
    }
    if (failures.length === recipients.length) throw new Error(`WhatsApp refused: ${failures.join("; ")}`);
    return { sent: recipients.length - failures.length, failed: failures };
}

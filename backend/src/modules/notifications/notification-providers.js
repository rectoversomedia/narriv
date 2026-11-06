import { logStructured } from "../../lib/logger.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";
import { whatsappRecipients } from "../../lib/notifications/chat-channels.js";

export function createEmailProvider() {
    return {
        channel: "email",
        async send({ to, subject, message, metadata, html: customHtml }) {
            if (!isEmailConfigured()) {
                logStructured("info", "provider_dispatch_placeholder", {
                    channel: "email",
                    to,
                    subject,
                    message,
                    metadata,
                    reason: "Email not configured",
                });
                return {
                    delivered: false,
                    provider: "resend",
                    reason: "Email provider not configured",
                };
            }

            const html = customHtml || `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>${subject}</h2>
                    <p>${message}</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eaeaea;" />
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification from Narriv.<br />
                        Workspace ID: ${metadata?.workspaceId || "Unknown"}
                    </p>
                </div>
            `;

            const result = await sendEmail({
                to,
                subject,
                html,
                text: message,
            });

            if (result && result.id) {
                return {
                    delivered: true,
                    provider: "resend",
                    messageId: result.id,
                };
            }

            return {
                delivered: false,
                provider: "resend",
                reason: "Failed to send email via provider",
            };
        },
    };
}

/** True when Narriv's own WhatsApp sender (Fonnte) is configured; clients then only give recipient numbers. */
export const isWhatsAppConfigured = () => Boolean(process.env.FONNTE_TOKEN && !/placeholder/i.test(process.env.FONNTE_TOKEN));

/**
 * WhatsApp through Fonnte (api.fonnte.com), sent from Narriv's own number to the workspace's recipient numbers
 * (workspace_settings.whatsapp_pic, comma-separated). Unlike the Meta Cloud API integration, it can message a number
 * that has not written first, which is what an alert needs.
 */
export function createWhatsAppProvider({ fetchImpl = fetch } = {}) {
    return {
        channel: "whatsapp",
        async send({ to, subject, message, metadata, text }) {
            if (!isWhatsAppConfigured()) {
                logStructured("info", "provider_dispatch_placeholder", { channel: "whatsapp", subject, metadata, reason: "FONNTE_TOKEN not set" });
                return { delivered: false, provider: "fonnte", reason: "WhatsApp sender not configured" };
            }
            const targets = whatsappRecipients({ to });
            if (!targets.length) return { delivered: false, provider: "fonnte", reason: "No valid recipient number" };
            try {
                const res = await fetchImpl("https://api.fonnte.com/send", {
                    method: "POST",
                    headers: { Authorization: process.env.FONNTE_TOKEN, "Content-Type": "application/json" },
                    body: JSON.stringify({ target: targets.join(","), message: String(text || message || subject).slice(0, 4000), countryCode: "62" }),
                    signal: AbortSignal.timeout(15000),
                });
                const body = await res.json().catch(() => ({}));
                const delivered = res.ok && body?.status !== false;
                if (!delivered) logStructured("warn", "whatsapp_send_failed", { status: res.status, reason: body?.reason || body?.detail || null, metadata });
                return { delivered, provider: "fonnte", recipients: targets.length, reason: delivered ? undefined : String(body?.reason || `HTTP ${res.status}`).slice(0, 160) };
            } catch (error) {
                logStructured("warn", "whatsapp_send_failed", { error: error?.message || error, metadata });
                return { delivered: false, provider: "fonnte", reason: "WhatsApp request failed" };
            }
        },
    };
}

export function createNotificationProviders() {
    return {
        email: createEmailProvider(),
        whatsapp: createWhatsAppProvider(),
    };
}


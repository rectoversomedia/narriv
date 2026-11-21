import { Resend } from "resend";
import { logStructured } from "./logger.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Narriv | Narrative Intelligence <noreply@narriv.digital>";
// Replies go to a person, not the no-reply sender (set once that mailbox receives mail).
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || null;

let resendClient = null;

function getClient() {
    if (!resendClient && RESEND_API_KEY) {
        resendClient = new Resend(RESEND_API_KEY);
    }
    return resendClient;
}

/**
 * Check whether email delivery is configured.
 * Returns true when RESEND_API_KEY is set; false otherwise.
 */
export function isEmailConfigured() {
    return Boolean(RESEND_API_KEY);
}

/**
 * Send an email via Resend.
 *
 * @param {object} options
 * @param {string} options.to        - Recipient email address.
 * @param {string} options.subject   - Email subject line.
 * @param {string} options.html      - HTML body.
 * @param {string} [options.text]    - Optional plain-text fallback.
 * @param {string} [options.from]    - Override sender (defaults to EMAIL_FROM).
 * @returns {Promise<{ id: string } | null>} Resend message ID or null on failure / not configured.
 */
/** attachments: [{ filename, content: Buffer }] (Resend accepts them as-is). */
/** Addresses that can never receive mail (demo accounts, .test/.example domains): sending to them only bounces and
 * hurts the sender reputation of narriv.digital. */
export function isUndeliverable(address) {
    const a = String(address || "").trim().toLowerCase();
    return !a.includes("@") || /@demo\.narriv\.digital$|\.(test|example|invalid|localhost)$/.test(a);
}

export async function sendEmail({ to, subject, html, text, from, attachments }) {
    if (isUndeliverable(to)) {
        logStructured("info", "email_skipped_undeliverable", { to, subject });
        return null;
    }
    const client = getClient();

    if (!client) {
        logStructured("warn", "email_not_configured", {
            to,
            subject,
            hint: "Set RESEND_API_KEY to enable email delivery.",
        });
        return null;
    }

    try {
        const { data, error } = await client.emails.send({
            from: from || EMAIL_FROM,
            to: [to],
            ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
            subject,
            html,
            ...(text ? { text } : {}),
            ...(attachments?.length ? { attachments } : {}),
        });

        if (error) {
            logStructured("error", "email_send_failed", {
                to,
                subject,
                error: error.message || JSON.stringify(error),
            });
            return null;
        }

        logStructured("info", "email_sent", { to, subject, messageId: data?.id });
        return { id: data?.id };
    } catch (err) {
        logStructured("error", "email_send_exception", {
            to,
            subject,
            error: err?.message || "Unknown email error",
        });
        return null;
    }
}

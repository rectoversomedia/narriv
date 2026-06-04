import { logStructured } from "../../lib/logger.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";

export function createEmailProvider() {
    return {
        channel: "email",
        async send({ to, subject, message, metadata }) {
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

            const html = `
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

export function createWhatsAppProvider() {
    return {
        channel: "whatsapp",
        async send({ to, subject, message, metadata }) {
            logStructured("info", "provider_dispatch_placeholder", {
                channel: "whatsapp",
                to,
                subject,
                message,
                metadata,
            });
            return {
                delivered: false,
                provider: "placeholder-whatsapp",
                reason: "Provider not integrated yet",
            };
        },
    };
}

export function createNotificationProviders() {
    return {
        email: createEmailProvider(),
        whatsapp: createWhatsAppProvider(),
    };
}


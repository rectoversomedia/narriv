import { logStructured } from "../../lib/logger.js";

export function createEmailProvider() {
    return {
        channel: "email",
        async send({ to, subject, message, metadata }) {
            logStructured("info", "provider_dispatch_placeholder", {
                channel: "email",
                to,
                subject,
                message,
                metadata,
            });
            return {
                delivered: false,
                provider: "placeholder-email",
                reason: "Provider not integrated yet",
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


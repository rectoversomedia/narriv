/**
 * Support contact. The email shows only once NEXT_PUBLIC_SUPPORT_EMAIL is set to a mailbox that actually receives
 * mail (hello@narriv.digital, once the domain has MX records). WhatsApp is the business number.
 */
export const SUPPORT_EMAIL: string | null = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

/** International form for wa.me links, and how the number is written for people. */
export const SUPPORT_WHATSAPP = { intl: "62811190692", display: "0811-190-692" } as const;
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP.intl}`;

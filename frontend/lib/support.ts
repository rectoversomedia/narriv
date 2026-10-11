/**
 * Support contact. Configured with NEXT_PUBLIC_SUPPORT_EMAIL; null until the
 * owner sets a mailbox that actually receives mail (no address is assumed).
 */
export const SUPPORT_EMAIL: string | null = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

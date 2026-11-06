import { baseSupabaseAdmin } from "./supabase.js";

/**
 * Narriv team members who may open the admin panel: the emails in PLATFORM_ADMIN_EMAILS (comma-separated).
 * Unset means nobody (fails closed). The email is read from the users table, not trusted from the token.
 */
export function platformAdminEmails() {
    return String(process.env.PLATFORM_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

export async function isPlatformAdmin(userId, db = baseSupabaseAdmin) {
    const allowed = platformAdminEmails();
    if (!userId || !allowed.length) return false;
    const { data } = await db.from("users").select("email").eq("id", userId).maybeSingle();
    return Boolean(data?.email && allowed.includes(String(data.email).toLowerCase()));
}

/** Express middleware, after verifyToken: 403 unless the signed-in user is a platform admin. */
export function requirePlatformAdmin(req, res, next) {
    isPlatformAdmin(req.user?.id)
        .then((ok) => (ok ? next() : res.status(403).json({ error: "Not allowed.", code: "NOT_PLATFORM_ADMIN" })))
        .catch(next);
}

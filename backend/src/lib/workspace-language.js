import { baseSupabaseAdmin } from "./supabase.js";

// Language of the content Narriv writes and stores for a workspace (workspace_settings.language, default "en").
// Unlike tr() (the viewer's UI language), this is fixed per workspace because stored text is shared by all members.
const cache = new Map();
const TTL_MS = 60 * 1000;

export async function workspaceLanguage(workspaceId, db = baseSupabaseAdmin) {
    if (!workspaceId) return "en";
    const hit = cache.get(workspaceId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.lang;
    // English unless the workspace chose Indonesian (existing workspaces keep the language stored for them).
    let lang = "en";
    try {
        const { data } = await db.from("workspace_settings").select("language").eq("workspace_id", workspaceId).maybeSingle();
        if (data?.language === "id") lang = "id";
    } catch { /* default */ }
    cache.set(workspaceId, { lang, at: Date.now() });
    return lang;
}

export function forgetWorkspaceLanguage(workspaceId) {
    cache.delete(workspaceId);
}

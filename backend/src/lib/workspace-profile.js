/**
 * What a workspace monitors for, which shapes what Narriv does with each record:
 *
 * - useCase "brand" (default): brand reputation, as Narriv has always worked.
 * - useCase "gov": a government body; issues of public services and citizen sentiment rather than competitors.
 * - useCase "cve": preventing violent extremism. Each record is also classified into a CVE narrative category
 *   (cve-categories.js) for a person to review, and privacy mode is on unless the workspace turns it off.
 * - privacyMode: account names, handles and post links are hidden wherever records are served (privacy.js), so the
 *   work stays on narratives and trends, not on individuals.
 *
 * Stored in workspaces.settings (useCase, privacyMode) beside monitoringPaused; read through a short cache because
 * ingestion asks for every record.
 */
import supabase from "./supabase.js";

export const USE_CASES = ["brand", "gov", "cve"];
const TTL_MS = 60_000;
const cache = new Map();

export function profileFromSettings(settings = {}) {
    const useCase = USE_CASES.includes(settings?.useCase) ? settings.useCase : "brand";
    const privacyMode = typeof settings?.privacyMode === "boolean" ? settings.privacyMode : useCase === "cve";
    return { useCase, privacyMode };
}

export async function getWorkspaceProfile(workspaceId, db = supabase) {
    if (!workspaceId) return profileFromSettings();
    const hit = cache.get(workspaceId);
    if (hit && hit.at > Date.now() - TTL_MS) return hit.profile;
    const { data } = await db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
    const profile = profileFromSettings(data?.settings);
    cache.set(workspaceId, { at: Date.now(), profile });
    return profile;
}

/** The strictest profile across the caller's workspaces: privacy applies if any of them asks for it. */
export async function getProfilesFor(workspaceIds = [], db = supabase) {
    const profiles = await Promise.all(workspaceIds.map((id) => getWorkspaceProfile(id, db)));
    return {
        useCase: profiles.some((p) => p.useCase === "cve") ? "cve" : profiles.some((p) => p.useCase === "gov") ? "gov" : "brand",
        privacyMode: profiles.some((p) => p.privacyMode),
    };
}

export function forgetWorkspaceProfile(workspaceId) {
    cache.delete(workspaceId);
}

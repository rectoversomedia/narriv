/**
 * Workspaces the signed-in user belongs to, and creation of client workspaces.
 *
 * GET  /workspaces   list memberships (id, name, role) and the one this request resolves to
 * POST /workspaces   create a workspace; the caller becomes its owner
 *
 * Each client gets its own workspace so data never mixes: every data endpoint
 * reads exactly one workspace (see lib/workspace-access.js). Demo sessions are
 * pinned to the shared demo workspace and cannot create workspaces.
 */
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { DEMO_WORKSPACE_ID, getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { DEFAULT_TIMEZONE, normalizeTimezone } from "../../lib/timezone.js";

export const MAX_OWNED_WORKSPACES = 10;

const router = express.Router();
router.use(verifyToken);

const isDemo = (req) => String(req.user?.id || "").startsWith("demo");

const createBody = z.object({
    name: z.string().trim().min(2, "Workspace name must be at least 2 characters.").max(80, "Workspace name must be at most 80 characters."),
    industry: z.string().trim().max(80).optional().nullable(),
    timezone: z.string().trim().max(80).optional().nullable(),
});

router.get("/", async (req, res) => {
    try {
        if (isDemo(req)) {
            return res.json({ data: [{ id: DEMO_WORKSPACE_ID, name: "Demo Workspace", role: null, isDemo: true }], currentWorkspaceId: DEMO_WORKSPACE_ID });
        }
        const { data: memberships, error } = await db
            .from("workspace_members")
            .select("workspace_id, role, created_at")
            .eq("user_id", req.user.id);
        if (error) throw error;
        const ids = (memberships || []).map((m) => m.workspace_id);
        const { data: workspaces, error: wsError } = ids.length
            ? await db.from("workspaces").select("id, name, onboarding_completed, created_at").in("id", ids)
            : { data: [], error: null };
        if (wsError) throw wsError;
        const byId = new Map((workspaces || []).map((w) => [w.id, w]));
        const [current] = await getUserWorkspaceIds(req.user.id);
        const data = (memberships || [])
            .filter((m) => byId.has(m.workspace_id))
            .map((m) => ({ id: m.workspace_id, name: byId.get(m.workspace_id).name, role: m.role, createdAt: byId.get(m.workspace_id).created_at }))
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        return res.json({ data, currentWorkspaceId: current || null });
    } catch (error) {
        logStructured("error", "workspaces_list_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Workspaces could not be loaded." });
    }
});

router.post("/", validateRequest({ body: createBody }), async (req, res) => {
    try {
        if (isDemo(req)) {
            return res.status(403).json({ error: "Demo sessions cannot create workspaces. Sign in with your own account.", code: "DEMO_READ_ONLY" });
        }
        const { count, error: countError } = await db
            .from("workspace_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", req.user.id)
            .eq("role", "owner");
        if (countError) throw countError;
        if ((count || 0) >= MAX_OWNED_WORKSPACES) {
            return res.status(409).json({ error: `You already own ${MAX_OWNED_WORKSPACES} workspaces, the maximum. Remove one before creating another.`, code: "WORKSPACE_LIMIT" });
        }

        const name = req.body.name.replace(/\s+/g, " ");
        const { data: workspace, error: wsError } = await db
            .from("workspaces")
            .insert({
                name,
                slug: `ws-${crypto.randomUUID().slice(0, 8)}-${Date.now().toString(36)}`,
                // Created deliberately by an admin, so no onboarding wizard.
                onboarding_completed: true,
                onboarding_step: 100,
            })
            .select("id, name, created_at")
            .single();
        if (wsError || !workspace) throw wsError || new Error("workspace insert returned no row");

        const { error: memberError } = await db.from("workspace_members").insert({ workspace_id: workspace.id, user_id: req.user.id, role: "owner" });
        if (memberError) {
            await db.from("workspaces").delete().eq("id", workspace.id);
            throw memberError;
        }

        const { error: settingsError } = await db.from("workspace_settings").upsert({
            workspace_id: workspace.id,
            brand_name: name,
            industry: req.body.industry || null,
            timezone: normalizeTimezone(req.body.timezone) ?? DEFAULT_TIMEZONE,
            updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" });
        if (settingsError) logStructured("warn", "workspace_settings_seed_failed", { workspaceId: workspace.id, error: settingsError.message });

        await recordAuditLog({ userId: req.user.id, event: "workspace_created", workspaceId: workspace.id, metadata: { name } });
        logStructured("info", "workspace_created", { workspaceId: workspace.id });
        return res.status(201).json({ data: { id: workspace.id, name: workspace.name, role: "owner", createdAt: workspace.created_at } });
    } catch (error) {
        logStructured("error", "workspace_create_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The workspace could not be created." });
    }
});

export default router;

/**
 * Monitoring keywords (drive scheduled ingestion).
 *
 * GET    /workspace/keywords          list (any member)
 * POST   /workspace/keywords          create (owner/admin)
 * PATCH  /workspace/keywords/:id      rename / activate / deactivate (owner/admin)
 * DELETE /workspace/keywords/:id      remove (owner/admin)
 *
 * Workspace-scoped; duplicates are rejected case-insensitively. Scheduled
 * ingestion processes the first SCHEDULED_KEYWORDS_PER_WORKSPACE active
 * keywords (oldest first) each run; the response states this explicitly.
 */
import express from "express";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { resolveWorkspaceIdForUser, requireWorkspaceRole, MANAGER_ROLES, getWorkspaceRole } from "../../lib/workspace-access.js";
import supabase from "../../lib/supabase.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

export const MAX_ACTIVE_KEYWORDS = 25;
export const SCHEDULED_KEYWORDS_PER_WORKSPACE = 3;

const router = express.Router();
router.use(verifyToken);

const keywordText = z.string().trim().min(2, "Keyword must be at least 2 characters.").max(100, "Keyword must be at most 100 characters.");
const createBody = z.object({ keyword: keywordText, workspaceId: z.string().uuid().optional() });
const updateBody = z.object({ keyword: keywordText.optional(), isActive: z.boolean().optional(), workspaceId: z.string().uuid().optional() })
    .refine((b) => b.keyword !== undefined || b.isActive !== undefined, { message: "Nothing to update." });
const idParams = z.object({ id: z.string().uuid() });

const normalize = (k) => k.trim().replace(/\s+/g, " ");

async function listKeywords(workspaceId) {
    return supabase
        .from("monitoring_keywords")
        .select("id, keyword, is_active, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
}

function present(rows) {
    const active = rows.filter((r) => r.is_active);
    const scheduledIds = new Set(active.slice(0, SCHEDULED_KEYWORDS_PER_WORKSPACE).map((r) => r.id));
    return {
        data: rows.map((r) => ({ id: r.id, keyword: r.keyword, isActive: r.is_active, scheduled: scheduledIds.has(r.id), createdAt: r.created_at, updatedAt: r.updated_at })),
        limits: { maxActive: MAX_ACTIVE_KEYWORDS, scheduledPerRun: SCHEDULED_KEYWORDS_PER_WORKSPACE },
        note: `Scheduled ingestion runs every 6 hours and processes the first ${SCHEDULED_KEYWORDS_PER_WORKSPACE} active keywords (oldest first).`,
    };
}

async function isDuplicate(workspaceId, keyword, exceptId = null) {
    const { data } = await supabase.from("monitoring_keywords").select("id, keyword").eq("workspace_id", workspaceId);
    return (data || []).some((r) => r.id !== exceptId && r.keyword.trim().toLowerCase() === keyword.toLowerCase());
}

router.get("/", async (req, res) => {
    const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId || null);
    if (!ws) return res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
    const { data, error } = await listKeywords(ws);
    if (error) {
        logStructured("error", "keywords_list_failed", { error: error.message });
        return res.status(500).json({ error: "Failed to load keywords" });
    }
    const role = await getWorkspaceRole(req.user.id, ws);
    return res.json({ ...present(data || []), canEdit: MANAGER_ROLES.includes(role) });
});

router.post("/", validateRequest({ body: createBody }), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    const ws = req.scopedWorkspaceId;
    const keyword = normalize(req.body.keyword);
    if (await isDuplicate(ws, keyword)) return res.status(409).json({ error: "This keyword already exists.", code: "DUPLICATE_KEYWORD" });
    const { data: existing } = await listKeywords(ws);
    if ((existing || []).filter((r) => r.is_active).length >= MAX_ACTIVE_KEYWORDS) {
        return res.status(422).json({ error: `At most ${MAX_ACTIVE_KEYWORDS} active keywords are allowed.`, code: "KEYWORD_LIMIT" });
    }
    const { data, error } = await supabase
        .from("monitoring_keywords")
        .insert({ workspace_id: ws, keyword, is_active: true })
        .select("id, keyword, is_active, created_at, updated_at")
        .single();
    if (error) {
        logStructured("error", "keyword_create_failed", { error: error.message });
        return res.status(500).json({ error: "Failed to save keyword" });
    }
    await recordAuditLog({ userId: req.user.id, workspaceId: ws, event: "monitoring_keyword_created", metadata: { keywordId: data.id, keyword } });
    const { data: all } = await listKeywords(ws);
    return res.status(201).json({ keyword: present(all || []).data.find((k) => k.id === data.id), ...present(all || []) });
});

router.patch("/:id", validateRequest({ params: idParams, body: updateBody }), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    const ws = req.scopedWorkspaceId;
    const { data: row } = await supabase.from("monitoring_keywords").select("id, is_active").eq("id", req.params.id).eq("workspace_id", ws).maybeSingle();
    if (!row) return res.status(404).json({ error: "Keyword not found", code: "KEYWORD_NOT_FOUND" });
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.keyword !== undefined) {
        const keyword = normalize(req.body.keyword);
        if (await isDuplicate(ws, keyword, row.id)) return res.status(409).json({ error: "This keyword already exists.", code: "DUPLICATE_KEYWORD" });
        patch.keyword = keyword;
    }
    if (req.body.isActive !== undefined) {
        if (req.body.isActive && !row.is_active) {
            const { data: existing } = await listKeywords(ws);
            if ((existing || []).filter((r) => r.is_active).length >= MAX_ACTIVE_KEYWORDS) {
                return res.status(422).json({ error: `At most ${MAX_ACTIVE_KEYWORDS} active keywords are allowed.`, code: "KEYWORD_LIMIT" });
            }
        }
        patch.is_active = req.body.isActive;
    }
    const { error } = await supabase.from("monitoring_keywords").update(patch).eq("id", row.id).eq("workspace_id", ws);
    if (error) {
        logStructured("error", "keyword_update_failed", { error: error.message });
        return res.status(500).json({ error: "Failed to update keyword" });
    }
    await recordAuditLog({ userId: req.user.id, workspaceId: ws, event: "monitoring_keyword_updated", metadata: { keywordId: row.id, ...patch } });
    const { data: all } = await listKeywords(ws);
    return res.json(present(all || []));
});

router.delete("/:id", validateRequest({ params: idParams }), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    const ws = req.scopedWorkspaceId;
    const { data: row } = await supabase.from("monitoring_keywords").select("id, keyword").eq("id", req.params.id).eq("workspace_id", ws).maybeSingle();
    if (!row) return res.status(404).json({ error: "Keyword not found", code: "KEYWORD_NOT_FOUND" });
    const { error } = await supabase.from("monitoring_keywords").delete().eq("id", row.id).eq("workspace_id", ws);
    if (error) {
        logStructured("error", "keyword_delete_failed", { error: error.message });
        return res.status(500).json({ error: "Failed to delete keyword" });
    }
    await recordAuditLog({ userId: req.user.id, workspaceId: ws, event: "monitoring_keyword_deleted", metadata: { keywordId: row.id, keyword: row.keyword } });
    const { data: all } = await listKeywords(ws);
    return res.json(present(all || []));
});

export default router;

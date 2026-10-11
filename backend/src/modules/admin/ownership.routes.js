/**
 * Platform-admin workspace ownership recovery.
 *
 * GET  /admin/ownership/ownerless                 list workspaces with no owner
 * POST /admin/ownership/:workspaceId/promote      promote an existing admin to owner
 *
 * Gated by the x-admin-secret header (ADMIN_SECRET; fails closed when unset),
 * never by a workspace session. Recovery never invents a member: it only
 * promotes an existing admin of a workspace that currently has no owner, needs
 * a written reason, and is audit-logged. Responses expose ids, roles and dates
 * only (no emails or names).
 */
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) return res.status(503).json({ error: "Ownership recovery is disabled (ADMIN_SECRET not configured).", code: "ADMIN_DISABLED" });
    const given = String(req.headers["x-admin-secret"] || "");
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        logStructured("warn", "admin_ownership_auth_failed", { path: req.path });
        return res.status(401).json({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" });
    }
    return next();
}

router.use(requirePlatformAdmin);

/** Workspaces whose membership has no owner, with candidate admins. */
export async function findOwnerlessWorkspaces(client = db) {
    const [{ data: workspaces, error: wsErr }, { data: members, error: mErr }] = await Promise.all([
        client.from("workspaces").select("id, created_at").limit(5000),
        client.from("workspace_members").select("id, workspace_id, role, created_at").limit(20000),
    ]);
    if (wsErr || mErr) throw new Error((wsErr || mErr).message);
    const byWs = new Map();
    for (const m of members || []) {
        const list = byWs.get(m.workspace_id) || [];
        list.push(m);
        byWs.set(m.workspace_id, list);
    }
    return (workspaces || [])
        .map((w) => ({ w, list: byWs.get(w.id) || [] }))
        .filter(({ list }) => !list.some((m) => m.role === "owner"))
        .map(({ w, list }) => ({
            workspaceId: w.id,
            createdAt: w.created_at,
            memberCount: list.length,
            roles: list.reduce((acc, m) => ({ ...acc, [m.role]: (acc[m.role] || 0) + 1 }), {}),
            // Oldest admin first: usually the creator under the old admin-only flow.
            candidates: list.filter((m) => m.role === "admin").sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).map((m) => ({ memberId: m.id, role: m.role, joinedAt: m.created_at })),
        }));
}

router.get("/ownerless", async (_req, res) => {
    try {
        const data = await findOwnerlessWorkspaces();
        return res.json({ count: data.length, data, note: "Promote only with the workspace's or the account owner's authorization." });
    } catch (e) {
        logStructured("error", "admin_ownerless_list_failed", { error: e.message });
        return res.status(500).json({ error: "Failed to list workspaces" });
    }
});

const promoteBody = z.object({
    memberId: z.string().min(1),
    reason: z.string().trim().min(10, "Give a reason of at least 10 characters (who authorized it and why).").max(500),
});

router.post("/:workspaceId/promote", validateRequest({ params: z.object({ workspaceId: z.string().uuid() }), body: promoteBody }), async (req, res) => {
    const { workspaceId } = req.params;
    const { memberId, reason } = req.body;
    try {
        const { data: members, error } = await db.from("workspace_members").select("id, user_id, role").eq("workspace_id", workspaceId);
        if (error) throw new Error(error.message);
        if ((members || []).some((m) => m.role === "owner")) {
            return res.status(409).json({ error: "This workspace already has an owner; recovery is not needed.", code: "HAS_OWNER" });
        }
        const target = (members || []).find((m) => m.id === memberId);
        if (!target) return res.status(404).json({ error: "Member not found in this workspace.", code: "MEMBER_NOT_FOUND" });
        if (target.role !== "admin") return res.status(422).json({ error: "Only an existing admin can be promoted to owner.", code: "NOT_ADMIN" });
        const { error: updErr } = await db.from("workspace_members").update({ role: "owner" }).eq("id", target.id).eq("workspace_id", workspaceId);
        if (updErr) throw new Error(updErr.message);
        await recordAuditLog({ userId: null, workspaceId, event: "workspace_owner_recovered", metadata: { actor_id: "platform-admin", member_id: target.id, promoted_user_id: target.user_id, previous_role: "admin", reason } });
        return res.json({ ok: true, workspaceId, memberId: target.id, role: "owner" });
    } catch (e) {
        logStructured("error", "admin_owner_promote_failed", { workspaceId, error: e.message });
        return res.status(500).json({ error: "Failed to promote member" });
    }
});

export default router;

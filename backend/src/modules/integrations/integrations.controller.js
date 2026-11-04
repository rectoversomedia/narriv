import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { testIntegrationConnection } from "./webhook-dispatcher.service.js";
import { assertPublicHttpUrl } from "../../lib/url-safety.js";
import { tr } from "../../lib/request-context.js";

// Every URL an integration can call is checked when it is saved (Slack, Teams and generic webhooks), so a private or
// non-http address is refused with a clear message instead of failing silently at dispatch time (SSRF guard).
async function invalidWebhookUrl(config) {
    const c = config || {};
    for (const url of [c.webhookUrl, c.url, c.webhook_url, c.incomingWebhook?.url].filter(Boolean)) {
        try { await assertPublicHttpUrl(String(url)); }
        catch { return tr("The webhook URL must be a public http(s) address.", "URL webhook harus berupa alamat http(s) publik."); }
    }
    return null;
}

// Secrets stay on the server: webhook URLs and tokens are returned masked, so any member can see that a channel
// is set up without being able to read (or reuse) its credentials.
const SECRET_KEYS = ["webhookUrl", "url", "webhook_url", "accessToken", "token"];
const maskValue = (v) => (typeof v === "string" && v.length > 8 ? `${v.slice(0, 12)}…${v.slice(-4)}` : "••••");
export function maskIntegration(integration) {
    if (!integration || !integration.config || typeof integration.config !== "object") return integration;
    const config = { ...integration.config };
    for (const key of SECRET_KEYS) if (config[key]) config[key] = maskValue(config[key]);
    if (config.incomingWebhook?.url) config.incomingWebhook = { ...config.incomingWebhook, url: maskValue(config.incomingWebhook.url) };
    return { ...integration, config };
}

// WhatsApp is configured with a phone number ID, an access token and recipient numbers instead of a URL.
function invalidWhatsAppConfig(platform, config) {
    if (platform !== "whatsapp") return null;
    const c = config || {};
    if (!String(c.phoneNumberId || "").trim() || !String(c.accessToken || "").trim() || !String(c.to || "").trim()) {
        return tr("WhatsApp needs the phone number ID, the access token and at least one recipient number.", "WhatsApp butuh Phone Number ID, access token, dan minimal satu nomor penerima.");
    }
    return null;
}

export async function listIntegrations(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { platform, status } = req.query;

        let query = supabase
            .from("integrations")
            .select("*")
            .eq("workspace_id", scopedWorkspaceId)
            .order("created_at", { ascending: false });

        if (platform) query = query.eq("platform", platform);
        if (status) query = query.eq("status", status);

        const { data: integrations, error } = await query;

        if (error) {
            logStructured("error", "Error listing integrations:", { error: error.message || error });
            return internalError(res);
        }

        return res.json({ data: (integrations || []).map(maskIntegration) });
    } catch (error) {
        logStructured("error", "Error listing integrations:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function getIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: integration, error } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error getting integration:", { error: error.message || error });
            return internalError(res);
        }

        if (!integration) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        return res.json(maskIntegration(integration));
    } catch (error) {
        logStructured("error", "Error getting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createIntegration(req, res) {
    try {
        const { workspaceId, name, platform, config } = req.body;
        const urlProblem = await invalidWebhookUrl(config);
        if (urlProblem) return badRequest(res, urlProblem, "INVALID_WEBHOOK_URL");
        const whatsappProblem = invalidWhatsAppConfig(platform, config);
        if (whatsappProblem) return badRequest(res, whatsappProblem, "INVALID_WHATSAPP_CONFIG");

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: integration, error } = await supabase
            .from("integrations")
            .insert({
                workspace_id: scopedWorkspaceId,
                name,
                platform,
                config: config || {},
                // Connecting a channel means it should receive alerts; it can be paused afterwards.
                status: "active",
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating integration:", { error: error.message || error });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_created",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: integration.id, name, platform },
        });

        return res.status(201).json(maskIntegration(integration));
    } catch (error) {
        logStructured("error", "Error creating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding integration:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const { workspaceId, ...updateData } = req.body;
        if (updateData.config) {
            const urlProblem = await invalidWebhookUrl(updateData.config);
            if (urlProblem) return badRequest(res, urlProblem, "INVALID_WEBHOOK_URL");
        }

        const { data: updated, error: updateError } = await supabase
            .from("integrations")
            .update(updateData)
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating integration:", { error: updateError.message || updateError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_updated",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: updated.id, changes: updateData },
        });

        return res.json(maskIntegration(updated));
    } catch (error) {
        logStructured("error", "Error updating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding integration:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const { error: deleteError } = await supabase
            .from("integrations")
            .delete()
            .eq("id", req.params.id);

        if (deleteError) {
            logStructured("error", "Error deleting integration:", { error: deleteError.message || deleteError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_deleted",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: req.params.id },
        });

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function testIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId || req.body?.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: integration, error } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error finding integration for test:", { error: error.message || error });
            return internalError(res);
        }

        if (!integration) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const result = await testIntegrationConnection(integration);

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_tested",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: integration.id, platform: integration.platform, result },
        });

        return res.json({ success: true, ...result });
    } catch (error) {
        logStructured("error", "Error testing integration webhook:", { error: error?.message || error });
        return badRequest(res, error.message || "Failed to test integration webhook");
    }
}

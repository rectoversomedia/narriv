import supabase from "../../lib/supabase.js";
import { badRequest, internalError } from "../../lib/api-error.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

// Helper: verify workspace membership
async function verifyWorkspaceAccess(userId, workspaceId) {
    const { data } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
    return !!data;
}

export async function createOnboardingWorkspace(req, res) {
    try {
        const { brandName, industry, timezone } = req.body;

        // Create workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .insert({
                name: brandName,
                slug: `workspace-${req.user.id}-${Date.now()}`,
            })
            .select()
            .single();

        if (workspaceError) {
            logStructured("error", "Error creating workspace:", { error: workspaceError?.message || workspaceError });
            return internalError(res);
        }

        // Create workspace settings
        const { data: settings, error: settingsError } = await supabase
            .from("workspace_settings")
            .insert({
                workspace_id: workspace.id,
                brand_name: brandName,
                industry: industry || null,
                timezone: timezone || "Asia/Jakarta (GMT+7)",
            })
            .select()
            .single();

        if (settingsError) {
            logStructured("error", "Error creating workspace settings:", { error: settingsError?.message || settingsError });
            // Continue anyway, settings can be created later
        }

        // Create notification settings
        const { data: notificationSettings, error: nsError } = await supabase
            .from("workspace_notification_settings")
            .insert({
                workspace_id: workspace.id,
            })
            .select()
            .single();

        if (nsError) {
            logStructured("error", "Error creating notification settings:", { error: nsError?.message || nsError });
            // Continue anyway
        }

        // Create member with user_id
        const { data: member, error: memberError } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: workspace.id,
                user_id: req.user.id,
                role: "admin",
            })
            .select()
            .single();

        if (memberError) {
            logStructured("error", "Error creating workspace member:", { error: memberError?.message || memberError });
            // Continue anyway
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: workspace.id,
            event: "onboarding_workspace_created",
            metadata: { workspaceId: workspace.id, brandName, industry },
        });

        return res.status(201).json({
            ...workspace,
            settings: settings || null,
            notificationSettings: notificationSettings || null,
            members: member ? [member] : [],
        });
    } catch (error) {
        logStructured("error", "Error creating onboarding workspace:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingSources(req, res) {
    try {
        const { sources } = req.body;
        const workspaceId = req.body.workspaceId;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const sourcesData = sources.map((source) => ({
            workspace_id: workspaceId,
            name: source.name,
            type: source.type,
            actor_id: source.actorId || null,
            input_config: source.inputConfig || {},
            is_active: true,
        }));

        const { data: created, error: createError } = await supabase
            .from("sources")
            .insert(sourcesData)
            .select();

        if (createError) {
            logStructured("error", "Error creating sources:", { error: createError?.message || createError });
            return internalError(res);
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_sources_created",
            metadata: { workspaceId, count: created?.length || 0 },
        });

        return res.status(201).json({ count: created?.length || 0 });
    } catch (error) {
        logStructured("error", "Error creating onboarding sources:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingNotifications(req, res) {
    try {
        const { workspaceId, emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        // Check if settings exist
        const { data: existing } = await supabase
            .from("workspace_notification_settings")
            .select("id")
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        let settings;
        if (existing) {
            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .update({
                    email_enabled: emailEnabled,
                    whatsapp_enabled: whatsappEnabled,
                    escalation_notifications: escalationNotifications,
                    reminder_notifications: reminderNotifications,
                })
                .eq("workspace_id", workspaceId)
                .select()
                .single();

            if (error) {
                logStructured("error", "Error updating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            settings = data;
        } else {
            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .insert({
                    workspace_id: workspaceId,
                    email_enabled: emailEnabled ?? true,
                    whatsapp_enabled: whatsappEnabled ?? false,
                    escalation_notifications: escalationNotifications ?? true,
                    reminder_notifications: reminderNotifications ?? true,
                })
                .select()
                .single();

            if (error) {
                logStructured("error", "Error creating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            settings = data;
        }

        return res.json(settings);
    } catch (error) {
        logStructured("error", "Error creating onboarding notifications:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingTeam(req, res) {
    try {
        const { members, workspaceId } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const results = [];
        for (const member of members) {
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("email", member.email)
                .maybeSingle();

            if (userError) {
                logStructured("error", "Error finding user:", { error: userError?.message || userError });
            }

            if (!user) {
                results.push({ email: member.email, status: "user_not_found" });
                continue;
            }

            const { data: existing } = await supabase
                .from("workspace_members")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (existing) {
                results.push({ email: member.email, status: "already_member" });
                continue;
            }

            const { data: newMember, error: createMemberError } = await supabase
                .from("workspace_members")
                .insert({
                    workspace_id: workspaceId,
                    user_id: user.id,
                    role: member.role,
                })
                .select()
                .single();

            if (createMemberError) {
                logStructured("error", "Error creating workspace member:", { error: createMemberError?.message || createMemberError });
                results.push({ email: member.email, status: "error" });
                continue;
            }

            results.push({ email: member.email, status: "added", role: member.role });
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_team_invited",
            metadata: { workspaceId, memberCount: members.length, results },
        });

        return res.json({ results });
    } catch (error) {
        logStructured("error", "Error creating onboarding team:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

// Get pre-configured Indonesia media source templates
export async function getSourceTemplates(req, res) {
    try {
        const { category, search } = req.query;

        let query = supabase
            .from("source_templates")
            .select("*")
            .eq("is_active", true)
            .order("category", { ascending: true })
            .order("name", { ascending: true });

        if (category) {
            query = query.eq("category", category);
        }

        if (search) {
            query = query.ilike("name", `%${search}%`);
        }

        const { data: templates, error } = await query;

        if (error) {
            logStructured("error", "Error fetching source templates:", { error: error?.message || error });
            return internalError(res);
        }

        // Group by category
        const grouped = templates?.reduce((acc, template) => {
            if (!acc[template.category]) {
                acc[template.category] = [];
            }
            acc[template.category].push(template);
            return acc;
        }, {}) || {};

        return res.json({
            templates: templates || [],
            grouped,
            total: templates?.length || 0,
        });
    } catch (error) {
        logStructured("error", "Error getting source templates:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

// Create onboarding keywords
export async function createOnboardingKeywords(req, res) {
    try {
        const { workspaceId, keywords } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const hasAccess = await verifyWorkspaceAccess(req.user.id, workspaceId);
        if (!hasAccess) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        // Upsert keywords
        const keywordsData = keywords.map((keyword) => ({
            workspace_id: workspaceId,
            keyword: keyword.trim(),
            is_active: true,
        }));

        const { data: created, error } = await supabase
            .from("monitoring_keywords")
            .upsert(keywordsData, { onConflict: "workspace_id,keyword" })
            .select();

        if (error) {
            logStructured("error", "Error creating monitoring keywords:", { error: error?.message || error });
            return internalError(res);
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_keywords_created",
            metadata: { workspaceId, count: keywords.length, keywords },
        });

        return res.status(201).json({
            count: created?.length || keywords.length,
            keywords: created || keywordsData,
        });
    } catch (error) {
        logStructured("error", "Error creating onboarding keywords:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

// Complete onboarding - mark done and optionally trigger ingestion
export async function completeOnboarding(req, res) {
    try {
        const { workspaceId, triggerIngestion = true } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const hasAccess = await verifyWorkspaceAccess(req.user.id, workspaceId);
        if (!hasAccess) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        // Update workspace onboarding status
        const { data: workspace, error: wsError } = await supabase
            .from("workspaces")
            .update({
                onboarding_completed: true,
                onboarding_step: 100, // 100% complete
            })
            .eq("id", workspaceId)
            .select()
            .single();

        if (wsError) {
            logStructured("error", "Error updating workspace onboarding status:", { error: wsError?.message || wsError });
            return internalError(res);
        }

        // Create/update onboarding progress record
        const { data: progress, error: progressError } = await supabase
            .from("onboarding_progress")
            .upsert({
                workspace_id: workspaceId,
                current_step: 100,
                completed_steps: ["profile", "keywords", "sources", "notifications", "preview"],
                setup_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: "workspace_id" })
            .select()
            .single();

        if (progressError) {
            logStructured("error", "Error updating onboarding progress:", { error: progressError?.message || progressError });
            // Continue anyway
        }

        // Trigger ingestion if requested
        let ingestionJobs = [];
        if (triggerIngestion) {
            // Get active sources for this workspace
            const { data: sources } = await supabase
                .from("sources")
                .select("id, name, type")
                .eq("workspace_id", workspaceId)
                .eq("is_active", true);

            if (sources && sources.length > 0) {
                // Create ingestion jobs for each source
                const jobsData = sources.map((source) => ({
                    workspace_id: workspaceId,
                    source_id: source.id,
                    status: "pending",
                }));

                const { data: jobs, error: jobsError } = await supabase
                    .from("ingestion_jobs")
                    .insert(jobsData)
                    .select();

                if (!jobsError && jobs) {
                    ingestionJobs = jobs;
                    logStructured("info", "Ingestion jobs created", {
                        workspaceId,
                        sourceCount: sources.length,
                        jobIds: jobs.map(j => j.id)
                    });
                }
            }
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_completed",
            metadata: {
                workspaceId,
                triggerIngestion,
                ingestionJobsCreated: ingestionJobs.length,
                sourcesCount: ingestionJobs.length,
            },
        });

        return res.json({
            success: true,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                onboarding_completed: true,
            },
            onboarding: {
                completed: true,
                completed_at: progress?.setup_completed_at || new Date().toISOString(),
            },
            ingestion: {
                triggered: triggerIngestion,
                jobs_created: ingestionJobs.length,
                jobs: ingestionJobs.map(j => ({ id: j.id, source_id: j.source_id, status: j.status })),
            },
        });
    } catch (error) {
        logStructured("error", "Error completing onboarding:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

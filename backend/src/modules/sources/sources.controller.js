import supabase from "../../lib/supabase.js";
import { getUserWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { invalidateWorkspaceCache } from "../../lib/cache.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { APIFY_ACTOR_PRESETS, buildSourceSeed, buildWebScraperSeeds, listSourcePresets } from "../ingestion/actor-presets.js";

const VALID_SOURCE_TYPES = ["news", "web", "forum", "social", "video", "podcast"];

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export const getSources = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceIds = await getUserWorkspaceIds(userId);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;
        const type = req.query.type ? String(req.query.type).toLowerCase() : null;
        const isActive = req.query.isActive !== undefined ? String(req.query.isActive).toLowerCase() === "true" : null;
        const search = req.query.search ? String(req.query.search).trim() : null;

        // Build query conditions
        let query = supabase.from('sources').select('*', { count: 'exact' });

        // Filter by workspace_ids (Supabase array contains)
        query = query.overlaps('workspace_id', workspaceIds);

        // Filter by type
        if (type === "deleted") {
            return res.json({
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0 }
            });
        }
        if (type) {
            query = query.eq('type', type);
        } else {
            query = query.neq('type', 'deleted');
        }

        if (isActive !== null) {
            query = query.eq('is_active', isActive);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,actor_id.ilike.%${search}%`);
        }

        // Apply pagination and ordering
        query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

        const { data: sources, count: total, error } = await query;

        if (error) {
            logStructured("error", "Error fetching sources from Supabase:", { error: error?.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        res.json({
            data: sources || [],
            pagination: {
                page,
                limit,
                total: total || 0,
                totalPages: Math.ceil((total || 0) / limit)
            }
        });
    } catch (error) {
        logStructured("error", "Error fetching sources:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createSource = async (req, res) => {
    try {
        const { name, type, workspaceId, actorId, inputConfig } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: "Name and type are required" });
        }
        const normalizedName = String(name).trim();
        const normalizedType = String(type).toLowerCase().trim();

        if (!normalizedName) {
            return res.status(400).json({ error: "Name cannot be empty" });
        }
        if (!VALID_SOURCE_TYPES.includes(normalizedType)) {
            return res.status(400).json({
                error: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
            });
        }
        if (actorId !== undefined && actorId !== null && String(actorId).trim() === "") {
            return res.status(400).json({ error: "actorId cannot be empty string" });
        }
        if (inputConfig !== undefined && !isObject(inputConfig)) {
            return res.status(400).json({ error: "inputConfig must be an object" });
        }

        const userId = req.user.id;
        const targetWorkspaceId = await resolveWorkspaceIdForUser(userId, workspaceId);

        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: source, error } = await supabase
            .from('sources')
            .insert({
                workspace_id: targetWorkspaceId,
                name: normalizedName,
                type: normalizedType,
                actor_id: actorId ? String(actorId).trim() : null,
                input_config: inputConfig || {},
                is_active: true
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating source in Supabase:", { error: error?.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await invalidateWorkspaceCache(targetWorkspaceId);
        await recordAuditLog({
            userId,
            event: "source_created",
            workspaceId: targetWorkspaceId,
            metadata: { sourceId: source.id, name: source.name, type: source.type },
        });
        res.status(201).json(source);
    } catch (error) {
        logStructured("error", "Error creating source:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

    export const updateSource = async (req, res) => {
    try {
        const { sourceId } = req.params;
        const { name, type, actorId, inputConfig, isActive } = req.body;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Find existing source - check workspace_id in array and type != deleted
        const { data: existingSource, error: findError } = await supabase
            .from('sources')
            .select('*')
            .overlaps('workspace_id', workspaceIds)
            .neq('type', 'deleted')
            .eq('id', sourceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding source:", { error: findError?.message || findError });
            return res.status(500).json({ error: "Internal server error" });
        }

        if (!existingSource) {
            return res.status(404).json({ error: "Source not found" });
        }

        const data = {};
        if (name !== undefined) data.name = name;
        if (type !== undefined) data.type = String(type).toLowerCase().trim();
        if (actorId !== undefined) data.actor_id = actorId || null;
        if (inputConfig !== undefined) data.input_config = inputConfig || {};
        if (isActive !== undefined) data.is_active = Boolean(isActive);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No source fields provided" });
        }

        if (data.name === "" || data.type === "") {
            return res.status(400).json({ error: "Name and type cannot be empty" });
        }
        if (data.type && !VALID_SOURCE_TYPES.includes(data.type)) {
            return res.status(400).json({
                error: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
            });
        }
        if (inputConfig !== undefined && !isObject(inputConfig)) {
            return res.status(400).json({ error: "inputConfig must be an object" });
        }

        const { data: source, error } = await supabase
            .from('sources')
            .update(data)
            .eq('id', sourceId)
            .select()
            .single();

        if (error) {
            logStructured("error", "Error updating source in Supabase:", { error: error?.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await invalidateWorkspaceCache(existingSource.workspace_id);
        await recordAuditLog({
            userId: req.user.id,
            event: "source_updated",
            workspaceId: existingSource.workspace_id,
            metadata: { sourceId, changes: Object.keys(data) },
        });
        res.json(source);
    } catch (error) {
        logStructured("error", "Error updating source:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteSource = async (req, res) => {
    try {
        const { sourceId } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Find existing source - check workspace_id in array and type != deleted
        const { data: existingSource, error: findError } = await supabase
            .from('sources')
            .select('*')
            .overlaps('workspace_id', workspaceIds)
            .neq('type', 'deleted')
            .eq('id', sourceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding source:", { error: findError?.message || findError });
            return res.status(500).json({ error: "Internal server error" });
        }

        if (!existingSource) {
            return res.status(404).json({ error: "Source not found" });
        }

        // Soft delete: set is_active = false and type = 'deleted'
        const { data: source, error } = await supabase
            .from('sources')
            .update({ is_active: false, type: 'deleted' })
            .eq('id', sourceId)
            .select()
            .single();

        if (error) {
            logStructured("error", "Error deleting source in Supabase:", { error: error?.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await invalidateWorkspaceCache(existingSource.workspace_id);
        await recordAuditLog({
            userId: req.user.id,
            event: "source_deleted",
            workspaceId: existingSource.workspace_id,
            metadata: { sourceId },
        });
        res.json(source);
    } catch (error) {
        logStructured("error", "Error deleting source:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getSourcePresets = async (req, res) => {
    const keyword = req.query.keyword || "Narriv";
    return res.json(listSourcePresets(keyword));
};

export const bootstrapDefaultSources = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            workspaceId,
            keyword = "Narriv",
            includeActors = true,
            includeWebScrapers = true,
            tiers = [1, 2],
            presetKeys,
            maxWebItems = 20,
        } = req.body;
        const targetWorkspaceId = await resolveWorkspaceIdForUser(userId, workspaceId);

        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const selectedTierSet = new Set(tiers);
        const selectedKeySet = Array.isArray(presetKeys) && presetKeys.length > 0 ? new Set(presetKeys) : null;
        const actorSeeds = includeActors
            ? APIFY_ACTOR_PRESETS
                .filter((preset) => selectedKeySet ? selectedKeySet.has(preset.key) : selectedTierSet.has(preset.tier))
                .map((preset) => buildSourceSeed({ presetKey: preset.key, keyword }))
                .filter(Boolean)
            : [];
        const webScraperSeeds = includeWebScrapers ? buildWebScraperSeeds({ maxItems: maxWebItems }) : [];
        const seeds = [...actorSeeds, ...webScraperSeeds];
        const created = [];
        const skipped = [];

        for (const seed of seeds) {
            // Check for existing sources with same name and input_config
            const { data: existings, error: findError } = await supabase
                .from('sources')
                .select('*')
                .eq('workspace_id', targetWorkspaceId)
                .eq('name', seed.name)
                .neq('type', 'deleted');

            if (findError) {
                logStructured("error", "Error checking existing sources:", { error: findError?.message || findError });
                continue;
            }

            const isDuplicate = existings?.some((existing) => {
                return JSON.stringify(existing.input_config) === JSON.stringify(seed.inputConfig);
            });

            if (isDuplicate) {
                skipped.push({ name: seed.name });
                continue;
            }

            const { data: source, error } = await supabase
                .from('sources')
                .insert({
                    workspace_id: targetWorkspaceId,
                    name: seed.name,
                    type: seed.type,
                    actor_id: seed.actorId,
                    input_config: seed.inputConfig,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                logStructured("error", "Error creating source in bootstrap:", { error: error?.message || error });
                continue;
            }
            created.push(source);
        }

        await invalidateWorkspaceCache(targetWorkspaceId);
        await recordAuditLog({
            userId,
            event: "default_sources_bootstrapped",
            workspaceId: targetWorkspaceId,
            metadata: {
                keyword,
                createdCount: created.length,
                skippedCount: skipped.length,
                includeActors,
                includeWebScrapers,
            },
        });

        return res.status(201).json({
            created: created.length,
            skipped: skipped.length,
            sources: created,
            skippedSources: skipped,
        });
    } catch (error) {
        logStructured("error", "Error bootstrapping default sources:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

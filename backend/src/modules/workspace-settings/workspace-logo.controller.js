import fs from "fs";
import path from "path";
import crypto from "crypto";
import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "logos");
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

function getExtensionFromMime(mimeType) {
    const map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
    };
    return map[mimeType] || ".png";
}

export async function uploadWorkspaceLogo(req, res) {
    try {
        const { workspaceId, fileName, fileContent, mimeType } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        // Validate file size (base64 decoded size)
        const buffer = Buffer.from(fileContent, "base64");
        if (buffer.length > MAX_FILE_SIZE) {
            return badRequest(res, "File size exceeds 2MB limit.", "FILE_TOO_LARGE");
        }

        // Generate unique filename
        const ext = getExtensionFromMime(mimeType);
        const uniqueName = `${crypto.randomUUID()}${ext}`;

        // Save file
        ensureUploadDir();
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        fs.writeFileSync(filePath, buffer);

        // Build URL (relative path for local storage)
        const logo_url = `/uploads/logos/${uniqueName}`;

        // Check if settings exist
        const { data: existing } = await supabase
            .from("workspace_settings")
            .select("id")
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (existing) {
            await supabase
                .from("workspace_settings")
                .update({ logo_url })
                .eq("workspace_id", scopedWorkspaceId);
        } else {
            await supabase
                .from("workspace_settings")
                .insert({
                    workspace_id: scopedWorkspaceId,
                    logo_url,
                });
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: scopedWorkspaceId,
            event: "workspace_logo_uploaded",
            metadata: {
                workspace_id: scopedWorkspaceId,
                file_name: uniqueName,
                original_name: fileName,
                mime_type: mimeType,
                size: buffer.length,
            },
        });

        return res.json({ url: logo_url, fileName: uniqueName });
    } catch (error) {
        logStructured("error", "Error uploading workspace logo:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

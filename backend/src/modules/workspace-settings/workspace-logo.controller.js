import crypto from "crypto";
import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

// Client logos live in a public Supabase Storage bucket (the server's own disk does not survive a restart) and the
// public URL is kept on the workspaces row, where the settings page and the overview read it.
const BUCKET = "workspace-logos";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/** The image type from the file's first bytes, so a renamed file of another kind is refused. */
export function detectImageType(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
    return null;
}

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
        const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_FILE_SIZE, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] });
        if (error && !/already exists/i.test(error.message || "")) throw error;
    }
    bucketReady = true;
}

export async function uploadWorkspaceLogo(req, res) {
    try {
        const { workspaceId, fileName, fileContent } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const buffer = Buffer.from(fileContent, "base64");
        if (buffer.length > MAX_FILE_SIZE) {
            return badRequest(res, "File size exceeds 2MB limit.", "FILE_TOO_LARGE");
        }
        const type = detectImageType(buffer);
        if (!type) {
            return badRequest(res, "Upload a PNG, JPG or WEBP image.", "INVALID_IMAGE");
        }

        await ensureBucket();
        const objectPath = `${scopedWorkspaceId}/${crypto.randomUUID()}.${type.ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, { contentType: type.mime, cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;
        const logo_url = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;

        const { error: updateError } = await supabase.from("workspaces").update({ logo_url }).eq("id", scopedWorkspaceId);
        if (updateError) throw updateError;

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: scopedWorkspaceId,
            event: "workspace_logo_uploaded",
            metadata: {
                workspace_id: scopedWorkspaceId,
                file_name: objectPath,
                original_name: fileName,
                mime_type: type.mime,
                size: buffer.length,
            },
        });

        return res.json({ url: logo_url, fileName: objectPath });
    } catch (error) {
        logStructured("error", "Error uploading workspace logo:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

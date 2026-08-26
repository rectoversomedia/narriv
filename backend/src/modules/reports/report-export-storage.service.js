import crypto from "crypto";
import supabase, { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(process.env.REPORT_EXPORT_URL_TTL_SECONDS || 3600);

function getProviderName() {
    return process.env.REPORT_EXPORT_STORAGE_PROVIDER || "database";
}

function buildSignedUrl(baseUrl, exportId, signedToken) {
    return `${baseUrl}/api/reports/exports/${exportId}/download?token=${signedToken}`;
}

/**
 * Upload a file to Supabase Storage.
 * Falls back to database mode if storage is not configured.
 */
async function uploadToStorage({ exportId, payload, fileName, ttlSeconds }) {
    const bucket = process.env.REPORT_EXPORT_STORAGE_BUCKET || "report-exports";
    const storagePath = `exports/${exportId}/${fileName}`;
    const signedToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
        // Upload the file content to Supabase Storage
        const { data: uploadData, error: uploadError } = await baseSupabaseAdmin.storage
            .from(bucket)
            .upload(storagePath, payload, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            logStructured("error", "storage_upload_failed", { exportId, error: uploadError.message });
            // Fall back to database if storage fails
            return null;
        }

        // Create a signed URL for secure download
        const { data: urlData, error: urlError } = await baseSupabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(storagePath, ttlSeconds);

        if (urlError) {
            logStructured("error", "storage_signed_url_failed", { exportId, error: urlError.message });
            return null;
        }

        logStructured("info", "export_stored_in_storage", {
            exportId,
            bucket,
            path: storagePath,
            signedUrl: urlData.signedUrl ? "(generated)" : null,
        });

        return {
            storagePath,
            signedUrl: urlData.signedUrl,
            signedToken,
            expiresAt,
        };
    } catch (err) {
        logStructured("error", "storage_exception", { exportId, error: err?.message });
        return null;
    }
}

/**
 * Get file content from Supabase Storage.
 */
async function getFromStorage({ storagePath }) {
    const bucket = process.env.REPORT_EXPORT_STORAGE_BUCKET || "report-exports";

    try {
        const { data, error } = await baseSupabaseAdmin.storage
            .from(bucket)
            .download(storagePath);

        if (error) {
            logStructured("error", "storage_download_failed", { storagePath, error: error.message });
            return null;
        }

        return data;
    } catch (err) {
        logStructured("error", "storage_download_exception", { storagePath, error: err?.message });
        return null;
    }
}

export async function storeReportExportPayload({
    exportId,
    payload,
    fileName,
    baseUrl,
    ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
}) {
    const provider = getProviderName();

    // Try Supabase Storage first if configured
    if (provider === "storage" || provider === "supabase") {
        const storageResult = await uploadToStorage({ exportId, payload, fileName, ttlSeconds });
        if (storageResult) {
            // Store minimal metadata in DB + storage reference
            const { error } = await baseSupabaseAdmin
                .from("report_exports")
                .update({
                    file_content: null, // no longer storing in DB
                    file_name: fileName,
                    signed_token: storageResult.signedToken,
                    signed_url: storageResult.signedUrl,
                    expires_at: storageResult.expiresAt.toISOString(),
                    status: "completed",
                    error_message: null,
                })
                .eq("id", exportId);

            if (error) {
                logStructured("error", "store_export_metadata_failed", { exportId, error: error.message });
                throw error;
            }

            logStructured("info", "export_payload_stored", { exportId, provider: "supabase_storage", ttlSeconds });
            return { signedUrl: storageResult.signedUrl, expiresAt: storageResult.expiresAt, provider: "supabase_storage" };
        }
        // Fall through to database mode if storage fails
        logStructured("warn", "storage_unavailable_falling_back", { exportId });
    }

    // Database fallback (original behavior)
    const signedToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const signedUrl = buildSignedUrl(baseUrl, exportId, signedToken);

    const { error } = await baseSupabaseAdmin
        .from("report_exports")
        .update({
            file_content: payload,
            file_name: fileName,
            signed_token: signedToken,
            signed_url: signedUrl,
            expires_at: expiresAt.toISOString(),
            status: "completed",
            error_message: null,
        })
        .eq("id", exportId);

    if (error) {
        logStructured("error", "store_export_payload_failed", { exportId, error: error.message });
        throw error;
    }

    logStructured("info", "export_payload_stored", { exportId, provider: "database", ttlSeconds });
    return { signedUrl, expiresAt, provider: "database" };
}

export async function resolveSignedReportDownload({ exportId, token }) {
    const { data: job, error } = await baseSupabaseAdmin
        .from("report_exports")
        .select("*, report:reports(*)")
        .eq("id", exportId)
        .single();

    if (error || !job) {
        return { ok: false, status: 404, error: "Export job not found" };
    }
    if (job.status !== "completed") {
        return { ok: false, status: 409, error: "Export is not ready" };
    }
    if (!job.signed_token || token !== job.signed_token) {
        return { ok: false, status: 401, error: "Invalid download token" };
    }
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
        return { ok: false, status: 410, error: "Signed URL has expired" };
    }

    // Try Supabase Storage first
    if (job.signed_url && job.signed_url.startsWith("http") && !job.file_content) {
        // File is in storage — create a fresh signed URL
        const storagePath = job.signed_url; // stored as path when in storage mode
        if (storagePath && storagePath.includes("/")) {
            const bucket = process.env.REPORT_EXPORT_STORAGE_BUCKET || "report-exports";
            const fileName = job.file_name || "export.pdf";
            const { data: urlData } = await baseSupabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(storagePath.split(`${bucket}/`)[1] || storagePath, 3600)
                .catch(() => ({ data: null }));

            if (urlData?.signedUrl) {
                return { ok: true, job, signedUrl: urlData.signedUrl, provider: "supabase_storage" };
            }
        }
    }

    // Fall back to database content
    if (!job.file_content) {
        return { ok: false, status: 409, error: "Export file not found" };
    }

    return { ok: true, job, payload: job.file_content, provider: "database" };
}

export async function cleanupExpiredReportExports(limit = 100) {
    const now = new Date();
    const { data: expired, error } = await baseSupabaseAdmin
        .from("report_exports")
        .select("id")
        .eq("status", "completed")
        .lt("expires_at", now.toISOString())
        .limit(limit);

    if (error || !expired || expired.length === 0) {
        return { cleaned: 0 };
    }

    const ids = expired.map((item) => item.id);

    // Try to delete from storage
    const provider = getProviderName();
    if (provider === "storage" || provider === "supabase") {
        const bucket = process.env.REPORT_EXPORT_STORAGE_BUCKET || "report-exports";
        for (const id of ids) {
            try {
                // List and delete files for this export
                const pathPrefix = `exports/${id}/`;
                await baseSupabaseAdmin.storage.from(bucket).remove([pathPrefix]);
            } catch (_) {
                // Ignore storage cleanup errors — DB cleanup still runs
            }
        }
    }

    const { error: updateError } = await baseSupabaseAdmin
        .from("report_exports")
        .update({
            status: "expired",
            file_content: null,
            signed_token: null,
            signed_url: null,
            error_message: "Export expired and cleaned up",
        })
        .in("id", ids);

    if (updateError) {
        logStructured("error", "cleanup_expired_exports_failed", { error: updateError.message });
    }

    logStructured("info", "expired_exports_cleaned", { cleaned: ids.length });
    return { cleaned: ids.length };
}

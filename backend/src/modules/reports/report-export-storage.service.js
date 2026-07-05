import crypto from "crypto";
import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(process.env.REPORT_EXPORT_URL_TTL_SECONDS || 3600);

function getProviderName() {
    return process.env.REPORT_EXPORT_STORAGE_PROVIDER || "database";
}

function buildSignedUrl(baseUrl, exportId, signedToken) {
    return `${baseUrl}/api/reports/exports/${exportId}/download?token=${signedToken}`;
}

export async function storeReportExportPayload({
    exportId,
    payload,
    fileName,
    baseUrl,
    ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
}) {
    const provider = getProviderName();
    const signedToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const signedUrl = buildSignedUrl(baseUrl, exportId, signedToken);

    const { error } = await supabase
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

    logStructured("info", "export_payload_stored", { exportId, provider, ttlSeconds });
    return { signedUrl, expiresAt, provider };
}

export async function resolveSignedReportDownload({ exportId, token }) {
    const { data: job, error } = await supabase
        .from("report_exports")
        .select("*, report:reports(*)")
        .eq("id", exportId)
        .single();

    if (error || !job) {
        return { ok: false, status: 404, error: "Export job not found" };
    }
    if (job.status !== "completed" || !job.file_content) {
        return { ok: false, status: 409, error: "Export is not ready" };
    }
    if (!job.signed_token || token !== job.signed_token) {
        return { ok: false, status: 401, error: "Invalid download token" };
    }
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
        return { ok: false, status: 410, error: "Signed URL has expired" };
    }

    return { ok: true, job, payload: job.file_content };
}

export async function cleanupExpiredReportExports(limit = 100) {
    const now = new Date();
    const { data: expired, error } = await supabase
        .from("report_exports")
        .select("id")
        .eq("status", "completed")
        .lt("expires_at", now.toISOString())
        .limit(limit);

    if (error || !expired || expired.length === 0) {
        return { cleaned: 0 };
    }

    const ids = expired.map((item) => item.id);
    const { error: updateError } = await supabase
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

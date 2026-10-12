// Workspace timezones are stored as IANA ids ("Asia/Jakarta"). Older rows and
// clients sent display labels ("Asia/Jakarta (GMT+7)"); strip the label and
// accept the id only if Intl recognises it. Returns null when invalid.
export function normalizeTimezone(value) {
    if (typeof value !== "string") return null;
    const id = value.replace(/\s*\(.*\)\s*$/, "").trim();
    if (!id) return null;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: id });
        return id;
    } catch {
        return null;
    }
}

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

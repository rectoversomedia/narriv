/** Uploaded files (workspace logos) are served by the API; anything else is already a usable URL. */
export function resolveBackendAssetUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  return url;
}

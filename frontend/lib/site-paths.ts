import type { AppLanguage } from "@/store/useUiStore";

// The public website has one address per language (English at /pricing, Indonesian at /id/harga), so search engines
// index both. Plain data, so server code (metadata, sitemap) and client code share it.

/** English path → Indonesian path, for every public page that has both. */
export const ID_PATHS: Record<string, string> = {
  "/": "/id",
  "/pricing": "/id/harga",
  "/help": "/id/bantuan",
  "/privacy": "/id/privasi",
  "/terms": "/id/ketentuan",
  "/blog": "/id/blog",
};
const EN_PATHS: Record<string, string> = Object.fromEntries(Object.entries(ID_PATHS).map(([en, id]) => [id, en]));

/** The same page in the other language ("/pricing#faq" → "/id/harga#faq"); unknown paths are returned as they are. */
export function localizedPath(path: string, lang: AppLanguage): string {
  const [pathname, hash = ""] = path.split("#");
  const clean = pathname === "/welcome" ? "/" : pathname || "/";
  const suffix = hash ? `#${hash}` : "";
  const map = lang === "id" ? ID_PATHS : EN_PATHS;
  if (map[clean]) return map[clean] + suffix;
  // Articles keep their slug: /blog/x ↔ /id/blog/x.
  if (lang === "id" && clean.startsWith("/blog/")) return `/id${clean}${suffix}`;
  if (lang === "en" && clean.startsWith("/id/blog/")) return clean.slice(3) + suffix;
  return clean + suffix;
}

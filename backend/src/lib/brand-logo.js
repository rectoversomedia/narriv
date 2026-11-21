/**
 * Brand logo, found automatically: when a workspace names its brand and has no logo of its own, Narriv finds the
 * brand's official website (AI, checked by actually loading it) and takes the logo the site itself publishes for
 * apps and browsers (apple-touch-icon, large icons, then Google's favicon service at 256 px). The image is stored in
 * the workspace-logos bucket like an uploaded logo, so the sidebar, overview and reports show it everywhere.
 *
 * A logo the client uploaded is never replaced: an automatic logo is marked in workspaces.settings.logo_auto, and
 * only an automatic logo (or none) is refreshed when the brand name changes.
 */
import crypto from "crypto";
import supabase from "./supabase.js";
import { aiJson } from "./ai-json.js";
import { assertPublicHttpUrl } from "./url-safety.js";
import { logStructured } from "./logger.js";
import { detectImageType, ensureBucket } from "../modules/workspace-settings/workspace-logo.controller.js";

const BUCKET = "workspace-logos";
const UA = { "user-agent": "Mozilla/5.0 (compatible; NarrivLogo/1.0; +https://narriv.digital)" };
const MIN_BYTES = 1500; // smaller files are 16 px favicons or placeholders

/** The brand's official domain ("FIFGROUP" -> "fifgroup.co.id"), or null. */
export async function findBrandDomain(brand, { workspaceId, chat, fetchImpl = fetch } = {}) {
    const out = await aiJson({
        workspaceId, chat, operation: "brand_logo_domain", maxTokens: 200,
        system: "You identify the official website of a brand, company or institution, most likely an Indonesian one. Answer only with domains you are confident are the brand's own (not news sites, marketplaces or social media).",
        user: `Brand: ${brand}\nReturn {"domains": ["example.co.id", ...]} with up to 3 candidate official domains, most likely first, or {"domains": []} if unsure.`,
    });
    const domains = (out?.domains || []).map((d) => String(d).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim()).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    for (const domain of domains.slice(0, 3)) {
        try {
            const url = await assertPublicHttpUrl(`https://${domain}/`);
            const res = await fetchImpl(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(10000) });
            if (res.ok) return { domain, html: await res.text().catch(() => ""), base: res.url || url };
        } catch { /* try the next one */ }
    }
    // The site refused a bot (403, timeouts): the first candidate still has a favicon at Google.
    return domains[0] ? { domain: domains[0], html: "", base: `https://${domains[0]}/` } : null;
}

/** Icon URLs the site declares, biggest first. */
export function declaredIcons(html, base) {
    const out = [];
    for (const m of String(html || "").matchAll(/<link\b[^>]*>/gi)) {
        const tag = m[0];
        const rel = (tag.match(/rel=["']([^"']+)["']/i)?.[1] || "").toLowerCase();
        if (!/icon/.test(rel)) continue;
        const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
        if (!href || /\.svg(\?|$)/i.test(href)) continue;
        const size = Number(tag.match(/sizes=["'](\d+)x\d+["']/i)?.[1] || (/apple-touch/.test(rel) ? 180 : 32));
        if (size < 120) continue; // small favicons: Google's 256 px service is sharper
        try { out.push({ url: new URL(href, base).toString(), size }); } catch { /* skip */ }
    }
    return out.sort((a, b) => b.size - a.size).map((x) => x.url);
}

/** Logo images in the page itself (an <img> whose src, alt, class or id says "logo"), header first. */
export function pageLogos(html, base) {
    const out = [];
    for (const m of String(html || "").matchAll(/<img\b[^>]*>/gi)) {
        const tag = m[0];
        if (!/logo/i.test(tag)) continue;
        const src = tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i)?.[1];
        if (!src || src.startsWith("data:")) continue;
        try { out.push(new URL(src, base).toString()); } catch { /* skip */ }
        if (out.length >= 3) break;
    }
    return out;
}

let sharpLib;
async function getSharp() {
    if (sharpLib === undefined) sharpLib = await import("sharp").then((m) => m.default || m).catch(() => null);
    return sharpLib;
}

/** True when the visible pixels are almost all white or near-white. */
async function isMostlyWhite(sharp, pngBuffer) {
    const { data, info } = await sharp(pngBuffer).resize({ width: 64, height: 64, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0, light = 0;
    for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] < 60) continue;
        visible++;
        if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) light++;
    }
    return visible === 0 || light / visible > 0.85;
}

/**
 * Download one candidate and return it as a clean PNG ({ buffer, type, width, height }), or null when it is not an
 * image, too small to look sharp, or too big. SVG logos are rendered to PNG.
 */
async function download(url, fetchImpl, minSide) {
    try {
        const safe = await assertPublicHttpUrl(url);
        const res = await fetchImpl(safe, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 200 || buffer.length > 4 * 1024 * 1024) return null;
        const isSvg = /<svg[\s>]/i.test(buffer.subarray(0, 2000).toString("utf8"));
        const sharp = await getSharp();
        if (!sharp) {
            const type = detectImageType(buffer);
            return type && buffer.length >= MIN_BYTES ? { buffer, type, width: 0, height: 0 } : null;
        }
        if (!isSvg && !detectImageType(buffer)) return null;
        const img = sharp(buffer, isSvg ? { density: 300 } : {});
        const meta = await img.metadata();
        if (!isSvg && Math.max(meta.width || 0, meta.height || 0) < minSide) return null;
        const png = await img.trim({ threshold: 5 }).resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: !isSvg }).png().toBuffer({ resolveWithObject: true });
        if (png.data.length > 2 * 1024 * 1024 || Math.min(png.info.width, png.info.height) < 24) return null;
        // A white logo made for dark headers would vanish on the white tile the app shows it on.
        if (await isMostlyWhite(sharp, png.data)) return null;
        return { buffer: png.data, type: { mime: "image/png", ext: "png" }, width: png.info.width, height: png.info.height };
    } catch {
        return null;
    }
}

/**
 * The best logo for the domain, in the order the brand would show it in a small square: big app icons the site
 * declares (apple-touch-icon and friends), the logo in the page, then Google's favicon service at 256 px.
 */
export async function fetchBrandLogo(site, { fetchImpl = fetch } = {}) {
    const declared = declaredIcons(site.html, site.base);
    const candidates = [
        ...declared.map((url) => [url, 120]),
        [`https://${site.domain}/apple-touch-icon.png`, 120],
        ...pageLogos(site.html, site.base).map((url) => [url, 64]),
        [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=256`, 96],
        [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=256`, 32],
    ];
    const seen = new Set();
    for (const [url, minSide] of candidates) {
        const key = `${url}|${minSide}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const img = await download(url, fetchImpl, minSide);
        if (img) return { ...img, source: url };
    }
    return null;
}

/**
 * Give the workspace its brand's logo when it has none (or only an automatic one for another brand name).
 * Returns the new logo URL, or null when nothing was changed.
 */
export async function ensureBrandLogo(workspaceId, { db = supabase, chat, fetchImpl = fetch, force = false } = {}) {
    const [{ data: ws }, { data: settings }] = await Promise.all([
        db.from("workspaces").select("logo_url, settings").eq("id", workspaceId).maybeSingle(),
        db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle(),
    ]);
    const brand = String(settings?.brand_name || "").trim();
    if (!ws || !brand || /^(narriv|my workspace)$/i.test(brand)) return null;
    const auto = ws.settings?.logo_auto;
    if (ws.logo_url && !auto) return null; // the client's own logo
    if (!force && auto?.brand === brand) return null; // already done for this name

    const site = await findBrandDomain(brand, { workspaceId, chat, fetchImpl });
    const img = site ? await fetchBrandLogo(site, { fetchImpl }) : null;
    if (!img) {
        logStructured("info", "brand_logo_not_found", { workspaceId, brand, domain: site?.domain || null });
        await db.from("workspaces").update({ settings: { ...(ws.settings || {}), logo_auto: { brand, at: new Date().toISOString(), found: false } } }).eq("id", workspaceId);
        return null;
    }
    if (db === supabase) await ensureBucket();
    const path = `${workspaceId}/auto-${crypto.randomUUID()}.${img.type.ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, img.buffer, { contentType: img.type.mime, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const logo_url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    await db.from("workspaces").update({
        logo_url,
        settings: { ...(ws.settings || {}), logo_auto: { brand, domain: site.domain, source: img.source, at: new Date().toISOString(), found: true } },
    }).eq("id", workspaceId);
    logStructured("info", "brand_logo_set", { workspaceId, brand, domain: site.domain, source: img.source });
    return logo_url;
}

/** Fire-and-forget version for request handlers. */
export function ensureBrandLogoLater(workspaceId) {
    setTimeout(() => ensureBrandLogo(workspaceId).catch((e) => logStructured("warn", "brand_logo_failed", { workspaceId, error: e?.message })), 0);
}

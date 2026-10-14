/**
 * RSS & Google News Ingestion Service
 *
 * Provides cost-free live news ingestion for brand keywords and news feeds.
 * Scrapes public RSS feeds (Google News RSS & Indonesian news portals),
 * archives raw responses to raw_documents, and generates structured signals.
 */

import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import supabaseAdmin from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { assertPublicHttpUrl } from "../../lib/url-safety.js";
import { persistCollectedRecords, existsInWorkspace, runWithConcurrency } from "./signal-persistence.js";

export { assertPublicHttpUrl, existsInWorkspace, runWithConcurrency };

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 NarrivNewsBot/1.0";
const REQUEST_TIMEOUT_MS = 15000;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

/**
 * Remove HTML tags and decode common entities
 */
export function stripHtml(str = "") {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean trailing publisher tag from title (e.g. "Judul Berita - Detikcom")
 */
export function cleanTitle(title = "") {
  if (!title) return "";
  const cleaned = stripHtml(title);
  const hyphenIndex = cleaned.lastIndexOf(" - ");
  if (hyphenIndex > 10) {
    return cleaned.substring(0, hyphenIndex).trim();
  }
  return cleaned;
}

/**
 * Extract publisher name from title or source tag
 */
export function extractPublisher(item) {
  if (item.source && typeof item.source === "string") {
    return stripHtml(item.source);
  }
  if (item.source?.["#text"]) {
    return stripHtml(item.source["#text"]);
  }
  const title = stripHtml(item.title || "");
  const hyphenIndex = title.lastIndexOf(" - ");
  if (hyphenIndex > 10) {
    return title.substring(hyphenIndex + 3).trim();
  }
  return "Online News";
}

/**
 * Generate deterministic external ID for deduplication
 */
export function generateExternalId(url, guid, title) {
  if (guid && typeof guid === "string" && !guid.startsWith("http")) {
    return guid.trim();
  }
  const source = url || guid || title || String(Date.now());
  return `rss_${crypto.createHash("sha256").update(source.trim()).digest("hex").substring(0, 24)}`;
}


/**
 * Fetch and parse an arbitrary RSS / Atom XML feed URL
 */
export async function fetchRssFeed(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
      // Untrusted (caller-supplied) URLs must not redirect to an unchecked host.
      redirect: options.untrusted ? "manual" : "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} fetching RSS: ${url}`);
    }

    const xmlText = await response.text();
    const parsed = xmlParser.parse(xmlText);

    // Support RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>)
    let rawItems = [];
    if (parsed.rss?.channel?.item) {
      rawItems = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed.feed?.entry) {
      rawItems = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    }

    const normalizedItems = rawItems.map((item) => {
      const title = item.title ? (typeof item.title === "string" ? item.title : item.title["#text"] || "") : "";
      const rawLink = item.link ? (typeof item.link === "string" ? item.link : item.link["@_href"] || item.link["#text"] || "") : "";
      const description = item.description || item["content:encoded"] || item.summary || "";
      const rawContent = typeof description === "string" ? description : description["#text"] || "";
      // Publication time comes only from the feed; a missing/invalid date stays
      // null rather than being replaced with the ingestion time.
      const pubDateStr = item.pubDate || item.published || item.updated || null;
      const pubDate = pubDateStr ? new Date(pubDateStr) : null;
      const publishedAt = pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate.toISOString() : null;

      const guid = item.guid ? (typeof item.guid === "string" ? item.guid : item.guid["#text"] || "") : rawLink;

      return {
        title: cleanTitle(title),
        fullTitle: stripHtml(title),
        content: stripHtml(rawContent) || cleanTitle(title),
        url: rawLink.trim(),
        guid: String(guid).trim(),
        publisher: extractPublisher(item),
        publishedAt,
      };
    });

    return normalizedItems.filter((item) => item.title && item.url);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch Google News RSS for a specific brand or topic query in Indonesia
 */
export async function fetchGoogleNewsRss(keyword, options = {}) {
  const query = (keyword || "perbankan indonesia").trim();
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=id&gl=ID&ceid=ID:id`;

  logStructured("info", "google_news_rss_fetch_start", { keyword: query, url: rssUrl });
  const items = await fetchRssFeed(rssUrl, options);
  const limit = options.limit || 15;
  return items.slice(0, limit);
}

/**
 * Main Ingestion Pipeline:
 * Fetch RSS, deduplicate against raw_documents & signals, run AI extraction, and persist.
 */
export async function ingestRssSignals({
  workspaceId,
  sourceId = null,
  keyword = null,
  rssUrl = null,
  limit = 10,
  userId = null,
}) {
  if (!workspaceId) {
    throw new Error("workspaceId is required for RSS ingestion");
  }

  const startTime = Date.now();
  let targetKeyword = (keyword || "").trim();

  // If sourceId provided, verify source and extract keyword/config
  let activeSource = null;
  if (sourceId) {
    const { data: source } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (source) {
      activeSource = source;
      if (!targetKeyword) {
        targetKeyword = source.config?.keyword || source.config?.query || source.name;
      }
    }
  }

  // If no keyword specified, check monitoring_keywords first
  if (!targetKeyword && !rssUrl) {
    const { data: monitoringKws } = await supabaseAdmin
      .from("monitoring_keywords")
      .select("keyword")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (monitoringKws && monitoringKws.length > 0 && monitoringKws[0]?.keyword) {
      targetKeyword = monitoringKws[0].keyword;
    }
  }

  // Next check active news/rss sources if still not specified
  if (!targetKeyword && !rssUrl) {
    const { data: newsSources } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .in("type", ["news", "rss", "web"])
      .order("created_at", { ascending: false });

    if (newsSources && newsSources.length > 0) {
      const matched = newsSources.find((s) => s.config?.keyword || s.config?.keywords?.[0]);
      if (matched) {
        activeSource = matched;
        targetKeyword = matched.config?.keyword || matched.config?.keywords?.[0] || matched.name;
      } else {
        activeSource = newsSources[0];
      }
    }
  }

  // Fall back to the workspace's own brand name; never to another
  // organisation's name (this used to default to "Bank Mandiri", which filled
  // new client workspaces with articles they never asked to monitor).
  if (!targetKeyword && !rssUrl) {
    const { data: settings } = await supabaseAdmin
      .from("workspace_settings")
      .select("brand_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (settings?.brand_name && settings.brand_name.toLowerCase() !== "narriv") {
      targetKeyword = settings.brand_name;
    } else {
      const err = new Error("No monitoring keyword is configured for this workspace. Add a keyword first.");
      err.code = "NO_KEYWORD";
      throw err;
    }
  }

  // If activeSource is still null, associate with first active news source if available
  if (!activeSource) {
    const { data: fallbackSource } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .eq("type", "news")
      .maybeSingle();
    if (fallbackSource) {
      activeSource = fallbackSource;
    }
  }

  // Fetch RSS items
  let fetchedItems = [];
  try {
    if (rssUrl) {
      const safeUrl = await assertPublicHttpUrl(rssUrl);
      fetchedItems = await fetchRssFeed(safeUrl, { limit, untrusted: true });
    } else {
      fetchedItems = await fetchGoogleNewsRss(targetKeyword, { limit });
    }
  } catch (fetchErr) {
    logStructured("error", "rss_fetch_failed", { error: fetchErr.message, keyword: targetKeyword, rssUrl });
    throw fetchErr;
  }

  // Create Ingestion Job Record
  const { data: job } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({
      workspace_id: workspaceId,
      source_id: activeSource?.id || null,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const result = await persistCollectedRecords(
    fetchedItems.map((item) => ({
      externalId: generateExternalId(item.url, item.guid, item.title),
      title: item.title,
      content: item.content,
      url: item.url,
      author: item.publisher,
      publishedAt: item.publishedAt,
      metadata: { publisher: item.publisher },
    })),
    {
      workspaceId,
      sourceId: activeSource?.id || null,
      platform: "news",
      keyword: targetKeyword,
      ingestionType: "rss",
      // Google News is queried for Indonesia in Indonesian (hl=id&gl=ID).
      signalDefaults: { region: "ID", language: "id" },
    },
  );
  const { createdSignals, createdRawDocs, skippedDuplicates, analyzed, analysisFailed, insertFailed } = result;

  // Update source sync status if sourceId is provided
  if (activeSource?.id) {
    await supabaseAdmin
      .from("sources")
      .update({
        last_sync_at: new Date().toISOString(),
        last_status: createdSignals.length > 0 ? "active" : "up-to-date",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSource.id);
  }

  // Update Ingestion Job
  if (job?.id) {
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        items_processed: createdSignals.length,
      })
      .eq("id", job.id);
  }

  const clusteringResult = result.clustering;
  const detectedAlerts = result.alerts;

  const durationMs = Date.now() - startTime;
  logStructured("info", "rss_ingestion_completed", {
    workspaceId,
    keyword: targetKeyword,
    fetched: fetchedItems.length,
    created: createdSignals.length,
    skipped: skippedDuplicates,
    analyzed,
    analysisFailed,
    insertFailed,
    clustersCreated: clusteringResult?.clustersCreated || 0,
    signalsAttached: clusteringResult?.signalsAttached || 0,
    alertsDetected: detectedAlerts?.length || 0,
    durationMs,
  });

  return {
    success: true,
    jobId: job?.id || null,
    keyword: targetKeyword,
    totalFetched: fetchedItems.length,
    newSignalsCreated: createdSignals.length,
    newRawDocsCreated: createdRawDocs.length,
    skippedDuplicates,
    analyzed,
    analysisFailed,
    insertFailed,
    signals: createdSignals,
    clustering: clusteringResult,
    alerts: detectedAlerts,
  };
}

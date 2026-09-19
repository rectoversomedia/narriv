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
import { analyzeSignal } from "../ai/ai.service.js";
import { runClustering } from "../clustering/clustering.service.js";
import { detectAlerts } from "../alerts/alerts.service.js";

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
      const pubDateStr = item.pubDate || item.published || item.updated || new Date().toISOString();
      const pubDate = new Date(pubDateStr);
      const validDate = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;

      const guid = item.guid ? (typeof item.guid === "string" ? item.guid : item.guid["#text"] || "") : rawLink;

      return {
        title: cleanTitle(title),
        fullTitle: stripHtml(title),
        content: stripHtml(rawContent) || cleanTitle(title),
        url: rawLink.trim(),
        guid: String(guid).trim(),
        publisher: extractPublisher(item),
        publishedAt: validDate.toISOString(),
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

  // Fallback to workspace brand if no keyword specified
  if (!targetKeyword && !rssUrl) {
    const { data: settings } = await supabaseAdmin
      .from("workspace_settings")
      .select("brand_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (settings?.brand_name && settings.brand_name.toLowerCase() !== "narriv") {
      targetKeyword = settings.brand_name;
    } else {
      targetKeyword = "Bank Mandiri";
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
      fetchedItems = await fetchRssFeed(rssUrl, { limit });
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

  const createdSignals = [];
  const createdRawDocs = [];
  let skippedDuplicates = 0;

  // Process and persist items
  for (const item of fetchedItems) {
    try {
      const externalId = generateExternalId(item.url, item.guid, item.title);

      // Check for deduplication in raw_documents or signals
      const { data: existingDoc } = await supabaseAdmin
        .from("raw_documents")
        .select("id")
        .eq("workspace_id", workspaceId)
        .or(`external_id.eq.${externalId},url.eq.${item.url}`)
        .maybeSingle();

      if (existingDoc) {
        skippedDuplicates++;
        continue;
      }

      // 1. Insert to raw_documents
      const { data: rawDoc, error: rawDocErr } = await supabaseAdmin
        .from("raw_documents")
        .insert({
          workspace_id: workspaceId,
          source_id: activeSource?.id || null,
          external_id: externalId,
          title: item.title,
          content: item.content,
          url: item.url,
          author: item.publisher,
          published_at: item.publishedAt,
          metadata: {
            ingestion_type: "rss",
            keyword: targetKeyword,
            publisher: item.publisher,
            ingested_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (rawDocErr || !rawDoc) {
        logStructured("warn", "raw_doc_insert_failed", { error: rawDocErr?.message });
        continue;
      }
      createdRawDocs.push(rawDoc);

      // 2. Perform AI Signal Analysis (GPT-4o-mini)
      let aiResult = null;
      try {
        aiResult = await analyzeSignal(item.title, item.content);
      } catch (aiErr) {
        logStructured("warn", "ai_signal_analysis_failed_fallback", { error: aiErr.message, title: item.title });
        // Deterministic fallback based on keyword heuristics
        const lowerContent = `${item.title} ${item.content}`.toLowerCase();
        let fallbackSentiment = "NEUTRAL";
        let fallbackScore = 0.0;
        let fallbackSeverity = "low";

        if (lowerContent.includes("rugi") || lowerContent.includes("bocor") || lowerContent.includes("penipuan") || lowerContent.includes("gagal") || lowerContent.includes("krisis") || lowerContent.includes("turun")) {
          fallbackSentiment = "NEGATIVE";
          fallbackScore = -0.65;
          fallbackSeverity = "medium";
        } else if (lowerContent.includes("laba") || lowerContent.includes("naik") || lowerContent.includes("apresiasi") || lowerContent.includes("tumbuh") || lowerContent.includes("sukses") || lowerContent.includes("penghargaan")) {
          fallbackSentiment = "POSITIVE";
          fallbackScore = 0.75;
          fallbackSeverity = "low";
        }

        aiResult = {
          sentiment: fallbackSentiment.toLowerCase(),
          narrative_type: "Industry News",
          stakeholder: "Consumers & Banking Customers",
          impact: fallbackSeverity,
          summary: item.content.substring(0, 180),
          recommended_action: "Monitor public discussion and evaluate customer impact.",
          confidence_score: 0.8,
        };
      }

      // Map AI result to database values
      const dbSentiment = String(aiResult?.sentiment || "NEUTRAL").toUpperCase();
      const rawImpact = String(aiResult?.impact || "low").toLowerCase();
      const dbSeverity = ["critical", "high", "medium", "low"].includes(rawImpact) ? rawImpact : "low";
      const sentimentScore = typeof aiResult?.confidence_score === "number"
        ? (dbSentiment === "NEGATIVE" ? -Math.abs(aiResult.confidence_score) : Math.abs(aiResult.confidence_score))
        : 0.0;

      // 3. Insert to signals
      const { data: signal, error: signalErr } = await supabaseAdmin
        .from("signals")
        .insert({
          workspace_id: workspaceId,
          source_id: activeSource?.id || null,
          raw_document_id: rawDoc.id,
          title: item.title,
          content: aiResult?.summary ? `${item.content} (AI Summary: ${aiResult.summary})` : item.content,
          platform: "news",
          url: item.url,
          author: item.publisher,
          published_at: item.publishedAt,
          captured_at: new Date().toISOString(),
          sentiment: dbSentiment,
          sentiment_score: sentimentScore,
          severity: dbSeverity,
          region: "ID",
          language: "id",
          topics: [targetKeyword, aiResult?.narrative_type || "Industry News"].filter(Boolean),
          metadata: {
            ai_summary: aiResult?.summary || null,
            narrative_type: aiResult?.narrative_type || null,
            stakeholder: aiResult?.stakeholder || null,
            recommended_action: aiResult?.recommended_action || null,
            ingestion_type: "rss",
            keyword: targetKeyword,
          },
        })
        .select()
        .single();

      if (signalErr || !signal) {
        logStructured("warn", "signal_insert_failed", { error: signalErr?.message });
        continue;
      }
      createdSignals.push(signal);

      // 4. Save analysis details to signal_analyses
      if (aiResult) {
        await supabaseAdmin
          .from("signal_analyses")
          .insert({
            signal_id: signal.id,
            analysis: aiResult,
            confidence: aiResult.confidence_score || 0.85,
            model: "gpt-4o-mini",
          });
      }
    } catch (itemErr) {
      logStructured("warn", "rss_item_processing_failed", { error: itemErr.message, title: item.title });
    }
  }

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

  // Trigger Dynamic Narrative Clustering if new signals were ingested
  let clusteringResult = null;
  if (createdSignals.length > 0) {
    try {
      logStructured("info", "triggering_dynamic_clustering_post_ingestion", {
        workspaceId,
        newSignalsCount: createdSignals.length,
      });
      clusteringResult = await runClustering(workspaceId);
    } catch (clusterErr) {
      logStructured("warn", "dynamic_clustering_post_ingestion_failed", {
        error: clusterErr.message,
        workspaceId,
      });
    }
  }

  // Trigger Automated Alert Rules Engine if new signals were ingested
  let detectedAlerts = [];
  if (createdSignals.length > 0) {
    try {
      logStructured("info", "evaluating_alert_rules_post_ingestion", {
        workspaceId,
        newSignalsCount: createdSignals.length,
      });
      detectedAlerts = await detectAlerts(workspaceId);
    } catch (alertErr) {
      logStructured("warn", "evaluating_alert_rules_post_ingestion_failed", {
        error: alertErr.message,
        workspaceId,
      });
    }
  }

  const durationMs = Date.now() - startTime;
  logStructured("info", "rss_ingestion_completed", {
    workspaceId,
    keyword: targetKeyword,
    fetched: fetchedItems.length,
    created: createdSignals.length,
    skipped: skippedDuplicates,
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
    signals: createdSignals,
    clustering: clusteringResult,
    alerts: detectedAlerts,
  };
}

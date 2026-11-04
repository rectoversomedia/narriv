/** Cases, integrations, AI visibility, batch analysis, source health and ingestion. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { VisibilityCitation } from "./workspace";

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface CaseRecord {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sourceType: string | null;
  sourceId: string | null;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFilters {
  workspaceId?: string;
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export async function getCases(filters: CaseFilters = {}): Promise<{ data: CaseRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } } | null> {
  const params = new URLSearchParams();
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  try {
    const res = await apiClient<{ data: CaseRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/api/workspace/cases${query ? `?${query}` : ""}`);
    // The list answers created_at / updated_at; the page reads camelCase.
     
    return res ? { ...res, data: (res.data ?? []).map((r: any) => ({ ...r, createdAt: r.createdAt ?? r.created_at, updatedAt: r.updatedAt ?? r.updated_at })) } : res;
  } catch {
    return null;
  }
}

export async function getCaseById(id: string): Promise<CaseRecord | null> {
  try {
    return await apiClient<CaseRecord>(`/api/workspace/cases/${id}`);
  } catch {
    return null;
  }
}

export async function createCase(input: { title: string; description?: string; priority?: string; sourceType?: string; sourceId?: string; assignedTo?: string; assignedTeam?: string; deadline?: string; workspaceId?: string }): Promise<CaseRecord | null> {
  return apiClient<CaseRecord>("/api/workspace/cases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCase(id: string, input: Partial<Pick<CaseRecord, "title" | "description" | "status" | "priority" | "assignedTo" | "assignedTeam" | "deadline" | "resolution">>): Promise<CaseRecord | null> {
  try {
    return await apiClient<CaseRecord>(`/api/workspace/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteCase(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/cases/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationRecord {
  id: string;
  workspaceId: string;
  name: string;
  platform: string;
  status: string;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getIntegrations(filters: { workspaceId?: string; platform?: string; status?: string } = {}): Promise<{ data: IntegrationRecord[] } | null> {
  const params = new URLSearchParams();
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.status) params.set("status", filters.status);

  const query = params.toString();
  try {
    return await apiClient<{ data: IntegrationRecord[] }>(`/api/workspace/integrations${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

export async function getIntegrationById(id: string): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>(`/api/workspace/integrations/${id}`);
  } catch {
    return null;
  }
}

export async function createIntegration(input: { name: string; platform: string; config?: Record<string, unknown> }): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>("/api/workspace/integrations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateIntegration(id: string, input: Partial<Pick<IntegrationRecord, "name" | "status" | "config">>): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>(`/api/workspace/integrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteIntegration(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/integrations/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

export async function testIntegration(id: string, workspaceId?: string): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  const query = params.toString();
  return await apiClient<{ success: boolean; message: string }>(
    `/api/workspace/integrations/${id}/test${query ? `?${query}` : ""}`,
    { method: "POST" }
  );
}

// ---------------------------------------------------------------------------
// AI Visibility Analysis
// ---------------------------------------------------------------------------

export interface VisibilityAnalysisResult {
  id?: string;
  workspace_id?: string;
  engine?: string;
  score?: number;
  result?: {
    visibility_score?: number;
    brand_presence_rate?: number;
    competitor_mention_rate?: number;
    query_used?: string[];
    raw_response?: Array<{
      query: string;
      response: string;
      responseId?: string;
      analysis?: {
        brandMentioned?: boolean;
        sentiment?: string;
        relevanceScore?: number;
        citations?: Array<{ domain: string; authority: number; type: string }>;
      };
    }>;
    citations?: VisibilityCitation[];
    metadata?: Record<string, unknown>;
  };
  rawResponse?: Array<{
    query: string;
    response: string;
    responseId?: string;
    analysis?: {
      brandMentioned?: boolean;
      sentiment?: string;
      relevanceScore?: number;
      citations?: Array<{ domain: string; authority: number; type: string }>;
    };
  }>;
  visibilityScore?: number;
}

export async function triggerVisibilityAnalysis(input: { brandName: string; competitors?: string[]; queries: string[]; engineName?: string }): Promise<VisibilityAnalysisResult | null> {
  try {
    return await apiClient<VisibilityAnalysisResult>("/api/visibility/analyze", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Batch Signal Analysis
// ---------------------------------------------------------------------------

export async function batchAnalyzeSignals(input: { signalIds: string[] }): Promise<{ analyzed: number; failed: number; skipped: number; results: Array<{ signalId: string; status: string; analysis?: unknown; error?: string }> } | null> {
  try {
    return await apiClient<{ analyzed: number; failed: number; skipped: number; results: Array<{ signalId: string; status: string; analysis?: unknown; error?: string }> }>("/signals/batch-analyze", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source Health & Coverage
// ---------------------------------------------------------------------------

export interface SourceHealthSummary {
  total: number;
  active: number;
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
}

export type ConnectorStatus = "operational" | "no_results" | "collecting" | "not_tested" | "failed" | "access_restricted" | "paused";
export interface SourceConnectorState {
  status: ConnectorStatus;
  configured: boolean;
  documents: number;
  lastDocumentAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  runs: number;
}
export interface SourceActivity { sourceId: string | null; name: string; kind: "source" | "keyword_monitoring"; at: string; outcome: "success" | "empty" | "failed" | "running"; error: string | null; inserted: number | null; trigger?: string }
export interface SourceHealthResponse {
  sources: Array<{ id: string; name: string; is_active?: boolean; health: { health: string; score: number; lastSyncAt: string | null; recentJobs: number; successRate: number }; connector?: SourceConnectorState }>;
  summary: SourceHealthSummary & { byStatus?: Partial<Record<ConnectorStatus, number>> };
  activity?: SourceActivity[];
  keywordMonitoring?: { lastRunAt: string; lastOutcome: string; lastSuccessAt: string | null } | null;
  lastSyncAt?: string | null;
}

export async function getSourceHealth(): Promise<SourceHealthResponse | null> {
  try {
    return await apiClient("/sources/health");
  } catch {
    return null;
  }
}

export async function getSourceCoverage(): Promise<{ totalSources: number; activeSources: number; totalDocuments: number; unattributedDocuments?: number; coverageRate: number; typeCoverage: Record<string, { sources: number; active: number; documents: number }>; windowDays?: number; platformVolume?: Record<string, number>; platformLabels?: Record<string, string> } | null> {
  try {
    return await apiClient("/sources/coverage");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ingestion — RSS & Webhook
// ---------------------------------------------------------------------------

export async function triggerRSSFeed(input: { sourceId: string; url: string; maxItems?: number }): Promise<{ fetched: number; created: number } | null> {
  try {
    return await apiClient<{ fetched: number; created: number }>(`/ingestion/rss/${input.sourceId}`, {
      method: "POST",
      body: JSON.stringify({ url: input.url, maxItems: input.maxItems }),
    });
  } catch {
    return null;
  }
}

export async function triggerWebhook(input: { sourceId: string; payload: Record<string, unknown> }): Promise<{ received: number; created: number } | null> {
  try {
    return await apiClient<{ received: number; created: number }>(`/ingestion/webhook/${input.sourceId}`, {
      method: "POST",
      body: JSON.stringify(input.payload),
    });
  } catch {
    return null;
  }
}

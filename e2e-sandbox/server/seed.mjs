// Isolated sandbox data. Nothing here touches production.
export const IDS = {
  WS: "00000000-0000-4000-8000-0000000000a1",        // full workspace
  WS_EMPTY: "00000000-0000-4000-8000-0000000000b1",  // brand-new workspace, no data
  WS_FOREIGN: "00000000-0000-4000-8000-0000000000c1",// another tenant
  OWNER: "00000000-0000-4000-8000-000000000001",
  ANALYST: "00000000-0000-4000-8000-000000000003",
  OWNER_EMPTY: "00000000-0000-4000-8000-000000000004",
  FOREIGN_OWNER: "00000000-0000-4000-8000-000000000007",
  SIG_NEG: "00000000-0000-4000-8000-0000000007a1",
  SIG_POS: "00000000-0000-4000-8000-0000000007a2",
  SIG_PENDING: "00000000-0000-4000-8000-0000000007a3",
  SIG_FOREIGN: "00000000-0000-4000-8000-0000000007c1",
  CLUSTER: "00000000-0000-4000-8000-0000000008a1",
  CLUSTER_SEEDED: "00000000-0000-4000-8000-0000000008a2",
  ALERT: "00000000-0000-4000-8000-0000000009a1",
  PLAN: "00000000-0000-4000-8000-000000000811",
  KEYWORD: "00000000-0000-4000-8000-0000000000f1",
};

export function seedData(now = Date.now()) {
  const iso = (h) => new Date(now - h * 3600 * 1000).toISOString();
  const { WS, WS_EMPTY, WS_FOREIGN, OWNER, ANALYST, OWNER_EMPTY, FOREIGN_OWNER } = IDS;
  return {
    users: [
      { id: OWNER, email: "owner@sandbox.test", name: "Sandbox Owner" },
      { id: ANALYST, email: "analyst@sandbox.test", name: "Sandbox Analyst" },
      { id: OWNER_EMPTY, email: "new@sandbox.test", name: "New Customer" },
      { id: FOREIGN_OWNER, email: "other@sandbox.test", name: "Other Tenant" },
    ],
    workspaces: [
      { id: WS, name: "Sandbox Workspace", onboarding_completed: true, created_at: iso(500) },
      { id: WS_EMPTY, name: "New Workspace", onboarding_completed: true, created_at: iso(1) },
      { id: WS_FOREIGN, name: "Other Tenant", onboarding_completed: true, created_at: iso(500) },
    ],
    workspace_members: [
      { id: "m-owner", workspace_id: WS, user_id: OWNER, role: "owner", created_at: iso(500) },
      { id: "m-analyst", workspace_id: WS, user_id: ANALYST, role: "analyst", created_at: iso(400) },
      { id: "m-new", workspace_id: WS_EMPTY, user_id: OWNER_EMPTY, role: "owner", created_at: iso(1) },
      { id: "m-foreign", workspace_id: WS_FOREIGN, user_id: FOREIGN_OWNER, role: "owner", created_at: iso(500) },
    ],
    workspace_settings: [
      { id: "set-a", workspace_id: WS, brand_name: "Sandbox Workspace", timezone: "UTC" },
      { id: "set-b", workspace_id: WS_EMPTY, brand_name: "New Workspace", timezone: "UTC" },
    ],
    monitoring_keywords: [{ id: IDS.KEYWORD, workspace_id: WS, keyword: "Existing Brand", is_active: true, created_at: "2026-01-01T00:00:00Z" }],
    signals: [
      { id: IDS.SIG_NEG, workspace_id: WS, title: "Existing Brand app outage frustrates customers", content: "Customers report a two-hour outage.", url: "https://news.example.com/outage", author: "Example News", platform: "news", sentiment: "NEGATIVE", captured_at: iso(2), published_at: iso(3) },
      { id: IDS.SIG_POS, workspace_id: WS, title: "Existing Brand wins service award", content: "An industry award for service.", url: "https://news.example.com/award", author: "Trade Daily", platform: "news", sentiment: "POSITIVE", captured_at: iso(5), published_at: iso(6) },
      { id: IDS.SIG_PENDING, workspace_id: WS, title: "Existing Brand announces new branch", content: "A new branch opens.", url: "https://news.example.com/branch", author: "City Paper", platform: "news", sentiment: null, captured_at: iso(1), published_at: iso(1) },
      { id: IDS.SIG_FOREIGN, workspace_id: WS_FOREIGN, title: "Other tenant confidential story", content: "Must never be visible.", url: "https://news.example.com/secret", author: "Secret Wire", platform: "news", sentiment: "NEGATIVE", captured_at: iso(2) },
    ],
    signal_analyses: [
      { id: "an-neg", signal_id: IDS.SIG_NEG, confidence: 0.82, analysis: { sentiment: "NEGATIVE", impact: "high", confidence_score: 0.82, summary: "Outage complaints." }, created_at: iso(2) },
      { id: "an-pos", signal_id: IDS.SIG_POS, confidence: 0.74, analysis: { sentiment: "POSITIVE", impact: "low", confidence_score: 0.74, summary: "Award coverage." }, created_at: iso(5) },
    ],
    narrative_clusters: [
      { id: IDS.CLUSTER, workspace_id: WS, title: "Service reliability concerns", signal_count: 2, sentiment: "negative", impact: "high", created_at: iso(5), updated_at: iso(1) },
      // Stored counter with no linked signals: must be reported as 0 and never cited.
      { id: IDS.CLUSTER_SEEDED, workspace_id: WS, title: "Seeded fixture narrative", signal_count: 24, sentiment: "neutral", created_at: iso(300), updated_at: iso(300) },
    ],
    narrative_cluster_signals: [
      { id: "ncs1", cluster_id: IDS.CLUSTER, signal_id: IDS.SIG_NEG },
      { id: "ncs2", cluster_id: IDS.CLUSTER, signal_id: IDS.SIG_PENDING },
    ],
    alerts: [
      { id: IDS.ALERT, workspace_id: WS, title: "Negative spike: Existing Brand", type: "risk", severity: "high", status: "open", what_happened: "Negative coverage increased.", created_at: iso(1), metadata: { signal_ids: [IDS.SIG_NEG, IDS.SIG_FOREIGN], triggered_by: "alert_engine" } },
    ],
    action_plans: [
      { id: IDS.PLAN, workspace_id: WS, cluster_id: IDS.CLUSTER, title: "PR Response Action Plan", type: "pr_response", priority: "medium", status: "pending", created_at: iso(3), strategy: JSON.stringify({ executive_summary: "Issue a holding statement.", draft: true, balanced: { title: "Holding statement", executive_summary: "Issue a holding statement.", plan: [["Draft statement", "Comms"]] } }) },
    ],
    cron_ingestion_logs: [
      { id: "log-1", job_name: "scheduled-rss-ingestion", status: "completed", created_at: iso(1), metadata: { trigger: "vercel-cron:6", durationMs: 9000, keywords: 1, results: [{ workspaceId: WS, keyword: "Existing Brand", status: "ok", fetched: 5, inserted: 2, deduplicated: 3 }] } },
    ],
  };
}

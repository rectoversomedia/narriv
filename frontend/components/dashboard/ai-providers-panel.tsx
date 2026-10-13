"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Cpu, Loader2 } from "lucide-react";
import { checkAiProviders, getAiProviders, getMonitoringKeywords, type AiProviderCheck, type ApifyAccountCheck } from "@/lib/api-service";

const WORKFLOW_LABEL: Record<string, string> = {
  ask_narriv: "Ask Narriv",
  signal_analysis_and_sentiment: "Signal analysis and sentiment",
  action_plans_and_recommendations: "Action plans and recommendations",
  ai_visibility: "AI Visibility",
  narrative_clustering: "Narrative clustering",
  reports: "Reports",
};

const ERROR_TEXT: Record<string, string> = {
  authentication_failed: "the API key was rejected",
  billing_or_quota: "billing or quota problem on the provider account",
  permission_denied: "the key lacks permission",
  model_not_found: "the model is not available to this key",
  rate_limited: "rate limited, try again shortly",
  provider_unavailable: "the provider is temporarily unavailable",
  timeout: "the request timed out",
  request_failed: "the request failed",
};

function CheckLine({ name, check }: { name: string; check: AiProviderCheck }) {
  if (!check.configured) return <li><b>{name}</b>: not configured on the server.</li>;
  if (check.ok) return <li><b>{name}</b>: responding ({check.model}, {check.latencyMs} ms).</li>;
  return <li className="text-[#C81E1E]"><b>{name}</b>: not responding: {ERROR_TEXT[check.error || ""] || check.error}{check.status ? ` (HTTP ${check.status})` : ""}.</li>;
}

function ApifyLine({ check }: { check: ApifyAccountCheck }) {
  if (!check.configured) return <li><b>Apify</b>: not configured on the server.</li>;
  if (!check.ok) return <li className="text-[#C81E1E]"><b>Apify</b>: {ERROR_TEXT[check.error || ""] || check.error}{check.status ? ` (HTTP ${check.status})` : ""}.</li>;
  const usage = typeof check.monthlyUsageUsd === "number" && typeof check.monthlyLimitUsd === "number"
    ? `, $${check.monthlyUsageUsd.toFixed(2)} of $${check.monthlyLimitUsd.toFixed(2)} used this cycle`
    : "";
  return <li><b>Apify</b>: connected (plan {check.plan ?? "unknown"}{usage}).</li>;
}

/**
 * Which AI provider and model each Narriv workflow actually uses, and a
 * connection test for owners/admins. Credentials never reach the browser.
 */
export function AiProvidersPanel() {
  const providersQuery = useQuery({ queryKey: ["ai-providers"], queryFn: getAiProviders, staleTime: 5 * 60 * 1000 });
  const roleQuery = useQuery({ queryKey: ["monitoring-keywords"], queryFn: getMonitoringKeywords, staleTime: 30 * 1000 });
  const canManage = Boolean(roleQuery.data?.canEdit);
  const check = useMutation({ mutationFn: checkAiProviders });
  const data = providersQuery.data;

  return (
    <section className="rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#6E44E8]"><Cpu size={18} strokeWidth={2.3} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-black text-[#101334]">AI providers</h3>
          <p className="text-[10px] font-semibold text-[#5F6B94]">The model behind each workflow. Routing profile: {data?.profile ?? "…"}.</p>
        </div>
      </div>
      {providersQuery.isError ? (
        <p className="mt-4 text-[11px] font-semibold text-[#C81E1E]">Provider information could not be loaded.</p>
      ) : !data ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
      ) : (
        <>
          <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="AI model per workflow">
            <table className="w-full min-w-[420px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-[#EEF1F7] text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                  <th className="py-2 pr-3">Workflow</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] font-semibold text-[#31406B]">
                {data.workflows.map((w) => (
                  <tr key={w.workflow}>
                    <td className="py-2 pr-3">{WORKFLOW_LABEL[w.workflow] ?? w.workflow}</td>
                    <td className="py-2 pr-3">{w.provider ?? "None"}</td>
                    <td className="py-2">{w.model ?? (w.note || "No language model")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-[#5A6478]">
            Keys configured on the server: OpenAI {data.providers.openai.configured ? "yes" : "no"}, Anthropic {data.providers.anthropic.configured ? "yes" : "no"}.
          </p>
          {canManage ? (
            <div className="mt-3">
              <button type="button" onClick={() => check.mutate()} disabled={check.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B] hover:bg-slate-50 disabled:opacity-60">
                {check.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                Test connections
              </button>
              <p className="mt-1 text-[10px] font-semibold text-[#5A6478]">Sends a one-word test prompt to each configured AI provider (no client data; a fraction of a cent) and reads the Apify account status (no scraping).</p>
              {check.isError ? <p role="alert" className="mt-2 text-[11px] font-semibold text-[#C81E1E]">{check.error instanceof Error ? check.error.message : "The test failed."}</p> : null}
              {check.data ? (
                <ul className="mt-2 space-y-1 text-[11px] font-semibold text-[#31406B]" role="status">
                  <CheckLine name="OpenAI" check={check.data.results.openai} />
                  <CheckLine name="Anthropic (Claude)" check={check.data.results.anthropic} />
                  {check.data.results.apify ? <ApifyLine check={check.data.results.apify} /> : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

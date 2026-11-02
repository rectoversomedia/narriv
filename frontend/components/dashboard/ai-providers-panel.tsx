"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Cpu, Loader2 } from "lucide-react";
import { checkAiProviders, getAiProviders, getMonitoringKeywords, type AiProviderCheck, type ApifyAccountCheck } from "@/lib/api-service";
import { pickL, useL } from "@/lib/use-l";

const WORKFLOW_LABEL: Record<string, [string, string]> = {
  ask_narriv: ["Ask Narriv", "Tanya Narriv"],
  signal_analysis_and_sentiment: ["Signal analysis and sentiment", "Analisis sinyal dan sentimen"],
  action_plans_and_recommendations: ["Action plans and recommendations", "Rencana aksi dan rekomendasi"],
  ai_visibility: ["AI Visibility", "Visibilitas AI"],
  narrative_clustering: ["Narrative clustering", "Pengelompokan narasi"],
  reports: ["Reports", "Laporan"],
};

const ERROR_TEXT: Record<string, [string, string]> = {
  authentication_failed: ["the API key was rejected", "kunci API ditolak"],
  billing_or_quota: ["billing or quota problem on the provider account", "masalah tagihan atau kuota di akun penyedia"],
  permission_denied: ["the key lacks permission", "kunci tidak punya izin"],
  model_not_found: ["the model is not available to this key", "model tidak tersedia untuk kunci ini"],
  rate_limited: ["rate limited, try again shortly", "terkena batas permintaan, coba lagi sebentar lagi"],
  provider_unavailable: ["the provider is temporarily unavailable", "penyedia sedang tidak tersedia"],
  timeout: ["the request timed out", "permintaan kehabisan waktu"],
  request_failed: ["the request failed", "permintaan gagal"],
};
const errorText = (code?: string | null) => (code && ERROR_TEXT[code] ? pickL(...ERROR_TEXT[code]) : code || "");

function CheckLine({ name, check }: { name: string; check: AiProviderCheck }) {
  if (!check.configured) return <li><b>{name}</b>: {pickL("not configured on the server.", "belum dikonfigurasi di server.")}</li>;
  if (check.ok) return <li><b>{name}</b>: {pickL("responding", "merespons")} ({check.model}, {check.latencyMs} ms).</li>;
  return <li className="text-[#C81E1E]"><b>{name}</b>: {pickL("not responding", "tidak merespons")}: {errorText(check.error)}{check.status ? ` (HTTP ${check.status})` : ""}.</li>;
}

function ApifyLine({ check }: { check: ApifyAccountCheck }) {
  if (!check.configured) return <li><b>Apify</b>: {pickL("not configured on the server.", "belum dikonfigurasi di server.")}</li>;
  if (!check.ok) return <li className="text-[#C81E1E]"><b>Apify</b>: {errorText(check.error)}{check.status ? ` (HTTP ${check.status})` : ""}.</li>;
  const usage = typeof check.monthlyUsageUsd === "number" && typeof check.monthlyLimitUsd === "number"
    ? pickL(`, $${check.monthlyUsageUsd.toFixed(2)} of $${check.monthlyLimitUsd.toFixed(2)} used this cycle`, `, $${check.monthlyUsageUsd.toFixed(2)} dari $${check.monthlyLimitUsd.toFixed(2)} terpakai siklus ini`)
    : "";
  return <li><b>Apify</b>: {pickL("connected (plan", "terhubung (paket")} {check.plan ?? pickL("unknown", "tidak diketahui")}{usage}).</li>;
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
  const L = useL();

  return (
    <section className="rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#6E44E8]"><Cpu size={18} strokeWidth={2.3} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-black text-[#101334]">{L("AI providers", "Penyedia AI")}</h3>
          <p className="text-[10px] font-semibold text-[#5F6B94]">{L("The model behind each workflow. Routing profile:", "Model di balik tiap alur kerja. Profil routing:")} {data?.profile ?? "…"}.</p>
        </div>
      </div>
      {providersQuery.isError ? (
        <p className="mt-4 text-[11px] font-semibold text-[#C81E1E]">{L("Provider information could not be loaded.", "Informasi penyedia belum bisa dimuat.")}</p>
      ) : !data ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
      ) : (
        <>
          <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label={L("AI model per workflow", "Model AI per alur kerja")}>
            <table className="w-full min-w-[420px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-[#EEF1F7] text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                  <th className="py-2 pr-3">{L("Workflow", "Alur kerja")}</th>
                  <th className="py-2 pr-3">{L("Provider", "Penyedia")}</th>
                  <th className="py-2">{L("Model", "Model")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] font-semibold text-[#31406B]">
                {data.workflows.map((w) => (
                  <tr key={w.workflow}>
                    <td className="py-2 pr-3">{WORKFLOW_LABEL[w.workflow] ? L(...WORKFLOW_LABEL[w.workflow]) : w.workflow}</td>
                    <td className="py-2 pr-3">{w.provider ?? L("None", "Tidak ada")}</td>
                    <td className="py-2">{w.model ?? (w.note || L("No language model", "Tanpa model bahasa"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-[#5A6478]">
            {L("Keys configured on the server:", "Kunci yang terpasang di server:")} OpenAI {data.providers.openai.configured ? L("yes", "ya") : L("no", "tidak")}, Anthropic {data.providers.anthropic.configured ? L("yes", "ya") : L("no", "tidak")}.
          </p>
          {canManage ? (
            <div className="mt-3">
              <button type="button" onClick={() => check.mutate()} disabled={check.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B] hover:bg-slate-50 disabled:opacity-60">
                {check.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                {L("Test connections", "Tes koneksi")}
              </button>
              <p className="mt-1 text-[10px] font-semibold text-[#5A6478]">{L("Sends a one-word test prompt to each configured AI provider (no client data; a fraction of a cent) and reads the Apify account status (no scraping).", "Mengirim prompt uji satu kata ke tiap penyedia AI yang terpasang (tanpa data klien; biaya sangat kecil) dan membaca status akun Apify (tanpa scraping).")}</p>
              {check.isError ? <p role="alert" className="mt-2 text-[11px] font-semibold text-[#C81E1E]">{check.error instanceof Error ? check.error.message : L("The test failed.", "Tes gagal.")}</p> : null}
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

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { checkAiProviders, getAiProviders, getMonitoringKeywords, type AiProviderCheck, type ApifyAccountCheck } from "@/lib/api-service";
import { pickL, useL } from "@/lib/use-l";

const WORKFLOW_LABEL: Record<string, [string, string]> = {
  ask_narriv: ["Ask Narriv", "Tanya Narriv"],
  signal_analysis_and_sentiment: ["Mention analysis and sentiment", "Analisis percakapan dan sentimen"],
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

  const prettyModel = (m?: string | null) => (m ? m.replace(/^gpt-/i, "GPT-").replace(/-mini$/i, " mini").replace(/^claude-/i, "Claude ") : null);
  const providerName = (p?: string | null) => (p === "openai" ? "OpenAI" : p === "anthropic" ? "Claude" : p ?? "");
  const usingAi = data?.workflows.filter((w) => w.provider).length ?? 0;
  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("AI behind Narriv", "AI di balik Narriv")}</h3>
          <p className="text-[12px] font-bold text-[#5A6478]">{data ? L(`${usingAi} of ${data.workflows.length} features use an AI model; the rest run on rules.`, `${usingAi} dari ${data.workflows.length} fitur memakai model AI; sisanya berbasis aturan.`) : "…"}</p>
        </div>
        {data ? (
          <div className="flex gap-2">
            {([["OpenAI", data.providers.openai.configured], ["Claude", data.providers.anthropic.configured]] as const).map(([name, on]) => (
              <span key={name} className={on ? "rounded-full bg-[#E5F6EE] px-2.5 py-1 text-[11px] font-black text-[#047857]" : "rounded-full bg-[#EEF1F6] px-2.5 py-1 text-[11px] font-black text-[#5A6478]"}>{name} {on ? L("connected", "terpasang") : L("not set", "belum")}</span>
            ))}
          </div>
        ) : null}
      </div>
      {providersQuery.isError ? (
        <p className="mt-4 text-[12px] font-semibold text-[#C81E1E]">{L("Provider information could not be loaded.", "Informasi penyedia belum bisa dimuat.")}</p>
      ) : !data ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
      ) : (
        <>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.workflows.map((w) => (
              <li key={w.workflow} className="flex items-center justify-between gap-2 rounded-[12px] bg-[#F7F8FC] px-3.5 py-3">
                <span className="text-[13px] font-black text-[#101334]">{WORKFLOW_LABEL[w.workflow] ? L(...WORKFLOW_LABEL[w.workflow]) : w.workflow}</span>
                {w.provider ? (
                  <span className="shrink-0 rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[11px] font-black text-[#3B52F5]">{providerName(w.provider)} · {prettyModel(w.model)}</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#5A6478]">{L("Rules", "Aturan")}</span>
                )}
              </li>
            ))}
          </ul>
          {canManage ? (
            <div className="mt-3">
              <button type="button" onClick={() => check.mutate()} disabled={check.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#101334] px-3.5 text-[12px] font-black text-white hover:bg-[#1F2452] disabled:opacity-60">
                {check.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                {L("Test connections", "Tes koneksi")}
              </button>
              <p className="mt-1.5 text-[11px] font-semibold text-[#5A6478]">{L("Sends a one-word test prompt to each configured AI provider (no client data; a fraction of a cent) and reads the Apify account status (no scraping).", "Mengirim prompt uji satu kata ke tiap penyedia AI yang terpasang (tanpa data klien; biaya sangat kecil) dan membaca status akun Apify (tanpa scraping).")}</p>
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

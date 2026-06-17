"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cable, CheckCircle2, Cloud, Filter, Link2, Plus, RefreshCcw, Trash2, TriangleAlert, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DashboardEmptyState, DashboardErrorState, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { createIntegration, deleteIntegration, getIntegrations, updateIntegration, type IntegrationRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";

const emptyIntegrations: IntegrationRecord[] = [];

function platformLabel(platform: string, options: { value: string; label: string }[]) {
  return options.find((option) => option.value === platform)?.label || platform;
}

function statusVariant(status: string): "green" | "amber" | "red" | "slate" {
  if (status === "active") return "green";
  if (status === "inactive") return "slate";
  if (status === "error") return "red";
  return "amber";
}

function formatDateTime(value: string | null, neverSyncedLabel: string) {
  if (!value) return neverSyncedLabel;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseConfigJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config harus berupa JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function configSummary(config: IntegrationRecord["config"], noConfigLabel: string) {
  if (!config || Object.keys(config).length === 0) return noConfigLabel;

  return Object.keys(config)
    .slice(0, 4)
    .map((key) => key)
    .join(", ");
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("slack");
  const [configJson, setConfigJson] = useState("{}");
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<IntegrationRecord | null>(null);

  const t = useTranslations("Workspace.integrations");

  const platformOptions = useMemo(() => [
    { value: "slack", label: "Slack" },
    { value: "teams", label: "Microsoft Teams" },
    { value: "webhook", label: t("platforms.webhook") },
    { value: "email", label: t("platforms.email") },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "bigquery", label: "BigQuery" },
    { value: "postgres", label: "Postgres" },
  ], [t]);

  const statusOptions = useMemo(() => [
    { value: "", label: t("filter.allStatus") },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "error", label: "Error" },
  ], [t]);

  const integrationsQuery = useQuery({
    queryKey: ["integrations", { platform: platformFilter, status: statusFilter }],
    queryFn: () => getIntegrations({
      platform: platformFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; platform: string; config: Record<string, unknown> }) => createIntegration(input),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.createFailed"));
        return;
      }

      setName("");
      setPlatform("slack");
      setConfigJson("{}");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.createSuccess"));
    },
    onError: () => toast.error(t("toast.createFailed")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateIntegration(id, { status }),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.updateFailed"));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.updateSuccess"));
    },
    onError: () => toast.error(t("toast.updateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.deleteFailed"));
        return;
      }

      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.deleteSuccess"));
    },
    onError: () => toast.error(t("toast.deleteFailed")),
  });

  const integrations = integrationsQuery.data?.data || emptyIntegrations;

  const metrics = useMemo(() => {
    const active = integrations.filter((item) => item.status === "active").length;
    const errors = integrations.filter((item) => item.status === "error").length;
    const platforms = new Set(integrations.map((item) => item.platform)).size;

    return [
      { label: t("metrics.total"), value: integrations.length, helper: t("metrics.totalDesc"), tone: "blue", icon: Cable },
      { label: t("metrics.active"), value: active, helper: t("metrics.activeDesc"), tone: "green", icon: CheckCircle2 },
      { label: t("metrics.platforms"), value: platforms, helper: t("metrics.platformsDesc"), tone: "purple", icon: Cloud },
      { label: t("metrics.needsAttention"), value: errors, helper: t("metrics.needsAttentionDesc"), tone: "red", icon: TriangleAlert },
    ];
  }, [integrations, t]);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setFormError("Nama integrasi wajib diisi.");
      return;
    }

    try {
      const config = parseConfigJson(configJson);
      createMutation.mutate({ name: name.trim(), platform, config });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Config JSON tidak valid.");
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-[#465FFF]/15 bg-[#465FFF]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
            Workspace Connections
          </span>
          <h1 className="mt-3 text-[28px] font-black tracking-tight text-slate-900">Integrations</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Hubungkan workspace ke channel eskalasi, webhook, database export, dan sistem operasi tim.
          </p>
        </div>
        <button
          type="button"
          onClick={() => integrationsQuery.refetch()}
          disabled={integrationsQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={integrationsQuery.isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  metric.tone === "blue" && "bg-[#465FFF]/10 text-[#465FFF]",
                  metric.tone === "green" && "bg-[#10B981]/10 text-[#10B981]",
                  metric.tone === "purple" && "bg-[#8B5CFF]/10 text-[#8B5CFF]",
                  metric.tone === "red" && "bg-[#EF4444]/10 text-[#EF4444]"
                )}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.value.toLocaleString("id-ID")}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold text-slate-500">{metric.helper}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <Plus size={19} />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">{t("form.title")}</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{t("form.desc")}</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-black text-slate-500">{t("form.name")}</span>
              <input
                value={name}
                onChange={(event) => { setName(event.target.value); setFormError(""); }}
                placeholder={t("form.namePlaceholder")}
                className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[11px] font-black text-slate-500">{t("form.platform")}</span>
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
              >
                {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[11px] font-black text-slate-500">Config JSON</span>
              <textarea
                value={configJson}
                onChange={(event) => { setConfigJson(event.target.value); setFormError(""); }}
                rows={6}
                className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold leading-5 text-slate-800 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
              />
            </label>

            {formError ? <p className="rounded-[8px] border border-[#FAD1D1] bg-[#FFF5F5] px-3 py-2 text-xs font-bold text-[#B42318]">{formError}</p> : null}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] px-4 text-sm font-black text-white transition hover:bg-[#3b52d9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2 size={15} />
              {createMutation.isPending ? t("form.connecting") : t("form.connect")}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-slate-400">
              <Filter size={14} />
              {t("filter.filterTitle")}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black text-slate-500">{t("filter.platform")}</span>
                <select
                  value={platformFilter}
                  onChange={(event) => setPlatformFilter(event.target.value)}
                  className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
                >
                  <option value="">{t("filter.allPlatform")}</option>
                  {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black text-slate-500">{t("filter.status")}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
                >
                  {statusOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => { setPlatformFilter(""); setStatusFilter(""); }}
                disabled={!platformFilter && !statusFilter}
                className="h-10 rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t("filter.reset")}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
            {integrationsQuery.isError || integrationsQuery.data === null ? (
              <DashboardErrorState
                title="Gagal memuat integrasi"
                description="Daftar integrasi belum bisa diambil dari backend. Coba refresh atau periksa koneksi API."
                onRetry={() => integrationsQuery.refetch()}
              />
            ) : integrationsQuery.isPending ? (
              <div className="p-4"><TableSkeleton rows={6} columns={5} /></div>
            ) : integrations.length === 0 ? (
              <DashboardEmptyState
                title="Belum ada integrasi"
                description="Hubungkan Slack, Teams, webhook, atau database export agar response workflow lebih otomatis."
                icon="inbox"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("table.integration")}</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("table.status")}</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("table.config")}</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("table.lastSync")}</th>
                      <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {integrations.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                              <Zap size={16} />
                            </span>
                            <div>
                              <p className="font-black text-slate-950">{item.name}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{platformLabel(item.platform, platformOptions)} · {item.id.slice(0, 8)}</p>
                              {item.errorMessage ? <p className="mt-1 text-xs font-bold text-[#EF4444]">{item.errorMessage}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Badge variant={statusVariant(item.status)} className="mb-2 rounded-full normal-case tracking-normal">{item.status}</Badge>
                          <select
                            value={item.status}
                            onChange={(event) => updateStatusMutation.mutate({ id: item.id, status: event.target.value })}
                            disabled={updateStatusMutation.isPending}
                            className="block rounded-[6px] border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="error">Error</option>
                          </select>
                        </td>
                        <td className="max-w-[260px] px-6 py-4 align-top">
                          <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{configSummary(item.config, t("table.noConfig"))}</p>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <p className="font-bold text-slate-700">{formatDateTime(item.lastSyncAt, t("table.neverSynced"))}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">Created {formatDateTime(item.createdAt, t("table.neverSynced"))}</p>
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Putus integrasi ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t("delete.title")}
        description={deleteTarget ? t("delete.description", { name: deleteTarget.name }) : t("delete.cancel")}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("delete.cancel")}
        tone="danger"
      />
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flag,
  Funnel,
  Lightbulb,
  ListChecks,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { getActionPlans, getActionQueue, submitActionPlanFeedback, type ActionPlanResponse, type ActionQueueRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Priority = "high" | "medium" | "low" | "done";
type ActionStatus = "active" | "in-progress" | "done";

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
};

type ActionItem = {
  id: string;
  title: string;
  issue: string;
  impact: string;
  response: string;
  owner: string;
  role: string;
  due: string;
  progress: number;
  priority: Exclude<Priority, "done">;
  status: ActionStatus;
  tone: Tone;
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10 text-[#465FFF]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10 text-[#8B5CFF]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10 text-[#10B981]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10 text-[#EF4444]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100 text-slate-500" },
};

const actions: ActionItem[] = [
  {
    id: "act-001",
    title: "Respond to payment delay complaints",
    issue: "Payment Delay",
    impact: "Reputation Risk",
    response: "Sprint Response",
    owner: "Arif Rahman",
    role: "PR Manager",
    due: "23 Mei 2025",
    progress: 35,
    priority: "high",
    status: "active",
    tone: "red",
  },
  {
    id: "act-002",
    title: "Investigate negative sentiment spike",
    issue: "Service Disruption",
    impact: "Reputation Risk",
    response: "Immediate Response",
    owner: "Dewi Lestari",
    role: "Product Manager",
    due: "22 Mei 2025",
    progress: 40,
    priority: "high",
    status: "active",
    tone: "red",
  },
  {
    id: "act-003",
    title: "Educate users about new features",
    issue: "Customer Service",
    impact: "Opportunity",
    response: "User Education",
    owner: "Rina Sari",
    role: "Marketing Lead",
    due: "30 Mei 2025",
    progress: 60,
    priority: "medium",
    status: "active",
    tone: "amber",
  },
  {
    id: "act-004",
    title: "Monitor promo conversations",
    issue: "Promo Discount",
    impact: "Opportunity",
    response: "Monitoring",
    owner: "M. Hidayat",
    role: "Social Media Lead",
    due: "28 Mei 2025",
    progress: 45,
    priority: "medium",
    status: "in-progress",
    tone: "amber",
  },
  {
    id: "act-005",
    title: "Evaluate FAQ and chatbot response",
    issue: "Customer Service",
    impact: "Efficiency",
    response: "Improvement",
    owner: "Anisa Nur",
    role: "CX Manager",
    due: "20 Mei 2025",
    progress: 100,
    priority: "low",
    status: "done",
    tone: "green",
  },
  {
    id: "act-006",
    title: "Improve mobile app stability",
    issue: "Mobile App Issue",
    impact: "Customer Trust",
    response: "Product Fix",
    owner: "Budi Santoso",
    role: "Product Lead",
    due: "25 Mei 2025",
    progress: 100,
    priority: "medium",
    status: "done",
    tone: "green",
  },
  {
    id: "act-007",
    title: "Update crisis communication plan",
    issue: "Crisis Management",
    impact: "Preparedness",
    response: "Playbook Update",
    owner: "Sarah A.",
    role: "Comms Lead",
    due: "18 Mei 2025",
    progress: 100,
    priority: "high",
    status: "done",
    tone: "green",
  },
];

function buildActionItems(records: ActionQueueRecord[]): ActionItem[] {
  return records.map((record, index) => {
    const severity = record.alert?.severity?.toLowerCase() ?? "medium";
    const priority: Exclude<Priority, "done"> = severity.includes("critical") || severity.includes("high") ? "high" : index % 3 === 0 ? "low" : "medium";
    const tone: Tone = priority === "high" ? "red" : priority === "medium" ? "amber" : "green";

    return {
      id: record.id,
      title: record.title,
      issue: record.alert?.title || record.cluster?.title || "Action Plan",
      impact: record.alert?.severity || record.cluster?.sentiment || "Review",
      response: "Live API Plan",
      owner: "Narriv Team",
      role: "Action Owner",
      due: new Date(record.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
      progress: priority === "high" ? 35 : priority === "medium" ? 55 : 75,
      priority,
      status: priority === "high" ? "active" : "in-progress",
      tone,
    };
  });
}

function hasActionPlanData(plan: ActionPlanResponse | null | undefined) {
  return Boolean(plan && (plan.inputNarrative || plan.evidenceSummary || plan.plan?.length || plan.outputs?.length));
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E6EAF2] bg-white text-[#101334] shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </Card>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone, negative = false }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone; negative?: boolean }) {
  const style = toneStyles[tone];
  return (
    <Panel>
      <CardContent className="flex min-h-[94px] items-center gap-4 p-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-full border" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)`, borderColor: `rgba(${style.rgb}, .12)` }}>
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-extrabold text-[#68739F]">{label}</span>
          <span className="mt-1 block text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</span>
          <span className={cn("mt-2 flex items-center gap-1 text-[11px] font-black", negative ? "text-[#EF4444]" : "text-[#10B981]")}>{negative ? "▲" : "▲"} {helper}</span>
        </span>
      </CardContent>
    </Panel>
  );
}

function StatusPill({ status }: { status: ActionStatus }) {
  const style = status === "done" ? "bg-[#10B981]/12 text-[#0C9B69]" : status === "in-progress" ? "bg-[#F59E0B]/12 text-[#F59E0B]" : "bg-[#EF4444]/10 text-[#EF4444]";
  const label = status === "done" ? "SELESAI" : status === "in-progress" ? "DALAM PROGRES" : "AKTIF";
  return <span className={cn("rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em]", style)}>{label}</span>;
}

function Avatar({ name }: { name: string }) {
  const url = `https://i.pravatar.cc/80?u=${encodeURIComponent(name)}`;
  return (
    <span
      aria-label={name}
      className="size-7 shrink-0 rounded-full border-2 border-white bg-cover bg-center shadow-sm"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
}

function ProgressLine({ value, tone }: { value: number; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: style.color }} />
      </span>
      <span className="w-9 text-right text-[10px] font-black text-[#101334]">{value}%</span>
    </div>
  );
}

function ActionCard({ action, selected, onSelect }: { action: ActionItem; selected: boolean; onSelect: (action: ActionItem) => void }) {
  const style = toneStyles[action.tone];
  return (
    <button
      type="button"
      onClick={() => onSelect(action)}
      className={cn("w-full rounded-[12px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(16,24,40,0.08)]", selected ? "border-[#465FFF] shadow-[0_12px_30px_rgba(70,95,255,0.08)]" : "border-[#EEF1F7]")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-black leading-5 text-[#101334]">{action.title}</h3>
        <StatusPill status={action.status} />
      </div>
      <div className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-[#68739F]">
        <span>{action.issue}</span>
        <span>Dampak: <b className="font-black" style={{ color: style.color }}>{action.impact}</b></span>
        <span>{action.response}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Avatar name={action.owner} />
          <span>
            <span className="block text-[11px] font-black text-[#101334]">{action.owner}</span>
            <span className="block text-[9px] font-semibold text-[#68739F]">{action.role}</span>
          </span>
        </span>
        <span className="text-[10px] font-black text-[#53608C]">{action.due}</span>
      </div>
      <div className="mt-4">
        <ProgressLine value={action.progress} tone={action.tone} />
      </div>
      <MoreVertical size={15} className="absolute hidden" />
    </button>
  );
}

function Lane({ title, count, tone, children }: { title: string; count: number; tone: Tone; children: ReactNode }) {
  const style = toneStyles[tone];
  return (
    <div className="rounded-[13px] border border-[#E8ECF5] bg-white p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-[12px] font-black text-[#101334]">
          <Flag size={13} style={{ color: style.color }} />
          {title}
        </h2>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}>{count}</span>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function PerformanceChart() {
  const width = 480;
  const height = 170;
  const dates = ["13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei", "19 Mei"];
  const made = [12, 30, 25, 29, 31, 28, 30];
  const done = [18, 20, 17, 20, 24, 21, 18];
  const x = (index: number) => 38 + (index / (dates.length - 1)) * (width - 58);
  const y = (value: number) => 18 + (1 - value / 40) * (height - 42);
  const path = (values: number[]) => values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");

  return (
    <svg className="chart-enter chart-line-draw h-[190px] w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {[0, 20, 40].map((tick) => (
        <g key={tick}>
          <line x1="34" x2={width - 12} y1={y(tick)} y2={y(tick)} stroke="#EEF1F7" />
          <text x="22" y={y(tick) + 4} textAnchor="end" className="fill-[#8A94B8] text-[10px] font-bold">{tick}</text>
        </g>
      ))}
      <path d={path(made)} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <path d={path(done)} fill="none" stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      {dates.map((date, index) => <text key={date} x={x(index)} y={height - 5} textAnchor="middle" className="fill-[#8A94B8] text-[9px] font-bold">{date}</text>)}
    </svg>
  );
}

export default function ActionPlansPage() {
  const t = useTranslations("ActionPlans");
  const queryClient = useQueryClient();
  const toastHook = useToast();
  const [filter, setFilter] = useState("Semua Tindakan");
  const [selectedActionId, setSelectedActionId] = useState(actions[0].id);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };

  const feedbackMutation = useMutation({
    mutationFn: ({ actionPlanId, action, reason }: { actionPlanId: string; action: "accepted" | "edited" | "rejected"; reason?: string }) => submitActionPlanFeedback(actionPlanId, action, reason),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["action-plans-latest"] });
      showToast(result ? "Feedback berhasil dikirim." : "Feedback belum bisa dikirim.", result ? "success" : "error");
    },
    onError: () => showToast("Feedback belum bisa dikirim. Coba lagi.", "error"),
  });
  const actionQueueQuery = useQuery({
    queryKey: ["action-queue", { limit: 20 }],
    queryFn: () => getActionQueue({ limit: 20 }),
    staleTime: 30 * 1000,
  });
  const actionPlanQuery = useQuery({
    queryKey: ["action-plans-latest"],
    queryFn: getActionPlans,
    staleTime: 30 * 1000,
  });
  const liveActions = actionQueueQuery.data?.data ? buildActionItems(actionQueueQuery.data.data) : [];
  const isQueueUnavailable = actionQueueQuery.data === null;
  const isPlanUnavailable = actionPlanQuery.data === null;
  const actionItems = liveActions.length > 0 || actionQueueQuery.data ? liveActions : actions;
  const selectedAction = actionItems.find((action) => action.id === selectedActionId) ?? actionItems[0] ?? actions[0];
  const latestPlan = actionPlanQuery.data;
  const detailSteps = hasActionPlanData(latestPlan) && latestPlan?.plan?.length ? latestPlan.plan : null;

  const highActions = actionItems.filter((action) => action.status !== "done" && action.priority === "high");
  const mediumActions = actionItems.filter((action) => action.status !== "done" && action.priority === "medium");
  const lowActions = actionItems.filter((action) => action.priority === "low");
  const doneActions = actionItems.filter((action) => action.status === "done" && action.priority !== "low");

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("desc")}</p>
        </div>
        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#3345F5] px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:brightness-105 sm:w-fit">
          <Plus size={15} />
          {t("newAction")}
          <ChevronDown size={13} />
        </button>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tindakan Aktif" value="12" helper="20% vs 7 hari lalu" icon={Target} tone="blue" />
        <MetricCard label="Dalam Progres" value="7" helper="18% vs 7 hari lalu" icon={Sparkles} tone="amber" />
        <MetricCard label="Selesai" value="28" helper="25% vs 7 hari lalu" icon={Check} tone="green" />
        <MetricCard label="Perlu Perhatian" value="3" helper="25% vs 7 hari lalu" icon={Flag} tone="red" negative />
        <MetricCard label="Rata-rata Resolusi" value="2h 34m" helper="12% vs 7 hari lalu" icon={Clock3} tone="blue" />
      </section>

      {isQueueUnavailable ? <DashboardErrorState title="Daftar tindakan live belum bisa dimuat" description="API client sudah mencoba token refresh. Untuk sementara, halaman menampilkan tindakan contoh." onRetry={() => void actionQueueQuery.refetch()} minHeight="min-h-[150px]" /> : null}
      {isPlanUnavailable ? <DashboardErrorState title="Detail tindakan live belum bisa dimuat" description="Panel detail tetap memakai data contoh sampai backend tersedia." onRetry={() => void actionPlanQuery.refetch()} minHeight="min-h-[150px]" /> : null}

      <Panel>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 border-b border-[#EEF1F7] pb-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {t.raw("tabs").map((tab: string) => (
                <button key={tab} type="button" onClick={() => setFilter(tab)} className={cn("h-10 rounded-[8px] px-4 text-[12px] font-black transition", filter === tab ? "bg-[#EEF0FF] text-[#465FFF]" : "text-[#53608C] hover:bg-[#F8FAFF]")}>{tab}</button>
              ))}
            </div>
            <div className="flex w-full flex-wrap gap-3 xl:w-auto">
              <label className="flex h-10 w-full min-w-[240px] items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] px-3 text-[#8A94B8] sm:w-[260px]">
                <Search size={15} />
                <input className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#8A94B8]" placeholder={t("search")} />
              </label>
              <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] sm:flex-none"><Funnel size={14} />{t("filter")}</button>
              <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] sm:flex-none">{t("sort")}<ChevronDown size={13} /></button>
            </div>
          </div>

          {actionQueueQuery.isPending ? (
            <PanelSkeleton className="mt-3" />
          ) : actionQueueQuery.data && liveActions.length === 0 ? (
            <DashboardEmptyState title="Belum ada tindakan live" description="Backend berhasil dihubungi, tetapi belum ada action plan yang dibuat." icon="inbox" minHeight="min-h-[360px]" />
          ) : (
            <div className="mt-3 grid gap-4 xl:grid-cols-4">
              <Lane title={t("lanes.high")} count={highActions.length} tone="red">
                {highActions.map((action) => <ActionCard key={action.id} action={action} selected={selectedAction.id === action.id} onSelect={(item) => setSelectedActionId(item.id)} />)}
                <button type="button" className="text-center text-[12px] font-black text-[#465FFF]">{t("viewAll")} ({highActions.length})</button>
              </Lane>
              <Lane title={t("lanes.medium")} count={mediumActions.length} tone="amber">
                {mediumActions.map((action) => <ActionCard key={action.id} action={action} selected={selectedAction.id === action.id} onSelect={(item) => setSelectedActionId(item.id)} />)}
                <button type="button" className="text-center text-[12px] font-black text-[#465FFF]">{t("viewAll")} ({mediumActions.length})</button>
              </Lane>
              <Lane title={t("lanes.low")} count={lowActions.length} tone="green">
                {lowActions.map((action) => <ActionCard key={action.id} action={action} selected={selectedAction.id === action.id} onSelect={(item) => setSelectedActionId(item.id)} />)}
                <button type="button" className="text-center text-[12px] font-black text-[#465FFF]">{t("viewAll")} ({lowActions.length})</button>
              </Lane>
              <Lane title={t("lanes.done")} count={doneActions.length} tone="slate">
                {doneActions.slice(0, 2).map((action) => <ActionCard key={action.id} action={action} selected={selectedAction.id === action.id} onSelect={(item) => setSelectedActionId(item.id)} />)}
                <button type="button" className="text-center text-[12px] font-black text-[#465FFF]">{t("viewAll")} ({doneActions.length})</button>
              </Lane>
            </div>
          )}
        </CardContent>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(340px,0.82fr)]">
        <Panel>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="mt-0.5 text-[#465FFF]" />
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("detail")}</h2>
                <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("detailDesc")}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#EF4444]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#EF4444]">High Priority</span>
              <span className="rounded-full bg-[#EF4444]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#EF4444]">Aktif</span>
              <span className="rounded-full bg-[#EEF1F7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#53608C]">Dibuat 23 Mei 2025</span>
            </div>
            <h3 className="mt-4 text-[18px] font-black text-[#101334]">{selectedAction.title}</h3>
            <p className="mt-3 text-[12px] font-semibold leading-relaxed text-[#53608C]">{latestPlan?.inputNarrative || "Siapkan respons publik yang empatik dan solutif, pastikan komunikasi konsisten di semua kanal bantuan. Pantau perkembangan sentimen setelah respons dikirim."}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[selectedAction.issue, selectedAction.impact, latestPlan?.workflowStatus || "4 jam", selectedAction.due].map((item, index) => (
                <div key={item} className="rounded-[10px] bg-[#FBFCFF] p-3">
                  <p className="text-[10px] font-black text-[#8A94B8]">{["Kategori", "Dampak", "SLA", "Jatuh Tempo"][index]}</p>
                  <p className="mt-1 text-[11px] font-black text-[#465FFF]">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-[12px] font-black text-[#101334]">Rekomendasi Langkah AI</p>
              <div className="mt-2 grid gap-2">
                {(detailSteps ?? [["Siapkan pernyataan resmi untuk publik", "PR Team"], ["Update FAQ terkait payment delay", "Customer Support"], ["Broadcast di semua kanal sosial", "Social Media Team"]]).slice(0, 3).map(([item, owner], index) => (
                  <div key={item} className="flex items-center justify-between rounded-[8px] border border-[#E8ECF5] px-3 py-2 text-[12px] font-semibold text-[#53608C]">
                    <span className="flex items-center gap-2"><CircleCheck size={16} className="text-[#10B981]" />{item}</span>
                    <span className="text-[10px] font-black text-[#68739F]">{owner || ["PR Team", "Customer Support", "Social Media Team"][index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "accepted" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF] disabled:opacity-50">Lihat Rencana Lengkap <ChevronRight size={14} /></button>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "accepted" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#10B981]/10 text-[11px] font-black text-[#0C9B69] transition hover:bg-[#10B981]/20 disabled:opacity-50"><Check size={14} /> Setuju</button>
              <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "rejected" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#EF4444]/10 text-[11px] font-black text-[#EF4444] transition hover:bg-[#EF4444]/20 disabled:opacity-50"><X size={14} /> Tolak</button>
            </div>
          </CardContent>
        </Panel>

        <Panel>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <BarChart3 size={20} className="mt-0.5 text-[#465FFF]" />
                <div>
                  <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("performance")}</h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("performanceDesc")}</p>
                </div>
              </div>
              <button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#53608C]">7 Hari Terakhir <ChevronDown size={12} /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">Rata-rata Resolusi</p><p className="mt-1 text-[22px] font-black text-[#101334]">2h 34m</p><p className="text-[11px] font-black text-[#10B981]">▼ 12%</p></div>
              <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">Tingkat Penyelesaian</p><p className="mt-1 text-[22px] font-black text-[#101334]">82%</p><p className="text-[11px] font-black text-[#10B981]">▲ 15%</p></div>
              <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">Tepat Waktu</p><p className="mt-1 text-[22px] font-black text-[#101334]">78%</p><p className="text-[11px] font-black text-[#10B981]">▲ 9%</p></div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[12px] font-black text-[#101334]"><span>Tindakan Dibuat vs Selesai</span><span className="flex gap-3 text-[10px] text-[#53608C]"><b className="text-[#465FFF]">Dibuat</b><b className="text-[#10B981]">Selesai</b></span></div>
              <PerformanceChart />
            </div>
            <button type="button" className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF]">Lihat Analytics Lengkap <ChevronRight size={14} /></button>
          </CardContent>
        </Panel>

        <Panel>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Lightbulb size={20} className="mt-0.5 text-[#465FFF]" />
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("learning")}</h2>
                <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("learningDesc")}</p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[13px] font-black text-[#101334]">Insight Utama</p>
              <div className="mt-3 grid gap-2.5">
                {[
                  ["Topik payment delay memiliki resolusi paling lama", "Rata-rata 4j 12m", TrendingDown],
                  ["Tindakan dengan template memiliki tingkat sukses lebih tinggi", "+28% lebih efektif", TrendingUp],
                  ["Komunikasi cepat di 1 jam pertama menurunkan sentimen negatif", "-32% sentimen negatif", Timer],
                ].map(([title, value, Icon]) => {
                  const TypedIcon = Icon as LucideIcon;
                  return <div key={title as string} className="flex items-center justify-between gap-4 rounded-[9px] bg-[#FBFCFF] p-3 text-[11px] font-semibold text-[#53608C]"><span className="flex items-center gap-2"><TypedIcon size={15} className="text-[#465FFF]" />{title as string}</span><b className="shrink-0 text-[#53608C]">{value as string}</b></div>;
                })}
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[13px] font-black text-[#101334]">Template Tindakan Populer</p>
              <div className="mt-3 grid gap-2.5">
                {["Crisis Response Template", "Customer Issue Response", "Promo Communication Plan"].map((template, index) => (
                  <div key={template} className="flex items-center justify-between rounded-[9px] border border-[#EEF1F7] px-3 py-2.5 text-[12px] font-semibold text-[#53608C]"><span className="flex items-center gap-2"><ListChecks size={15} className="text-[#EF4444]" />{template}</span><span className="text-[10px] font-black">Digunakan {index === 0 ? "24x" : index === 1 ? "18x" : "12x"}</span></div>
                ))}
              </div>
            </div>
            <button type="button" className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF]">Kelola Semua Template <ChevronRight size={14} /></button>
          </CardContent>
        </Panel>
      </section>
    </div>
  );
}

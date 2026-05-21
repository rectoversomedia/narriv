"use client";

import { useState } from "react";
import { Check, Edit3, FileText, MessageSquare, Plus, Search, Sparkles, Target, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, PrimaryAction, ProgressBar, SecondaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actions, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

const lanes = ["High", "Medium", "Low"] as const;

export default function ActionPlansPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [filter, setFilter] = useState("all");
  const [selectedAction, setSelectedAction] = useState(actions[0]);
  const [feedback, setFeedback] = useState<"accept" | "edit" | "reject" | null>(null);

  return (
    <div className="space-y-8 pb-6">
      <PageTitle
        title={t("pages.actions.title")}
        description={t("pages.actions.desc")}
        action={<PrimaryAction><Plus size={16} />{t("common.newAction")}</PrimaryAction>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Tindakan Aktif" value="12" helper="+20% vs 7 hari" icon={Target} tone="blue" />
        <MetricTile label="Dalam Proses" value="7" helper="+16% vs 7 hari" icon={Sparkles} tone="amber" />
        <MetricTile label="Selesai" value="28" helper="+25% vs 7 hari" icon={Check} tone="green" />
        <MetricTile label="Perlu Perhatian" value="3" helper="-25% vs 7 hari" icon={MessageSquare} tone="red" />
      </div>

      <AppCard>
        <CardContent className="p-5">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full xl:w-auto">
              <TabsList className="bg-slate-100 text-slate-500">
                <TabsTrigger value="all">{t("pages.actions.all")}</TabsTrigger>
                <TabsTrigger value="active">{t("pages.actions.active")}</TabsTrigger>
                <TabsTrigger value="progress">{t("pages.actions.progress")}</TabsTrigger>
                <TabsTrigger value="done">{t("pages.actions.done")}</TabsTrigger>
                <TabsTrigger value="attention">{t("pages.actions.attention")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap gap-3">
              <label className="flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-slate-500 focus-within:border-[#465FFF]/50">
                <Search size={16} />
                <input className="bg-transparent text-sm outline-none placeholder:text-slate-300" placeholder="Cari tindakan..." />
              </label>
              <SecondaryAction>Sort by SLA</SecondaryAction>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {lanes.map((lane) => {
              const laneActions = actions.filter((action) => text(action.priority, "en") === lane);
              return (
                <div key={lane} className="rounded-[14px] border border-slate-100 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-black text-slate-900">{lane} Priority</h2>
                    <StatusPill tone={lane === "High" ? "red" : lane === "Medium" ? "amber" : "green"}>{laneActions.length} item</StatusPill>
                  </div>
                  <div className="grid gap-3">
                    {laneActions.map((action) => (
                      <button
                        key={text(action.title, language)}
                        type="button"
                        onClick={() => setSelectedAction(action)}
                        className={`rounded-[12px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${selectedAction.title.en === action.title.en ? "border-[#465FFF] bg-[#465FFF]/5" : "border-slate-100 bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900">{text(action.title, language)}</p>
                          <StatusPill tone={action.tone}>{text(action.status, language)}</StatusPill>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-400">{text(action.issue, language)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{action.owner}</p>
                            <p className="text-[11px] font-semibold text-slate-400">{action.role}</p>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500">{action.due}</p>
                        </div>
                        <div className="mt-4"><ProgressBar value={action.progress} tone={action.tone} /></div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </AppCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <AppCard>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="text-[#465FFF]" size={22} />
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Action Preview Drawer</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Draft rekomendasi AI untuk aksi terpilih.</p>
              </div>
            </div>
            <div className="mt-5 rounded-[12px] border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={selectedAction.tone}>{text(selectedAction.priority, language)}</StatusPill>
                <StatusPill tone="purple">AI Draft</StatusPill>
                <StatusPill tone="slate">{selectedAction.due}</StatusPill>
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-900">{text(selectedAction.title, language)}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                Siapkan respons publik yang mengakui isu, menjelaskan langkah mitigasi, dan mengarahkan pelanggan ke kanal bantuan resmi. Gunakan nada empatik, faktual, dan hindari janji yang belum tervalidasi.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["PR Response", "Social Post", "CS Brief"].map((item) => (
                  <div key={item} className="rounded-[10px] border border-slate-100 bg-slate-50 p-4">
                    <FileText size={18} className="text-[#465FFF]" />
                    <p className="mt-3 text-sm font-black text-slate-900">{item}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Siap diedit</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">AI Learning Loop</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Stakeholder bisa melihat bagaimana feedback memperbaiki rekomendasi AI berikutnya.</p>
            <div className="mt-5 grid gap-3">
              {[
                ["accept", Check, "Accept", "Gunakan rekomendasi AI"],
                ["edit", Edit3, "Edit", "Ubah sebelum dipakai"],
                ["reject", X, "Reject", "Tolak dan beri alasan"],
              ].map(([key, Icon, label, desc]) => {
                const TypedIcon = Icon as typeof Check;
                return (
                  <button key={key as string} type="button" onClick={() => setFeedback(key as "accept" | "edit" | "reject")} className={`flex items-center gap-3 rounded-[10px] border p-4 text-left transition ${feedback === key ? "border-[#465FFF] bg-[#465FFF]/5" : "border-slate-100 bg-slate-50 hover:bg-white"}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#465FFF]/10 text-[#465FFF]"><TypedIcon size={18} /></span>
                    <span>
                      <span className="block text-sm font-black text-slate-900">{label as string}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-400">{desc as string}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Button className="mt-5 h-10 w-full rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]" disabled={!feedback}>Kirim Feedback</Button>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}

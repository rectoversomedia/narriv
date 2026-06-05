"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppCard, IconBubble, PrimaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { alerts, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";
import { getAlertById, updateAlertStatus, updateAlertAssignment } from "@/lib/api-service";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";

import type { Tone } from "@/lib/mock-data";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const queryClient = useQueryClient();
  const toastHook = useToast();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };
  
  const alertQuery = useQuery({
    queryKey: ["alert-detail", params.id],
    queryFn: () => getAlertById(params.id),
    staleTime: 30 * 1000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: "open" | "acknowledged" | "resolved") => updateAlertStatus(params.id, status),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alert-detail", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast(result ? "Status alert berhasil diperbarui." : "Status alert belum bisa diperbarui.", result ? "success" : "error");
    },
    onError: () => showToast("Status alert belum bisa diperbarui. Coba lagi.", "error"),
  });

  const assignmentMutation = useMutation({
    mutationFn: (input: { assignedTo?: string | null; assignedTeam?: string | null; deadline?: string | null }) => updateAlertAssignment(params.id, input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alert-detail", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast(result ? "Penugasan alert berhasil disimpan." : "Penugasan alert belum bisa disimpan.", result ? "success" : "error");
    },
    onError: () => showToast("Penugasan alert belum bisa disimpan. Coba lagi.", "error"),
  });

  const isLiveUnavailable = alertQuery.data === null;
  const liveData = alertQuery.data;

  // Fallback to static mock data if API unavailable
  const fallbackAlert = alerts.find((item) => item.id === params.id) ?? alerts[0];

  const title = liveData?.title || text(fallbackAlert.title, language);
  const source = liveData?.type || fallbackAlert.source;
  const issue = liveData?.type || text(fallbackAlert.issue, language);
  const whatHappened = liveData?.whatHappened || text(fallbackAlert.title, language);
  const whyItMatters = liveData?.whyItMatters || text(fallbackAlert.title, language);
  const whatToDo = liveData?.whatToDo || text(fallbackAlert.title, language);
  const tone = liveData?.severity === "critical" || liveData?.severity === "high" ? "red" : liveData?.severity === "medium" ? "amber" : liveData?.severity === "low" ? "blue" : fallbackAlert.tone;
  const currentStatus = liveData?.status || "open";

  const [assignedTo, setAssignedTo] = useState(liveData?.assignedTo || "Arif Rahman");
  const [assignedTeam, setAssignedTeam] = useState(liveData?.assignedTeam || "PR Team");
  const [deadline, setDeadline] = useState(liveData?.deadline ? new Date(liveData.deadline).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : fallbackAlert.time);

  const handleSaveAssignment = () => {
    assignmentMutation.mutate({ assignedTo, assignedTeam, deadline });
  };
  
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#465FFF] transition-all">
        <ArrowLeft size={16} />
        Back
      </Link>
      
      {isLiveUnavailable ? (
        <DashboardErrorState title="Detail alert live belum bisa dimuat" description="API client sudah mencoba token refresh. Halaman ini menggunakan data contoh sementara." onRetry={() => void alertQuery.refetch()} minHeight="min-h-[150px]" />
      ) : null}

      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : (
      <AppCard>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={tone as Tone}>{params.id}</StatusPill>
            <StatusPill tone="slate">{source}</StatusPill>
            <div className="ml-auto flex gap-2">
              {(["open", "acknowledged", "resolved"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => statusMutation.mutate(status)}
                  disabled={statusMutation.isPending || currentStatus === status}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${currentStatus === status ? "bg-[#465FFF] text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {status === "open" ? "Baru" : status === "acknowledged" ? "Investigating" : "Resolved"}
                </button>
              ))}
            </div>
          </div>
          
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">{issue} membutuhkan perhatian cepat dari tim terkait.</p>
          
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">What happened</span>
              {whatHappened}
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">Why it matters</span>
              {whyItMatters}
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">What to do</span>
              {whatToDo}
            </div>
          </div>
          
          <div className="mt-8 rounded-[10px] border border-[#10B981]/20 bg-[#10B981]/5 p-5">
            <p className="flex items-center gap-2 font-bold text-[#10B981]">
              <CheckCircle2 size={17} />
              Recommended step
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Route this alert to Action Center and assign an owner.</p>
            <PrimaryAction className="mt-4">{t("common.newAction")}</PrimaryAction>
          </div>
        </CardContent>
      </AppCard>
      )}
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : (
      <AppCard>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <IconBubble icon={AlertTriangle} tone={tone as Tone} />
            <h2 className="text-xl font-bold text-slate-900">Assignment</h2>
            <button
              type="button"
              onClick={handleSaveAssignment}
              disabled={assignmentMutation.isPending}
              className="ml-auto flex items-center gap-2 rounded-lg bg-[#465FFF] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#3B4FE0] disabled:opacity-50"
            >
              <Save size={14} />
              {assignmentMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Input 
              value={assignedTo} 
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-11 border-slate-200 text-slate-900 focus:border-[#465FFF]/50" 
            />
            <Input 
              value={assignedTeam} 
              onChange={(e) => setAssignedTeam(e.target.value)}
              className="h-11 border-slate-200 text-[#465FFF] focus:border-[#465FFF]/50" 
            />
            <Input 
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 border-slate-200 text-slate-500 focus:border-[#465FFF]/50" 
            />
          </div>
        </CardContent>
      </AppCard>
      )}
    </div>
  );
}

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
import { getAlertById, updateAlertStatus, updateAlertAssignment, type Alert } from "@/lib/api-service";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";

import type { Tone } from "@/lib/mock-data";

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function AssignmentCard({ alert, isSaving, onSave }: { alert: Alert | null; isSaving: boolean; onSave: (input: { assignedTo: string | null; assignedTeam: string | null; deadline: string | null }) => void }) {
  const td = useTranslations("AlertDetail");
  const [assignedTo, setAssignedTo] = useState(alert?.assignedTo ?? "");
  const [assignedTeam, setAssignedTeam] = useState(alert?.assignedTeam ?? "");
  const [deadline, setDeadline] = useState(toDateTimeLocalValue(alert?.deadline));
  const tone = alert?.severity === "critical" || alert?.severity === "high" ? "red" : alert?.severity === "medium" ? "amber" : alert?.severity === "low" ? "blue" : "purple";

  const handleSaveAssignment = () => {
    onSave({
      assignedTo: nullableText(assignedTo),
      assignedTeam: nullableText(assignedTeam),
      deadline: toIsoDateTime(deadline),
    });
  };

  return (
    <AppCard>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <IconBubble icon={AlertTriangle} tone={tone as Tone} />
          <h2 className="text-xl font-bold text-slate-900">{td("assignment.title")}</h2>
          <button
            type="button"
            onClick={handleSaveAssignment}
            disabled={isSaving}
            className="ml-auto flex items-center gap-2 rounded-lg bg-[#465FFF] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#3B4FE0] disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? td("assignment.saving") : td("assignment.save")}
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
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-11 border-slate-200 text-slate-500 focus:border-[#465FFF]/50"
          />
        </div>
      </CardContent>
    </AppCard>
  );
}

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("DemoApp");
  const td = useTranslations("AlertDetail");
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
      showToast(result ? td("toast.statusUpdated") : td("toast.statusUpdateFailed"), result ? "success" : "error");
    },
    onError: () => showToast(td("toast.statusUpdateFailed"), "error"),
  });

  const assignmentMutation = useMutation({
    mutationFn: (input: { assignedTo?: string | null; assignedTeam?: string | null; deadline?: string | null }) => updateAlertAssignment(params.id, input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alert-detail", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast(result ? td("toast.assignmentSaved") : td("toast.assignmentFailed"), result ? "success" : "error");
    },
    onError: () => showToast(td("toast.assignmentFailed"), "error"),
  });

  const isLiveUnavailable = alertQuery.data === null;
  const liveData = alertQuery.data;

  const title = liveData?.title ?? "";
  const source = liveData?.type ?? "";
  const issue = liveData?.type ?? "";
  const whatHappened = liveData?.whatHappened ?? "";
  const whyItMatters = liveData?.whyItMatters ?? "";
  const whatToDo = liveData?.whatToDo ?? "";
  const tone = liveData?.severity === "critical" || liveData?.severity === "high" ? "red" : liveData?.severity === "medium" ? "amber" : liveData?.severity === "low" ? "blue" : "purple";
  const currentStatus = liveData?.status || "open";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#465FFF] transition-all">
        <ArrowLeft size={16} />
        {td("nav.back")}
      </Link>
      
      {isLiveUnavailable ? (
        <DashboardErrorState title={td("empty.title")} description={td("empty.desc")} onRetry={() => void alertQuery.refetch()} minHeight="min-h-[150px]" />
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
                  {status === "open" ? td("status.new") : status === "acknowledged" ? td("status.investigating") : td("status.resolved")}
                </button>
              ))}
            </div>
          </div>
          
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">{td("issue.description", { issue })}</p>
          
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">{td("section.whatHappened")}</span>
              {whatHappened}
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">{td("section.whyItMatters")}</span>
              {whyItMatters}
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
              <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">{td("section.whatToDo")}</span>
              {whatToDo}
            </div>
          </div>
          
          <div className="mt-8 rounded-[10px] border border-[#10B981]/20 bg-[#10B981]/5 p-5">
            <p className="flex items-center gap-2 font-bold text-[#10B981]">
              <CheckCircle2 size={17} />
              {td("recommendation.title")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">{td("recommendation.desc")}</p>
            <PrimaryAction className="mt-4">{t("common.newAction")}</PrimaryAction>
          </div>
        </CardContent>
      </AppCard>
      )}
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : (
        <AssignmentCard
          key={liveData?.id ?? "empty-alert-assignment"}
          alert={liveData ?? null}
          isSaving={assignmentMutation.isPending}
          onSave={(input) => assignmentMutation.mutate(input)}
        />
      )}
    </div>
  );
}

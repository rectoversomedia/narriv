"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, PrimaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alerts, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const alert = alerts.find((item) => item.id === params.id) ?? alerts[0];
  
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#465FFF] transition-all">
        <ArrowLeft size={16} />
        Back
      </Link>
      
      <AppCard>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={alert.tone}>{alert.id}</StatusPill>
            <StatusPill tone="slate">{alert.source}</StatusPill>
          </div>
          
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{text(alert.title, language)}</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">{text(alert.issue, language)} membutuhkan perhatian cepat dari tim terkait.</p>
          
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["What happened", "Why it matters", "What to do"].map((item) => (
              <div 
                key={item} 
                className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500"
              >
                <span className="block text-xs font-bold text-[#465FFF] uppercase tracking-wider mb-1">{item}</span>
                {text(alert.title, language)}
              </div>
            ))}
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
      
      <AppCard>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <IconBubble icon={AlertTriangle} tone={alert.tone} />
            <h2 className="text-xl font-bold text-slate-900">Assignment</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Input 
              defaultValue="Arif Rahman" 
              className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-[#465FFF]/50" 
            />
            <Input 
              defaultValue="PR Team" 
              className="h-11 bg-slate-50 border-slate-200 text-[#465FFF] placeholder:text-slate-300 focus:border-[#465FFF]/50" 
            />
            <Input 
              defaultValue={alert.time} 
              className="h-11 bg-slate-50 border-slate-200 text-slate-500 placeholder:text-slate-300 focus:border-[#465FFF]/50" 
            />
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}

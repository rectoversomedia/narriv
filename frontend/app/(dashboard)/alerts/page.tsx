"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Clock3, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, MetricTile, PageTitle, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { alerts, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function AlertsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.alerts.title")} description={t("pages.alerts.desc")} />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Smart Alerts" value="17" helper="5 critical" icon={Bell} tone="red" />
        <MetricTile label="Resolved" value="28" helper="25% vs 7 days" icon={ShieldCheck} tone="green" />
        <MetricTile label="Avg SLA" value="17m" helper="8m faster" icon={Clock3} tone="purple" />
      </div>
      
      {/* Alerts Queue */}
      <AppCard>
        <CardContent className="p-5">
          <h2 className="mb-5 text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.alerts.queue")}</h2>
          
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <Link 
                key={alert.id} 
                href={`/alerts/${alert.id}`} 
                className="flex items-center gap-4 rounded-[10px] border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:border-[#465FFF]/35 hover:bg-white/[0.04] active:scale-[0.99]"
              >
                <IconBubble icon={AlertTriangle} tone={alert.tone} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{text(alert.title, language)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400 truncate">
                    {alert.source} - {text(alert.issue, language)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center">
                  <StatusPill tone={alert.tone}>{alert.time}</StatusPill>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}

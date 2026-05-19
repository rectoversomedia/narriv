"use client";

import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, PrimaryAction, IconBubble } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { settingsCards } from "@/lib/mock-data";

export default function SettingsPage() {
  const t = useTranslations("DemoApp");
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle 
        title={t("pages.settings.title")} 
        description={t("pages.settings.desc")} 
        action={<PrimaryAction>Save Settings</PrimaryAction>} 
      />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Team Members" value="18" helper="5 active analysts" icon={settingsCards[3].icon} tone="blue" />
        <MetricTile label="Security Score" value="96" helper="SSO ready" icon={settingsCards[4].icon} tone="green" />
        <MetricTile label="Notification Rules" value="12" helper="3 critical routes" icon={settingsCards[1].icon} tone="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Profile Card */}
        <AppCard>
          <CardContent className="p-5">
            <h2 className="mb-5 text-[20px] font-bold text-slate-900 tracking-tight">Workspace Profile</h2>
            
            <div className="grid gap-5 md:grid-cols-2">
              {[["Brand Name", "Narriv"], ["Industry", "Enterprise Intelligence"], ["Timezone", "Asia/Jakarta"], ["Notification Email", "ops@narriv.ai"]].map(([label, value]) => (
                <label key={label} className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                  <Input 
                    defaultValue={value} 
                    className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-[#465FFF]/50 focus:ring-1 focus:ring-[#465FFF]/50 transition-all rounded-lg" 
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Configuration Hub */}
        <AppCard>
          <CardContent className="p-5">
            <h2 className="mb-5 text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.settings.hub")}</h2>
            
            <div className="grid gap-3">
              {settingsCards.map((card) => { 
                const Icon = card.icon; 
                return (
                  <div 
                    key={card.key} 
                    className="flex items-center gap-3.5 rounded-[10px] border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:border-slate-200 hover:bg-white/[0.03] cursor-pointer"
                  >
                    <IconBubble icon={Icon} tone={card.tone} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{t(`pages.settings.${card.key}`)}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage configuration</p>
                    </div>
                  </div>
                ); 
              })}
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}

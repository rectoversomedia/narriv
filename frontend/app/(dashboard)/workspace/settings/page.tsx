"use client";

import { useState } from "react";
import { BarChart3, Bell, CreditCard, Globe2, KeyRound, Lock, Save, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, MetricTile, PageTitle, PrimaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { settingsCards, teamMembers } from "@/lib/mock-data";

const sections = [
  { key: "profile", label: "Profil & Akun", icon: Users },
  { key: "notifications", label: "Notifikasi", icon: Bell },
  { key: "analysis", label: "Preferensi Analisis", icon: BarChart3 },
  { key: "team", label: "Manajemen Tim", icon: Users },
  { key: "security", label: "Keamanan", icon: Shield },
  { key: "integrations", label: "Integrasi", icon: KeyRound },
  { key: "language", label: "Bahasa & Regional", icon: Globe2 },
  { key: "billing", label: "Billing & Langganan", icon: CreditCard },
];

export default function SettingsPage() {
  const t = useTranslations("DemoApp");
  const [active, setActive] = useState("profile");
  const [criticalAlert, setCriticalAlert] = useState(true);
  const ActiveIcon = sections.find((section) => section.key === active)?.icon ?? Users;

  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.settings.title")} description={t("pages.settings.desc")} action={<PrimaryAction><Save size={16} />Save Settings</PrimaryAction>} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Team Members" value="18" helper="5 active analysts" icon={settingsCards[3].icon} tone="blue" />
        <MetricTile label="Security Score" value="96" helper="SSO ready" icon={settingsCards[4].icon} tone="green" />
        <MetricTile label="Notification Rules" value="12" helper="3 critical routes" icon={settingsCards[1].icon} tone="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[290px_1fr]">
        <AppCard>
          <CardContent className="p-4">
            <div className="grid gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button key={section.key} type="button" onClick={() => setActive(section.key)} className={`flex h-12 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-black transition ${active === section.key ? "bg-[#465FFF]/10 text-[#465FFF]" : "text-slate-700 hover:bg-slate-50"}`}>
                    <Icon size={18} />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </AppCard>

        <div className="grid gap-6">
          <AppCard>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <IconBubble icon={ActiveIcon} tone="purple" />
                <div>
                  <h2 className="text-[22px] font-black tracking-tight text-slate-900">{sections.find((section) => section.key === active)?.label}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Mock settings panel mengikuti flow Settings design.</p>
                </div>
              </div>

              {active === "profile" ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {[["Brand Name", "Narriv"], ["Industry", "Enterprise Intelligence"], ["Timezone", "Asia/Jakarta"], ["Notification Email", "ops@narriv.ai"]].map(([label, value]) => (
                    <label key={label} className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                      <Input defaultValue={value} className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-900" />
                    </label>
                  ))}
                </div>
              ) : null}

              {active === "notifications" ? (
                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  {["WhatsApp-to-PIC", "Email Harian", "Slack Webhook"].map((item, index) => (
                    <div key={item} className="rounded-[12px] border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <StatusPill tone={index === 0 ? "red" : index === 1 ? "blue" : "purple"}>{item}</StatusPill>
                        <button type="button" onClick={() => setCriticalAlert((value) => !value)} className={`relative h-5 w-9 rounded-full ${criticalAlert ? "bg-[#465FFF]" : "bg-slate-200"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${criticalAlert ? "left-4" : "left-0.5"}`} />
                        </button>
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-600">Critical alerts dikirim ke owner dan channel eskalasi utama.</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {active === "analysis" ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[["Risk Threshold", "80%"], ["Minimal Percakapan", "100"], ["Lookback Window", "7 hari terakhir"]].map(([label, value]) => (
                    <div key={label} className="rounded-[12px] border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                      <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {active === "team" ? (
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-100">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => (
                        <TableRow key={member.email}>
                          <TableCell><b>{member.name}</b><p className="text-xs text-slate-400">{member.email}</p></TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell><StatusPill tone={member.tone}>{member.status}</StatusPill></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {active === "security" ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {["SSO Ready", "Audit Log 12 Bulan", "2FA Required"].map((item) => (
                    <div key={item} className="rounded-[12px] border border-[#10B981]/20 bg-[#10B981]/5 p-4">
                      <Lock className="text-[#10B981]" size={20} />
                      <p className="mt-3 text-sm font-black text-slate-900">{item}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Aktif untuk workspace</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {!["profile", "notifications", "analysis", "team", "security"].includes(active) ? (
                <div className="mt-6 rounded-[12px] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-sm font-semibold leading-7 text-slate-600">Panel ini disiapkan sebagai placeholder interaktif untuk flow {sections.find((section) => section.key === active)?.label}. Stakeholder dapat melihat pola navigasi dan struktur konfigurasi sebelum integrasi backend.</p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="h-10 rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]">Simpan Perubahan</Button>
                <Button variant="outline" className="h-10 rounded-[8px] border-slate-200 bg-slate-50">Reset</Button>
              </div>
            </CardContent>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

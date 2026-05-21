"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, MoreVertical, Plus, Settings, ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, MetricTile, PageTitle, PrimaryAction, SecondaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { alertRules, alerts, notificationChannels, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function AlertsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [quietHours, setQuietHours] = useState(true);
  const [channels, setChannels] = useState(notificationChannels);
  const [selectedRule, setSelectedRule] = useState(alertRules[0].name);

  return (
    <div className="space-y-8 pb-6">
      <PageTitle
        title={t("pages.alerts.title")}
        description={t("pages.alerts.desc")}
        action={
          <div className="flex flex-wrap gap-3">
            <SecondaryAction><Users size={16} />Kelola Kontak</SecondaryAction>
            <SecondaryAction><Settings size={16} />Pengaturan Notifikasi</SecondaryAction>
            <PrimaryAction><Plus size={16} />Buat Alert Baru</PrimaryAction>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Total Alert (30 Hari)" value="1.248" helper="+18,7% vs 30 hari" icon={Bell} tone="purple" />
        <MetricTile label="Alert Kritis" value="32" helper="-11,1% vs 30 hari" icon={AlertTriangle} tone="red" />
        <MetricTile label="Alert Peringatan" value="156" helper="+9,3% vs 30 hari" icon={AlertTriangle} tone="amber" />
        <MetricTile label="Alert Informasi" value="1.060" helper="+21,4% vs 30 hari" icon={Info} tone="blue" />
        <MetricTile label="Terselesaikan" value="1.216" helper="+24,8% vs 30 hari" icon={ShieldCheck} tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <AppCard>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Aturan Alert</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Daftar aturan alert yang aktif dalam sistem.</p>
              </div>
              <SecondaryAction>Lihat Semua Aturan</SecondaryAction>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="py-4 font-semibold text-slate-500">Nama Aturan</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Kategori</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Tingkat</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Teraktifkan</TableHead>
                    <TableHead className="py-4 text-right font-semibold text-slate-500" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertRules.map((rule) => (
                    <TableRow
                      key={rule.name}
                      onClick={() => setSelectedRule(rule.name)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 ${selectedRule === rule.name ? "bg-[#465FFF]/5" : "hover:bg-slate-50"}`}
                    >
                      <TableCell className="py-4">
                        <p className="font-bold text-slate-900">{rule.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Memantau perubahan narasi secara real-time</p>
                      </TableCell>
                      <TableCell className="py-4"><StatusPill tone={rule.tone}>{rule.category}</StatusPill></TableCell>
                      <TableCell className="py-4"><StatusPill tone={rule.tone}>{rule.level}</StatusPill></TableCell>
                      <TableCell className="py-4"><StatusPill tone="green">{rule.status}</StatusPill></TableCell>
                      <TableCell className="py-4 text-sm font-semibold text-slate-600">{rule.activated}</TableCell>
                      <TableCell className="py-4 text-right"><MoreVertical size={16} className="ml-auto text-slate-400" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Notifikasi Terbaru</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Daftar alert terbaru yang terjadi.</p>
              </div>
              <Link href="/alerts" className="text-xs font-bold text-[#465FFF] hover:underline">Lihat Semua</Link>
            </div>
            <div className="grid gap-3">
              {alerts.map((alert) => (
                <Link key={alert.id} href={`/alerts/${alert.id}`} className="flex items-center gap-4 rounded-[10px] border border-slate-100 bg-slate-50 p-4 transition hover:border-[#465FFF]/30 hover:bg-white">
                  <IconBubble icon={AlertTriangle} tone={alert.tone} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{text(alert.title, language)}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{text(alert.issue, language)}</p>
                  </div>
                  <div className="text-right">
                    <StatusPill tone={alert.tone}>{alert.tone === "red" ? "Kritis" : "Peringatan"}</StatusPill>
                    <p className="mt-2 text-xs font-bold text-slate-500">{alert.time}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Saluran Notifikasi</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Kelola saluran untuk menerima notifikasi alert.</p>
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="py-4 font-semibold text-slate-500">Channel</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Tujuan</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Prioritas</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="py-4 text-right font-semibold text-slate-500">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.name} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <StatusPill tone={channel.tone}>{channel.name}</StatusPill>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm font-semibold text-slate-600">{channel.target}</TableCell>
                      <TableCell className="py-4 text-sm font-semibold text-slate-500">{channel.name === "SMS" ? "Kritis saja" : "Semua alert"}</TableCell>
                      <TableCell className="py-4">
                        <span className={`text-xs font-bold ${channel.active ? "text-[#10B981]" : "text-slate-400"}`}>{channel.active ? "Aktif" : "Nonaktif"}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Bell size={16} className={channel.active ? "text-[#465FFF]" : "text-slate-300"} />
                          <Switch
                            checked={channel.active}
                            onCheckedChange={(active) => setChannels((items) => items.map((item) => item.name === channel.name ? { ...item, active } : item))}
                            className="data-checked:bg-[#465FFF]"
                            aria-label={`Toggle ${channel.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Jadwal Senyap</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Notifikasi non-kritis tidak dikirim saat quiet hours.</p>
              </div>
              <Switch checked={quietHours} onCheckedChange={setQuietHours} className="data-checked:bg-[#465FFF]" aria-label="Toggle quiet hours" />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[["Hari", "Setiap Hari"], ["Waktu Mulai", "22:00"], ["Waktu Selesai", "07:00"]].map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[10px] border border-[#465FFF]/10 bg-[#465FFF]/5 p-4 text-sm font-semibold text-slate-600">
              <CheckCircle2 className="mr-2 inline text-[#465FFF]" size={16} />
              Alert tingkat Kritis tetap dikirim meskipun dalam jadwal senyap.
            </div>
            <Button className="mt-5 h-10 rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]">Simpan Jadwal</Button>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Crown, Rocket, Sprout, Zap, type LucideIcon } from "lucide-react";
import { getEntitlements, type Entitlements, type FeatureKey, type PaidPlan } from "@/lib/api-service";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

/** Each plan's mark, the same as on the pricing page. */
export const PLAN_META: Record<PaidPlan, { name: string; icon: LucideIcon; color: string; soft: string }> = {
  starter: { name: "Starter", icon: Sprout, color: "#12A66A", soft: "#E5F6EE" },
  pilot: { name: "Pilot", icon: Rocket, color: "#F59E0B", soft: "#FFF4E5" },
  intelligence: { name: "Intelligence", icon: Zap, color: "#465FFF", soft: "#EEF1FF" },
  decision: { name: "Decision", icon: Building2, color: "#8B5CFF", soft: "#F1ECFF" },
  command: { name: "Command", icon: Crown, color: "#E85BB8", soft: "#FDEBF6" },
};

/** Which feature a page belongs to (pages not listed are in every plan). */
export const PAGE_FEATURE: Record<string, FeatureKey> = {
  "/visibility": "ai_visibility",
  "/forecast": "forecast",
  "/cek-klaim": "claim_check",
  "/ask": "ask",
  "/competitors": "competitors",
  "/network": "network",
  "/investigasi": "network",
  "/recon": "account_check",
  "/action-plans": "action_plans",
  "/workspace/white-label": "white_label",
};

export const FEATURE_COPY: Record<FeatureKey, { en: string; id: string; descEn: string; descId: string }> = {
  whatsapp_alerts: { en: "WhatsApp alerts", id: "Peringatan WhatsApp", descEn: "High-risk alerts straight to your team's WhatsApp.", descId: "Peringatan berisiko tinggi langsung ke WhatsApp tim Anda." },
  ai_visibility: { en: "AI visibility", id: "Jawaban AI", descEn: "How ChatGPT and Claude talk about your brand, and what to fix.", descId: "Cara ChatGPT dan Claude membicarakan brand Anda, dan apa yang perlu dibenahi." },
  forecast: { en: "Issue forecast", id: "Prediksi Isu", descEn: "Issues likely to surface next, and how to prepare.", descId: "Isu yang berpeluang muncul berikutnya, dan cara bersiap." },
  claim_check: { en: "Claim check", id: "Cek Klaim", descEn: "Paste a claim or link: Narriv finds fact-checks and coverage.", descId: "Tempel klaim atau tautan: Narriv mencari cek fakta dan pemberitaannya." },
  ask: { en: "Ask narriv", id: "Ask narriv", descEn: "Ask your data a question and get an answer with sources.", descId: "Tanyakan data Anda dan dapatkan jawaban lengkap dengan sumbernya." },
  action_plans: { en: "Response plans", id: "Rencana respons", descEn: "AI drafts a response plan for each issue; your team approves it.", descId: "AI menyusun rencana respons untuk tiap isu, tim Anda yang menyetujui." },
  competitors: { en: "Competitor check", id: "Cek Kompetitor", descEn: "Share of coverage, bad press and AI answers against your competitors.", descId: "Porsi berita, berita buruk, dan jawaban AI dibanding kompetitor." },
  network: { en: "Conversation network", id: "Jaringan percakapan", descEn: "Who talks about you, in which camps, and signs of coordination.", descId: "Siapa yang membicarakan Anda, dalam kubu apa, dan tanda koordinasi." },
  account_check: { en: "Account check", id: "Cek Influencer", descEn: "Check an account before working with it.", descId: "Cek sebuah akun sebelum bekerja sama." },
  press_release: { en: "Press release", id: "Siaran pers", descEn: "Approved releases sent to 170+ media you choose.", descId: "Rilis yang disetujui, dikirim ke 170+ media pilihan." },
  scheduled_reports: { en: "Scheduled reports", id: "Laporan terjadwal", descEn: "Board reports delivered on a schedule.", descId: "Laporan direksi terkirim otomatis sesuai jadwal." },
  social_media: { en: "Social media", id: "Media sosial", descEn: "Instagram, TikTok, X and Facebook in your monitoring.", descId: "Instagram, TikTok, X, dan Facebook dalam pemantauan Anda." },
  influencer: { en: "Influencer campaigns", id: "Kampanye influencer", descEn: "8,500+ creators with briefs, waves and posting dates.", descId: "8.500+ kreator dengan brief, gelombang, dan tanggal posting." },
  service_stages: { en: "Video, ads and social", id: "Video, iklan, dan media sosial", descEn: "Short videos, paid ads and social media management from your plan.", descId: "Video pendek, iklan berbayar, dan kelola media sosial dari rencana Anda." },
  white_label: { en: "Agency label", id: "Label agensi", descEn: "Reports and emails with your agency's name and logo.", descId: "Laporan dan email dengan nama dan logo agensi Anda." },
  escalation: { en: "Escalation matrix", id: "Matriks eskalasi", descEn: "Who is told, and when, as an alert grows.", descId: "Siapa yang dikabari, dan kapan, saat peringatan membesar." },
  integrations: { en: "Integrations", id: "Integrasi", descEn: "Slack, Microsoft Teams and webhooks.", descId: "Slack, Microsoft Teams, dan webhook." },
};

/** The selected workspace's plan and features. While loading (or in the demo) everything counts as open. */
export function useEntitlements(): { ent: Entitlements | null; can: (f: FeatureKey) => boolean; loading: boolean } {
  const ws = useWorkspaceStore((s) => s.selectedWorkspaceId);
  const demo = isDemoSession(useAuthStore((s) => s.user));
  const q = useQuery({ queryKey: ["entitlements", ws], queryFn: getEntitlements, staleTime: 5 * 60 * 1000, enabled: !demo });
  const ent = q.data?.data ?? null;
  return { ent, loading: q.isPending && !demo, can: (f) => !ent || ent.features[f] !== false };
}

export function PlanBadge({ plan, trial = false, className, dark = false }: { plan: PaidPlan; trial?: boolean; className?: string; dark?: boolean }) {
  const m = PLAN_META[plan];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-black", dark ? "bg-white/10 text-white" : "text-[#101334]", className)} style={dark ? undefined : { background: m.soft }}>
      <span className="grid size-4 place-items-center rounded-full text-white" style={{ background: m.color }}><Icon size={10} strokeWidth={2.6} aria-hidden="true" /></span>
      {trial ? `Trial · ${m.name}` : m.name}
    </span>
  );
}

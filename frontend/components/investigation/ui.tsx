"use client";

import Link from "next/link";
import { Bot, Lock, ShieldCheck } from "lucide-react";
import type { AutomationLevel, Identity } from "@/lib/api/investigations";
import { cveCategory, cveIdeology } from "@/lib/cve";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

// Group colours: no red or green (those mean risk and tone). Counter-narrative groups are teal.
const GROUP_COLORS = ["#465FFF", "#8B5CF6", "#F59E0B", "#EC4899", "#0EA5E9", "#A16207", "#64748B"];
export function groupColor(id: string | null | undefined, groups: Array<{ id: string; stance?: string | null }>) {
  if (!id) return "#B8C0D6";
  const g = groups.find((x) => x.id === id);
  if (g?.stance === "counter") return "#0D9488";
  const i = groups.filter((x) => x.stance !== "counter").findIndex((x) => x.id === id);
  return GROUP_COLORS[(i < 0 ? 0 : i) % GROUP_COLORS.length];
}

export const PLATFORM: Record<string, string> = { twitter: "X", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", news: "Berita", telegram: "Telegram", web: "Web" };

export const fmtWhen = (v: string | null | undefined) => (v ? new Date(v).toLocaleString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
export const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString(intlLocale(), { day: "numeric", month: "short", year: "numeric" }) : "–");
export const fmtNum = (n: number) => n.toLocaleString("id-ID");
export function fmtDelay(min: number, L: (en: string, id: string) => string) {
  if (min < 60) return L(`+${min} min`, `+${min} mnt`);
  if (min < 48 * 60) return L(`+${Math.round(min / 60)} h`, `+${Math.round(min / 60)} jam`);
  return L(`+${Math.round(min / 1440)} d`, `+${Math.round(min / 1440)} hari`);
}
export function accountAge(createdAt: string | null | undefined, L: (en: string, id: string) => string) {
  if (!createdAt) return null;
  const d = Math.max(1, Math.round((Date.now() - Date.parse(createdAt)) / 86400000));
  if (d < 60) return L(`${d} days old`, `${d} hari`);
  if (d < 730) return L(`${Math.round(d / 30)} months old`, `${Math.round(d / 30)} bulan`);
  return L(`${Math.round(d / 365)} years old`, `${Math.round(d / 365)} tahun`);
}

const AUTO: Record<AutomationLevel, { en: string; id: string; cls: string }> = {
  high: { en: "Strong automation signs", id: "Indikasi kuat otomatis", cls: "bg-[#FDECEC] text-[#B42318] border-[#F5C2C0]" },
  medium: { en: "Worth checking", id: "Perlu dicek", cls: "bg-[#FFF4E5] text-[#A04606] border-[#F8D9B0]" },
  low: { en: "Looks organic", id: "Cenderung organik", cls: "bg-[#F1F4FA] text-[#4A5578] border-[#DCE2EF]" },
  publisher: { en: "Media outlet", id: "Media", cls: "bg-[#EEF1FF] text-[#3347D6] border-[#D5DCFF]" },
};

export function AutomationBadge({ level, score, compact = false }: { level: AutomationLevel; score?: number; compact?: boolean }) {
  const L = useL();
  const a = AUTO[level];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-bold", a.cls)}>
      {level === "high" || level === "medium" ? <Bot className="h-3 w-3" /> : null}
      {compact ? (score != null && level !== "publisher" ? score : L(a.en, a.id)) : L(a.en, a.id)}
      {!compact && score != null && level !== "publisher" ? <span className="opacity-70">· {score}</span> : null}
    </span>
  );
}

export function CategoryChip({ id }: { id: string | null }) {
  const L = useL();
  if (!id) return null;
  if (id === "none") return <span className="rounded-full bg-[#E5F6EE] px-2 py-0.5 text-[11.5px] font-bold text-[#047857]">{L("Not a threat", "Bukan ancaman")}</span>;
  const c = cveCategory(id);
  return <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold", c?.risk ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#E6F6F4] text-[#0F766E]")}>{c ? L(c.label[0], c.label[1]) : id}</span>;
}

export function ideologyLabel(id: string | null | undefined, L: (en: string, id: string) => string) {
  const i = cveIdeology(id);
  return i ? L(i.label[0], i.label[1]) : null;
}

export function GroupChip({ id, label, color }: { id: string | null; label: string | null; color: string }) {
  const L = useL();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE2EF] bg-white px-2 py-0.5 text-[11.5px] font-bold text-[#101334]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {id ? label : L("Not affiliated", "Tidak terafiliasi")}
    </span>
  );
}

export function AccountLink({ id, handle, className }: { id: string; handle: string; className?: string }) {
  return (
    <Link href={`/investigasi/akun/${encodeURIComponent(id)}`} className={cn("font-bold text-[#101334] underline decoration-[#C9D0E4] underline-offset-2 hover:decoration-[#465FFF]", className)}>
      {handle}
    </Link>
  );
}

/** Who can see identities, and the standing caveat that every sign is an indication. */
export function IdentityNote({ identity }: { identity: Identity }) {
  const L = useL();
  return (
    <div className={cn("flex items-start gap-2.5 rounded-[14px] border px-4 py-3 text-[13px] leading-relaxed", identity.masked ? "border-[#F8D9B0] bg-[#FFF8EE] text-[#7A3E06]" : "border-[#D5DCFF] bg-[#F4F6FF] text-[#2A3366]")}>
      {identity.masked ? <Lock className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}
      <p>
        {identity.masked
          ? L("Privacy mode: account names are replaced by aliases. Only the workspace owner/admin, as the authorised officer, sees them.", "Mode privasi: nama akun diganti alias. Hanya pemilik/admin workspace, sebagai petugas berwenang, yang melihat nama aslinya.")
          : identity.reason === "authorised"
            ? L("You see account names as the authorised officer. Share them only through official channels.", "Anda melihat nama akun sebagai petugas berwenang. Teruskan hanya lewat jalur resmi.")
            : null}{" "}
        {L(
          "Origin, automation and affiliation are indications from collected data, not findings: verify before acting.",
          "Asal isu, indikasi otomatis, dan afiliasi adalah indikasi dari data yang terkumpul, bukan kesimpulan: verifikasi sebelum bertindak.",
        )}
      </p>
    </div>
  );
}

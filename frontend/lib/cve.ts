import type { CveCategory } from "@/lib/api-service";

/**
 * The CVE narrative categories as shown in the app (the API's cve-categories.js holds what the AI is told).
 * They describe what content does, never who posted it. `risk` false: tracked, but good news.
 */
export const CVE_CATEGORIES: Array<{ id: CveCategory; label: [string, string]; hint: [string, string]; risk: boolean; tone: string }> = [
  { id: "incitement", label: ["Incitement to violence", "Ajakan kekerasan"], hint: ["Calls for or threatens violence", "Menyerukan atau mengancam kekerasan"], risk: true, tone: "bg-[#FDECEC] text-[#B42318]" },
  { id: "propaganda", label: ["Glorifying violence", "Glorifikasi kekerasan"], hint: ["Praises an attack, attacker or violent group", "Memuji serangan, pelaku, atau kelompok kekerasan"], risk: true, tone: "bg-[#FDECEC] text-[#B42318]" },
  { id: "dehumanization", label: ["Dehumanising a group", "Dehumanisasi kelompok"], hint: ["Portrays a group as subhuman or a threat", "Menggambarkan kelompok sebagai bukan manusia atau ancaman"], risk: true, tone: "bg-[#FEF0E6] text-[#B54708]" },
  { id: "delegitimization", label: ["Delegitimising the state", "Delegitimasi negara"], hint: ["Calls the state religiously illegitimate, e.g. 'thogut'", "Menyebut negara tidak sah secara agama, misalnya 'thogut'"], risk: true, tone: "bg-[#F3E8FF] text-[#7E22CE]" },
  { id: "recruitment", label: ["Recruitment", "Ajakan bergabung"], hint: ["Invites people to join or fund a violent cause", "Mengajak bergabung atau mendanai gerakan kekerasan"], risk: true, tone: "bg-[#FEF0E6] text-[#B54708]" },
  { id: "misinformation", label: ["Incident misinformation", "Hoaks seputar insiden"], hint: ["False claims about an attack or arrest", "Klaim keliru soal serangan atau penangkapan"], risk: true, tone: "bg-[#FEF6E4] text-[#8A4B08]" },
  { id: "counter_narrative", label: ["Counter-narrative", "Kontra-narasi"], hint: ["Promotes peace and rejects violence", "Mengajak damai dan menolak kekerasan"], risk: false, tone: "bg-[#E8F7F0] text-[#047857]" },
];

export const cveCategory = (id: string | null | undefined) => CVE_CATEGORIES.find((c) => c.id === id) ?? null;

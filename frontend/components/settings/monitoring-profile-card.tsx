"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Landmark, Loader2, Megaphone, ShieldAlert, type LucideIcon } from "lucide-react";
import { setWorkspaceProfile, type WorkspaceSettingsResponse, type WorkspaceUseCase } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * What the workspace monitors for, and privacy mode. Brand reputation is Narriv's default; preventing violent
 * extremism (CVE) adds narrative categories that a person reviews, and hides account identities unless turned off.
 */
export function MonitoringProfileCard({ settings }: { settings?: WorkspaceSettingsResponse | null }) {
  const L = useL();
  const toast = useToast();
  const queryClient = useQueryClient();
  const useCase = settings?.useCase ?? "brand";
  const privacyMode = settings?.privacyMode ?? false;

  const save = useMutation({
    mutationFn: (input: { useCase?: WorkspaceUseCase; privacyMode?: boolean }) => setWorkspaceProfile(input),
    onSuccess: (r) => {
      queryClient.setQueryData<WorkspaceSettingsResponse | null>(["workspace-settings"], (prev) => (prev ? { ...prev, useCase: r.use_case, privacyMode: r.privacy_mode } : prev));
      void queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["signals"] });
      void queryClient.invalidateQueries({ queryKey: ["cve-summary"] });
      toast.showToast({
        title: L("Monitoring updated", "Pemantauan diperbarui"),
        description: r.use_case === "cve"
          ? L(`CVE monitoring is on; privacy mode is ${r.privacy_mode ? "on" : "off"}.`, `Pemantauan CVE aktif; mode privasi ${r.privacy_mode ? "aktif" : "nonaktif"}.`)
          : L(`Brand monitoring; privacy mode is ${r.privacy_mode ? "on" : "off"}.`, `Pemantauan reputasi brand; mode privasi ${r.privacy_mode ? "aktif" : "nonaktif"}.`),
        tone: "success",
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Only owners and admins can change this.", "Hanya pemilik dan admin yang dapat mengubah ini."), L("Not saved", "Gagal disimpan")),
  });

  const options: Array<{ id: WorkspaceUseCase; icon: LucideIcon; title: string; body: string }> = [
    {
      id: "brand",
      icon: Megaphone,
      title: L("Brand reputation", "Reputasi brand"),
      body: L("Issues, sentiment, competitors and AI visibility of a brand or company.", "Isu, sentimen, kompetitor, dan visibilitas di AI untuk brand atau perusahaan."),
    },
    {
      id: "gov",
      icon: Landmark,
      title: L("Government", "Pemerintahan"),
      body: L("Public services, policies and citizen sentiment; hoaxes about programmes and the office.", "Layanan publik, kebijakan, dan suara warga; hoaks soal program dan instansi."),
    },
    {
      id: "cve",
      icon: ShieldAlert,
      title: L("Preventing violent extremism (CVE)", "Pencegahan ekstremisme (CVE)"),
      body: L("Narratives of incitement, glorified violence, recruitment and incident hoaxes, plus counter-narratives, by region.", "Narasi ajakan kekerasan, glorifikasi, perekrutan, dan hoaks insiden, serta kontra-narasi, per wilayah."),
    },
  ];

  return (
    <section className={BOX}>
      <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Monitoring Type", "Jenis Pemantauan")}</h2>
      <p className="mt-1 text-[13px] font-medium text-[#5A6478]">{L("How Narriv reads your data.", "Cara Narriv membaca data Anda.")}</p>

      <div role="radiogroup" aria-label={L("Monitoring type", "Jenis pemantauan")} className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((o) => {
          const on = useCase === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={save.isPending}
              onClick={() => !on && save.mutate({ useCase: o.id })}
              className={cn("flex items-start gap-3 rounded-[14px] p-4 text-left transition", on ? "bg-white shadow-[inset_0_0_0_2px_#465FFF]" : "bg-white hover:shadow-[inset_0_0_0_2px_#DDE3EF]")}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-[#465FFF] text-white" : "bg-white text-[#465FFF]")}><o.icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-black text-[#101334]">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-relaxed text-[#5A6478]">{o.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-[14px] bg-white p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#465FFF]"><EyeOff size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-[14px] font-black text-[#101334]">{L("Privacy Mode", "Mode Privasi")}</p>
            <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-[#5A6478]">
              {L(
                "Hides social account names, @handles and post links everywhere, including exports.",
                "Sembunyikan nama akun, @handle, dan tautan postingan media sosial di semua tempat, termasuk ekspor.",
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={privacyMode}
          aria-label={L("Privacy mode", "Mode privasi")}
          disabled={save.isPending}
          onClick={() => save.mutate({ privacyMode: !privacyMode })}
          className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", privacyMode ? "bg-[#465FFF]" : "bg-[#CBD2E1]")}
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition", privacyMode ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>

      {useCase === "cve" ? (
        <ul className="mt-4 grid gap-2 text-[12.5px] font-medium leading-relaxed text-[#31406B] md:grid-cols-3">
          <li className="py-1"><b className="font-black text-[#101334]">{L("Narratives, not people.", "Narasi, bukan orang.")}</b> {L("Narriv tracks what spreads and where, never builds profiles of individuals.", "Narriv memantau narasi yang menyebar dan di mana, tidak membuat profil individu.")}</li>
          <li className="py-1"><b className="font-black text-[#101334]">{L("A person decides.", "Manusia yang memutuskan.")}</b> {L("AI only suggests a category; each one is confirmed or dismissed by your team.", "AI hanya menyarankan kategori; tim Anda yang mengonfirmasi atau menolaknya.")}</li>
          <li className="py-1"><b className="font-black text-[#101334]">{L("Public sources only.", "Hanya sumber publik.")}</b> {L("News and public posts; never private groups or chats.", "Berita dan postingan publik; tidak pernah grup atau percakapan tertutup.")}</li>
        </ul>
      ) : null}
      {save.isPending ? <p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#5A6478]"><Loader2 size={13} className="animate-spin" aria-hidden="true" />{L("Saving…", "Menyimpan…")}</p> : null}
    </section>
  );
}

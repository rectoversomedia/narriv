"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMyAccount } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { ModalShell, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

// The last row of the danger zone: deletes the account for good. The person types a word to confirm, then is signed
// out and sent to sign-up, where the same email can register again. Not shown in the demo.
export function DeleteAccountRow() {
  const L = useL();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const word = L("DELETE", "HAPUS");

  const mutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      useWorkspaceStore.getState().setSelectedWorkspaceId(null);
      queryClient.clear();
      useAuthStore.getState().logout();
      window.location.href = "/signup";
    },
    onError: () => showToast({ description: L("The account could not be deleted. Try again.", "Akun belum dapat dihapus. Coba lagi."), tone: "error" }),
  });

  if (!user || isDemoSession(user)) return null;

  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setTyped("");
  };

  return (
    <>
      <div className="flex flex-col gap-3.5 border-t border-slate-100/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="block text-[11.5px] font-black text-[#D32F2F]">{L("Delete Account", "Hapus Akun")}</span>
          <span className="mt-1 block text-[10px] font-semibold leading-normal text-[#5A6478]">
            {L("Permanently deletes your account and the workspaces you own, with all their data.", "Hapus permanen akun Anda dan workspace milik Anda beserta seluruh datanya.")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[11px] font-black text-white shadow-sm transition hover:bg-rose-700"
        >
          {L("Delete Account", "Hapus Akun")}
        </button>
      </div>

      <ModalShell
        open={open}
        onClose={close}
        size="sm"
        title={L("Delete Your Account?", "Hapus Akun Anda?")}
        description={L("This cannot be undone.", "Tindakan ini tidak dapat dibatalkan.")}
        closeLabel={L("Close", "Tutup")}
        footer={
          <>
            <button type="button" onClick={close} className={secondaryButtonClass}>{L("Cancel", "Batal")}</button>
            <button type="button" onClick={() => mutation.mutate()} disabled={typed.trim().toUpperCase() !== word || mutation.isPending} className={dangerButtonClass}>
              {mutation.isPending ? L("Deleting…", "Menghapus…") : L("Delete Permanently", "Hapus Permanen")}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[13px] leading-relaxed text-[#31406B]">
          <ul className="space-y-1.5 rounded-[12px] bg-[#FFF5F5] p-4 font-semibold text-[#9F1D1D]">
            <li>{L("Your account and sign-in", "Akun dan akses login Anda")}</li>
            <li>{L("Workspaces you own, with their mentions, alerts, reports and plans", "Workspace milik Anda beserta sinyal, peringatan, laporan, dan rencana aksinya")}</li>
            <li>{L("Your membership in other teams' workspaces", "Keanggotaan Anda di workspace tim lain")}</li>
          </ul>
          <p>{L("You can sign up again with the same email afterwards.", "Setelah itu Anda dapat mendaftar ulang dengan email yang sama.")}</p>
          <label htmlFor="delete-account-confirm" className="block font-bold text-[#101334]">
            {L(`Type ${word} to confirm`, `Ketik ${word} untuk konfirmasi`)}
          </label>
          <input id="delete-account-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} placeholder={word} />
        </div>
      </ModalShell>
    </>
  );
}

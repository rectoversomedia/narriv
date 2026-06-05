"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, CenterIcon, HelpAction, InfoCallout, PrimaryButton, SecondaryLinkButton, VerificationCodeInput } from "@/components/auth/auth-shell";
import { resendVerificationCode, verifyEmailCode } from "@/lib/api-service";
import { useAuthStore } from "@/store/useAuthStore";

export default function VerifyEmailPage() {
  const router = useRouter();
  // We can reuse translations or just hardcode some basic ones if translation missing
  // Actually, let's use the ones that make sense or add some if needed.
  // We will assume "AuthDesign.verifyEmail" might be missing, so we'll fall back to strings for now 
  // or add them to messages later.
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    setEmail(window.sessionStorage.getItem("narriv_verify_email") || "");
    setDevCode(window.sessionStorage.getItem("narriv_dev_verification_code"));
  }, []);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const joinedCode = code.join("");
    if (!email) {
      setApiError("Email tidak ditemukan. Mulai ulang proses registrasi.");
      return;
    }
    if (!/^\d{6}$/.test(joinedCode)) {
      setApiError("Masukkan kode 6 digit.");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    try {
      const response = await verifyEmailCode({ email, code: joinedCode });
      
      // Cleanup
      window.sessionStorage.removeItem("narriv_verify_email");
      window.sessionStorage.removeItem("narriv_dev_verification_code");
      
      // Set session and redirect
      setSession(
        response.token, 
        { name: response.user.name, email: response.user.email, provider: "password", workspace: "Narriv" }, 
        response.refreshToken
      );
      router.push("/");
    } catch {
      setApiError("Kode verifikasi tidak valid atau sudah kedaluwarsa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setApiError(null);
    try {
      const response = await resendVerificationCode({ email });
      if (response.verificationCode) {
        window.sessionStorage.setItem("narriv_dev_verification_code", response.verificationCode);
        setDevCode(response.verificationCode);
      }
      setCode(["", "", "", "", "", ""]);
    } catch {
      setApiError("Kode verifikasi belum bisa dikirim ulang.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell visual="verification" topAction={<HelpAction />}>
      <CenterIcon variant="shield" />

      <div className="mx-auto mb-12 max-w-[620px] text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">Verifikasi Email Anda</h1>
        <p className="mt-4 text-[19px] font-medium leading-8 text-[#3E4975]">
          Kami telah mengirimkan kode 6 digit ke email Anda. Masukkan kode di bawah untuk mengonfirmasi akun Anda.
          <br />
          <span className="font-bold text-[#2F20FF]">{email || "Email"}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="grid gap-8">
        <VerificationCodeInput value={code} onChange={setCode} />
        {devCode ? <p className="rounded-[8px] border border-[#D7E2FF] bg-[#F5F7FF] px-4 py-3 text-center text-sm font-semibold text-[#3446B5]">Dev verify code: {devCode}</p> : null}
        {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}
        <PrimaryButton loading={isSubmitting}>{isSubmitting ? "Memverifikasi..." : "Verifikasi akun"}</PrimaryButton>
      </form>

      <p className="mt-12 text-center text-[17px] font-medium text-[#3E4975]">
        Kedaluwarsa dalam <span className="font-bold text-[#2F20FF]">10:00</span>
      </p>

      <div className="mt-11 grid gap-9">
        <InfoCallout title="Tidak menerima email?" text="Cek folder Spam atau Promotion Anda. Jika tetap tidak ada, silakan minta pengiriman ulang." />
        <button type="button" onClick={handleResend} disabled={isResending || !email} className="mx-auto flex items-center gap-3 text-[16px] font-medium text-[#3E4975] transition hover:text-[#2F20FF] disabled:cursor-not-allowed disabled:opacity-60">
          <span className="h-4 w-4 rounded-full border-2 border-[#3E4975] border-t-transparent" />
          {isResending ? "Mengirim..." : "Kirim ulang kode"} 
        </button>
        <SecondaryLinkButton href="/signup">Kembali ke pendaftaran</SecondaryLinkButton>
      </div>
    </AuthShell>
  );
}

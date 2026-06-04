"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthShell, CenterIcon, HelpAction, InfoCallout, PrimaryButton, SecondaryLinkButton, VerificationCodeInput } from "@/components/auth/auth-shell";
import { requestPasswordReset, verifyPasswordResetCode } from "@/lib/api-service";

export default function VerifyCodePage() {
  const router = useRouter();
  const t = useTranslations("AuthDesign.verifyCode");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setEmail(window.sessionStorage.getItem("narriv-reset-email") || "");
    setDevCode(window.sessionStorage.getItem("narriv-reset-dev-code"));
  }, []);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const joinedCode = code.join("");
    if (!email) {
      setApiError("Reset email tidak ditemukan. Mulai ulang proses reset password.");
      return;
    }
    if (!/^\d{6}$/.test(joinedCode)) {
      setApiError("Masukkan kode 6 digit.");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    try {
      const response = await verifyPasswordResetCode({ email, code: joinedCode });
      window.sessionStorage.setItem("narriv-reset-token", response.resetToken);
      window.sessionStorage.removeItem("narriv-reset-dev-code");
      router.push("/new-password");
    } catch {
      setApiError("Kode reset tidak valid atau sudah kedaluwarsa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setApiError(null);
    try {
      const response = await requestPasswordReset({ email });
      if (response.resetCode) {
        window.sessionStorage.setItem("narriv-reset-dev-code", response.resetCode);
        setDevCode(response.resetCode);
      }
      setCode(["", "", "", "", "", ""]);
    } catch {
      setApiError("Kode reset belum bisa dikirim ulang.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell visual="verification" topAction={<HelpAction />}>
      <CenterIcon variant="shield" />

      <div className="mx-auto mb-12 max-w-[620px] text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-4 text-[19px] font-medium leading-8 text-[#3E4975]">
          {t("subtitle")}
          <br />
          <span className="font-bold text-[#2F20FF]">{email || t("email")}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="grid gap-8">
        <VerificationCodeInput value={code} onChange={setCode} />
        {devCode ? <p className="rounded-[8px] border border-[#D7E2FF] bg-[#F5F7FF] px-4 py-3 text-center text-sm font-semibold text-[#3446B5]">Dev reset code: {devCode}</p> : null}
        {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}
        <PrimaryButton loading={isSubmitting}>{isSubmitting ? "Memverifikasi..." : "Verifikasi kode"}</PrimaryButton>
      </form>

      <p className="mt-12 text-center text-[17px] font-medium text-[#3E4975]">
        {t("expiresIn")} <span className="font-bold text-[#2F20FF]">10:00</span>
      </p>

      <div className="mt-11 grid gap-9">
        <InfoCallout title={t("infoTitle")} text={t("infoText")} />
        <button type="button" onClick={handleResend} disabled={isResending || !email} className="mx-auto flex items-center gap-3 text-[16px] font-medium text-[#3E4975] transition hover:text-[#2F20FF] disabled:cursor-not-allowed disabled:opacity-60">
          <span className="h-4 w-4 rounded-full border-2 border-[#3E4975] border-t-transparent" />
          {isResending ? "Mengirim..." : t("resendCode")} <span className="font-bold">(00:45)</span>
        </button>
        <SecondaryLinkButton href="/signup">{t("backToSignup")}</SecondaryLinkButton>
      </div>
    </AuthShell>
  );
}

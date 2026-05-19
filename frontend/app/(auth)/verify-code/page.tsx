"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthShell, CenterIcon, HelpAction, InfoCallout, SecondaryLinkButton, VerificationCodeInput } from "@/components/auth/auth-shell";

export default function VerifyCodePage() {
  const t = useTranslations("AuthDesign.verifyCode");
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  return (
    <AuthShell visual="verification" topAction={<HelpAction />}>
      <CenterIcon variant="shield" />

      <div className="mx-auto mb-12 max-w-[620px] text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-4 text-[19px] font-medium leading-8 text-[#3E4975]">
          {t("subtitle")}
          <br />
          <span className="font-bold text-[#2F20FF]">{t("email")}</span>
        </p>
      </div>

      <VerificationCodeInput value={code} onChange={setCode} />

      <p className="mt-12 text-center text-[17px] font-medium text-[#3E4975]">
        {t("expiresIn")} <span className="font-bold text-[#2F20FF]">10:00</span>
      </p>

      <div className="mt-11 grid gap-9">
        <InfoCallout title={t("infoTitle")} text={t("infoText")} />
        <button type="button" className="mx-auto flex items-center gap-3 text-[16px] font-medium text-[#3E4975] transition hover:text-[#2F20FF]">
          <span className="h-4 w-4 rounded-full border-2 border-[#3E4975] border-t-transparent" />
          {t("resendCode")} <span className="font-bold">(00:45)</span>
        </button>
        <SecondaryLinkButton href="/signup">{t("backToSignup")}</SecondaryLinkButton>
      </div>
    </AuthShell>
  );
}

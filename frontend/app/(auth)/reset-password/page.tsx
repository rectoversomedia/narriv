"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import * as z from "zod";
import { useState } from "react";
import { AuthInput, AuthShell, CenterIcon, Divider, HelpAction, InfoCallout, PrimaryButton, SecondaryLinkButton } from "@/components/auth/auth-shell";
import { FieldGroup } from "@/components/ui/field";
import { requestPasswordReset } from "@/lib/api-service";

type ResetFormValues = {
  email: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("AuthDesign.resetPassword");
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const resetSchema = z.object({
    email: z.email({ message: t("errors.invalidEmail") }),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ResetFormValues) => {
    setApiError(null);
    try {
      const response = await requestPasswordReset({ email: data.email });
      window.sessionStorage.setItem("narriv-reset-email", data.email.trim().toLowerCase());
      if (response.resetCode) window.sessionStorage.setItem("narriv-reset-dev-code", response.resetCode);
      setSubmitted(true);
      router.push("/verify-code");
    } catch {
      setApiError("Reset password belum bisa dimulai. Coba lagi sebentar.");
    }
  };

  return (
    <AuthShell visual="security" topAction={<HelpAction />}>
      <CenterIcon variant="lock" />

      <div className="mx-auto mb-11 max-w-[560px] text-center">
        <h1 className="text-[38px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-5 text-[19px] font-medium leading-8 text-[#3E4975]">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-8">
          <AuthInput label={t("email")} icon="email" type="email" autoComplete="email" placeholder={t("emailPlaceholder")} error={errors.email?.message} registration={register("email")} />

          {submitted ? <p className="rounded-[8px] border border-[#12B76A]/20 bg-[#ECFDF3] px-4 py-3 text-sm font-semibold text-[#027A48]">{t("submitted")}</p> : null}
          {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}

          <PrimaryButton loading={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</PrimaryButton>
        </FieldGroup>
      </form>

      <div className="mt-8 grid gap-8">
        <Divider label={t("divider")} />
        <SecondaryLinkButton href="/login">{t("backToLogin")}</SecondaryLinkButton>
        <InfoCallout title={t("infoTitle")} text={t("infoText")} />
      </div>
    </AuthShell>
  );
}

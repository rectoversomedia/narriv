"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { AuthShell, CenterIcon, Divider, HelpAction, PasswordInput, PasswordStrengthMeter, PrimaryButton, SecondaryLinkButton } from "@/components/auth/auth-shell";
import { FieldGroup } from "@/components/ui/field";
import { resetPasswordWithToken } from "@/lib/api-service";

type NewPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export default function NewPasswordPage() {
  const router = useRouter();
  const t = useTranslations("AuthDesign.newPassword");
  const [apiError, setApiError] = useState<string | null>(null);
  const newPasswordSchema = z.object({
    password: z.string()
      .min(10, { message: t("errors.passwordTooShort") })
      .regex(/[A-Z]/, { message: t("errors.passwordUppercase") })
      .regex(/[0-9]/, { message: t("errors.passwordNumber") })
      .regex(/[^A-Za-z0-9]/, { message: t("errors.passwordSymbol") }),
    confirmPassword: z.string().min(1, { message: t("errors.confirmRequired") }),
  }).refine((values) => values.password === values.confirmPassword, {
    message: t("errors.passwordMismatch"),
    path: ["confirmPassword"],
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: NewPasswordFormValues) => {
    const resetToken = window.sessionStorage.getItem("narriv-reset-token");
    if (!resetToken) {
      setApiError("Token reset tidak ditemukan. Mulai ulang proses reset password.");
      return;
    }

    setApiError(null);
    try {
      await resetPasswordWithToken({ resetToken, newPassword: values.password });
      window.sessionStorage.removeItem("narriv-reset-email");
      window.sessionStorage.removeItem("narriv-reset-token");
      window.sessionStorage.removeItem("narriv-reset-dev-code");
      router.push("/login");
    } catch {
      setApiError("Password belum bisa direset. Token mungkin sudah kedaluwarsa.");
    }
  };

  return (
    <AuthShell visual="security" topAction={<HelpAction />}>
      <CenterIcon variant="lock-check" />

      <div className="mx-auto mb-11 max-w-[520px] text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-5 text-[18px] font-medium leading-8 text-[#3E4975]">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-9">
          <div>
            <PasswordInput label={t("password")} autoComplete="new-password" placeholder={t("passwordPlaceholder")} error={errors.password?.message} registration={register("password")} />
            <PasswordStrengthMeter />
          </div>
          <div>
            <PasswordInput label={t("confirmPassword")} autoComplete="new-password" placeholder={t("confirmPasswordPlaceholder")} error={errors.confirmPassword?.message} registration={register("confirmPassword")} />
            <p className="mt-4 text-[15px] font-medium text-[#3E4975]">{t("confirmHelp")}</p>
          </div>

          {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}

          <PrimaryButton loading={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</PrimaryButton>
        </FieldGroup>
      </form>

      <div className="mt-8 grid gap-8">
        <Divider label={t("divider")} />
        <SecondaryLinkButton href="/login">{t("backToLogin")}</SecondaryLinkButton>
      </div>
    </AuthShell>
  );
}

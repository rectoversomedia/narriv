"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { AuthInput, AuthShell, Divider, PasswordInput, PasswordRequirements, PrimaryButton, SecurityFooter, SocialButtons } from "@/components/auth/auth-shell";
import { Field, FieldContent, FieldError, FieldGroup } from "@/components/ui/field";
import { registerWithPassword } from "@/lib/api-service";

type SignupFormValues = {
  name: string;
  email: string;
  company: string;
  role: string;
  password: string;
  terms: boolean;
};

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("AuthDesign.signup");
  const [apiError, setApiError] = useState<string | null>(null);
  const signupSchema = z.object({
    name: z.string().min(2, { message: t("errors.nameTooShort") }),
    email: z.email({ message: t("errors.invalidEmail") }),
    company: z.string().min(2, { message: t("errors.companyRequired") }),
    role: z.string(),
    password: z.string()
      .min(10, { message: t("errors.passwordTooShort") })
      .regex(/[A-Z]/, { message: t("errors.passwordUppercase") })
      .regex(/[0-9]/, { message: t("errors.passwordNumber") })
      .regex(/[^A-Za-z0-9]/, { message: t("errors.passwordSymbol") }),
    terms: z.boolean().refine((value) => value, { message: t("errors.termsRequired") }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", company: "", role: "", password: "", terms: true },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setApiError(null);

    try {
      const json = await registerWithPassword({ name: data.name, email: data.email, password: data.password });
      
      // Store email temporarily for verify page
      sessionStorage.setItem("narriv_verify_email", json.email);
      if (json.verificationCode) {
        sessionStorage.setItem("narriv_dev_verification_code", json.verificationCode);
      }
      
      router.push("/verify-email");
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status) {
        setApiError(status === 400 || status === 409 ? t("errors.emailRegistered") : t("errors.registrationFailed"));
        return;
      }
      setApiError(t("errors.backendUnavailable"));
    }
  };

  return (
    <AuthShell
      visual="features"
      topAction={
        <p className="text-[15px] font-medium text-[#111536]">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-[#2F20FF] hover:underline">{t("loginLink")}</Link>
        </p>
      }
    >
      <div className="mb-9">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-4 text-[19px] font-medium text-[#3E4975]">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-6">
          <AuthInput label={t("fullName")} icon="user" autoComplete="name" placeholder={t("fullNamePlaceholder")} error={errors.name?.message} registration={register("name")} />
          <AuthInput label={t("email")} icon="email" type="email" autoComplete="email" placeholder={t("emailPlaceholder")} error={errors.email?.message} registration={register("email")} />
          <AuthInput label={t("company")} icon="company" autoComplete="organization" placeholder={t("companyPlaceholder")} error={errors.company?.message} registration={register("company")} />
          <AuthInput label={t("role")} icon="role" autoComplete="organization-title" placeholder={t("rolePlaceholder")} registration={register("role")} />
          <div>
            <PasswordInput label={t("password")} autoComplete="new-password" placeholder={t("passwordPlaceholder")} error={errors.password?.message} registration={register("password")} />
            <PasswordRequirements />
          </div>

          <Field data-invalid={!!errors.terms} orientation="horizontal" className="items-start gap-3 text-[14px] font-medium text-[#111536]">
            <input id="signup-terms" type="checkbox" aria-invalid={!!errors.terms || undefined} className="mt-0.5 h-[18px] w-[18px] accent-[#2F20FF]" {...register("terms")} />
            <FieldContent className="text-[14px] font-medium leading-6 text-[#111536]">
              <span>
                {t("termsPrefix")} <button type="button" className="font-semibold text-[#2F20FF]">{t("terms")}</button> {t("termsMiddle")} <button type="button" className="font-semibold text-[#2F20FF]">{t("privacy")}</button>
              </span>
              <FieldError className="mt-1 text-[#F04438]">{errors.terms?.message}</FieldError>
            </FieldContent>
          </Field>

          {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}

          <PrimaryButton loading={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</PrimaryButton>
        </FieldGroup>
      </form>

      <div className="mt-7 grid gap-6">
        <Divider label={t("divider")} />
        <SocialButtons />
      </div>

      <div className="mt-10">
        <SecurityFooter />
      </div>
    </AuthShell>
  );
}

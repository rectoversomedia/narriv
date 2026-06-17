"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMemo, useState, Suspense } from "react";
import { AuthInput, AuthShell, Divider, LanguageSelector, PasswordInput, PrimaryButton, SecurityFooter, SocialButtons } from "@/components/auth/auth-shell";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { loginWithPassword } from "@/lib/api-service";
import { useAuthStore, type AuthUser } from "@/store/useAuthStore";

type LoginFormValues = {
  email: string;
  password: string;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("AuthDesign.login");
  const setSession = useAuthStore((state) => state.setSession);
  const [apiError, setApiError] = useState<string | null>(null);

  const oauthError = useMemo(() => {
    if (searchParams.get("error") === "oauth_failed") {
      return t("errors.loginFailed") || "Social login failed. Please try again or use password.";
    }
    return null;
  }, [searchParams, t]);

  const displayError = apiError ?? oauthError;
  const loginSchema = z.object({
    email: z.email({ message: t("errors.invalidEmail") }),
    password: z.string().min(1, { message: t("errors.passwordRequired") }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const finishLogin = (token: string, user: AuthUser, refreshToken?: string | null) => {
    setSession(token, user, refreshToken);
    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
  };

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);

    try {
      const json = await loginWithPassword({ email: data.email, password: data.password });
      finishLogin(json.token, {
        name: json.user.name,
        email: json.user.email,
        provider: "password",
        workspace: "Narriv",
      }, json.refreshToken);
    } catch (error) {
      const err = error as { status?: number; info?: { code?: string; email?: string } };
      
      if (err.info?.code === "EMAIL_NOT_VERIFIED") {
        window.sessionStorage.setItem("narriv_verify_email", err.info.email || data.email);
        router.push("/verify-email");
        return;
      }
      
      const status = err.status;
      if (status) {
        setApiError(status === 401 || status === 400 ? t("errors.invalidCredentials") : t("errors.loginFailed"));
        return;
      }
      setApiError(t("errors.backendUnavailable"));
    }
  };

    return (
    <AuthShell visual="dashboard" topAction={<LanguageSelector />}>
      <div className="mb-12 lg:hidden">
        <div className="flex items-center gap-3">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden">
            <Image src="/narriv-logo.svg" alt="Narriv Logo" fill sizes="64px" className="object-contain" priority />
          </span>
          <p className="text-3xl font-bold tracking-[-0.04em] text-[#111536]">Narriv</p>
        </div>
      </div>

      <div className="mb-12">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-5 text-[19px] font-medium text-[#3E4975]">{t("subtitle")}</p>
      </div>

      <form
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <FieldGroup className="gap-7">
          <AuthInput
            label={t("email")}
            icon="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            error={errors.email?.message}
            registration={register("email")}
          />
          <PasswordInput
            label={t("password")}
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            error={errors.password?.message}
            registration={register("password")}
          />

          {displayError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{displayError}</p> : null}

          <div className="flex items-center justify-between pt-1">
            <Field orientation="horizontal" className="w-auto items-center gap-3">
              <input id="remember-me" type="checkbox" defaultChecked className="h-[19px] w-[19px] accent-[#2F20FF]" />
              <FieldLabel htmlFor="remember-me" className="text-[16px] font-semibold text-[#111536]">{t("rememberMe")}</FieldLabel>
            </Field>
            <Link href="/reset-password" className="text-[16px] font-semibold text-[#2F20FF] hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>

          <PrimaryButton loading={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</PrimaryButton>
        </FieldGroup>
        </form>

        <div className="mt-8 grid gap-6">
          <Divider label={t("divider")} />
        <SocialButtons />
      </div>

      <p className="mt-10 text-center text-[16px] font-medium text-[#3E4975]">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-[#2F20FF] hover:underline">
          {t("signUp")}
        </Link>
      </p>

      <div className="mt-24">
        <SecurityFooter />
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2F20FF] border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

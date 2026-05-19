"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { AuthInput, AuthShell, Divider, LanguageSelector, PasswordInput, PrimaryButton, SecurityFooter, SocialButtons } from "@/components/auth/auth-shell";
import { useAuthStore, type AuthUser } from "@/store/useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("AuthDesign.login");
  const setSession = useAuthStore((state) => state.setSession);
  const [apiError, setApiError] = useState<string | null>(null);
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
    router.push("/");
  };

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
        credentials: "omit",
      });

      if (res.ok) {
        const json = await res.json() as { token: string; refreshToken?: string; user: { name: string; email: string } };
        finishLogin(json.token, {
          name: json.user.name,
          email: json.user.email,
          provider: "password",
          workspace: "Narriv",
        }, json.refreshToken);
        return;
      }

      await res.json().catch(() => ({}));
      setApiError(res.status === 401 || res.status === 400 ? t("errors.invalidCredentials") : t("errors.loginFailed"));
    } catch {
      setApiError(t("errors.backendUnavailable"));
    }
  };

  const showUnavailable = () => setApiError(t("errors.socialUnavailable"));

  const handleDemoLogin = () => {
    setApiError(null);
    finishLogin("demo-ui-session", {
      name: "Testing User",
      email: "testing@narriv.ai",
      provider: "password",
      workspace: "User Workspace",
    }, null);
  };

  return (
    <AuthShell visual="dashboard" topAction={<LanguageSelector />}>
      <div className="mb-12 lg:hidden">
        <p className="text-3xl font-bold tracking-[-0.04em] text-[#111536]">Narriv</p>
      </div>

      <div className="mb-12">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">{t("title")}</h1>
        <p className="mt-5 text-[19px] font-medium text-[#3E4975]">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
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

        {apiError ? <p className="rounded-[8px] border border-[#F04438]/20 bg-[#FFF5F4] px-4 py-3 text-sm font-medium text-[#B42318]">{apiError}</p> : null}

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-3 text-[16px] font-semibold text-[#111536]">
            <input type="checkbox" defaultChecked className="h-[19px] w-[19px] accent-[#2F20FF]" />
            {t("rememberMe")}
          </label>
          <Link href="/reset-password" className="text-[16px] font-semibold text-[#2F20FF] hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>

        <PrimaryButton loading={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</PrimaryButton>
      </form>

      <div className="mt-5 rounded-[10px] border border-[#DADAFE] bg-[#FBFAFF] p-4">
        <button
          type="button"
          onClick={handleDemoLogin}
          className="flex h-[52px] w-full items-center justify-center rounded-[8px] border border-[#3B20EA] bg-white text-[16px] font-bold text-[#2F20FF] transition hover:bg-[#F6F4FF]"
        >
          {t("demoButton")}
        </button>
        <p className="mt-3 text-center text-[13px] font-medium leading-5 text-[#53608C]">
          {t("demoNote")}
        </p>
      </div>

      <div className="mt-8 grid gap-6">
        <Divider label={t("divider")} />
        <SocialButtons onClick={showUnavailable} />
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

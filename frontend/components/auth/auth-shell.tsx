"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ChangeEvent, ClipboardEvent, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/store/useUiStore";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
  HelpCircle,
  Info,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

type AuthVisual = "dashboard" | "features" | "security" | "verification";

const iconMap = {
  email: Mail,
  password: LockKeyhole,
  user: User,
  company: Building2,
  role: BriefcaseBusiness,
};

export type AuthInputIcon = keyof typeof iconMap;

type AuthShellProps = {
  visual: AuthVisual;
  children: ReactNode;
  topAction?: ReactNode;
  email?: string;
};

export function AuthShell({ visual, children, topAction, email }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-white font-sans text-[#111536] lg:grid lg:grid-cols-[minmax(520px,1fr)_minmax(560px,1fr)]">
      <BrandPanel visual={visual} email={email} />
      <section className="relative flex min-h-dvh items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        {topAction ? <div className="absolute right-6 top-6 sm:right-10 lg:right-14 lg:top-10">{topAction}</div> : null}
        <div className="w-full max-w-[520px] pt-12 lg:pt-0">{children}</div>
      </section>
    </main>
  );
}

function BrandPanel({ visual, email }: { visual: AuthVisual; email?: string }) {
  const t = useTranslations("AuthDesign");
  const isVerification = visual === "verification";

  return (
    <aside className="relative hidden min-h-dvh flex-col overflow-hidden bg-[#020733] px-16 py-16 text-white lg:flex">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(80,60,255,0.22),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(60,40,200,0.18),transparent_35%),linear-gradient(180deg,#020733_0%,#040830_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[25%] bg-[radial-gradient(ellipse_at_center_bottom,rgba(60,50,220,0.28),transparent_70%)]" />

      {/* Top section: logo */}
      <div className="relative z-10 shrink-0 text-center">
        <NarrivLogo />
      </div>

      {/* Center section: headline + description — vertically centered */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        {isVerification ? (
          <div>
            <h1 className="text-[42px] font-bold leading-[1.15] tracking-[-0.04em] text-white">
              {t("brand.verifyTitle")}
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-white/70">
              {t("brand.verifyDescription")}
              <br />
              <span className="font-semibold text-[#6B7FFF]">{email || t("sampleEmail")}</span>
            </p>
          </div>
        ) : (
          <div>
            <div className="space-y-1">
              <p className="text-[42px] font-bold leading-[1.1] tracking-[-0.04em] text-white">
                {t("brand.line1")}
              </p>
              <p className="text-[42px] font-bold leading-[1.1] tracking-[-0.04em] text-white">
                {t("brand.line2")}
              </p>
              <p className="bg-gradient-to-r from-[#8D4DFF] via-[#6B63FF] to-[#22B8FF] bg-clip-text text-[42px] font-bold leading-[1.1] tracking-[-0.04em] text-transparent">
                {t("brand.line3")}
              </p>
            </div>
            <p className="mt-8 text-lg leading-relaxed text-white/60">
              {visual === "features"
                ? t("brand.featuresDescription")
                : t("brand.description")}
            </p>
          </div>
        )}
      </div>

      {/* Bottom section: divider + footer */}
      <div className="relative z-10 shrink-0 space-y-6 text-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(100,80,255,0.35)] to-transparent" />
        <p className="text-sm font-medium tracking-wide text-white/35">
          &copy; {new Date().getFullYear()} Narriv &mdash; Narrative Intelligence Platform
        </p>
      </div>
    </aside>
  );
}

function NarrivLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/narriv-logo-final.png"
      alt="Narriv"
      width={240}
      height={160}
      className="h-auto w-auto object-contain"
    />
  );
}

export function LanguageSelector() {
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const t = useTranslations("AuthDesign");
  const cooldownRef = useRef(false);

  const handleToggleLanguage = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(() => {
        toggleLanguage();
      });
    } else {
      toggleLanguage();
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        cooldownRef.current = false;
      });
    });
  };

  return (
    <button type="button" onClick={handleToggleLanguage} className="flex items-center gap-3 rounded-full px-3 py-2 text-[15px] font-semibold text-[#1C2452] hover:bg-[#F6F8FF]">
      <Globe2 size={21} className={cn("transition-transform duration-500", language === "id" ? "rotate-0" : "rotate-180")} />
      <span key={language} className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-200">
        {language === "id" ? t("language.id") : t("language.en")}
      </span>
      <ChevronDown size={18} />
    </button>
  );
}

export function HelpAction() {
  const t = useTranslations("AuthDesign");

  return (
    <div className="flex items-center gap-2 text-[15px] font-medium text-[#344054]">
      <HelpCircle size={20} className="text-[#344054]" />
      <span>{t("help.needHelp")}</span>
      <Link href="mailto:support@narriv.ai" className="font-semibold text-[#2F20FF] hover:underline">
        {t("help.contact")}
      </Link>
    </div>
  );
}

type AuthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  icon: AuthInputIcon;
  error?: string;
  registration?: UseFormRegisterReturn;
  rightAddon?: ReactNode;
  onValueChange?: (value: string) => void;
};

export function AuthInput({ label, icon, error, registration, rightAddon, onValueChange, className = "", onChange, ...props }: AuthInputProps) {
  const Icon = iconMap[icon];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void registration?.onChange(event);
    onChange?.(event);
    onValueChange?.(event.currentTarget.value);
  };

  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="mb-1 block text-[15px] font-semibold text-[#111536]">{label}</FieldLabel>
      <span className={`flex h-[59px] items-center gap-4 rounded-[8px] border bg-white px-5 transition focus-within:border-[#3D2DFF] focus-within:shadow-[0_0_0_3px_rgba(61,45,255,0.08)] ${error ? "border-[#F04438]" : "border-[#D6DDEC]"}`}>
        <Icon size={22} className="shrink-0 text-[#344054]" strokeWidth={1.8} />
        <Input
          {...props}
          {...registration}
          aria-invalid={!!error || undefined}
          onChange={handleChange}
          className={`h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-[17px] font-medium text-[#27325F] shadow-none outline-none placeholder:text-[#68739F] focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 ${className}`}
        />
        {rightAddon}
      </span>
      <FieldError className="mt-0 text-sm font-medium text-[#F04438]">{error}</FieldError>
    </Field>
  );
}

type PasswordInputProps = Omit<AuthInputProps, "type" | "rightAddon" | "icon"> & {
  showLabel?: string;
  hideLabel?: string;
};

export function PasswordInput({ showLabel = "Tampilkan kata sandi", hideLabel = "Sembunyikan kata sandi", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthInput
      {...props}
      icon="password"
      type={visible ? "text" : "password"}
      rightAddon={
        <button
          type="button"
          aria-label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((value) => !value)}
          className="rounded-full p-1 text-[#344054] transition hover:bg-[#F4F6FB]"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
}

export function PrimaryButton({ children, loading }: { children: ReactNode; loading?: boolean }) {
  return (
    <Button
      type="submit"
      disabled={loading}
      size="lg"
      className="flex h-[58px] w-full items-center justify-center rounded-[8px] bg-gradient-to-r from-[#2819FF] to-[#6B2EFF] text-[18px] font-semibold text-white shadow-[0_14px_34px_rgba(63,43,255,0.28)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </Button>
  );
}

export function SecondaryLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-[58px] w-full items-center justify-center gap-3 rounded-[8px] border border-[#D6DDEC] bg-white text-[17px] font-semibold text-[#111536] transition hover:border-[#AAB4D5] hover:bg-[#FBFCFF]">
      <ArrowLeft size={21} />
      {children}
    </Link>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-px flex-1 bg-[#D8DEEA]" />
      <span className="text-[15px] font-medium text-[#3E4975]">{label}</span>
      <div className="h-px flex-1 bg-[#D8DEEA]" />
    </div>
  );
}

export function SocialButtons() {
  const t = useTranslations("AuthDesign");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return (
    <div className="grid gap-4">
      <SocialButton icon={<GoogleLogo />} label={t("social.google")} href={`${apiUrl}/auth/google`} />
      <DemoButton />
    </div>
  );
}

function DemoButton() {
  const t = useTranslations("AuthDesign");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    // SECURITY FIX: Demo mode now requires server-side authentication
    // Direct localStorage manipulation bypasses security - we must validate at server
    setIsLoading(true);

    try {
      // Call frontend proxy route — it calls the backend and sets the narriv_auth cookie
      // on narriv.digital so the middleware can read it.
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Demo login failed");
      }

      const data = await response.json();

      // Store auth state from server response
      const zustandState = {
        state: {
          token: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem("narriv-auth", JSON.stringify(zustandState));

      // Store legacy keys for page-load restoration
      localStorage.setItem("narriv_demo_user", JSON.stringify(data.user));
      localStorage.setItem("narriv_demo_token", data.accessToken);
      localStorage.setItem("narriv_demo_refresh_token", data.refreshToken);

      // SECURITY FIX: Dispatch custom event WITH server-provided tokens
      // Tokens must come from server-side validation
      window.dispatchEvent(new CustomEvent("narriv_demo_login", {
        detail: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }
      }));

      // Redirect to dashboard
      window.location.href = "/?demo=true";
    } catch (error) {
      console.error("Demo login error:", error);
      // Show error message to user
      alert(error instanceof Error ? error.message : "Demo login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDemoLogin}
      disabled={isLoading}
      className="relative flex h-[58px] w-full items-center justify-center gap-3 rounded-[8px] border border-[#D6DDEC] bg-gradient-to-r from-[#10B981]/10 to-[#059669]/10 text-[18px] font-semibold text-[#059669] transition hover:border-[#10B981] hover:from-[#10B981]/20 hover:to-[#059669]/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span className="absolute left-9 flex h-6 w-6 items-center justify-center">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </span>
      ) : (
        <span className="absolute left-9 flex h-6 w-6 items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </span>
      )}
      {isLoading ? "Loading..." : (t("social.demo") || "Try Demo")}
    </button>
  );
}

function SocialButton({ icon, label, href }: { icon: ReactNode; label: string; href?: string }) {
  if (href) {
    return (
      <a href={href} className="relative flex h-[58px] w-full items-center justify-center rounded-[8px] border border-[#D6DDEC] bg-white text-[18px] font-semibold text-[#111536] transition hover:border-[#AAB4D5] hover:bg-[#FBFCFF]">
        <span className="absolute left-9 flex h-6 w-6 items-center justify-center">{icon}</span>
        {label}
      </a>
    );
  }

  return (
    <button type="button" className="relative flex h-[58px] w-full items-center justify-center rounded-[8px] border border-[#D6DDEC] bg-white text-[18px] font-semibold text-[#111536] transition hover:border-[#AAB4D5] hover:bg-[#FBFCFF]">
      <span className="absolute left-9 flex h-6 w-6 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}



function GoogleLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#4285F4" />
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#EA4335" />
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#34A853" />
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.801 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#FBBC05" />
    </svg>
  );
}

export function SecurityFooter() {
  const t = useTranslations("AuthDesign");

  return (
    <div className="flex items-center justify-center gap-3 text-[15px] font-medium text-[#3E4975]">
      <ShieldCheck size={19} />
      {t("security.footer")}
    </div>
  );
}

export function InfoCallout({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-center gap-5 rounded-[8px] border border-[#E0E4F1] bg-[#FBFAFF] p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#2F20FF] text-[#2F20FF]">
        <Info size={24} />
      </span>
      <span>
        <span className="block text-[16px] font-bold text-[#111536]">{title}</span>
        <span className="mt-1 block text-[15px] text-[#68739F]">{text}</span>
      </span>
    </div>
  );
}

export function CenterIcon({ variant }: { variant: "lock" | "lock-check" | "shield" }) {
  return (
    <div className="mx-auto mb-9 flex h-[136px] w-[136px] items-center justify-center rounded-full bg-[#F0EFFF] text-[#3626F6]">
      {variant === "shield" ? <ShieldCheck size={70} strokeWidth={1.8} /> : <LockKeyhole size={70} strokeWidth={1.8} />}
      {variant === "lock-check" ? <span className="-ml-6 mt-12 flex h-10 w-10 items-center justify-center rounded-full bg-[#3626F6] text-white"><Check size={24} strokeWidth={3} /></span> : null}
    </div>
  );
}

export function PasswordRequirements() {
  const t = useTranslations("AuthDesign");
  const items = [t("passwordReq.length"), t("passwordReq.uppercase"), t("passwordReq.number"), t("passwordReq.special")];
  return (
    <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-[13px] font-medium text-[#111536]">
      {items.map((item) => (
        <span key={item} className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#1DB45A] text-[#1DB45A]">
            <Check size={11} strokeWidth={3} />
          </span>
          {item}
        </span>
      ))}
    </div>
  );
}

export function PasswordStrengthMeter() {
  const t = useTranslations("AuthDesign");

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-[15px] font-medium text-[#3E4975]">
        <span>{t("passwordStrength.label")}</span>
        <span className="font-bold text-[#E11D48]">{t("passwordStrength.weak")}</span>
        <span className="ml-auto h-1.5 w-[78px] rounded-full bg-[#E11D48]" />
        <span className="h-1.5 w-[78px] rounded-full bg-[#CAD1DF]" />
        <span className="h-1.5 w-[78px] rounded-full bg-[#CAD1DF]" />
      </div>
      <p className="mt-4 text-[15px] leading-6 text-[#3E4975]">
        {t("passwordStrength.help")}
      </p>
    </div>
  );
}

type CodeInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function VerificationCodeInput({ value, onChange }: CodeInputProps) {
  const t = useTranslations("AuthDesign");
  const setAt = (index: number, nextValue: string) => {
    const next = [...value];
    next[index] = nextValue.replace(/\D/g, "").slice(-1);
    onChange(next);
  };

  const focusInput = (index: number) => {
    const input = document.querySelector<HTMLInputElement>(`[data-code-index="${index}"]`);
    input?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    onChange(Array.from({ length: 6 }, (_, index) => digits[index] ?? ""));
    focusInput(Math.min(digits.length, 5));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-6">
      {value.map((digit, index) => (
        <input
          key={index}
          data-code-index={index}
          value={digit}
          inputMode="numeric"
          maxLength={1}
          onPaste={handlePaste}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onChange={(event) => {
            setAt(index, event.currentTarget.value);
            if (event.currentTarget.value && index < 5) focusInput(index + 1);
          }}
          aria-label={t("verification.digitLabel", { digit: index + 1 })}
          className="h-[74px] rounded-[10px] border border-[#D6DDEC] bg-white text-center text-[34px] font-semibold text-[#2F20FF] outline-none transition focus:border-[#2F20FF] focus:shadow-[0_0_0_3px_rgba(47,32,255,0.08)]"
        />
      ))}
    </div>
  );
}

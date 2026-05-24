"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChangeEvent, ClipboardEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
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
};

export function AuthShell({ visual, children, topAction }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-white font-sans text-[#111536] lg:grid lg:grid-cols-[minmax(520px,1fr)_minmax(560px,1fr)]">
      <BrandPanel visual={visual} />
      <section className="relative flex min-h-dvh items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        {topAction ? <div className="absolute right-6 top-6 sm:right-10 lg:right-14 lg:top-10">{topAction}</div> : null}
        <div className="w-full max-w-[520px] pt-12 lg:pt-0">{children}</div>
      </section>
    </main>
  );
}

function BrandPanel({ visual }: { visual: AuthVisual }) {
  const t = useTranslations("AuthDesign");
  const isVerification = visual === "verification";

  return (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-[#020733] px-12 py-14 text-white lg:flex lg:flex-col xl:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(50,103,255,0.28),transparent_27%),radial-gradient(circle_at_82%_88%,rgba(70,95,255,0.42),transparent_35%),linear-gradient(180deg,#020733_0%,#050946_48%,#080066_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[radial-gradient(ellipse_at_center,rgba(69,95,255,0.44),transparent_68%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <NarrivLogo />

        <div className={isVerification ? "mt-36 max-w-[560px]" : "mt-24 max-w-[560px]"}>
          {isVerification ? (
            <>
              <h1 className="text-[42px] font-bold leading-[1.2] tracking-[-0.04em] text-white">
                {t("brand.verifyTitle")}
              </h1>
              <p className="mt-7 max-w-[500px] text-xl leading-8 text-white/72">
                {t("brand.verifyDescription")}
                <br />
                <span className="font-semibold text-[#6B7FFF]">{t("sampleEmail")}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[40px] font-bold leading-[1.18] tracking-[-0.04em] xl:text-[44px]">
                {t("brand.line1")}
                <br />
                {t("brand.line2")}
                <br />
                <span className="bg-gradient-to-r from-[#8D4DFF] via-[#6B63FF] to-[#22B8FF] bg-clip-text text-transparent">
                  {t("brand.line3")}
                </span>
              </h1>
              <p className="mt-6 max-w-[520px] text-xl leading-8 text-white/72">
                {visual === "features"
                  ? t("brand.featuresDescription")
                  : t("brand.description")}
              </p>
            </>
          )}
        </div>

        <div className="relative mt-auto flex-1 flex flex-col justify-center min-h-[460px] pb-10">
          <WorldMapGlow />
          {visual === "dashboard" && (
            <Image src="/auth/dashboard-v2.svg" alt="Dashboard Illustration" width={680} height={400} className="w-full max-w-[680px] h-auto object-contain z-10 mx-auto" priority />
          )}
          {visual === "features" && (
            <Image src="/auth/features-v2.svg" alt="Feature Illustration" width={680} height={400} className="w-full max-w-[680px] h-auto object-contain z-10 mx-auto scale-[1.15]" priority />
          )}
          {visual === "security" && (
            <Image src="/auth/security-v2.svg" alt="Security Illustration" width={560} height={400} className="w-full max-w-[560px] h-auto object-contain z-10 mx-auto scale-[1.15]" priority />
          )}
          {visual === "verification" && (
            <Image src="/auth/verification-v2.svg" alt="Verification Illustration" width={560} height={400} className="w-full max-w-[560px] h-auto object-contain z-10 mx-auto" priority />
          )}
        </div>
      </div>
    </aside>
  );
}

function NarrivLogo() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark className="h-[112px] w-[112px]" priority />
      <span className="text-[64px] font-bold tracking-[-0.04em] text-white">Narriv</span>
    </div>
  );
}

function LogoMark({ className = "h-16 w-16", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      <Image src="/narriv-logo.svg" alt="Narriv Logo" fill sizes="112px" className="object-contain" priority={priority} />
    </span>
  );
}

function WorldMapGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-[-70px] bottom-[-76px] h-[300px] opacity-80">
      <div className="absolute inset-x-0 bottom-0 h-[210px] bg-[radial-gradient(ellipse_at_center,rgba(65,67,255,0.48),transparent_66%)] blur-sm" />
      <div className="absolute bottom-12 left-10 h-[130px] w-[80%] rounded-[50%] border-t border-[#244CFF]/35" />
      <div className="absolute inset-x-0 bottom-10 h-[170px] bg-[repeating-radial-gradient(circle_at_center,rgba(49,91,255,0.85)_0_1px,transparent_1px_8px)] opacity-55 [clip-path:polygon(8%_58%,18%_50%,28%_58%,36%_42%,47%_49%,55%_38%,64%_53%,77%_42%,90%_58%,84%_75%,65%_72%,52%_83%,38%_69%,22%_80%)]" />
      {[8, 22, 41, 58, 74, 89].map((left, index) => (
        <span key={left} className="absolute bottom-8 w-px bg-linear-to-t from-[#6B4DFF] to-transparent" style={{ left: `${left}%`, height: `${90 + index * 12}px` }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#8B5CFF] shadow-[0_0_18px_#8B5CFF]" />
        </span>
      ))}
    </div>
  );
}

export function LanguageSelector() {
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const t = useTranslations("AuthDesign");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const activeLang = mounted ? language : "en";

  return (
    <button type="button" onClick={() => startTransition(toggleLanguage)} className="flex items-center gap-3 rounded-full px-3 py-2 text-[15px] font-semibold text-[#1C2452] transition-colors duration-200 hover:bg-[#F6F8FF]">
      <Globe2 size={21} />
      {activeLang === "id" ? t("language.id") : t("language.en")}
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

export function SocialButtons({ onClick }: { onClick?: () => void }) {
  const t = useTranslations("AuthDesign");

  return (
    <div className="grid gap-4">
      <SocialButton icon={<AppleLogo />} label={t("social.apple")} onClick={onClick} />
      <SocialButton icon={<GoogleLogo />} label={t("social.google")} onClick={onClick} />
      <SocialButton icon={<MicrosoftLogo />} label={t("social.microsoft")} onClick={onClick} />
    </div>
  );
}

function SocialButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative flex h-[58px] w-full items-center justify-center rounded-[8px] border border-[#D6DDEC] bg-white text-[18px] font-semibold text-[#111536] transition hover:border-[#AAB4D5] hover:bg-[#FBFCFF]">
      <span className="absolute left-9 flex h-6 w-6 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

function AppleLogo() {
  return (
    <svg width="23" height="27" viewBox="0 0 23 27" aria-hidden="true" className="fill-black">
      <path d="M18.9 14.2c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-.9 0-2.4-1.1-4-1C6.5 7.3 4.6 8.5 3.6 10.2c-2.2 3.8-.6 9.5 1.6 12.6 1.1 1.5 2.3 3.2 3.9 3.1 1.6-.1 2.2-1 4-1s2.3 1 4 1c1.7 0 2.8-1.5 3.8-3 1.2-1.8 1.7-3.5 1.7-3.6-.1-.1-3.7-1.5-3.7-5.1ZM15.9 5.1c.9-1.1 1.4-2.5 1.3-4-1.3.1-2.8.8-3.7 1.9-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.9-.7 3.7-1.7Z" />
    </svg>
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

function MicrosoftLogo() {
  return (
    <span className="grid h-6 w-6 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#F35325]" />
      <span className="bg-[#81BC06]" />
      <span className="bg-[#05A6F0]" />
      <span className="bg-[#FFBA08]" />
    </span>
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
      <LogoMark className="h-24 w-24" />
      {variant === "lock-check" ? <span className="-ml-5 mt-16 flex h-9 w-9 items-center justify-center rounded-full bg-[#3626F6] text-white"><Check size={22} strokeWidth={3} /></span> : null}
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

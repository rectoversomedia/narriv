"use client";

import { useTranslations } from "next-intl";
import { pickL } from "@/lib/use-l";
import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowRight, BarChart3, Bell, Check, ChevronDown, Headphones, Lightbulb, Mail, Shield, Users, X, type LucideIcon } from "lucide-react";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useToast } from "@/components/ui/toast";
import { launchDashboard, signalDashboardReady } from "@/lib/launch";
import { OnboardingAside, OnboardingProgress } from "./onboarding-chrome";
import {
  createOnboardingWorkspace,
  createOnboardingSources,
  createOnboardingNotifications,
  createOnboardingTeam,
  createOnboardingKeywords,
  getSourceTemplates,
  completeOnboarding,
  getCurrentUser,
  getWorkspaceSettings,
} from "@/lib/api-service";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

type ProfileData = {
  name: string;
  role: string;
  company: string;
  industry: string;
  mainGoal: string;
  goals: string[];
};

// Only what the backend acts on (workspace notification settings); in-app notifications are always on.
type NotificationsData = {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  escalationEnabled: boolean;
  reminderEnabled: boolean;
};

// Each workspace's first three active keywords are checked every hour (backend SCHEDULED_KEYWORDS_PER_WORKSPACE).
const MAX_ONBOARDING_KEYWORDS = 3;

type OnboardingData = {
  profile: ProfileData;
  keywords: string[];
  sources: Array<{ name: string; type: string; sourceTemplateId?: string }>;
  notifications: NotificationsData;
  team: Array<{ email: string; role: string }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Banking & Financial Services",
  "Leasing & Financing",
  "Insurance",
  "Telecommunications",
  "E-commerce & Retail",
  "Technology & Software",
  "Healthcare & Pharmaceuticals",
  "Automotive",
  "Food & Beverage",
  "Manufacturing",
  "Energy & Utilities",
  "Real Estate",
  "Education",
  "Government & Public Sector",
  "Media & Entertainment",
  "Transportation & Logistics",
  "Hospitality & Tourism",
  "Professional Services",
  "Agriculture",
  "Other",
];

const INDUSTRY_ID: Record<string, string> = {
  "Banking & Financial Services": "Perbankan & Jasa Keuangan",
  "Leasing & Financing": "Leasing & Pembiayaan",
  "E-commerce & Retail": "E-commerce & Ritel",
  "Technology & Software": "Teknologi & Perangkat Lunak",
  "Healthcare & Pharmaceuticals": "Kesehatan & Farmasi",
  "Food & Beverage": "Makanan & Minuman",
  "Energy & Utilities": "Energi & Utilitas",
  "Real Estate": "Properti",
  "Government & Public Sector": "Pemerintahan & Sektor Publik",
  "Media & Entertainment": "Media & Hiburan",
  "Transportation & Logistics": "Transportasi & Logistik",
  "Hospitality & Tourism": "Perhotelan & Pariwisata",
  "Professional Services": "Jasa Profesional",
};

const ROLES = [
  "CEO / Founder",
  "Marketing Manager",
  "Brand Manager",
  "Communications Manager",
  "PR Manager",
  "Social Media Manager",
  "Customer Experience Manager",
  "Business Intelligence Analyst",
  "Risk Manager",
  "Compliance Officer",
  "Sales Manager",
  "Product Manager",
  "Data Analyst",
  "Other",
];

const DEFAULT_GOALS: Array<{
  id: string;
  labelKey: string;
  descKey: string;
  icon: LucideIcon;
  color: string;
}> = [
  { id: "brand", labelKey: "goalBrand", descKey: "goalBrandDesc", icon: BarChart3, color: "#10B981" },
  { id: "competitor", labelKey: "goalCompetitor", descKey: "goalCompetitorDesc", icon: Users, color: "#3B82F6" },
  { id: "market", labelKey: "goalMarket", descKey: "goalMarketDesc", icon: Lightbulb, color: "#F59E0B" },
  { id: "complaints", labelKey: "goalService", descKey: "goalServiceDesc", icon: Headphones, color: "#EF4444" },
];

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const toast = useToast();

  const [step, setStep] = useState<Step | "processing">(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const [data, setData] = useState<OnboardingData>({
    profile: {
      name: "",
      role: "",
      company: "",
      industry: "",
      mainGoal: "",
      goals: ["brand"],
    },
    keywords: [],
    sources: [],
    notifications: {
      emailEnabled: true,
      whatsappEnabled: false,
      escalationEnabled: true,
      reminderEnabled: true,
    },
    team: [],
  });

  // Prefill registration data (name, company, role)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionName = sessionStorage.getItem("narriv_signup_name");
      const sessionCompany = sessionStorage.getItem("narriv_signup_company");
      const sessionRole = sessionStorage.getItem("narriv_signup_role");

      if (sessionName || sessionCompany) {
        setData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            name: prev.profile.name || sessionName || "",
            company: prev.profile.company || sessionCompany || "",
            role: prev.profile.role || sessionRole || prev.profile.role,
          },
        }));
      }
    }

    // Also query current user and workspace settings from backend as authoritative source
    getCurrentUser().then((u) => {
      if (u?.name) {
        setData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            name: prev.profile.name || u.name,
          },
        }));
      }
    });

    getWorkspaceSettings().then((ws) => {
      if (ws?.brandName && !ws.brandName.endsWith("'s Workspace")) {
        setData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            company: prev.profile.company || ws.brandName || "",
          },
        }));
      }
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<ProfileData>) => {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...updates } }));
  }, []);

  const updateKeywords = useCallback((keywords: string[]) => {
    setData((prev) => ({ ...prev, keywords }));
  }, []);

  const updateSources = useCallback((sources: OnboardingData["sources"]) => {
    setData((prev) => ({ ...prev, sources }));
  }, []);

  const updateNotifications = useCallback((updates: Partial<NotificationsData>) => {
    setData((prev) => ({ ...prev, notifications: { ...prev.notifications, ...updates } }));
  }, []);

  const validateStep = useCallback(
    (s: Step): string | null => {
      if (s === 1) {
        if (!data.profile.name.trim()) return pickL("Please enter your full name.", "Isi nama lengkap Anda.");
        if (!data.profile.role) return pickL("Please select your role.", "Pilih jabatan Anda.");
        if (!data.profile.company.trim()) return pickL("Please enter your company or brand name.", "Isi nama perusahaan atau brand.");
        if (!data.profile.industry) return pickL("Please select your industry.", "Pilih industri.");
        return null;
      }
      if (s === 2) {
        if (data.keywords.length === 0) return pickL("Please add at least one keyword to monitor.", "Tambahkan minimal satu kata kunci untuk dipantau.");
        return null;
      }
      if (s === 3) {
        if (data.sources.length === 0) return pickL("Please select at least one data source.", "Pilih minimal satu sumber data.");
        return null;
      }
      return null;
    },
    [data]
  );

  const next = useCallback(() => {
    const current = step === "processing" ? 5 : step;
    const err = validateStep(current);
    if (err) {
      toast.error(err);
      return;
    }
    if (step === 5) {
      setStep("processing");
      return;
    }
    const nextStep = (step as number) + 1;
    setStep(nextStep as Step);
  }, [step, validateStep, toast]);

  const back = useCallback(() => {
    if (step === "processing") { setStep(5); return; }
    if (step === 1) return;
    const prevStep = (step as number) - 1;
    setStep(prevStep as Step);
  }, [step]);

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const brandName = data.profile.company.trim() || "My Workspace";
      const industry = data.profile.industry || "General";
      const workspace = await createOnboardingWorkspace({
        brandName,
        industry,
        timezone: "Asia/Jakarta",
      });
      if (!workspace?.id) throw new Error(pickL("Failed to configure workspace.", "Workspace gagal disiapkan."));

      const result = await completeOnboarding({ workspaceId: workspace.id, triggerIngestion: false });
      if (result?.success) {
        toast.success(pickL("Welcome to Narriv! You can configure more settings later.", "Selamat datang di Narriv! Pengaturan lain bisa diubah nanti."));
        launchDashboard(() => { window.location.href = "/"; });
      } else {
        throw new Error(pickL("Failed to complete onboarding.", "Onboarding gagal diselesaikan."));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : pickL("Failed to skip onboarding.", "Gagal melewati onboarding.");
      toast.error(msg);
      setIsSubmitting(false);
    }
  }, [data.profile, toast]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setProcessingProgress(0);

    const progressSteps = [10, 25, 40, 55, 70, 85, 95];
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < progressSteps.length) {
        setProcessingProgress(progressSteps[stepIdx++]);
      }
    }, 600);

    try {
      const workspace = await createOnboardingWorkspace({
        brandName: data.profile.company,
        industry: data.profile.industry,
        timezone: "Asia/Jakarta",
      });
      if (!workspace?.id) throw new Error(pickL("Failed to create workspace.", "Workspace gagal dibuat."));

      await createOnboardingKeywords({ workspaceId: workspace.id, keywords: data.keywords });
      await createOnboardingSources({ workspaceId: workspace.id, sources: data.sources });
      await createOnboardingNotifications({
        workspaceId: workspace.id,
        emailEnabled: data.notifications.emailEnabled,
        whatsappEnabled: data.notifications.whatsappEnabled,
        escalationNotifications: data.notifications.escalationEnabled,
        reminderNotifications: data.notifications.reminderEnabled,
      });
      if (data.team.length > 0) {
        await createOnboardingTeam({ workspaceId: workspace.id, members: data.team });
      }

      const result = await completeOnboarding({ workspaceId: workspace.id, triggerIngestion: true });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (result?.success) {
        setTimeout(() => launchDashboard(() => { window.location.href = "/"; }), 400);
      } else {
        throw new Error(pickL("Setup incomplete.", "Pengaturan belum selesai."));
      }
    } catch (e) {
      clearInterval(progressInterval);
      const msg = e instanceof Error ? e.message : pickL("An unexpected error occurred.", "Terjadi kesalahan. Coba lagi.");
      setSubmitError(msg);
      setIsSubmitting(false);
      setProcessingProgress(0);
      toast.error(msg);
    }
  }, [data, toast]);

  useEffect(() => {
    if (step === "processing" && !isSubmitting) {
      handleSubmit();
    }
  }, [step, isSubmitting, handleSubmit]);

  // A new Google account lands here straight from sign-in; let the welcome screen lift onto the first step.
  useEffect(() => {
    signalDashboardReady();
  }, []);

  const current = step === "processing" ? 6 : (step as number);

  return (
    <div className="min-h-dvh bg-[#F4F6FD] text-[#111536] lg:grid lg:grid-cols-[minmax(360px,420px)_1fr]">
      <OnboardingAside current={current} />

      <div className="relative min-w-0 overflow-hidden">
        {/* Soft light canvas: two colour washes and a faint dot grid, so the form never sits on flat grey. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(70,95,255,0.12),transparent_40%),radial-gradient(circle_at_0%_100%,rgba(192,132,252,0.12),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(70,95,255,0.10)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(180deg,black,transparent_70%)]" />

        <header className="relative z-20 flex h-16 items-center justify-between px-4 sm:px-6 lg:h-20 lg:justify-end lg:px-10">
          <img src="/brand/logo-h.webp" alt="Narriv" width={120} height={80} className="w-[96px] object-contain lg:hidden" />
          {/* Opens the help page in a new tab so the onboarding progress stays here. */}
          <a
            href="/help#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-white/80 px-4 text-sm font-semibold text-[#3E4975] shadow-[0_0_0_1px_#E3E7F3] backdrop-blur transition-colors hover:text-[#3B52F5]"
          >
            <Headphones size={15} />
            <span className="sm:hidden">{pickL("Help", "Bantuan")}</span>
            <span className="hidden sm:inline">{pickL("Need Help?", "Butuh Bantuan?")}</span>
          </a>
        </header>

        <main className="relative z-10 mx-auto max-w-[860px] px-4 pb-10 sm:px-6 lg:px-10">
          <OnboardingProgress current={current} />

          <div key={step} className="onb-step-in mt-6 lg:mt-2">
            {step === "processing" ? (
              <ProcessingStep
                progress={processingProgress}
                submitError={submitError}
                onRetry={handleSubmit}
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] bg-white border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
                <div className="p-5 sm:p-8 lg:p-10">
                  {step === 1 && (
                    <ProfileStep data={data.profile} onChange={updateProfile} />
                  )}
                  {step === 2 && (
                    <KeywordsStep keywords={data.keywords} onChange={updateKeywords} brand={data.profile.company} />
                  )}
                  {step === 3 && (
                    <SourcesStep sources={data.sources} onChange={updateSources} />
                  )}
                  {step === 4 && (
                    <NotificationsStep
                      data={data.notifications}
                      onChange={updateNotifications}
                    />
                  )}
                  {step === 5 && <PreviewStep data={data} />}
                </div>

                <div className="sticky bottom-0 flex items-center justify-between border-t border-[#EEF0F8] bg-white/95 px-5 py-4 backdrop-blur sm:px-8 sm:py-5 lg:px-10">
                  {step === 1 ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#5F6B94] transition-colors hover:text-[#3B52F5] disabled:opacity-50"
                      onClick={handleSkip}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? pickL("Skipping…", "Melewati…") : pickL("Skip for Now", "Lewati Dulu")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={back}
                      className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-[#3E4975] shadow-[0_0_0_1px_#DDE3EF] transition-colors hover:text-[#3B52F5] hover:shadow-[0_0_0_1px_#465FFF]"
                    >
                      {pickL("Back", "Kembali")}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={next}
                    className="group flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#465FFF] to-[#6D4DFF] px-7 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(70,95,255,0.8)] transition-all hover:shadow-[0_14px_28px_-10px_rgba(70,95,255,0.95)] active:scale-[0.98]"
                  >
                    {step === 5 ? pickL("Finish Setup", "Selesaikan") : pickL("Continue", "Lanjut")}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[13px] font-medium text-[#7A84A6] lg:hidden">
            {pickL("Your data is encrypted and private to your workspace.", "Data Anda terenkripsi dan hanya untuk workspace Anda.")}
          </p>
        </main>
      </div>
    </div>
  );
}

// ─── Step 1: Profile & Goals ──────────────────────────────────────────────────

function ProfileStep({
  data,
  onChange,
}: {
  data: ProfileData;
  onChange: (u: Partial<ProfileData>) => void;
}) {
  const t = useTranslations("OnboardingDesign.profile");

  const toggleGoal = (id: string) => {
    const current = data.goals;
    if (current.includes(id)) {
      if (current.length === 1) return;
      onChange({ goals: current.filter((g) => g !== id) });
    } else {
      if (current.length >= 3) return;
      onChange({ goals: [...current, id] });
    }
  };

  const mainGoalMax = 200;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#5F6B94]">{t("desc")}</p>
      </div>

      {/* Personal Info */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{pickL("Personal Information", "Data diri")}</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label={t("name")} required htmlFor="onb-name">
            <input id="onb-name"
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={pickL("e.g. Sarah Johnson", "mis. Rani Pratiwi")}
              className="form-input"
              autoComplete="name"
            />
          </FormField>

          <FormField label={t("role")} required htmlFor="onb-role">
            <Select id="onb-role"
              value={data.role}
              onChange={(v) => onChange({ role: v })}
              placeholder={pickL("Select your role", "Pilih jabatan")}
            >
              {/* The title typed at sign-up stays selected even when it is not in the list. */}
              {data.role && !ROLES.includes(data.role) ? <option value={data.role}>{data.role}</option> : null}
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="border-t border-[#F0F2FA]" />

      {/* Company Info */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{pickL("Company / Brand", "Perusahaan / Brand")}</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label={t("company")} required htmlFor="onb-company">
            <input id="onb-company"
              type="text"
              value={data.company}
              onChange={(e) => onChange({ company: e.target.value })}
              placeholder={pickL("e.g. FIFGROUP", "mis. Bank Arunika")}
              className="form-input"
              autoComplete="organization"
            />
          </FormField>

          <FormField label={t("industry")} required htmlFor="onb-industry">
            <Select id="onb-industry"
              value={data.industry}
              onChange={(v) => onChange({ industry: v })}
              placeholder={pickL("Select your industry", "Pilih industri")}
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{INDUSTRY_ID[ind] ? pickL(ind, INDUSTRY_ID[ind]) : ind}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label={t("mainGoal")} htmlFor="onb-goal">
          <textarea id="onb-goal"
            value={data.mainGoal}
            onChange={(e) => {
              if (e.target.value.length <= mainGoalMax) {
                onChange({ mainGoal: e.target.value });
              }
            }}
            placeholder={pickL("Describe what you want to achieve with Narriv. This helps AI personalize your experience...", "Ceritakan apa yang ingin dicapai dengan Narriv, misalnya memantau isu layanan dan reputasi brand.")}
            rows={4}
            className="form-textarea"
          />
          <p className="mt-1.5 text-right text-xs font-medium text-[#647099]">
            {data.mainGoal.length}/{mainGoalMax}
          </p>
        </FormField>
      </div>

      <div className="border-t border-[#F0F2FA]" />

      {/* Goals */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#111536]">{t("goalsTitle")}</h2>
          <p className="mt-1 text-sm font-medium text-[#5F6B94]">{t("goalsDesc")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {DEFAULT_GOALS.map((goal) => {
            const selected = data.goals.includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
                  selected
                    ? "border-[#465FFF] bg-[#F8F6FF] shadow-[0_0_0_3px_rgba(47,32,255,0.08)]"
                    : "border-[#E8EAF6] bg-white hover:border-[#B8BDD8]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    selected ? "border-[#465FFF] bg-[#465FFF]" : "border-[#D6DDEC] bg-white"
                  }`}
                >
                  {selected && <Check size={12} strokeWidth={3} className="text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <goal.icon size={16} style={{ color: goal.color }} />
                    <p className="text-sm font-bold text-[#111536]">
                      {t(goal.labelKey as any)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[#5F6B94] leading-relaxed">
                    {t(goal.descKey as any)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-medium text-[#647099]">
          {pickL("Select 1–3 goals. You can change this anytime in Settings.", "Pilih 1–3 tujuan. Bisa diubah kapan saja di Pengaturan.")}
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Keywords ─────────────────────────────────────────────────────────

function KeywordsStep({
  keywords,
  onChange,
  brand = "",
}: {
  keywords: string[];
  onChange: (kw: string[]) => void;
  brand?: string;
}) {
  const t = useTranslations("OnboardingDesign.keywords");
  const [input, setInput] = useState("");

  // Suggestions built from the brand itself: generic terms ("Market News") pull in unrelated articles and cost.
  const base = brand.trim();
  const suggestions = base ? [base, `${base} keluhan`, `${base} layanan`, `${base} aplikasi`, `${base} promo`] : [];

  const add = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase()) || keywords.length >= MAX_ONBOARDING_KEYWORDS) return;
    onChange([...keywords, trimmed]);
    setInput("");
  };

  const remove = (kw: string) => onChange(keywords.filter((k) => k !== kw));

  const full = keywords.length >= MAX_ONBOARDING_KEYWORDS;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(input); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#5F6B94]">{t("desc")}</p>
      </div>

      <div className="space-y-3">
        <FormField label={t("inputLabel")} htmlFor="onb-keyword">
          <div className="flex gap-3">
            <input id="onb-keyword"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={full}
              placeholder={full ? pickL("All 3 added", "Sudah 3 kata kunci") : base ? pickL(`e.g. ${base}`, `mis. ${base}`) : t("placeholder")}
              className="form-input min-w-0 flex-1 disabled:bg-[#F8F9FF]"
            />
            <button
              type="button"
              onClick={() => add(input)}
              disabled={!input.trim() || full}
              className="flex h-12 items-center gap-2 rounded-xl border border-[#D6DDEC] bg-white px-5 text-sm font-semibold text-[#3E4975] transition-colors hover:border-[#465FFF] hover:text-[#3B52F5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("add")}
            </button>
          </div>
        </FormField>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#647099]">{t("examples")}</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              disabled={keywords.some((k) => k.toLowerCase() === s.toLowerCase()) || full}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8EAF6] bg-white px-3 py-1.5 text-xs font-semibold text-[#3E4975] transition-colors hover:border-[#465FFF] hover:text-[#3B52F5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{t("yourKeywords")}</h2>
          <span className="text-xs font-semibold text-[#647099]">{keywords.length}/{MAX_ONBOARDING_KEYWORDS}</span>
        </div>
        <p className="text-xs font-medium text-[#5F6B94]">
          {pickL("Each keyword is checked every hour. You can change them anytime in Settings.", "Tiap kata kunci dicek setiap jam. Bisa diganti kapan saja di Pengaturan.")}
        </p>

        {keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E8EAF6] py-12 text-center">
            <p className="mt-3 text-sm font-semibold text-[#647099]">{pickL("No keywords added yet", "Belum ada kata kunci")}</p>
            <p className="mt-1 text-xs font-medium text-[#C4C9E2]">{pickL("Type a keyword above and press Enter to add", "Ketik kata kunci di atas lalu tekan Enter")}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <KeywordPill key={kw} label={kw} onRemove={() => remove(kw)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#F0EFFF] bg-[#FAF8FF] p-4">
        <Lightbulb size={18} className="mt-0.5 shrink-0 text-[#6E44E8]" />
        <div>
          <p className="text-sm font-bold text-[#111536]">{t("tipTitle")}</p>
          <p className="mt-0.5 text-xs font-medium text-[#5F6B94] leading-relaxed">{t("tipText")}</p>
        </div>
      </div>
    </div>
  );
}

function KeywordPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#E8EAF6] bg-white px-4 py-2 text-sm font-semibold text-[#3E4975] shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-[#647099] hover:text-[#C81E1E] transition-colors">
        <X size={14} />
      </button>
    </span>
  );
}

// ─── Step 3: Sources ────────────────────────────────────────────────────────────

function SourcesStep({
  sources,
  onChange,
}: {
  sources: OnboardingData["sources"];
  onChange: (s: OnboardingData["sources"]) => void;
}) {
  const t = useTranslations("OnboardingDesign.sources");
  const [templates, setTemplates] = useState<Record<string, Array<{ id: string; name: string; category: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [wantSocial, setWantSocial] = useState(() => sources.some((s) => s.type === "social"));

  useEffect(() => {
    getSourceTemplates()
      .then((r) => { if (r?.grouped) setTemplates(r.grouped); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // News is always collected. Social media is saved as a request: the Narriv team switches it on per workspace.
  // Synced in an effect so onChange never sees stale templates.
  useEffect(() => {
    if (loading) return;
    const pick = (cat: string) => (templates[cat] || []).map((tmpl) => ({ name: tmpl.name, type: tmpl.category, sourceTemplateId: tmpl.id }));
    const next = [...pick("news"), ...(wantSocial ? pick("social") : [])];
    onChange(next.length ? next : [{ name: "Berita Online", type: "news" }]);
  }, [wantSocial, templates, loading, onChange]);

  const live = [
    { key: "news", name: pickL("Online news", "Berita online"), desc: pickL("Every Indonesian news portal: Kompas, Detik, CNN Indonesia, Tempo and more.", "Semua portal berita Indonesia: Kompas, Detik, CNN Indonesia, Tempo, dan lainnya.") },
    { key: "youtube", name: "YouTube", desc: pickL("Videos that mention your keywords.", "Video yang menyebut kata kunci Anda.") },
  ];
  const social = ["instagram", "tiktok", "x", "facebook"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#5F6B94]">{pickL("Where Narriv looks for your keywords.", "Tempat Narriv mencari kata kunci Anda.")}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{pickL("On from day one", "Langsung aktif")}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {live.map((src) => (
            <div key={src.key} className="flex items-start gap-4 rounded-xl bg-[#F8F6FF] p-5 shadow-[0_0_0_1px_rgba(70,95,255,0.18)]">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm">
                <PlatformIcon platform={src.key} className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#111536]">{src.name}</p>
                  <span className="rounded-full bg-[#E8F7F0] px-2 py-0.5 text-[11px] font-bold text-[#047857]">{pickL("Every hour", "Tiap jam")}</span>
                </div>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[#5F6B94]">{src.desc}</p>
              </div>
              <Check size={18} strokeWidth={3} className="mt-1 shrink-0 text-[#465FFF]" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{pickL("Social media", "Media sosial")}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={wantSocial}
          onClick={() => setWantSocial((v) => !v)}
          className={`flex w-full flex-col gap-4 rounded-xl p-5 text-left transition-all sm:flex-row sm:items-center ${
            wantSocial ? "bg-[#F8F6FF] shadow-[0_0_0_1px_rgba(70,95,255,0.18)]" : "bg-white shadow-[0_0_0_1px_#E8EAF6] hover:shadow-[0_0_0_1px_#B8BDD8]"
          }`}
        >
          <span className="flex shrink-0 -space-x-2">
            {social.map((key) => (
              <span key={key} className="flex size-10 items-center justify-center rounded-full bg-white p-2 shadow-sm ring-2 ring-white">
                <PlatformIcon platform={key} className="size-5" />
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#111536]">Instagram, TikTok, X, Facebook</span>
            <span className="mt-1 block text-xs font-medium leading-relaxed text-[#5F6B94]">
              {pickL("Switched on by the Narriv team for your plan. Turn this on and we will contact you.", "Diaktifkan tim Narriv sesuai paket Anda. Nyalakan ini dan kami akan menghubungi Anda.")}
            </span>
          </span>
          <span className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs font-bold text-[#3E4975]">{wantSocial ? pickL("Requested", "Diminta") : pickL("Request", "Minta")}</span>
            <ToggleSwitch active={wantSocial} onChange={() => setWantSocial((v) => !v)} />
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Notifications ─────────────────────────────────────────────────

function NotificationsStep({
  data,
  onChange,
}: {
  data: NotificationsData;
  onChange: (u: Partial<NotificationsData>) => void;
}) {
  const t = useTranslations("OnboardingDesign.notifications");

  const rows = [
    { key: "emailEnabled" as const, icon: Mail, title: pickL("Email for important alerts", "Email untuk peringatan penting"), desc: pickL("Critical and high alerts go to your inbox.", "Peringatan kritis dan tinggi dikirim ke inbox Anda.") },
    { key: "escalationEnabled" as const, icon: Shield, title: pickL("Escalations", "Eskalasi"), desc: pickL("Tell me when an alert is escalated to a higher level.", "Beri tahu saya saat peringatan dinaikkan ke level lebih tinggi.") },
    { key: "reminderEnabled" as const, icon: Bell, title: pickL("Deadline reminders", "Pengingat tenggat"), desc: pickL("Remind the owner before a task passes its deadline.", "Ingatkan penanggung jawab sebelum tugas lewat tenggat.") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#5F6B94]">{pickL("Alerts always appear in Narriv. Choose what else reaches you.", "Peringatan selalu muncul di Narriv. Pilih apa lagi yang dikirim ke Anda.")}</p>
      </div>

      <div className="grid gap-3">
        {rows.map(({ key, icon: Icon, title, desc }) => (
          <div
            key={key}
            className={`flex items-center gap-4 rounded-xl p-5 transition-all ${data[key] ? "bg-[#F8F6FF] shadow-[0_0_0_1px_rgba(70,95,255,0.18)]" : "bg-white shadow-[0_0_0_1px_#E8EAF6]"}`}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${data[key] ? "bg-[#465FFF] text-white" : "bg-[#F0F2FA] text-[#647099]"}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#111536]">{title}</p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-[#5F6B94]">{desc}</p>
            </div>
            <ToggleSwitch active={data[key]} onChange={() => onChange({ [key]: !data[key] })} />
          </div>
        ))}
      </div>

      <p className="text-xs font-medium text-[#647099]">
        {pickL("WhatsApp and Telegram are coming soon. Slack, Teams and webhooks can be connected later in Settings.", "WhatsApp dan Telegram segera hadir. Slack, Teams, dan webhook bisa disambungkan nanti di Pengaturan.")}
      </p>
    </div>
  );
}

function ToggleSwitch({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#465FFF] focus:ring-offset-2 ${
        active ? "bg-[#465FFF]" : "bg-[#D6DDEC]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Step 5: Preview ─────────────────────────────────────────────────────────

function PreviewStep({ data }: { data: OnboardingData }) {
  const t = useTranslations("OnboardingDesign.preview");
  const socialRequested = data.sources.some((s) => s.type === "social");
  const sent = [data.notifications.emailEnabled && "Email", data.notifications.escalationEnabled && pickL("Escalations", "Eskalasi"), data.notifications.reminderEnabled && pickL("Reminders", "Pengingat")].filter(Boolean) as string[];

  const tiles = [
    { value: data.keywords.length, label: pickL("keywords, checked hourly", "kata kunci, dicek tiap jam") },
    { value: 2, label: pickL("sources live now", "sumber langsung aktif") },
    { value: sent.length, label: pickL("notifications on", "notifikasi aktif") },
  ];

  const next = [
    { when: pickL("In about a minute", "Sekitar 1 menit"), what: pickL("The first news and YouTube results arrive and are scored for sentiment.", "Berita dan YouTube pertama masuk dan dinilai sentimennya.") },
    { when: pickL("Every hour", "Setiap jam"), what: pickL("Narriv checks again and groups mentions into issues.", "Narriv mengecek lagi dan mengelompokkan percakapan jadi isu.") },
    { when: pickL("When something spikes", "Saat ada lonjakan"), what: data.notifications.emailEnabled ? pickL("An alert appears in Narriv and in your email.", "Peringatan muncul di Narriv dan email Anda.") : pickL("An alert appears in Narriv.", "Peringatan muncul di Narriv.") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{pickL("Ready to start", "Siap dimulai")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#5F6B94]">{t("readyText")}</p>
      </div>

      {/* The brand, the way it will look at the top of the dashboard. */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] px-5 pb-5 pt-6 text-center text-white">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[160px] w-[420px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-30 blur-[80px]" />
        <p className="relative text-[11px] font-black uppercase tracking-[0.16em] text-white/60">{pickL("Monitoring", "Pemantauan")}</p>
        <p className="relative mt-1 truncate text-[26px] font-black tracking-[-0.02em]">{data.profile.company || "—"}</p>
        <div className="relative mt-3 flex flex-wrap justify-center gap-1.5">
          {data.keywords.map((kw) => (
            <span key={kw} className="rounded-full bg-white/[0.12] px-3 py-1 text-[13px] font-semibold">{kw}</span>
          ))}
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl bg-white px-2 py-3 text-[#111536]">
              <p className="text-[26px] font-black leading-none">{tile.value}</p>
              <p className="mt-1.5 text-[11px] font-semibold leading-tight text-[#5F6B94]">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#647099]">{pickL("What happens next", "Yang terjadi setelah ini")}</h2>
        <ol className="space-y-2">
          {next.map((step, i) => (
            <li key={step.when} className="flex items-start gap-3 rounded-xl bg-[#FAFBFF] px-4 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#465FFF] text-[12px] font-black text-white">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#111536]">{step.when}</span>
                <span className="block text-xs font-medium leading-relaxed text-[#5F6B94]">{step.what}</span>
              </span>
            </li>
          ))}
        </ol>
        {socialRequested ? (
          <p className="text-xs font-medium text-[#5F6B94]">{pickL("Social media: requested. The Narriv team will contact you to switch it on.", "Media sosial: sudah diminta. Tim Narriv akan menghubungi Anda untuk mengaktifkannya.")}</p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Processing Step ─────────────────────────────────────────────────────────

function ProcessingStep({
  progress,
  submitError,
  onRetry,
}: {
  progress: number;
  submitError: string | null;
  onRetry: () => void;
}) {
  const t = useTranslations("OnboardingDesign.processing");

  const steps = [
    { label: pickL("Creating workspace", "Membuat workspace"), done: progress >= 10 },
    { label: pickL("Adding keywords", "Menambah kata kunci"), done: progress >= 40 },
    { label: pickL("Setting up sources", "Menyiapkan sumber"), done: progress >= 55 },
    { label: pickL("Configuring notifications", "Mengatur notifikasi"), done: progress >= 70 },
    { label: pickL("Launching dashboard", "Membuka dashboard"), done: progress >= 95 },
  ];

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="relative">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#E6EAF2] bg-white shadow-sm">
          <img src="/brand/logo-h.webp" alt="Narriv" width={144} height={96} className="object-contain" />
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
      <p className="mt-3 max-w-md text-sm font-medium text-[#5F6B94] leading-relaxed">{t("desc")}</p>

      <div className="mt-8 w-full max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#647099]">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0F2FA]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  s.done ? "bg-[#10B981]" : "border border-[#D6DDEC] bg-white"
                }`}
              >
                {s.done && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className={`text-xs font-semibold ${s.done ? "text-[#047857]" : "text-[#647099]"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-[#C81E1E]">{submitError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-[#EF4444] bg-white px-6 py-3 text-sm font-semibold text-[#C81E1E] transition-colors hover:bg-[#FFF5F5]"
          >
            {pickL("Try Again", "Coba lagi")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function FormField({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block" htmlFor={htmlFor}>
        <span className="text-sm font-semibold text-[#3E4975]">
          {label}
          {required && <span className="ml-1 text-[#C81E1E]">*</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  placeholder,
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className="form-select w-full appearance-none pr-10"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#647099]"
      />
    </div>
  );
}

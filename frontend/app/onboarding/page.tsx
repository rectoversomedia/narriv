"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Globe2,
  Hash,
  Headphones,
  Lightbulb,
  Mail,
  MessageCircle,
  Mic,
  Newspaper,
  Plus,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  createOnboardingWorkspace,
  createOnboardingSources,
  createOnboardingNotifications,
  createOnboardingTeam,
  createOnboardingKeywords,
  getSourceTemplates,
  completeOnboarding,
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

type NotificationsData = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  alertSpike: boolean;
  alertNegative: boolean;
  alertViral: boolean;
  alertComplaint: boolean;
  realtimeEnabled: boolean;
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
};

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
  const t = useTranslations("OnboardingDesign");
  const toast = useToast();
  const router = useRouter();

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
      inAppEnabled: true,
      telegramEnabled: false,
      whatsappEnabled: false,
      alertSpike: true,
      alertNegative: true,
      alertViral: true,
      alertComplaint: true,
      realtimeEnabled: true,
      dailyEnabled: true,
      weeklyEnabled: false,
    },
    team: [],
  });

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
        if (!data.profile.name.trim()) return "Please enter your full name.";
        if (!data.profile.role) return "Please select your role.";
        if (!data.profile.company.trim()) return "Please enter your company or brand name.";
        if (!data.profile.industry) return "Please select your industry.";
        return null;
      }
      if (s === 2) {
        if (data.keywords.length === 0) return "Please add at least one keyword to monitor.";
        return null;
      }
      if (s === 3) {
        if (data.sources.length === 0) return "Please select at least one data source.";
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
      if (!workspace?.id) throw new Error("Failed to create workspace.");

      await createOnboardingKeywords({ workspaceId: workspace.id, keywords: data.keywords });
      await createOnboardingSources({ workspaceId: workspace.id, sources: data.sources });
      await createOnboardingNotifications({
        workspaceId: workspace.id,
        emailEnabled: data.notifications.emailEnabled,
        whatsappEnabled: data.notifications.whatsappEnabled,
        escalationNotifications: data.notifications.alertNegative,
        reminderNotifications: data.notifications.dailyEnabled,
      });
      if (data.team.length > 0) {
        await createOnboardingTeam({ workspaceId: workspace.id, members: data.team });
      }

      const result = await completeOnboarding({ workspaceId: workspace.id, triggerIngestion: true });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (result?.success) {
        setTimeout(() => router.push("/"), 800);
      } else {
        throw new Error("Setup incomplete.");
      }
    } catch (e) {
      clearInterval(progressInterval);
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      setSubmitError(msg);
      setIsSubmitting(false);
      setProcessingProgress(0);
      toast.error(msg);
    }
  }, [data, router, toast]);

  useEffect(() => {
    if (step === "processing" && !isSubmitting) {
      handleSubmit();
    }
  }, [step, isSubmitting, handleSubmit]);

  return (
    <div className="min-h-dvh bg-[#F8F9FF] text-[#111536]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E8EAF6] bg-white/80 backdrop-blur-md px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Image src="/narriv-logo.png" alt="Narriv" width={32} height={32} />
          <span className="text-[20px] font-bold tracking-[-0.04em] text-[#111536]">Narriv</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#68739F]">
            {step === "processing" ? 5 : step} of 5
          </span>
          <div className="h-6 w-px bg-[#D6DDEC]" />
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-full border border-[#D6DDEC] bg-white px-4 text-sm font-semibold text-[#3E4975] transition-colors hover:border-[#2F20FF] hover:text-[#2F20FF]"
          >
            Need help?
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {step !== "processing" && <StepIndicator current={step as Step} />}

        <div className="mt-8">
          {step === "processing" ? (
            <ProcessingStep
              progress={processingProgress}
              submitError={submitError}
              onRetry={handleSubmit}
            />
          ) : (
            <div className="rounded-2xl border border-[#E8EAF6] bg-white shadow-sm">
              <div className="p-8 lg:p-10">
                {step === 1 && (
                  <ProfileStep data={data.profile} onChange={updateProfile} />
                )}
                {step === 2 && (
                  <KeywordsStep keywords={data.keywords} onChange={updateKeywords} />
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

              <div className="flex items-center justify-between border-t border-[#F0F2FA] px-8 py-6 lg:px-10">
                {step === 1 ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#68739F] transition-colors hover:text-[#2F20FF]"
                    onClick={() => next()}
                  >
                    Skip for now
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={back}
                    className="flex h-11 items-center gap-2 rounded-xl border border-[#D6DDEC] bg-white px-6 text-sm font-semibold text-[#3E4975] transition-colors hover:border-[#2F20FF] hover:text-[#2F20FF]"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={next}
                  className="flex h-11 items-center gap-3 rounded-xl bg-gradient-to-r from-[#2F20FF] to-[#6B2EFF] px-8 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(47,32,255,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(47,32,255,0.4)] active:scale-[0.98]"
                >
                  {step === 5 ? "Finish Setup" : "Continue"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm font-medium text-[#9BA3C2]">
          <ShieldCheck size={15} className="text-[#10B981]" />
          Your data is safe with Narriv. We protect your privacy and information security.
        </p>
      </main>
    </div>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const t = useTranslations("OnboardingDesign.steps");
  const steps = [
    { label: t("profile"), num: 1 },
    { label: t("keywords"), num: 2 },
    { label: t("sources"), num: 3 },
    { label: t("notifications"), num: 4 },
    { label: t("preview"), num: 5 },
  ];

  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                s.num < current
                  ? "bg-[#2F20FF] text-white"
                  : s.num === current
                  ? "border-2 border-[#2F20FF] bg-white text-[#2F20FF]"
                  : "border-2 border-[#D6DDEC] bg-white text-[#9BA3C2]"
              }`}
            >
              {s.num < current ? <Check size={14} strokeWidth={3} /> : s.num}
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap hidden sm:block ${
                s.num === current ? "text-[#2F20FF]" : s.num < current ? "text-[#3E4975]" : "text-[#9BA3C2]"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-5 h-px w-8 sm:w-16 ${s.num < current ? "bg-[#2F20FF]" : "bg-[#E8EAF6]"}`}
            />
          )}
        </div>
      ))}
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
        <p className="mt-1.5 text-sm font-medium text-[#68739F]">{t("desc")}</p>
      </div>

      {/* Personal Info */}
      <div className="space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">Personal Information</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label={t("name")} required>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Sarah Johnson"
              className="form-input"
              autoComplete="name"
            />
          </FormField>

          <FormField label={t("role")} required>
            <Select
              value={data.role}
              onChange={(v) => onChange({ role: v })}
              placeholder="Select your role"
            >
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
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">Company / Brand</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label={t("company")} required>
            <input
              type="text"
              value={data.company}
              onChange={(e) => onChange({ company: e.target.value })}
              placeholder="e.g. FIFGROUP"
              className="form-input"
              autoComplete="organization"
            />
          </FormField>

          <FormField label={t("industry")} required>
            <Select
              value={data.industry}
              onChange={(v) => onChange({ industry: v })}
              placeholder="Select your industry"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label={t("mainGoal")}>
          <textarea
            value={data.mainGoal}
            onChange={(e) => {
              if (e.target.value.length <= mainGoalMax) {
                onChange({ mainGoal: e.target.value });
              }
            }}
            placeholder="Describe what you want to achieve with Narriv. This helps AI personalize your experience..."
            rows={4}
            className="form-textarea"
          />
          <p className="mt-1.5 text-right text-xs font-medium text-[#9BA3C2]">
            {data.mainGoal.length}/{mainGoalMax}
          </p>
        </FormField>
      </div>

      <div className="border-t border-[#F0F2FA]" />

      {/* Goals */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#111536]">{t("goalsTitle")}</h2>
          <p className="mt-1 text-sm font-medium text-[#68739F]">{t("goalsDesc")}</p>
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
                    ? "border-[#2F20FF] bg-[#F8F6FF] shadow-[0_0_0_3px_rgba(47,32,255,0.08)]"
                    : "border-[#E8EAF6] bg-white hover:border-[#B8BDD8]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    selected ? "border-[#2F20FF] bg-[#2F20FF]" : "border-[#D6DDEC] bg-white"
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
                  <p className="mt-1 text-xs font-medium text-[#68739F] leading-relaxed">
                    {t(goal.descKey as any)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-medium text-[#9BA3C2]">
          Select 1–3 goals. You can change this anytime in Settings.
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Keywords ─────────────────────────────────────────────────────────

function KeywordsStep({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (kw: string[]) => void;
}) {
  const t = useTranslations("OnboardingDesign.keywords");
  const [input, setInput] = useState("");

  const suggestions = ["Brand Indonesia", "Customer Service", "Viral", "Competitor", "Market News"];

  const add = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= 50) return;
    onChange([...keywords, trimmed]);
    setInput("");
  };

  const remove = (kw: string) => onChange(keywords.filter((k) => k !== kw));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(input); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#68739F]">{t("desc")}</p>
      </div>

      <div className="space-y-3">
        <FormField label={t("inputLabel")}>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              className="form-input flex-1"
            />
            <button
              type="button"
              onClick={() => add(input)}
              disabled={!input.trim()}
              className="flex h-12 items-center gap-2 rounded-xl border border-[#D6DDEC] bg-white px-5 text-sm font-semibold text-[#3E4975] transition-colors hover:border-[#2F20FF] hover:text-[#2F20FF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              {t("add")}
            </button>
          </div>
        </FormField>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#9BA3C2]">{t("examples")}</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              disabled={keywords.includes(s) || keywords.length >= 50}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8EAF6] bg-white px-3 py-1.5 text-xs font-semibold text-[#3E4975] transition-colors hover:border-[#2F20FF] hover:text-[#2F20FF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">Your Keywords</h2>
          <span className="text-xs font-semibold text-[#9BA3C2]">{keywords.length}/50</span>
        </div>

        {keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E8EAF6] py-12 text-center">
            <Hash size={32} className="text-[#D6DDEC]" />
            <p className="mt-3 text-sm font-semibold text-[#9BA3C2]">No keywords added yet</p>
            <p className="mt-1 text-xs font-medium text-[#C4C9E2]">Type a keyword above and press Enter to add</p>
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
        <Lightbulb size={18} className="mt-0.5 shrink-0 text-[#8B5CFF]" />
        <div>
          <p className="text-sm font-bold text-[#111536]">{t("tipTitle")}</p>
          <p className="mt-0.5 text-xs font-medium text-[#68739F] leading-relaxed">{t("tipText")}</p>
        </div>
      </div>
    </div>
  );
}

function KeywordPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#E8EAF6] bg-white px-4 py-2 text-sm font-semibold text-[#3E4975] shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
      {label}
      <button type="button" onClick={onRemove} className="text-[#9BA3C2] hover:text-[#EF4444] transition-colors">
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
  const [templates, setTemplates] = useState<
    Record<string, Array<{ id: string; name: string; description: string | null; category: string }>>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState<string[]>(["news", "social"]);

  const categoryIcons: Record<string, LucideIcon> = {
    news: Globe2,
    social: Share2,
    forum: MessageCircle,
    review: ShoppingCart,
    blog: Newspaper,
    podcast: Mic,
  };

  useEffect(() => {
    getSourceTemplates()
      .then((r) => { if (r?.grouped) setTemplates(r.grouped); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (cat: string) => {
    let newCats: string[];
    if (selectedCats.includes(cat)) {
      if (selectedCats.length === 1) return; // keep at least one
      newCats = selectedCats.filter((c) => c !== cat);
    } else {
      newCats = [...selectedCats, cat];
    }
    setSelectedCats(newCats);

    const newSources: OnboardingData["sources"] = [];
    newCats.forEach((catName) => {
      (templates[catName] || []).forEach((tmpl) => {
        newSources.push({ name: tmpl.name, type: tmpl.category, sourceTemplateId: tmpl.id });
      });
    });
    onChange(newSources);
  };

  const categories = useMemo(() => Object.keys(templates), [templates]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#68739F]">{t("desc")}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">Quick Select by Category</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat] || Globe2;
            const active = selectedCats.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "border-[#2F20FF] bg-[#2F20FF] text-white shadow-[0_2px_8px_rgba(47,32,255,0.25)]"
                    : "border-[#E8EAF6] bg-white text-[#3E4975] hover:border-[#B8BDD8]"
                }`}
              >
                <Icon size={15} />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                <span className="opacity-60">({templates[cat]?.length ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">{t("choose")}</h2>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-[#F0F2FA] bg-[#F8F9FF] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {categories.flatMap((cat) =>
              (templates[cat] || []).map((tmpl) => {
                const Icon = categoryIcons[cat] || Globe2;
                const isActive = selectedCats.includes(cat);
                return (
                  <SourceCard
                    key={tmpl.id}
                    icon={Icon}
                    title={tmpl.name}
                    desc={tmpl.description ?? `${cat} source`}
                    active={isActive}
                    onToggle={() => toggleCategory(cat)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#E8EAF6] bg-[#FAFBFF] px-6 py-4">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-[#2F20FF]" />
          <span className="text-sm font-bold text-[#111536]">
            {sources.length} source{sources.length !== 1 ? "s" : ""} selected
          </span>
        </div>
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...new Set(sources.map((s) => s.type))].map((type) => {
              const Icon = categoryIcons[type];
              return (
                <span key={type} className="inline-flex items-center gap-1.5 rounded-full bg-[#2F20FF]/10 px-3 py-1 text-xs font-semibold text-[#2F20FF]">
                  {Icon && <Icon size={12} />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  desc,
  active,
  onToggle,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
        active
          ? "border-[#2F20FF] bg-[#F8F6FF] shadow-[0_0_0_3px_rgba(47,32,255,0.08)]"
          : "border-[#E8EAF6] bg-white hover:border-[#B8BDD8]"
      }`}
    >
      <div
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-[#2F20FF] text-white" : "bg-[#F0F2FA] text-[#68739F]"
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#111536]">{title}</p>
        <p className="mt-1 text-xs font-medium text-[#68739F] leading-relaxed">{desc}</p>
      </div>
      <div
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          active ? "border-[#2F20FF] bg-[#2F20FF]" : "border-[#D6DDEC] bg-white"
        }`}
      >
        {active && <Check size={10} strokeWidth={3} className="text-white" />}
      </div>
    </button>
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

  const alertTypes = [
    { key: "alertSpike" as const, label: t("spike"), desc: t("spikeDesc"), icon: BarChart3, color: "#8B5CFF" },
    { key: "alertNegative" as const, label: t("negative"), desc: t("negativeDesc"), icon: Shield, color: "#EF4444" },
    { key: "alertViral" as const, label: t("viral"), desc: t("viralDesc"), icon: Sparkles, color: "#F59E0B" },
    { key: "alertComplaint" as const, label: t("complaint"), desc: t("complaintDesc"), icon: Headphones, color: "#10B981" },
  ];

  const channels = [
    { key: "emailEnabled" as const, label: t("email"), icon: Mail },
    { key: "inAppEnabled" as const, label: "In-app", icon: Bell },
    { key: "telegramEnabled" as const, label: "Telegram", icon: MessageCircle },
    { key: "whatsappEnabled" as const, label: "WhatsApp", icon: MessageCircle },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
        <p className="mt-1.5 text-sm font-medium text-[#68739F]">{t("desc")}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">{t("alertTypes")}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {alertTypes.map(({ key, label, desc, icon: Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !data[key] })}
              className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
                data[key]
                  ? "border-[#2F20FF] bg-[#F8F6FF] shadow-[0_0_0_3px_rgba(47,32,255,0.08)]"
                  : "border-[#E8EAF6] bg-white hover:border-[#B8BDD8]"
              }`}
            >
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}18`, color }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#111536]">{label}</p>
                <p className="mt-1 text-xs font-medium text-[#68739F] leading-relaxed">{desc}</p>
              </div>
              <ToggleSwitch
                active={data[key]}
                onChange={() => onChange({ [key]: !data[key] })}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">{t("channels")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !data[key] })}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                data[key] ? "border-[#2F20FF] bg-[#F8F6FF]" : "border-[#E8EAF6] bg-white hover:border-[#B8BDD8]"
              }`}
            >
              <Icon size={18} className={data[key] ? "text-[#2F20FF]" : "text-[#68739F]"} />
              <span className={`text-sm font-semibold ${data[key] ? "text-[#111536]" : "text-[#68739F]"}`}>
                {label}
              </span>
              <div className="ml-auto">
                <ToggleSwitch active={data[key]} onChange={() => onChange({ [key]: !data[key] })} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">{t("frequency")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: "dailyEnabled" as const, title: t("daily"), sub: "Every day, 08:00" },
            { key: "weeklyEnabled" as const, title: t("weekly"), sub: "Every Monday, 09:00" },
            { key: "realtimeEnabled" as const, title: t("realtime"), sub: t("realtimeDesc") },
          ].map(({ key, title, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !data[key] })}
              className={`flex items-center justify-between rounded-xl border p-5 text-left transition-all ${
                data[key] ? "border-[#2F20FF] bg-[#F8F6FF]" : "border-[#E8EAF6] bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-[#111536]">{title}</p>
                <p className="mt-1 text-xs font-medium text-[#68739F]">{sub}</p>
              </div>
              <ToggleSwitch active={data[key]} onChange={() => onChange({ [key]: !data[key] })} />
            </button>
          ))}
        </div>
      </div>
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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#2F20FF] focus:ring-offset-2 ${
        active ? "bg-[#2F20FF]" : "bg-[#D6DDEC]"
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

  const activeAlertTypes = [
    data.notifications.alertSpike && t("spike"),
    data.notifications.alertNegative && t("negative"),
    data.notifications.alertViral && t("viral"),
    data.notifications.alertComplaint && t("complaint"),
  ].filter(Boolean);

  const activeChannels = [
    data.notifications.emailEnabled && t("email"),
    data.notifications.inAppEnabled && "In-app",
    data.notifications.telegramEnabled && "Telegram",
    data.notifications.whatsappEnabled && "WhatsApp",
  ].filter(Boolean);

  const summaryRows = [
    { label: "Name", value: data.profile.name || "—" },
    { label: "Role", value: data.profile.role || "—" },
    { label: "Company", value: data.profile.company || "—" },
    { label: "Industry", value: data.profile.industry || "—" },
    {
      label: "Keywords",
      value: `${data.keywords.length} keyword${data.keywords.length !== 1 ? "s" : ""}`,
    },
    {
      label: "Data Sources",
      value: `${data.sources.length} source${data.sources.length !== 1 ? "s" : ""}`,
    },
    { label: "Alert Types", value: `${activeAlertTypes.length} active` },
    { label: "Channels", value: `${activeChannels.length} active` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
          <p className="mt-1.5 text-sm font-medium text-[#68739F]">{t("desc")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/12 px-4 py-2 text-xs font-bold text-[#10B981]">
          <CheckCircle2 size={14} />
          Ready
        </span>
      </div>

      {data.keywords.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">
            Keywords you&apos;ll monitor
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2F20FF]/10 px-4 py-2 text-sm font-semibold text-[#2F20FF]"
              >
                <Hash size={13} />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.sources.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">Data Sources</h2>
          <div className="flex flex-wrap gap-2">
            {[...new Set(data.sources.map((s) => s.type))].map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8EAF6] bg-white px-4 py-2 text-sm font-semibold text-[#3E4975]"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} (
                {data.sources.filter((s) => s.type === type).length})
              </span>
            ))}
          </div>
        </div>
      )}

      {activeAlertTypes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9BA3C2]">
            Alerts &amp; Notifications
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeAlertTypes.map(
              (label) =>
                label && (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-[#E8EAF6] bg-[#FAFBFF] px-4 py-3"
                  >
                    <Bell size={16} className="text-[#2F20FF]" />
                    <span className="text-sm font-semibold text-[#111536]">{label}</span>
                  </div>
                )
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[#F0F2FA]" />

      <div className="rounded-xl border border-[#E8EAF6] overflow-hidden">
        <div className="border-b border-[#F0F2FA] bg-[#FAFBFF] px-6 py-4">
          <h2 className="text-sm font-bold text-[#111536]">{t("summaryTitle")}</h2>
        </div>
        <div className="divide-y divide-[#F0F2FA]">
          {summaryRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4">
              <span className="text-sm font-medium text-[#68739F]">{label}</span>
              <span className="text-sm font-semibold text-[#111536]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-[#10B981]/20 bg-[#F0FFF8] p-6">
        <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-[#10B981]" />
        <div>
          <p className="text-base font-bold text-[#111536]">{t("readyTitle")}</p>
          <p className="mt-1 text-sm font-medium text-[#68739F]">{t("readyText")}</p>
        </div>
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
    { label: "Creating workspace", done: progress >= 10 },
    { label: "Adding keywords", done: progress >= 40 },
    { label: "Setting up sources", done: progress >= 55 },
    { label: "Configuring notifications", done: progress >= 70 },
    { label: "Launching dashboard", done: progress >= 95 },
  ];

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full border border-[#2F20FF]/20 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#2F20FF]/40 bg-white shadow-lg">
          <Image src="/narriv-logo.png" alt="Narriv" width={56} height={56} className="object-contain" />
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-bold tracking-tight text-[#111536]">{t("title")}</h1>
      <p className="mt-3 max-w-md text-sm font-medium text-[#68739F] leading-relaxed">{t("desc")}</p>

      <div className="mt-8 w-full max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#9BA3C2]">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0F2FA]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2F20FF] to-[#6B2EFF] transition-all duration-500 ease-out"
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
              <span className={`text-xs font-semibold ${s.done ? "text-[#10B981]" : "text-[#9BA3C2]"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-[#EF4444]">{submitError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-[#EF4444] bg-white px-6 py-3 text-sm font-semibold text-[#EF4444] transition-colors hover:bg-[#FFF5F5]"
          >
            Try Again
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
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-semibold text-[#3E4975]">
          {label}
          {required && <span className="ml-1 text-[#EF4444]">*</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className="form-select w-full appearance-none pr-10"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9BA3C2]"
      />
    </div>
  );
}

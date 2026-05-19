"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  FileText,
  Folder,
  Globe2,
  Hash,
  Headphones,
  Home,
  Lightbulb,
  Mail,
  MessageCircle,
  Mic,
  Newspaper,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  User,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import { Particles } from "@/components/ui/particles";

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const t = useTranslations("OnboardingDesign");
  const [step, setStep] = useState<Step | "processing">(1);
  const currentStep = step === "processing" ? 5 : step;

  const next = () => {
    if (step === "processing") return;
    if (step === 5) {
      setStep("processing");
      return;
    }
    setStep((step + 1) as Step);
  };

  const back = () => {
    if (step === "processing") {
      setStep(5);
      return;
    }
    if (step > 1) setStep((step - 1) as Step);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden selection:bg-[#465FFF]/30">
      <Particles particleCount={120} particleBaseSize={5} speed={0.06} particleColors={['#465FFF', '#8B5CFF', '#00F0FF']} />
      
      <OnboardingSidebar />
      <div className="min-h-screen lg:pl-[292px] relative z-10">
        <OnboardingTopbar showSearch={step !== 1} />
        
        <main className="px-5 pb-10 pt-6 sm:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto max-w-[1510px]">
            {step === "processing" ? (
              <ProcessingScreen />
            ) : (
              <>
                <header className="mb-8">
                  <h1 className="text-[34px] font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800">{t("title")}</h1>
                  <p className="mt-2 text-[15px] font-semibold text-slate-400">{t("subtitle")}</p>
                </header>
                
                <StepProgress current={currentStep} />
                
                <section className="mt-8 overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.4)]">
                  <div className="p-7 sm:p-9">
                    {step === 1 ? <ProfileStep /> : null}
                    {step === 2 ? <KeywordsStep /> : null}
                    {step === 3 ? <SourcesStep /> : null}
                    {step === 4 ? <NotificationsStep /> : null}
                    {step === 5 ? <PreviewStep /> : null}
                  </div>
                  <StepFooter step={step} onBack={back} onNext={next} />
                </section>
                
                <SafetyFooter />
                <HelpBubble />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function OnboardingSidebar() {
  const t = useTranslations("OnboardingDesign.sidebar");
  const main = [
    { icon: Home, label: t("command"), active: true },
    { icon: Activity, label: t("signals") },
    { icon: Bell, label: t("alerts") },
    { icon: Search, label: t("visibility") },
  ];
  const analysis = [
    { icon: BarChart3, label: t("intelligence") },
    { icon: FileText, label: t("reports") },
  ];
  const action = [{ icon: Target, label: t("actionCenter") }];
  const system = [
    { icon: Database, label: t("dataSources") },
    { icon: Settings, label: t("settings") },
  ];

  return (
    <aside className="sidebar-gradient fixed inset-y-0 left-0 z-30 hidden w-[292px] overflow-y-auto px-5 py-8 text-slate-900 lg:block">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Image src="/narriv-logo.svg" alt="Narriv" width={64} height={64} priority className="h-16 w-16 scale-[1.28] object-cover" />
        </span>
        <span className="text-[33px] font-bold tracking-[-0.05em] bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">Narriv</span>
      </div>

      <SidebarGroup title={t("main")} items={main} />
      <SidebarGroup title={t("analysis")} items={analysis} />
      <SidebarGroup title={t("action")} items={action} />
      <SidebarGroup title={t("system")} items={system} />

      <div className="mt-10 rounded-[10px] border border-slate-200 bg-slate-50 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between text-[13px] font-semibold text-slate-800">
          <span>{t("scoreTitle")}</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[10px]">i</span>
        </div>
        <div className="mt-4 flex items-end gap-1">
          <span className="text-[42px] font-bold leading-none text-[#8B5CFF] drop-shadow-[0_0_10px_rgba(139,92,255,0.3)]">86</span>
          <span className="pb-1 text-sm text-slate-400">/100</span>
        </div>
        <p className="mt-3 text-[15px] font-bold text-[#10B981]">{t("good")}</p>
        <p className="mt-2 text-[13px] text-slate-500">{t("scoreText")}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[78%] rounded-full bg-linear-to-r from-[#465FFF] to-[#8B5CFF] shadow-[0_0_10px_rgba(70,95,255,0.5)]" />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-[10px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#465FFF] to-[#8B5CFF] text-sm font-bold text-white shadow-[0_0_10px_rgba(70,95,255,0.3)]">TU</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-slate-900">{t("user")}</p>
          <p className="mt-1 truncate text-[13px] text-slate-400">{t("workspace")}</p>
        </div>
        <ChevronDown size={18} className="text-slate-500" />
      </div>

      <p className="mt-8 px-2 text-[13px] text-slate-400">© 2025 Narriv</p>
      <p className="mt-3 px-2 text-[13px] text-slate-400">All rights reserved.</p>
    </aside>
  );
}

function SidebarGroup({ title, items }: { title: string; items: { icon: LucideIcon; label: string; active?: boolean }[] }) {
  return (
    <div className="mt-9">
      <p className="px-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className={`flex h-[52px] items-center gap-4 rounded-[8px] px-4 text-left text-[16px] font-bold ${item.active ? "bg-[#465FFF] text-white shadow-[0_0_15px_rgba(70,95,255,0.4)]" : "text-slate-600 hover:bg-slate-100"} transition-all`} type="button">
              <Icon size={24} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OnboardingTopbar({ showSearch }: { showSearch: boolean }) {
  const t = useTranslations("OnboardingDesign.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);

  return (
    <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {showSearch ? (
          <label className="hidden h-[48px] w-full max-w-[530px] items-center gap-4 rounded-[8px] border border-border bg-slate-50 px-5 text-slate-500 lg:flex focus-within:border-[#465FFF]/50 transition-all">
            <Search size={20} className="text-slate-400" />
            <input className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-slate-300 text-slate-900" placeholder={t("search")} />
          </label>
        ) : (
          <div />
        )}
      </div>
      <div className="flex items-center gap-5">
        <button type="button" onClick={toggleLanguage} className="hidden rounded-[8px] border border-border px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#465FFF] sm:block">
          {language === "id" ? "ID" : "EN"}
        </button>
        <button type="button" className="relative text-slate-900 hover:text-[#465FFF] transition">
          <Bell size={25} />
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#465FFF] text-[11px] font-bold text-white shadow-[0_0_8px_rgba(70,95,255,0.4)]">3</span>
        </button>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#465FFF] to-[#8B5CFF] text-[16px] font-bold text-white shadow-[0_0_10px_rgba(70,95,255,0.3)]">TU</div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-bold text-slate-900">{t("user")}</p>
            <p className="mt-1 text-[13px] font-semibold text-slate-400">{t("workspace")}</p>
          </div>
          <ChevronDown size={18} className="hidden sm:block text-slate-400" />
        </div>
      </div>
    </header>
  );
}

function StepProgress({ current }: { current: Step }) {
  const t = useTranslations("OnboardingDesign.steps");
  const steps = [
    { title: t("profile"), desc: t("profileDesc") },
    { title: t("keywords"), desc: t("keywordsDesc") },
    { title: t("sources"), desc: t("sourcesDesc") },
    { title: t("notifications"), desc: t("notificationsDesc") },
    { title: t("preview"), desc: t("previewDesc") },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-5 bg-slate-50 border border-slate-100 p-5 rounded-[12px] backdrop-blur-md">
      {steps.map((item, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <div key={item.title} className="relative flex items-center gap-4">
            {index > 0 ? <div className={`absolute -left-[calc(50%-8px)] top-6 hidden h-px w-[calc(100%-32px)] xl:block ${done || active ? "bg-[#465FFF]/50" : "bg-slate-200"}`} /> : null}
            <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[18px] font-bold transition-all ${done ? "border-white bg-white text-black" : active ? "border-[#465FFF] bg-[#465FFF] text-white shadow-[0_0_10px_rgba(70,95,255,0.4)]" : "border-slate-300 bg-slate-50 text-slate-400"}`}>
              {done ? <Check size={23} strokeWidth={2.6} /> : number}
            </div>
            <div className="min-w-0">
              <p className={`text-[15px] font-bold ${active ? "text-[#465FFF] drop-shadow-[0_0_8px_rgba(70,95,255,0.2)]" : "text-slate-900"}`}>{item.title}</p>
              <p className="mt-1 text-[13px] font-medium text-slate-400">{item.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon: Icon, step, title, desc }: { icon: LucideIcon; step: number; title: string; desc: string }) {
  return (
    <div className="mb-8 flex items-start gap-5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/20 shadow-[0_0_12px_rgba(139,92,255,0.25)]">
        <Icon size={33} strokeWidth={2.2} />
      </div>
      <div>
        <h2 className="text-[26px] font-black tracking-tight text-slate-900">{step}. {title}</h2>
        <p className="mt-2 text-[15px] font-semibold text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function ProfileStep() {
  const t = useTranslations("OnboardingDesign.profile");
  const goals = [
    { title: t("goalBrand"), desc: t("goalBrandDesc"), icon: BarChart3, checked: true, tone: "green" },
    { title: t("goalCompetitor"), desc: t("goalCompetitorDesc"), icon: Users, checked: false, tone: "blue" },
    { title: t("goalMarket"), desc: t("goalMarketDesc"), icon: Lightbulb, checked: true, tone: "amber" },
    { title: t("goalService"), desc: t("goalServiceDesc"), icon: Headphones, checked: false, tone: "blue" },
  ];

  return (
    <div>
      <SectionTitle icon={User} step={1} title={t("title")} desc={t("desc")} />
      
      <div className="grid gap-10 xl:grid-cols-[1fr_560px]">
        <div className="grid gap-7">
          <div className="grid gap-7 md:grid-cols-2">
            <TextField label={t("name")} value="Testing User" icon={User} />
            <SelectField label={t("role")} value="Marketing Manager" />
            <TextField label={t("company")} value="FIFGROUP" />
            <SelectField label={t("industry")} value={t("industryValue")} />
          </div>
          <label className="block">
            <span className="mb-3 block text-[15px] font-bold text-slate-900">{t("mainGoal")}</span>
            <textarea 
              className="min-h-[118px] w-full resize-none rounded-[8px] border border-slate-200 bg-slate-50 p-5 text-[15px] font-medium leading-7 text-slate-900 outline-none focus:border-[#465FFF]/50 focus:ring-1 focus:ring-[#465FFF]/50 transition-all" 
              defaultValue={t("mainGoalValue")} 
            />
            <span className="-mt-9 mr-5 block text-right text-[13px] font-semibold text-slate-400">136/200</span>
          </label>
        </div>
        
        <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-6">
          <h3 className="text-[18px] font-bold text-slate-900">{t("goalsTitle")}</h3>
          <p className="mt-2 text-[14px] font-semibold text-slate-400">{t("goalsDesc")}</p>
          <div className="mt-6 grid gap-4">
            {goals.map((goal) => <GoalCard key={goal.title} {...goal} />)}
          </div>
        </div>
      </div>
      
      <PersonalizationCard />
    </div>
  );
}

function TextField({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[15px] font-bold text-slate-900">{label}</span>
      <span className="flex h-[56px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-5 text-[15px] font-semibold text-slate-700">
        {Icon ? <Icon size={19} className="text-slate-400" /> : null}
        {value}
      </span>
    </label>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[15px] font-bold text-slate-900">{label}</span>
      <span className="flex h-[56px] items-center justify-between rounded-[8px] border border-slate-200 bg-slate-50 px-5 text-[15px] font-semibold text-slate-700 cursor-pointer">
        {value}
        <ChevronDown size={18} className="text-slate-400" />
      </span>
    </label>
  );
}

function GoalCard({ title, desc, icon: Icon, checked, tone }: { title: string; desc: string; icon: LucideIcon; checked: boolean; tone: string }) {
  const toneClass = tone === "green" ? "text-[#10B981]" : tone === "amber" ? "text-[#F59E0B]" : "text-[#465FFF]";
  return (
    <button 
      type="button" 
      className={`flex items-center gap-4 rounded-[8px] border p-4 text-left transition-all duration-300 ${checked ? "border-[#465FFF] bg-[#465FFF]/10 shadow-[0_0_12px_rgba(70,95,255,0.15)]" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checked ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-slate-300 text-transparent"}`}>
        <Check size={15} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-[13px] font-semibold text-slate-400">{desc}</span>
      </span>
      <Icon size={21} className={`${toneClass} shrink-0`} />
    </button>
  );
}

function PersonalizationCard() {
  const t = useTranslations("OnboardingDesign.profile");
  return (
    <div className="mt-8 flex items-center gap-6 rounded-[10px] border border-slate-100 bg-slate-50 p-7">
      <Sparkles size={35} className="shrink-0 text-[#8B5CFF] drop-shadow-[0_0_10px_rgba(139,92,255,0.5)]" />
      <div>
        <h3 className="text-[19px] font-bold text-slate-900">{t("aiTitle")}</h3>
        <p className="mt-2 text-[15px] font-semibold text-slate-400">{t("aiDesc")}</p>
      </div>
      <div className="ml-auto hidden h-16 w-44 rounded-[8px] border border-slate-100 bg-black/30 shadow-inner xl:block" />
    </div>
  );
}

function KeywordsStep() {
  const t = useTranslations("OnboardingDesign.keywords");
  const keywords = ["FIFGROUP", "Leasing", "Motor", "Keluhan Kredit", "Customer Service", "Pembiayaan"];
  return (
    <div>
      <SectionTitle icon={Hash} step={2} title={t("title")} desc={t("desc")} />
      
      <div className="grid gap-10 xl:grid-cols-[1fr_520px]">
        <div>
          <h3 className="mb-4 text-[16px] font-bold text-slate-900">{t("inputLabel")}</h3>
          <div className="flex gap-4">
            <input 
              className="h-[56px] min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-slate-50 px-5 text-[15px] font-semibold outline-none placeholder:text-slate-300 text-slate-900 focus:border-[#465FFF]/50" 
              placeholder={t("placeholder")} 
            />
            <button 
              className="flex h-[56px] items-center gap-3 rounded-[8px] border border-[#8B5CFF]/30 bg-[#8B5CFF]/15 px-7 text-[16px] font-bold text-[#8B5CFF] hover:bg-[#8B5CFF]/25 transition" 
              type="button"
            >
              <Plus size={21} />
              {t("add")}
            </button>
          </div>
          
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[14px] font-semibold">
            <span className="text-slate-400">{t("examples")}</span>
            {keywords.slice(1).map((item) => <Pill key={item}>{item}</Pill>)}
          </div>
          
          <h3 className="mb-4 mt-10 text-[16px] font-bold text-slate-900">{t("yourKeywords")}</h3>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {keywords.map((item) => <KeywordCard key={item} label={item} />)}
          </div>
          
          <TipBox tone="purple" title={t("tipTitle")} text={t("tipText")} />
        </div>
        <TopicPreview />
      </div>
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-100 px-4 py-2 text-slate-600">
      {children}
      <X size={14} className="text-slate-400 hover:text-[#465FFF] cursor-pointer" />
    </span>
  );
}

function KeywordCard({ label }: { label: string }) {
  const t = useTranslations("OnboardingDesign.keywords");
  return (
    <div className="flex h-[62px] items-center justify-between rounded-[8px] border border-slate-100 bg-slate-50 px-5 hover:border-slate-200 transition-all">
      <span className="text-[16px] font-bold text-slate-900">{label}</span>
      <span className="flex items-center gap-3 text-[13px] font-semibold text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
        {t("active")}
      </span>
      <X size={18} className="text-slate-400 hover:text-[#465FFF] cursor-pointer" />
    </div>
  );
}

function TopicPreview() {
  const t = useTranslations("OnboardingDesign.keywords");
  const legend = [
    [t("social"), "5.642 (43,9%)", "#465FFF"],
    [t("news"), "3.892 (30,3%)", "#00F0FF"],
    [t("forum"), "2.156 (16,8%)", "#10B981"],
    [t("blog"), "1.152 (8,9%)", "#F59E0B"],
  ];
  const topics = ["FIFGROUP", "Leasing", "Keluhan Kredit", "Motor", "Customer Service"];
  return (
    <aside className="rounded-[10px] border border-slate-100 bg-slate-50 p-7">
      <h3 className="text-[17px] font-bold text-slate-900">{t("previewTitle")}</h3>
      <div className="mt-8 grid gap-8 md:grid-cols-[190px_1fr] xl:grid-cols-1 2xl:grid-cols-[190px_1fr]">
        <DonutChart center="12.842" label={t("mentions")} />
        <div className="grid content-center gap-5">
          {legend.map(([label, value, color]) => <LegendRow key={label} label={label} value={value} color={color} />)}
        </div>
      </div>
      <h4 className="mt-8 text-[16px] font-bold text-slate-900">{t("topTalked")}</h4>
      <div className="mt-5 grid gap-4">
        {topics.map((topic, index) => <RankRow key={topic} rank={index + 1} label={topic} value={["4.128", "3.042", "2.156", "1.894", "1.622"][index]} />)}
      </div>
      <button className="mx-auto mt-7 flex items-center gap-3 text-[15px] font-bold text-[#465FFF] hover:text-[#465FFF] transition-all" type="button">
        {t("viewDetails")} 
        <ArrowRight size={18} />
      </button>
    </aside>
  );
}

function SourcesStep() {
  const t = useTranslations("OnboardingDesign.sources");
  const sources = [
    { icon: Globe2, title: t("onlineNews"), desc: t("onlineNewsDesc"), checked: true },
    { icon: Share2, title: t("socialMedia"), desc: t("socialMediaDesc"), checked: true },
    { icon: Video, title: "YouTube", desc: t("youtubeDesc"), checked: true, red: true },
    { icon: Video, title: "TikTok", desc: t("tiktokDesc"), checked: true, black: true },
    { icon: MessageCircle, title: t("forum"), desc: t("forumDesc"), checked: true },
    { icon: FileText, title: t("blog"), desc: t("blogDesc") },
    { icon: Mic, title: t("podcast"), desc: t("podcastDesc") },
    { icon: ShoppingCart, title: t("review"), desc: t("reviewDesc") },
    { icon: Folder, title: t("publicDocs"), desc: t("publicDocsDesc") },
  ];
  return (
    <div>
      <div className="grid gap-9 xl:grid-cols-[1fr_470px]">
        <div>
          <SectionTitle icon={Database} step={3} title={t("title")} desc={t("desc")} />
          <h3 className="mb-5 text-[16px] font-bold text-slate-900">{t("choose")}</h3>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {sources.map((item) => <SourceCard key={item.title} {...item} />)}
          </div>
          <div className="mt-7 flex items-center gap-4 rounded-[8px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/5 p-5 text-[16px] font-semibold text-[#8B5CFF]">
            <ShieldCheck size={24} />
            {t("moreSources")}
          </div>
        </div>
        <aside className="grid content-start gap-5 border-l border-slate-100 pl-8">
          <SelectedSourcesSummary />
          <TipBox tone="blue" title={t("qualityTitle")} text={t("qualityText")} icon={ShieldCheck} />
          <TipBox tone="amber" title={t("tipTitle")} text={t("tipText")} icon={Lightbulb} />
        </aside>
      </div>
    </div>
  );
}

function SourceCard({ icon: Icon, title, desc, checked, red, black }: { icon: LucideIcon; title: string; desc: string; checked?: boolean; red?: boolean; black?: boolean }) {
  return (
    <div className={`flex min-h-[112px] items-start gap-5 rounded-[8px] border p-5 transition-all duration-300 ${checked ? "border-[#465FFF] bg-[#465FFF]/5 shadow-[0_0_10px_rgba(70,95,255,0.1)]" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}>
      <Icon size={26} className={red ? "text-rose-500" : black ? "text-slate-900" : "text-[#465FFF]"} fill={red ? "currentColor" : undefined} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-[14px] font-semibold leading-6 text-slate-400">{desc}</p>
      </div>
      <CheckBox checked={!!checked} />
    </div>
  );
}

function SelectedSourcesSummary() {
  const t = useTranslations("OnboardingDesign.sources");
  const rows = [
    [t("onlineNews"), "1.248", Globe2],
    [t("socialMedia"), "8", Share2],
    ["YouTube", "2", Video],
    ["TikTok", "1.024", Video],
    [t("forum"), "156", MessageCircle],
    [t("podcast"), "48", Mic],
  ] as const;
  return (
    <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-slate-900">{t("summaryTitle")}</h3>
        <span className="rounded-full bg-[#10B981]/15 border border-[#10B981]/25 px-4 py-2 text-[13px] font-bold text-[#10B981]">6 {t("active")}</span>
      </div>
      <div className="mt-6 grid gap-5">
        {rows.map(([label, value, Icon]) => (
          <div key={label} className="flex items-center gap-4">
            <Icon size={20} className="text-[#465FFF]" />
            <span className="min-w-0 flex-1 text-[15px] font-bold text-slate-800">{label}</span>
            <span className="text-[14px] font-semibold text-slate-400">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsStep() {
  const t = useTranslations("OnboardingDesign.notifications");
  const alerts = [
    { icon: BarChart3, title: t("spike"), desc: t("spikeDesc"), checked: true, tone: "purple" },
    { icon: Shield, title: t("negative"), desc: t("negativeDesc"), checked: true, tone: "red" },
    { icon: AlertTriangle, title: t("viral"), desc: t("viralDesc"), checked: true, tone: "amber" },
    { icon: MessageCircle, title: t("complaint"), desc: t("complaintDesc"), checked: true, tone: "green" },
    { icon: Newspaper, title: t("importantNews"), desc: t("importantNewsDesc") },
    { icon: User, title: t("competitor"), desc: t("competitorDesc") },
  ];
  const channels = [t("email"), "In-app", "Telegram", "WhatsApp", "SMS"];
  return (
    <div className="grid gap-9 xl:grid-cols-[1fr_470px]">
      <div>
        <SectionTitle icon={Bell} step={4} title={t("title")} desc={t("desc")} />
        
        <h3 className="mb-5 text-[16px] font-bold text-slate-900">{t("alertTypes")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((item) => <AlertCard key={item.title} {...item} />)}
        </div>
        
        <h3 className="mb-2 mt-6 text-[16px] font-bold text-slate-900">{t("channels")}</h3>
        <p className="mb-4 text-[14px] font-semibold text-slate-400">{t("channelsDesc")}</p>
        <div className="grid gap-3 md:grid-cols-5">
          {channels.map((item, index) => <ChannelCard key={item} label={item} checked={index < 4} />)}
        </div>
        
        <h3 className="mb-4 mt-7 text-[16px] font-bold text-slate-900">{t("frequency")}</h3>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_220px]">
          <ScheduleCard title={t("daily")} value={t("dailyValue")} />
          <ScheduleCard title={t("weekly")} value={t("weeklyValue")} />
          <div className="flex items-center justify-between rounded-[8px] border border-slate-100 bg-slate-50 p-5">
            <span>
              <span className="block text-[15px] font-bold text-slate-900">{t("realtime")}</span>
              <span className="mt-1 block text-[12px] font-semibold text-slate-400">{t("realtimeDesc")}</span>
            </span>
            <span className="flex h-6 w-11 items-center rounded-full bg-[#465FFF] p-1 cursor-pointer">
              <span className="ml-auto h-4 w-4 rounded-full bg-white shadow-md" />
            </span>
          </div>
        </div>
      </div>
      <aside className="grid content-start gap-5 border-l border-slate-100 pl-8">
        <NotificationSummary />
        <TipBox tone="amber" title={t("tipTitle")} text={t("tipText")} icon={Lightbulb} />
      </aside>
    </div>
  );
}

function AlertCard({ icon: Icon, title, desc, checked, tone }: { icon: LucideIcon; title: string; desc: string; checked?: boolean; tone?: string }) {
  const colors = tone === "red" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : tone === "amber" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : tone === "green" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[#8B5CFF]/10 text-[#8B5CFF] border-[#8B5CFF]/20";
  return (
    <div className={`flex items-start gap-5 rounded-[8px] border p-5 transition-all duration-300 ${checked ? "border-[#465FFF] bg-[#465FFF]/5" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border ${colors}`}><Icon size={25} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold text-slate-900">{title}</span>
        <span className="mt-2 block text-[14px] font-semibold leading-6 text-slate-400">{desc}</span>
      </span>
      <CheckBox checked={!!checked} />
    </div>
  );
}

function ChannelCard({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <div className="flex h-[54px] items-center justify-between rounded-[8px] border border-slate-100 bg-slate-50 px-5 text-[14px] font-bold text-slate-800">
      <div className="flex items-center gap-2">
        <Mail size={18} className="text-[#465FFF]" />
        {label}
      </div>
      <CheckBox checked={!!checked} />
    </div>
  );
}

function ScheduleCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex h-[64px] items-center justify-between rounded-[8px] border border-slate-100 bg-slate-50 px-5">
      <span>
        <span className="block text-[14px] font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-[13px] font-semibold text-slate-400">{value}</span>
      </span>
      <CalendarDays size={18} className="text-slate-400" />
    </div>
  );
}

function NotificationSummary() {
  const t = useTranslations("OnboardingDesign.notifications");
  const alerts = [t("spike"), t("negative"), t("viral"), t("complaint")];
  return (
    <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-6">
      <h3 className="text-[17px] font-bold text-slate-900">{t("summaryTitle")}</h3>
      <p className="mt-2 text-[14px] font-semibold text-slate-400">{t("summaryDesc")}</p>
      
      <div className="mt-5 rounded-[8px] border border-slate-100 bg-slate-50 p-5">
        <h4 className="mb-4 text-[14px] font-bold text-slate-800">{t("alertCount")}</h4>
        <div className="grid gap-4">
          {alerts.map((item) => (
            <div key={item} className="flex items-center gap-3 text-[14px] font-bold text-slate-700">
              <Bell size={17} className="text-[#465FFF]" />
              {item}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 rounded-[8px] border border-slate-100 bg-slate-50 p-5">
        <h4 className="mb-4 text-[14px] font-bold text-slate-800">{t("channelCount")}</h4>
        <div className="flex flex-wrap gap-3 text-[13px] font-bold text-[#465FFF] items-center">
          <Mail size={18} />
          <span>In-app</span>
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          <span>Telegram</span>
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          <span>WhatsApp</span>
        </div>
      </div>
      
      <div className="mt-4 rounded-[8px] border border-slate-100 bg-slate-50 p-5">
        <h4 className="mb-4 text-[14px] font-bold text-slate-800">{t("summaryTime")}</h4>
        <p className="text-[14px] font-semibold text-slate-400"><b className="text-slate-900">{t("daily")}</b> {t("dailyValue")}</p>
        <p className="mt-3 text-[14px] font-semibold text-slate-400"><b className="text-slate-900">{t("weekly")}</b> {t("weeklyValue")}</p>
      </div>
    </div>
  );
}

function PreviewStep() {
  const t = useTranslations("OnboardingDesign.preview");
  const metrics = [
    [t("totalMentions"), "12.842", Activity],
    [t("negativeSentiment"), "2.156", Shield],
    [t("activeSources"), "6 / 8", Database],
    [t("avgResponse"), "17m 24s", Clock3],
    [t("aiVisibility"), "2.451", Eye],
  ] as const;
  return (
    <div>
      <div className="mb-7 flex items-center justify-between">
        <SectionTitle icon={Sparkles} step={5} title={t("title")} desc={t("desc")} />
        <span className="hidden rounded-full bg-[#10B981]/15 border border-[#10B981]/25 px-4 py-2 text-[13px] font-bold text-[#10B981] md:inline-flex items-center gap-1">
          <Check size={15} /> 
          {t("ready")}
        </span>
      </div>
      
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => <MetricPreview key={label} label={label} value={value} icon={Icon} />)}
      </div>
      
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
            <LineChartCard />
            <TopTopicsCard />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <SentimentCard />
            <TopSourcesCard />
            <LatestAlertsCard />
          </div>
        </div>
        <PreviewSummary />
      </div>
    </div>
  );
}

function MetricPreview({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[8px] border border-slate-100 bg-slate-50 p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/20 shadow-[0_0_8px_rgba(139,92,255,0.2)]">
          <Icon size={25} />
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-slate-400">{label}</span>
          <span className="mt-1 block text-[26px] font-black text-slate-900 leading-none tracking-tight">{value}</span>
          <span className="mt-1.5 block text-[12px] font-bold text-[#10B981]">▲ 18,3%</span>
        </span>
      </div>
    </div>
  );
}

function LineChartCard() {
  const t = useTranslations("OnboardingDesign.preview");
  return (
    <ChartPanel title={t("activityTitle")} desc={t("activityDesc")}>
      <div className="h-[230px] w-full relative">
        <svg viewBox="0 0 560 210" className="h-[230px] w-full z-10 relative">
          <defs>
            <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#465FFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" x2="560" y1={35 + i * 35} y2={35 + i * 35} stroke="rgba(255,255,255,0.05)" />
          ))}
          <path d="M0 160 L55 138 L110 132 L165 104 L220 122 L275 91 L330 98 L385 35 L440 48 L495 90 L560 72 L560 210 L0 210 Z" fill="url(#lineFill)" />
          <polyline points="0,160 55,138 110,132 165,104 220,122 275,91 330,98 385,35 440,48 495,90 560,72" fill="none" stroke="#465FFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </ChartPanel>
  );
}

function TopTopicsCard() {
  const t = useTranslations("OnboardingDesign.preview");
  const topics = ["FIFGROUP", "Leasing", "Keluhan Kredit", "Motor", "Customer Service"];
  return (
    <ChartPanel title={t("topicTitle")} desc={t("topicDesc")}>
      {topics.map((topic, i) => (
        <BarRank key={topic} rank={i + 1} label={topic} value={[75, 62, 43, 37, 31][i]} />
      ))}
      <button className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#465FFF] hover:text-[#465FFF] transition" type="button">
        {t("viewAllTopics")}
        <ArrowRight size={16} />
      </button>
    </ChartPanel>
  );
}

function SentimentCard() {
  const t = useTranslations("OnboardingDesign.preview");
  return (
    <ChartPanel title={t("sentimentTitle")} desc={t("sentimentDesc")}>
      <div className="grid grid-cols-[150px_1fr] items-center gap-5">
        <DonutChart center="12.842" label={t("totalMentionsShort")} />
        <div className="grid gap-3">
          <LegendRow label={t("positive")} value="6.842" color="#10B981" />
          <LegendRow label={t("neutral")} value="3.892" color="#00F0FF" />
          <LegendRow label={t("negative")} value="2.108" color="#EF4444" />
        </div>
      </div>
    </ChartPanel>
  );
}

function TopSourcesCard() {
  const t = useTranslations("OnboardingDesign.preview");
  const rows = ["TikTok", "YouTube", t("onlineNews"), t("forum"), "Instagram"];
  return (
    <ChartPanel title={t("topSources")} desc={t("topSourcesDesc")}>
      {rows.map((row, i) => (
        <div key={row} className="mb-3 flex items-center gap-3 text-[14px] font-bold text-slate-800 py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <Globe2 size={17} className="text-[#465FFF]" />
          <span className="flex-1 truncate">{row}</span>
          <span className="text-slate-400">{["4.218", "3.156", "2.842", "1.118", "832"][i]}</span>
        </div>
      ))}
      <button className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#465FFF] hover:text-[#465FFF] transition" type="button">
        {t("viewAllSources")}
        <ArrowRight size={16} />
      </button>
    </ChartPanel>
  );
}

function LatestAlertsCard() {
  const t = useTranslations("OnboardingDesign.preview");
  const rows = [t("alertNegative"), t("alertViral"), t("alertComplaint")];
  return (
    <ChartPanel title={t("latestAlerts")} desc={t("latestAlertsDesc")}>
      {rows.map((row, i) => (
        <div key={row} className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3.5 last:border-0 last:pb-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-slate-900 truncate">{row}</span>
            <span className="text-[12px] font-semibold text-slate-400 truncate">Topik: {i === 0 ? "Keluhan Kredit" : i === 1 ? "Leasing" : "Motor"}</span>
          </span>
          <span className="text-[12px] font-bold text-slate-400">{["10:23", "09:45", "08:20"][i]}</span>
        </div>
      ))}
      <button className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#465FFF] hover:text-[#465FFF] transition" type="button">
        {t("viewAllAlerts")}
        <ArrowRight size={16} />
      </button>
    </ChartPanel>
  );
}

function PreviewSummary() {
  const t = useTranslations("OnboardingDesign.preview");
  const rows = [[t("topics"), "6 keyword"], [t("sources"), "6"], [t("alerts"), "4"], [t("channels"), "4"], [t("time"), t("dailyWeekly")]];
  return (
    <aside className="grid content-start gap-5">
      <div className="rounded-[10px] border border-slate-100 bg-slate-50 overflow-hidden">
        <h3 className="border-b border-slate-100 p-6 text-[18px] font-bold text-slate-900">{t("summaryTitle")}</h3>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-slate-100 px-6 py-5 last:border-b-0">
            <span className="font-bold text-slate-700">{label}</span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-500">{value}</span>
          </div>
        ))}
      </div>
      
      <div className="rounded-[10px] border border-slate-100 bg-[#465FFF]/5 p-6">
        <h3 className="text-[17px] font-bold text-[#465FFF]">{t("readyTitle")}</h3>
        <p className="mt-2 text-[14px] font-semibold leading-6 text-slate-400">{t("readyText")}</p>
      </div>
    </aside>
  );
}

function ProcessingScreen() {
  const t = useTranslations("OnboardingDesign.processing");
  const items = [[t("mineTitle"), t("mineDesc"), Search], [t("sentimentTitle"), t("sentimentDesc"), ShieldCheck], [t("insightTitle"), t("insightDesc"), BarChart3], [t("alertTitle"), t("alertDesc"), Bell]] as const;
  const summary = [[t("topics"), "6 keyword", Hash], [t("sources"), "6", Database], [t("alerts"), "4", Bell], [t("summaryTime"), t("dailyWeekly"), Clock3]] as const;
  return (
    <div className="flex min-h-[calc(100vh-138px)] flex-col items-center justify-center py-10">
      <div className="relative w-full max-w-[980px]">
        {/* Radar pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] h-[300px] rounded-full border border-[#465FFF]/15 animate-ping" />
        </div>
        
        <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-full border border-dashed border-[#8B5CFF]/30 bg-slate-50 relative z-10 shadow-[0_0_20px_rgba(70,95,255,0.1)]">
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border border-slate-100 bg-slate-50 shadow-[0_0_30px_rgba(70,95,255,0.25)]">
            <Image src="/narriv-logo.svg" alt="Narriv" width={84} height={84} priority className="h-[84px] w-[84px] object-contain animate-pulse" />
          </div>
        </div>
        
        <div className="mt-8 grid gap-5 lg:grid-cols-2 relative z-10">
          {items.map(([title, desc, Icon], i) => (
            <div 
              key={title} 
              className={`rounded-[12px] border border-slate-100 bg-slate-50 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.3)] backdrop-blur-md ${i % 2 === 0 ? "lg:mr-28" : "lg:ml-28"} hover:border-[#465FFF]/30 transition duration-300`}
            >
              <div className="flex items-center gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/20"><Icon size={28} /></span>
                <span>
                  <span className="block text-[15px] font-bold text-slate-900">{title}</span>
                  <span className="mt-1 block text-[13px] font-semibold leading-6 text-slate-400">{desc}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <h1 className="mt-12 text-center text-[32px] font-black tracking-tight text-slate-900">{t("title")}</h1>
      <p className="mt-4 max-w-[720px] text-center text-[17px] font-semibold leading-7 text-slate-400">{t("desc")}</p>
      
      <div className="mt-10 flex w-full max-w-[720px] items-center gap-5">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-100">
          <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] shadow-[0_0_10px_rgba(70,95,255,0.5)]" />
        </div>
        <span className="text-[24px] font-black text-[#465FFF] drop-shadow-[0_0_8px_rgba(70,95,255,0.4)]">70%</span>
      </div>
      
      <div className="mt-14 w-full max-w-[1060px]">
        <h2 className="mb-5 text-[14px] font-bold uppercase tracking-[0.08em] text-slate-400">{t("summaryTitle")}</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summary.map(([title, value, Icon]) => (
            <div key={title} className="flex items-center gap-5 rounded-[10px] border border-slate-100 bg-slate-50 p-5 hover:border-slate-200 transition">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/15 text-[#465FFF] border border-[#465FFF]/20"><Icon size={28} /></span>
              <span>
                <span className="block text-[15px] font-bold text-slate-900">{title}</span>
                <span className="mt-1 block text-[14px] font-semibold text-slate-400">{value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 w-full max-w-[1060px] rounded-[10px] border border-slate-100 bg-[#8B5CFF]/5 p-6">
        <div className="flex items-center gap-5">
          <Sparkles size={30} className="text-[#8B5CFF] shrink-0" />
          <span>
            <span className="block text-[18px] font-bold text-slate-900">{t("didYouKnow")}</span>
            <span className="mt-1 block text-[15px] font-semibold text-slate-400">{t("didYouKnowText")}</span>
          </span>
        </div>
      </div>
      
      <SafetyFooter />
    </div>
  );
}

function StepFooter({ step, onBack, onNext }: { step: Step; onBack: () => void; onNext: () => void }) {
  const t = useTranslations("OnboardingDesign.footer");
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-7 py-6 sm:px-9 bg-slate-50">
      {step === 1 ? (
        <button className="h-[50px] rounded-[8px] border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all px-7 text-[15px] font-bold text-slate-700" type="button">
          {t("skip")}
        </button>
      ) : (
        <button onClick={onBack} className="flex h-[50px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all px-7 text-[15px] font-bold text-slate-700" type="button">
          <ArrowLeft size={19} />
          {t("back")}
        </button>
      )}
      <div className="ml-auto text-[15px] font-semibold text-slate-400">{t("step", { step })}</div>
      <button 
        onClick={onNext} 
        className="flex h-[50px] min-w-[252px] items-center justify-center gap-3 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-8 text-[15px] font-bold text-white shadow-[0_0_15px_rgba(70,95,255,0.3)] transition hover:from-[#3b52d9] hover:to-[#764ee6] border border-slate-200 active:scale-[0.98]" 
        type="button"
      >
        {step === 5 ? t("finish") : t("continue")} 
        <ArrowRight size={19} />
      </button>
    </div>
  );
}

function TipBox({ title, text, tone = "purple", icon: Icon = Sparkles }: { title: string; text: string; tone?: "purple" | "blue" | "amber"; icon?: LucideIcon }) {
  const cls = tone === "amber" ? "border-amber-500/20 bg-amber-500/5 text-amber-400" : tone === "blue" ? "border-sky-500/20 bg-sky-500/5 text-sky-400" : "border-purple-500/20 bg-purple-500/5 text-purple-400";
  return (
    <div className={`mt-8 flex items-center gap-5 rounded-[8px] border p-5 ${cls}`}>
      <Icon size={25} className="shrink-0" />
      <span>
        <span className="block text-[16px] font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-[14px] font-semibold leading-6 text-slate-400">{text}</span>
      </span>
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border transition ${checked ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-slate-300 bg-slate-50 text-transparent"}`}>
      <Check size={15} strokeWidth={3} />
    </span>
  );
}

function ChartPanel({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-slate-100 bg-slate-50 p-6">
      <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
      {desc ? <p className="mt-2 text-[13px] font-semibold text-slate-400">{desc}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function DonutChart({ center, label }: { center: string; label: string }) {
  return (
    <div className="relative mx-auto flex h-[168px] w-[168px] items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_44%,#00F0FF_44%_74%,#10B981_74%_91%,#F59E0B_91%_100%)] p-[24px]">
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-background text-center">
        <span className="text-[25px] font-black text-slate-900 leading-none">{center}</span>
        <span className="mt-1 text-[12px] font-semibold text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function LegendRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 text-[14px] font-semibold">
      <span className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color, boxShadow: `0_0_8px_${color}` }} />
      <span className="flex-1 text-slate-500 truncate">{label}</span>
      <span className="text-slate-900 font-bold">{value}</span>
    </div>
  );
}

function RankRow({ rank, label, value }: { rank: number; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 text-[14px] font-bold border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-100 shrink-0">{rank}</span>
      <span className="flex-1 text-slate-800 truncate">{label}</span>
      <span className="text-slate-400">{value} mentions</span>
    </div>
  );
}

function BarRank({ rank, label, value }: { rank: number; label: string; value: number }) {
  return (
    <div className="mb-4 grid grid-cols-[28px_130px_1fr] items-center gap-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500 border border-slate-100">{rank}</span>
      <span className="text-[14px] font-bold text-slate-800 truncate">{label}</span>
      <span className="h-1.5 rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-[#465FFF] shadow-[0_0_8px_#465FFF]" style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

function SafetyFooter() {
  const t = useTranslations("OnboardingDesign.footer");
  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-center text-[13px] font-semibold text-slate-400">
      <ShieldCheck size={18} className="text-[#10B981]" />
      {t("safety")}
    </div>
  );
}

function HelpBubble() {
  const t = useTranslations("OnboardingDesign.footer");
  return (
    <button 
      className="fixed bottom-6 right-6 hidden items-center gap-4 rounded-full bg-[#0C0F1D]/80 border border-slate-100 backdrop-blur-md py-3 pl-4 pr-6 text-[15px] font-bold text-white shadow-[0_0_20px_rgba(70,95,255,0.15)] hover:border-[#465FFF]/50 hover:shadow-[0_0_25px_rgba(70,95,255,0.25)] transition duration-300 xl:flex active:scale-[0.96]" 
      type="button"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#465FFF] text-white shadow-[0_0_12px_rgba(70,95,255,0.4)]">
        <MessageCircle size={22} />
      </span>
      {t("help")}
    </button>
  );
}

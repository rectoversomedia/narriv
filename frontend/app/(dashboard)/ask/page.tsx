"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { Send, TrendingUp, Zap, AlertTriangle, Users, Compass, BarChart2, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { getNarratives, getDashboardSummary } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import type { NarrativeRecord, DashboardSummary } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Confidence = "high" | "medium" | "low";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: Array<{ id: string; kind?: string; title?: string | null; url?: string | null }>;
  metrics?: Array<{ label: string; value: string }>;
  confidence?: Confidence;
  links?: Array<{ label: string; href: string }>;
  isDemo?: boolean;
  coverage?: string;
}

const PLATFORM_NAME: Record<string, string> = { news: "news", x: "X", tiktok: "TikTok", instagram: "Instagram", threads: "Threads", youtube: "YouTube", facebook: "Facebook", web: "web search" };

// What the answer was based on, so it never reads as broader coverage than the data.
function describeCoverage(data: { signals: number; windowHours: number; platforms?: Record<string, number> } | undefined, lang: "en" | "id"): string | undefined {
  if (!data || !data.signals) return undefined;
  const days = Math.round(data.windowHours / 24);
  const platforms = Object.entries(data.platforms ?? {}).map(([p, n]) => `${PLATFORM_NAME[p] ?? p} ${n}`).join(", ");
  const newsOnly = Object.keys(data.platforms ?? {}).length > 0 && Object.keys(data.platforms ?? {}).every((p) => p === "news");
  if (lang === "id") {
    const period = days >= 1 ? `${days} hari terakhir` : `${data.windowHours} jam terakhir`;
    const count = data.signals >= 50 ? `${data.signals} data tersimpan terbaru` : `${data.signals} data tersimpan`;
    return `Berdasarkan ${count} dari ${period}${platforms ? ` (${platforms})` : ""}.${newsOnly ? " Hanya sumber berita; media sosial belum tercakup." : ""}`;
  }
  const period = days >= 1 ? `the last ${days} day${days === 1 ? "" : "s"}` : `the last ${data.windowHours} hours`;
  const count = data.signals >= 50 ? `the ${data.signals} most recent stored signals` : `${data.signals} stored signal${data.signals === 1 ? "" : "s"}`;
  return `Based on ${count} from ${period}${platforms ? ` (${platforms})` : ""}.${newsOnly ? " News sources only; social media is not covered." : ""}`;
}

interface SuggestedCategory {
  id: string;
  icon: typeof TrendingUp;
  question: { en: string; id: string };
}

// Business questions an executive or communications team would ask, with no
// presupposed findings; answers always come from the grounded backend.
const SUGGESTED_CATEGORIES: SuggestedCategory[] = [
  { id: "today", icon: Compass, question: { id: "Apa isu paling penting yang perlu saya ketahui hari ini?", en: "What is the most important issue I need to know about today?" } },
  { id: "changes", icon: Activity, question: { id: "Apa yang berubah dibandingkan minggu lalu?", en: "What changed compared with last week?" } },
  { id: "risks", icon: AlertTriangle, question: { id: "Apakah ada potensi risiko reputasi?", en: "Is there a potential reputation risk?" } },
  { id: "complaints", icon: Zap, question: { id: "Apa keluhan pelanggan yang paling sering muncul?", en: "What are the most common customer complaints?" } },
  { id: "why", icon: BarChart2, question: { id: "Mengapa isu utama saat ini perlu diperhatikan?", en: "Why does the main current issue deserve attention?" } },
  { id: "actions", icon: TrendingUp, question: { id: "Apa tindakan yang sebaiknya dilakukan tim komunikasi?", en: "What should the communications team do?" } },
  { id: "development", icon: Activity, question: { id: "Bagaimana perkembangan isu utama selama 7 hari terakhir?", en: "How has the main issue developed over the last 7 days?" } },
  { id: "competitors", icon: Users, question: { id: "Bagaimana posisi brand dibandingkan kompetitor?", en: "How does the brand compare with competitors?" } },
];

// ---------------------------------------------------------------------------
// Response templates
// ---------------------------------------------------------------------------

// Canned keyword-matched answers were removed: Ask Narriv only shows answers
// returned by the grounded backend, or an explicit error.

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceChip({ confidence, t }: { confidence: Confidence; t: (key: string) => string }) {
  const map: Record<Confidence, { label: string; className: string }> = {
    high: {
      label: t("confidenceHigh"),
      className: "bg-[#12B76A]/10 text-[#027A48] border border-transparent",
    },
    medium: {
      label: t("confidenceMedium"),
      className: "bg-[#FDB022]/10 text-[#B54708] border border-transparent",
    },
    low: {
      label: t("confidenceLow"),
      className: "bg-slate-100 text-[#5A6478] border border-slate-200",
    },
  };
  const { label, className } = map[confidence];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${className}`}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {label}
    </span>
  );
}


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const QUICK_TONES = ["#465FFF", "#E5484D", "#F59E0B", "#12A66A", "#8B5CFF", "#0EA5E9", "#F97316", "#64748B"];

/** While the chat is empty: the workspace in four numbers, then one-tap questions. */
function AskPulse({ summary, topIssue, onAsk, language }: { summary: DashboardSummary; topIssue: NarrativeRecord | null; onAsk: (q: string) => void; language: "en" | "id" }) {
  const L = (en: string, id: string) => (language === "id" ? id : en);
  const k = summary.kpis;
  const neg = Math.round(k?.negative_percentage ?? 0);
  const pos = Math.round(k?.positive_percentage ?? 0);
  const tiles = [
    { label: L("Mentions", "Percakapan"), value: (k?.total_signals ?? 0).toLocaleString(language === "id" ? "id-ID" : "en-US"), sub: L("in this workspace", "di workspace ini"), rgb: "70,95,255", color: "#3B52F5" },
    { label: L("Negative", "Negatif"), value: `${neg}%`, sub: L("of analysed mentions", "dari percakapan teranalisis"), rgb: "229,72,77", color: "#C81E1E" },
    { label: L("Positive", "Positif"), value: `${pos}%`, sub: L("of analysed mentions", "dari percakapan teranalisis"), rgb: "18,166,106", color: "#047857" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center shadow-[0_1px_2px_rgba(16,19,52,0.06),0_10px_24px_-16px_rgba(16,19,52,0.25)]">
            <p className="text-[11px] font-black" style={{ color: t.color }}>{t.label}</p>
            <p className="mt-1.5 text-[28px] font-black leading-none tracking-[-0.04em] text-[#101334]">{t.value}</p>
            <p className="mt-1.5 text-[11px] font-bold text-[#5A6478]">{t.sub}</p>
          </div>
        ))}
        <div className="rounded-[14px] bg-[#101334] p-4 text-white">
          <p className="text-[11px] font-black text-[#A9B4FF]">{L("Top issue", "Isu utama")}</p>
          <p className="mt-1.5 line-clamp-3 text-[14px] font-black leading-snug">{topIssue?.title ?? L("No issue yet", "Belum ada isu")}</p>
          {topIssue ? <p className="mt-1.5 text-[11px] font-bold text-white/70">{topIssue.signalCount} {L("mentions", "percakapan")}</p> : null}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-black text-[#5A6478]">{L("Ask in one tap", "Tanya sekali klik")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED_CATEGORIES.slice(0, 6).map((cat, i) => (
            <button key={cat.id} type="button" onClick={() => onAsk(cat.question[language])} className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3 text-left shadow-[0_2px_10px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(16,24,40,0.08)]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white" style={{ background: QUICK_TONES[i % QUICK_TONES.length] }}>{i + 1}</span>
              <span className="text-[13px] font-bold leading-snug text-[#101334]">{cat.question[language]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AskPage() {
  const tAsk = useTranslations("askNarriv");
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // Only show a model name after the backend reports which model actually answered.
  const [lastModel, setLastModel] = useState<string | null>(null);
  const language = useUiStore((state) => state.language);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Suggestions start collapsed on small screens so the conversation has room.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setSidebarOpen(false);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load real API data in parallel
  const [narratives, setNarratives] = useState<{ data: NarrativeRecord[] } | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    Promise.all([
      getNarratives({ limit: 10 }),
      getDashboardSummary(),
    ]).then(([narrativesResult, summaryResult]) => {
      if (narrativesResult) setNarratives(narrativesResult);
      if (summaryResult) setDashboardSummary(summaryResult);
    }).catch(() => {
      // No sample narratives: Ask only describes stored records.
    });
  }, [isDemoSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Real backend: POST /api/ai/ask (grounded, evidence-first)
    (async () => {
      try {
        const { askNarriv } = await import("@/lib/intelligence-api");
        // 7-day evidence window (24h often holds too few signals to answer).
        const result = await askNarriv(trimmed, 168);
        if (result.meta?.model) setLastModel(result.meta.model);
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer || (result.error ? (language === "id" ? `Pertanyaan ini belum dapat dijawab: ${result.error}` : `I could not answer that: ${result.error}`) : (language === "id" ? "Data belum cukup untuk menjawab." : "Insufficient data to answer.")),
          evidence: (result.sources || []).map((s) => ({ id: s.id, kind: s.kind, title: (s.title as string | null | undefined) ?? null, url: (s.url as string | null | undefined) ?? null })),
          // Grounded + cited sources is the strongest signal we have; otherwise low.
          confidence: result.grounded && (result.sources || []).length > 0 ? "medium" : "low",
          links: [],
          isDemo: isDemoSession,
          coverage: describeCoverage(result.data, language),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        // Never answer with canned or synthesized facts: state what failed instead.
        const status = (err as { status?: number })?.status;
        const reason =
          status === 401 ? "Your session has expired. Please sign in again."
          : status === 403 ? "You don't have access to this workspace's data."
          : status === 429 ? "Too many questions in a short time. Please wait a minute and try again."
          : status && status >= 500 ? "The intelligence service had a problem answering. Please try again shortly."
          : "The intelligence service could not be reached. Check your connection and try again.";
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I couldn't answer this question. ${reason}\n\nNo answer was generated, so nothing here should be treated as a finding.`,
          evidence: [],
          confidence: "low",
          links: [],
          isDemo: isDemoSession,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } finally {
        setIsTyping(false);
      }
    })();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  function clearChat() {
    setMessages([]);
    setInputValue("");
    textareaRef.current?.focus();
  }

  // Dynamic welcome message — uses loaded real or mock data
  const welcomeContent = useMemo(() => {
    return pickL(
      "Ask anything. Answers come from this workspace's data, with sources.",
      "Tanya apa saja. Jawaban dari data workspace ini, lengkap dengan sumber.",
    );
  }, []);

  const WELCOME_MESSAGE = useMemo<Message>(() => ({
    id: "welcome",
    role: "assistant",
    content: welcomeContent,
    links: [
      { label: pickL("View mentions", "Lihat percakapan"), href: "/signals" },
      { label: pickL("View dashboard", "Lihat dashboard"), href: "/" },
    ],
    isDemo: isDemoSession,
  }), [welcomeContent, isDemoSession]);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setMessages([WELCOME_MESSAGE]);
      setInitialized(true);
      return;
    }
    // Keep the welcome text current once workspace data arrives.
    setMessages((prev) => (prev[0]?.id === "welcome" ? [WELCOME_MESSAGE, ...prev.slice(1)] : prev));
  }, [initialized, WELCOME_MESSAGE]);

  return (
    <div className="relative flex h-[calc(100dvh-250px)] min-h-[420px] overflow-hidden rounded-card border border-line bg-white lg:h-[calc(100dvh-152px)]">
      {/* ── Sidebar (overlay on small screens, column on desktop) ── */}
      {sidebarOpen ? <button type="button" aria-label="Close suggestions" onClick={() => setSidebarOpen(false)} className="absolute inset-0 z-10 bg-navy/20 lg:hidden" /> : null}
      <aside
        className={`flex shrink-0 flex-col border-r border-line-soft bg-white transition-[width] duration-base ease-standard ${
          sidebarOpen ? "absolute inset-y-0 left-0 z-20 w-[85%] max-w-[300px] shadow-raised lg:static lg:w-64 lg:shadow-none" : "w-0 overflow-hidden"
        }`}
      >
        <div className="flex flex-col gap-1 p-4">
          {/* Title */}
          <div className="mb-3 flex items-center gap-2.5">
            {sidebarOpen && (
              <div>
                <p className="text-[14px] font-black text-slate-900">{tAsk("title")}</p>
                <p className="text-[11px] font-semibold text-[#5A6478]">{tAsk("subtitle")}</p>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {sidebarOpen && (
            <div className="flex flex-col gap-1">
              <p className="mb-1 px-1 text-[10px] font-black text-[#5A6478]">
                {pickL("Suggested questions", "Pertanyaan yang disarankan")}
              </p>
              {SUGGESTED_CATEGORIES.map((cat) => {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sendMessage(cat.question[language]);
                      if (window.matchMedia("(max-width: 1023px)").matches) setSidebarOpen(false);
                    }}
                    className="flex items-start gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-[#465FFF]/15 hover:bg-[#465FFF]/5 active:scale-[0.98]"
                  >
                    <span className="text-[12px] font-semibold leading-snug text-slate-700">
                      {cat.question[language]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-[#5A6478] transition hover:border-[#465FFF]/20 hover:text-[#3B52F5] lg:hidden"
            >
              {sidebarOpen ? <ChevronDown size={14} className="rotate-90" /> : <ChevronRight size={14} />}
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-black text-slate-900">{tAsk("title")}</h1>
            </div>
            {lastModel && (
              <span title={language === "id" ? "Model yang menghasilkan jawaban terakhir" : "Model that produced the latest answer"} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-[#5A6478]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                {lastModel}
              </span>
            )}
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-[#5A6478] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {pickL("Clear", "Hapus percakapan")}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[#465FFF] px-4 py-3 shadow-sm">
                      <p className="text-[13px] font-semibold leading-relaxed text-white">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="flex-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    {/* Demo badge */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black text-slate-900">Narriv</span>
                        {msg.confidence && <ConfidenceChip confidence={msg.confidence} t={tAsk} />}
                      </div>
                      {msg.isDemo && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#6E44E8]">
                          DEMO
                        </span>
                      )}
                    </div>

                    {/* Content — render newlines as paragraphs */}
                    <div className="space-y-2">
                      {msg.content.split("\n\n").map((para, i) => {
                        if (para.startsWith("**") && para.endsWith("**")) {
                          return (
                            <p key={i} className="text-[13px] font-black text-slate-900">
                              {para.slice(2, -2)}
                            </p>
                          );
                        }
                        return (
                          <p key={i} className="text-[13px] font-semibold leading-relaxed text-slate-600">
                            {para}
                          </p>
                        );
                      })}
                    </div>

                    {msg.coverage ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#5A6478]">{msg.coverage}</p>
                    ) : null}

                    {/* Metrics */}
                    {msg.metrics && msg.metrics.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {msg.metrics.map((m, i) => (
                          <div key={i} className="rounded-xl bg-[#EEF1FF] px-3 py-2.5 text-center">
                            <p className="text-[11px] font-bold text-[#3B52F5]">{m.label}</p>
                            <p className="mt-0.5 text-[18px] font-black text-slate-900">{m.value || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Evidence bullets */}
                    {msg.evidence && msg.evidence.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        <li className="text-[10px] font-black text-[#5A6478]">{language === "id" ? "Sumber yang dikutip" : "Sources cited"}</li>
                        {msg.evidence.map((e) => {
                          const label = e.title || e.id;
                          const kind = e.kind === "alert" ? "Alert" : e.kind === "narrative" ? "Narrative" : e.kind === "signal" ? "Signal" : "Record";
                          const href = e.kind === "signal" ? e.url : e.kind === "alert" ? `/alerts/${e.id}` : e.kind === "narrative" ? "/intelligence" : null;
                          return (
                            <li key={e.id} className="flex items-start gap-2 text-[12px] font-semibold text-[#5A6478]">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#465FFF]/40" />
                              <span className="min-w-0">
                                <span className="mr-1.5 text-[10px] font-black text-[#5A6478]">{kind}</span>
                                {href ? (
                                  <a href={href} {...(e.kind === "signal" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-[#3B52F5] underline-offset-2 hover:underline">{label}</a>
                                ) : (
                                  label
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#3B52F5] transition hover:text-[#6E44E8] hover:underline"
                          >
                            {link.label}
                            <ChevronRight size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length <= 1 && dashboardSummary ? (
              <AskPulse summary={dashboardSummary} topIssue={narratives?.data?.[0] ?? null} onAsk={sendMessage} language={language} />
            ) : null}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-5 py-4 shadow-sm">
                  <p className="mb-2 text-[12px] font-semibold text-[#5A6478]">{tAsk("thinking")}</p>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 typing-dot rounded-full bg-[#465FFF]/40 [animation-delay:0ms]" />
                    <span className="h-2 w-2 typing-dot rounded-full bg-[#465FFF]/40 [animation-delay:150ms]" />
                    <span className="h-2 w-2 typing-dot rounded-full bg-[#465FFF]/40 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-100 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-[#465FFF]/40 focus-within:bg-white focus-within:shadow-sm">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tAsk("placeholder")}
                rows={1}
                className="w-full resize-none bg-transparent text-[13px] font-semibold text-slate-900 placeholder:text-[#5A6478] focus:outline-none"
                style={{ minHeight: "20px", maxHeight: "120px" }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#465FFF] text-white shadow-sm transition-all hover:bg-[#3b50d8] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={tAsk("send")}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] font-semibold text-[#5A6478]">
            {pickL("Press Enter to send · Shift+Enter for a new line", "Tekan Enter untuk kirim · Shift+Enter untuk baris baru")}
          </p>
        </div>
      </main>
    </div>
  );
}

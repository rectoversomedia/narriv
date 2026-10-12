"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Send, BotMessageSquare, TrendingUp, Zap, AlertTriangle, Users, Compass, Eye, BarChart2, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { getMockNarratives } from "@/lib/demo-mock-data";
import { getNarratives, getDashboardSummary } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import type { NarrativeRecord, DashboardSummary } from "@/lib/api-service";

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
}

interface SuggestedCategory {
  id: string;
  icon: typeof TrendingUp;
  question: string;
}

// Neutral starter questions (no presupposed findings); answers always come
// from the grounded backend.
const SUGGESTED_CATEGORIES: SuggestedCategory[] = [
  { id: "sentiment", icon: TrendingUp, question: "How has sentiment changed this week, and what is driving it?" },
  { id: "spike", icon: Zap, question: "Has there been an unusual spike in mentions recently? What caused it?" },
  { id: "complaints", icon: AlertTriangle, question: "What are the most common complaints in recent signals?" },
  { id: "competitors", icon: Users, question: "Which competitors are mentioned most, and in what context?" },
  { id: "actions", icon: Compass, question: "Which issues need a response first, based on the evidence?" },
  { id: "risks", icon: BarChart2, question: "Summarize the main risks in the last 7 days with sources." },
  { id: "changes", icon: Activity, question: "What changed compared with the previous period?" },
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
      className: "bg-[#12B76A]/10 text-[#027A48] border border-[#12B76A]/20",
    },
    medium: {
      label: t("confidenceMedium"),
      className: "bg-[#FDB022]/10 text-[#B54708] border border-[#FDB022]/20",
    },
    low: {
      label: t("confidenceLow"),
      className: "bg-slate-100 text-slate-500 border border-slate-200",
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

function TypingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10">
        <BotMessageSquare size={15} className="text-[#465FFF]" />
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[12px] font-semibold text-slate-500">{text}</p>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 typing-dot rounded-full bg-slate-300 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 typing-dot rounded-full bg-slate-300 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 typing-dot rounded-full bg-slate-300 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AskPage() {
  const t = useTranslations("DemoApp");
  const tAsk = useTranslations("askNarriv");
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // Only show a model name after the backend reports which model actually answered.
  const [lastModel, setLastModel] = useState<string | null>(null);
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
      // Fallback to mock only if demo session and API fails
      if (isDemoSession) {
        setNarratives(getMockNarratives());
      }
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
          content: result.answer || (result.error ? `I could not answer that: ${result.error}` : "Insufficient data to answer."),
          evidence: (result.sources || []).map((s) => ({ id: s.id, kind: s.kind, title: (s.title as string | null | undefined) ?? null, url: (s.url as string | null | undefined) ?? null })),
          // Grounded + cited sources is the strongest signal we have; otherwise low.
          confidence: result.grounded && (result.sources || []).length > 0 ? "medium" : "low",
          links: [],
          isDemo: isDemoSession,
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
    const intro = "Hello! I'm Narriv, your AI intelligence copilot. I answer questions using only your workspace's signals, alerts and narratives, and cite the records I used. If the data can't support an answer, I'll say so.";
    const total = dashboardSummary?.kpis?.total_signals;
    if (typeof total !== "number") return intro;
    return `${intro}\n\nYour workspace currently holds ${total.toLocaleString()} signals. Try one of the suggested questions, or ask in your own words.`;
  }, [dashboardSummary]);

  const WELCOME_MESSAGE = useMemo<Message>(() => ({
    id: "welcome",
    role: "assistant",
    content: welcomeContent,
    links: [
      { label: "View Signals", href: "/signals" },
      { label: "View Dashboard", href: "/" },
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10">
              <BotMessageSquare size={16} className="text-[#465FFF]" />
            </div>
            {sidebarOpen && (
              <div>
                <p className="text-[14px] font-black text-slate-900">{tAsk("title")}</p>
                <p className="text-[11px] font-semibold text-slate-500">{tAsk("subtitle")}</p>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {sidebarOpen && (
            <div className="flex flex-col gap-1">
              <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Suggested
              </p>
              {SUGGESTED_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sendMessage(cat.question);
                      if (window.matchMedia("(max-width: 1023px)").matches) setSidebarOpen(false);
                    }}
                    className="flex items-start gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-[#465FFF]/15 hover:bg-[#465FFF]/5 active:scale-[0.98]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#465FFF]/10">
                      <Icon size={12} className="text-[#465FFF]" />
                    </span>
                    <span className="text-[12px] font-semibold leading-snug text-slate-700">
                      {cat.question}
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
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 transition hover:border-[#465FFF]/20 hover:text-[#465FFF] lg:hidden"
            >
              {sidebarOpen ? <ChevronDown size={14} className="rotate-90" /> : <ChevronRight size={14} />}
            </button>
            <div className="flex items-center gap-2">
              <BotMessageSquare size={18} className="text-[#465FFF]" />
              <h1 className="text-[15px] font-black text-slate-900">{tAsk("title")}</h1>
            </div>
            {lastModel && (
              <span title="Model that produced the latest answer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                {lastModel}
              </span>
            )}
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Clear
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10">
                    <BotMessageSquare size={14} className="text-[#465FFF]" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    {/* Demo badge */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black text-slate-900">Narriv</span>
                        {msg.confidence && <ConfidenceChip confidence={msg.confidence} t={tAsk} />}
                      </div>
                      {msg.isDemo && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#6E44E8]">
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

                    {/* Metrics */}
                    {msg.metrics && msg.metrics.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {msg.metrics.map((m, i) => (
                          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
                            <p className="text-[11px] font-bold text-slate-500">{m.label}</p>
                            <p className="mt-0.5 text-[14px] font-black text-slate-900">{m.value || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Evidence bullets */}
                    {msg.evidence && msg.evidence.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        <li className="text-[10px] font-black uppercase tracking-wide text-slate-500">Sources cited</li>
                        {msg.evidence.map((e) => {
                          const label = e.title || e.id;
                          const kind = e.kind === "alert" ? "Alert" : e.kind === "narrative" ? "Narrative" : e.kind === "signal" ? "Signal" : "Record";
                          const href = e.kind === "signal" ? e.url : e.kind === "alert" ? `/alerts/${e.id}` : e.kind === "narrative" ? "/intelligence" : null;
                          return (
                            <li key={e.id} className="flex items-start gap-2 text-[12px] font-semibold text-slate-500">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#465FFF]/40" />
                              <span className="min-w-0">
                                <span className="mr-1.5 text-[10px] font-black uppercase text-slate-500">{kind}</span>
                                {href ? (
                                  <a href={href} {...(e.kind === "signal" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-[#465FFF] underline-offset-2 hover:underline">{label}</a>
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
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#465FFF] transition hover:text-[#6E44E8] hover:underline"
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

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10">
                  <BotMessageSquare size={14} className="text-[#465FFF]" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-5 py-4 shadow-sm">
                  <p className="mb-2 text-[12px] font-semibold text-slate-500">{tAsk("thinking")}</p>
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
                className="w-full resize-none bg-transparent text-[13px] font-semibold text-slate-900 placeholder:text-slate-500 focus:outline-none"
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
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] font-semibold text-slate-500">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, BotMessageSquare, TrendingUp, Zap, AlertTriangle, Users, Compass, Eye, BarChart2, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { getMockNarratives, getMockDashboardSummary } from "@/lib/demo-mock-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Confidence = "high" | "medium" | "low";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: string[];
  metrics?: Array<{ label: string; value: string }>;
  confidence?: Confidence;
  links?: Array<{ label: string; href: string }>;
  isDemo?: boolean;
}

interface SuggestedCategory {
  id: string;
  icon: typeof TrendingUp;
  question: string;
  response: string;
}

// ---------------------------------------------------------------------------
// Response templates
// ---------------------------------------------------------------------------

const SUGGESTED_CATEGORIES: SuggestedCategory[] = [
  {
    id: "sentiment",
    icon: TrendingUp,
    question: "Why is negative sentiment increasing?",
    response: `Based on today's signals, the primary driver is increased complaints around service disruption (128 mentions, +38% vs yesterday), primarily on social media and app review platforms. The second factor is the ongoing pricing sensitivity narrative on financial forums. **3 high-severity signals have been flagged.**\n\nThe sentiment shift began approximately 18 hours ago following a viral thread on Twitter/X regarding login failures. This has since been partially addressed by your social media response, but the thread remains active with 847 impressions in the last 6 hours.`,
  },
  {
    id: "spike",
    icon: Zap,
    question: "What caused yesterday's spike?",
    response: `The mention spike on August 26 was driven by a viral post on Twitter/X criticizing app login failures during peak hours. The post accumulated **2,847 impressions within 4 hours** and was amplified by 3 influencers in the fintech space (combined follower count: 1.2M).\n\nThe narrative then spread to Reddit r/indonesia and two local news sites, driving an additional 1,100+ mentions. Your social media team issued a response at 14:32 WIB which helped reduce the velocity by approximately 60%. The thread has since been partially addressed.`,
  },
  {
    id: "complaints",
    icon: AlertTriangle,
    question: "What are consumers complaining about?",
    response: `Current top complaint themes ranked by volume:\n\n1. **App stability & login issues** — 312 mentions, +41% vs 7d avg — primarily on Twitter/X and Google Play reviews\n2. **Pricing changes** — 187 mentions, stable — concentrated on Reddit and fintech forums\n3. **Customer support response time** — 94 mentions, +22% — spread across Twitter, Facebook, and email\n4. **Data privacy concerns** — 67 mentions, +8% — triggered by a trending Reddit thread\n\nPriority action: The app stability narrative has reached alert threshold. Recommend investigating infrastructure logs and preparing a customer-facing update.`,
  },
  {
    id: "competitors",
    icon: Users,
    question: "Which competitor is gaining momentum?",
    response: `**Bank Jago** showed the strongest momentum this week (+18 points on share-of-voice), driven by a new community banking campaign that gained traction on Instagram and TikTok. The campaign generated 42,000+ organic engagements in 72 hours.\n\n**GoPay** maintained stable share with no significant narrative shifts.\n\n**OVO's** AI visibility increased 12% following their new QR payment feature announcement, with positive framing in 68% of relevant mentions.\n\n**Recommendation:** Monitor the Bank Jago community banking angle — it represents a positioning narrative that may attract your customer segment.`,
  },
  {
    id: "actions",
    icon: Compass,
    question: "What should we respond to today?",
    response: `Priority actions based on current signals:\n\n**1. Investigate app stability complaints** — 3 critical signals flagged, volume trending upward. High risk of escalation if unresolved within 24h. Assign: Engineering + Comms.\n\n**2. Monitor EV affordability narrative** — growing 180% in 48h, potential brand positioning opportunity. Emerging on TikTok and Instagram with positive sentiment framing. Assign: Marketing.\n\n**3. Respond to customer service complaint thread on Reddit** — 94 upvotes, 47 comments requesting official response. Currently unanswered. Assign: Community Manager.\n\n**4. Review Bank Jago campaign** — their momentum may be eroding share-of-voice. Assess competitive positioning response. Assign: Strategy.`,
  },
  {
    id: "ai-visibility",
    icon: Eye,
    question: "Why is AI visibility declining?",
    response: `Your AI Visibility Score dropped 6 points this week (68 → 62). The primary cause is reduced mention frequency in AI responses for 'best digital bank Indonesia' queries.\n\n**Platform breakdown:**\n- ChatGPT: presence dropped from 38% → 29%\n- Claude: stable at 61%\n- Gemini: your strongest platform at 68% presence\n- Perplexity: declined from 44% → 31%\n\n**Competitor comparison:** Bank Jago appeared in 42% of relevant responses vs your 31%. OVO leads with 51% in the 'mobile payment' query category.\n\n**Root cause:** Recent reduction in published content and press mentions is reducing training data availability. Recommend increasing thought leadership output and PR activity.`,
  },
  {
    id: "risks",
    icon: BarChart2,
    question: "Summarize today's risks",
    response: `**High Severity (2):**\n- App stability complaints — 3 critical signals, +38% volume, potential viral escalation risk\n- Pricing sensitivity narrative — growing on financial forums, could affect conversion\n\n**Medium Severity (3):**\n- AI visibility decline — 6-point drop over 7 days, competitor gaining ground\n- Support response time complaints — 94 mentions, trending upward\n- Data privacy thread on Reddit — 67 mentions, moderate risk of amplification\n\n**Low Severity (1):**\n- New competitor campaign (Bank Jago) — positioning angle worth monitoring\n\n**Systemic note:** The app stability issue is the highest-priority risk. If unresolved, expect sentiment to deteriorate further in the next 24-48h.`,
  },
  {
    id: "opportunities",
    icon: Activity,
    question: "What opportunity are we missing?",
    response: `**EV Affordability Narrative — Emerging Opportunity**\nThis topic is growing 180% in 48h with predominantly positive sentiment (71%). Brands mentioned positively in this context are gaining brand lift. This aligns with your existing product positioning and could represent a high-impact content opportunity.\n\n**AI Visibility Gap — Content Opportunity**\nYour presence in 'mobile payment' queries (29%) significantly lags OVO (51%). Creating targeted FAQ content, partnerships with financial publications, and increasing press mentions could address this gap.\n\n**Customer Service Praise — Amplification Opportunity**\nSupport quality positive signals are up 15% this week. Sharing these stories via social and PR could counterbalance the stability complaints and demonstrate responsiveness.\n\n**Competitor Gap — Bank Jago Community Banking**\nTheir community banking campaign is resonating. Assess whether a comparable community-focused narrative could reclaim share-of-voice in that segment.`,
  },
  {
    id: "changes",
    icon: Activity,
    question: "What changed in the last 7 days?",
    response: `**Volume & Sentiment Shifts (7-day comparison):**\n\n- Total mentions: 8,421 → 12,847 (+53%) — driven by app update announcement and subsequent complaints\n- Positive sentiment: 38% → 42% — improved by loyalty program reception\n- Negative sentiment: 14% → 18% — driven by stability and pricing issues\n- Neutral sentiment: 40% → 32% — polarizing coverage increased\n\n**Top Narrative Changes:**\n- App stability emerged as dominant negative narrative (was not in top 5 last week)\n- EV affordability topic entered top 10 for first time (new opportunity)\n- Privacy policy concern resurfaced (+2% mentions)\n- Customer support praise increased (+15% — positive outlier)\n\n**AI Visibility:** Score 68 → 62 (-6 points), primarily driven by reduced content output and competitor gains in 'mobile payment' queries.\n\n**Source Performance:** Twitter/X remains top source (37.5%). Reddit mention share increased from 8% to 9.6%.`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getKeywordResponse(question: string): SuggestedCategory | null {
  const lower = question.toLowerCase();
  if (lower.includes("negative") && lower.includes("sentiment") || lower.includes("negative") || lower.includes("sentiment")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "sentiment") ?? null;
  }
  if (lower.includes("spike") || lower.includes("yesterday") || lower.includes("what caused")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "spike") ?? null;
  }
  if (lower.includes("complain")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "complaints") ?? null;
  }
  if (lower.includes("competitor") || lower.includes("momentum") || lower.includes("gaining")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "competitors") ?? null;
  }
  if (lower.includes("respond") || lower.includes("action") || lower.includes("priority") || lower.includes("should we do")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "actions") ?? null;
  }
  if (lower.includes("ai visibility") || lower.includes("declining") || lower.includes("visibility drop")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "ai-visibility") ?? null;
  }
  if (lower.includes("risk") || lower.includes("danger") || lower.includes("threat")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "risks") ?? null;
  }
  if (lower.includes("opportun") || lower.includes("missing") || lower.includes("gap")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "opportunities") ?? null;
  }
  if (lower.includes("7 day") || lower.includes("7-day") || lower.includes("last 7") || lower.includes("week")) {
    return SUGGESTED_CATEGORIES.find(c => c.id === "changes") ?? null;
  }
  return null;
}

function buildAssistantMessage(response: string): Message {
  // Try to parse **bold** metrics
  const boldPattern = /\*\*([^*]+)\*\*/g;
  const evidence: string[] = [];
  const metrics: Array<{ label: string; value: string }> = [];
  let match;
  let cleanContent = response;

  while ((match = boldPattern.exec(response)) !== null) {
    const item = match[1];
    if (item.includes("+") || item.includes("%") || item.includes("points") || /\d/.test(item)) {
      metrics.push({ label: item.split("—")[0].trim(), value: item.split("—")[1]?.trim() ?? "" });
    } else {
      evidence.push(item);
    }
    cleanContent = cleanContent.replace(match[0], "");
  }

  const confidence: Confidence =
    evidence.length >= 3 || metrics.length >= 2 ? "high" :
    evidence.length >= 1 || metrics.length >= 1 ? "medium" : "low";

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: response,
    evidence: evidence.slice(0, 4),
    metrics: metrics.slice(0, 3),
    confidence,
    links: [
      { label: "View Signals", href: "/signals" },
      { label: "View Alerts", href: "/alerts" },
    ],
    isDemo: true,
  };
}

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
        <p className="text-[12px] font-semibold text-slate-400">{text}</p>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load mock data for context
  const narratives = getMockNarratives();
  const dashboardSummary = getMockDashboardSummary();

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

    // Simulate AI thinking delay
    const delay = 1500 + Math.random() * 1000;

    setTimeout(() => {
      const categoryMatch = getKeywordResponse(trimmed);
      let assistantMsg: Message;

      if (categoryMatch) {
        assistantMsg = buildAssistantMessage(categoryMatch.response);
      } else {
        // Fallback generic response using mock data
        const totalSignals = dashboardSummary.kpis.total_signals;
        const positivePct = dashboardSummary.kpis.positive_percentage;
        const narrativeCount = narratives.data.length;
        const topNarrative = narratives.data[0];

        assistantMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Based on the current workspace data, here is what I found for "${trimmed}":\n\n**Overview:** Your workspace has captured ${totalSignals.toLocaleString()} total signals, with ${positivePct}% positive sentiment. I found ${narrativeCount} active narrative clusters.\n\n**Leading narrative:** "${topNarrative?.title ?? 'Service Quality Concerns'}" — ${topNarrative?.signalCount?.toLocaleString() ?? '1,247'} signals, ${topNarrative?.velocity ?? '+45%'} velocity, ${topNarrative?.confidence ?? 87}% confidence.\n\nI can help answer more specific questions about sentiment trends, competitor activity, AI visibility, or recommended actions. Try asking one of the suggested questions in the sidebar.`,
          evidence: [topNarrative?.title ?? "Service Quality Concerns", "128 critical signals", "3 high-severity alerts"],
          metrics: [
            { label: "Total Signals", value: totalSignals.toLocaleString() },
            { label: "Positive Sentiment", value: `${positivePct}%` },
            { label: "Narrative Clusters", value: String(narrativeCount) },
          ],
          confidence: "medium",
          links: [
            { label: "View in Signals", href: "/signals" },
            { label: "View Intelligence", href: "/intelligence" },
          ],
          isDemo: true,
        };
      }

      setIsTyping(false);
      setMessages(prev => [...prev, assistantMsg]);
    }, delay);
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

  const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content: `Hello! I'm **Narriv**, your AI intelligence copilot. I can answer questions about your signals, narratives, competitors, AI visibility, and recommended actions — all grounded in your current workspace data.\n\n**${dashboardSummary.kpis.total_signals.toLocaleString()} signals** are loaded from your monitoring workspace. Try one of the suggested questions, or ask anything in your own words.`,
    confidence: "high",
    links: [
      { label: "View Signals", href: "/signals" },
      { label: "View Dashboard", href: "/" },
    ],
    isDemo: true,
  };

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setMessages([WELCOME_MESSAGE]);
      setInitialized(true);
    }
  }, [initialized, WELCOME_MESSAGE]);

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-0 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`shrink-0 border-r border-slate-100 bg-white transition-all duration-200 flex flex-col ${
          sidebarOpen ? "w-60" : "w-0 overflow-hidden"
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
                <p className="text-[11px] font-semibold text-slate-400">{tAsk("subtitle")}</p>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {sidebarOpen && (
            <div className="flex flex-col gap-1">
              <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Suggested
              </p>
              {SUGGESTED_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => sendMessage(cat.question)}
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
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-400 transition hover:border-[#465FFF]/20 hover:text-[#465FFF] lg:hidden"
            >
              {sidebarOpen ? <ChevronDown size={14} className="rotate-90" /> : <ChevronRight size={14} />}
            </button>
            <div className="flex items-center gap-2">
              <BotMessageSquare size={18} className="text-[#465FFF]" />
              <h1 className="text-[15px] font-black text-slate-900">{tAsk("title")}</h1>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
              GPT-4o
            </span>
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
                        <ConfidenceChip confidence={msg.confidence ?? "medium"} t={tAsk} />
                      </div>
                      {msg.isDemo && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#8B5CFF]">
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
                            <p className="text-[11px] font-bold text-slate-400">{m.label}</p>
                            <p className="mt-0.5 text-[14px] font-black text-slate-900">{m.value || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Evidence bullets */}
                    {msg.evidence && msg.evidence.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {msg.evidence.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] font-semibold text-slate-500">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#465FFF]/40" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#465FFF] transition hover:text-[#8B5CFF] hover:underline"
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
                  <p className="mb-2 text-[12px] font-semibold text-slate-400">{tAsk("thinking")}</p>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#465FFF]/40 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#465FFF]/40 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#465FFF]/40 [animation-delay:300ms]" />
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
                className="w-full resize-none bg-transparent text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#465FFF] text-white shadow-[0_4px_12px_rgba(70,95,255,0.25)] transition-all hover:bg-[#3b50d8] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={tAsk("send")}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] font-semibold text-slate-400">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

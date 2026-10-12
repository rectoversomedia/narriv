"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";
import {
  Search,
  Book,
  MessageCircle,
  Mail,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ArrowLeft,
  Video,
  FileText,
  Zap,
  Shield,
  Users,
  BarChart3,
  Bell,
  Database,
  Bot,
  Settings,
  Globe,
  Clock,
} from "lucide-react";

import { X, BookOpen } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils";

const categories = [
  {
    id: "getting-started",
    icon: Zap,
    color: "bg-blue-500",
    title: "Getting Started",
    description: "Learn the basics of Narriv",
    topics: [
      { title: "Quick Start Guide", slug: "quick-start" },
      { title: "Dashboard Overview", slug: "dashboard-overview" },
      { title: "Setting Up Your Workspace", slug: "workspace-setup" },
      { title: "Inviting Team Members", slug: "team-invitation" },
    ],
  },
  {
    id: "data-sources",
    icon: Database,
    color: "bg-purple-500",
    title: "Data Sources",
    description: "Configure and manage data sources",
    topics: [
      { title: "Adding Your First Source", slug: "adding-source" },
      { title: "Supported Platforms", slug: "supported-platforms" },
      { title: "Apify Integration", slug: "apify-integration" },
      { title: "Webhook Setup", slug: "webhook-setup" },
    ],
  },
  {
    id: "signals",
    icon: BarChart3,
    color: "bg-green-500",
    title: "Signals & Monitoring",
    description: "Understanding signals and monitoring",
    topics: [
      { title: "What Are Signals?", slug: "what-are-signals" },
      { title: "Filtering & Search", slug: "filtering-search" },
      { title: "Sentiment Analysis", slug: "sentiment-analysis" },
      { title: "Exporting Data", slug: "exporting-data" },
    ],
  },
  {
    id: "alerts",
    icon: Bell,
    color: "bg-red-500",
    title: "Alerts & Notifications",
    description: "Setting up and managing alerts",
    topics: [
      { title: "Alert Types Explained", slug: "alert-types" },
      { title: "Creating Custom Alerts", slug: "custom-alerts" },
      { title: "Escalation Matrix", slug: "escalation-matrix" },
      { title: "Notification Channels", slug: "notification-channels" },
    ],
  },
  {
    id: "ai",
    icon: Bot,
    color: "bg-indigo-500",
    title: "AI & Automation",
    description: "Leveraging AI features",
    topics: [
      { title: "AI Signal Analysis", slug: "ai-analysis" },
      { title: "Generating Action Plans", slug: "action-plans" },
      { title: "Narrative Clustering", slug: "narrative-clustering" },
      { title: "AI Visibility Reports", slug: "ai-visibility" },
    ],
  },
  {
    id: "reports",
    icon: FileText,
    color: "bg-amber-500",
    title: "Reports & Analytics",
    description: "Creating and managing reports",
    topics: [
      { title: "Report Templates", slug: "report-templates" },
      { title: "Scheduled Reports", slug: "scheduled-reports" },
      { title: "Custom Reports", slug: "custom-reports" },
      { title: "Export Formats", slug: "export-formats" },
    ],
  },
  {
    id: "team",
    icon: Users,
    color: "bg-teal-500",
    title: "Team Management",
    description: "Collaboration and access control",
    topics: [
      { title: "Roles & Permissions", slug: "roles-permissions" },
      { title: "Workspace Settings", slug: "workspace-settings" },
      { title: "Audit Logs", slug: "audit-logs" },
    ],
  },
  {
    id: "security",
    icon: Shield,
    color: "bg-slate-600",
    title: "Security & Compliance",
    description: "Data security and privacy",
    topics: [
      { title: "Data Encryption", slug: "data-encryption" },
      { title: "GDPR Compliance", slug: "gdpr-compliance" },
      { title: "API Security", slug: "api-security" },
    ],
  },
];


interface Article {
  title: string;
  slug: string;
  content: string;
  category: string;
  lastUpdated: string;
  helpful: number;
}

function ArticlePage({ article }: { article: Article }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/help" className="inline-flex items-center gap-2 text-sm text-[#5A6478] hover:text-slate-900 mb-6">
        <ArrowLeft size={16} />
        Back to Help Center
      </Link>

      <article className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {article.category}
          </span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4">{article.title}</h1>

        <p className="text-sm text-[#5A6478] mb-8">Last updated: {article.lastUpdated}</p>

        <div
          className="prose prose-slate max-w-none"
          // SECURITY: Sanitize HTML content to prevent XSS attacks
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />

        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-900 mb-4">Was this article helpful?</p>
          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Yes, helpful
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Not helpful
            </button>
          </div>
        </div>
      </article>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Still need help?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Link
            href="/help#contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Contact Support
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  onClick,
}: {
  category: (typeof categories)[0];
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <button
      onClick={onClick}
      className="text-left group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${category.color} text-white`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {category.title}
          </h3>
          <p className="mt-1 text-sm text-[#5A6478] line-clamp-2">{category.description}</p>
        </div>
        <ChevronRight
          size={20}
          className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors"
        />
      </div>
    </button>
  );
}

function TopicList({
  category,
  onBack,
}: {
  category: (typeof categories)[0];
  onBack: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-[#5A6478] hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={16} />
        All Categories
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${category.color} text-white`}>
          <category.icon size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{category.title}</h1>
          <p className="text-[#5A6478]">{category.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {category.topics.map((topic) => (
          <div key={topic.slug} className="flex items-center justify-between p-5">
            <span className="font-medium text-slate-900">{topic.title}</span>
            <span className="text-xs font-semibold text-[#5A6478]">Guide not yet published</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  results,
}: {
  query: string;
  results: Array<{ q: string; a: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-sm text-[#5A6478] mb-6">
        {results.length} matching answers for &quot;{query}&quot;
      </p>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.q} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900">{result.q}</h3>
            <p className="mt-2 text-sm text-slate-600">{result.a}</p>
          </div>
        ))}
        {results.length === 0 ? <p className="text-sm text-[#5A6478]">No answers match. Contact support below.</p> : null}
      </div>
    </div>
  );
}

export default function HelpCenterPage() {
  const t = useTranslations("HelpCenter");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[0] | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Answers describe current product behavior only.
  const faqs = [
    {
      q: "How do I get started with Narriv?",
      a: "Create an account and complete onboarding, then add monitoring keywords in Settings → Monitoring Keywords. Scheduled ingestion runs every 6 hours, collects news for your active keywords, and the AI analysis step classifies each new signal. Narratives, risk and recommendations are built from those stored signals.",
    },
    {
      q: "What data sources does Narriv support?",
      a: "Scheduled ingestion collects online news for your active monitoring keywords. Additional connectors are listed on the Data Sources page with their real connection status; a connector only collects data once it is configured and healthy.",
    },
    {
      q: "How does AI sentiment analysis work?",
      a: "Each new signal is analyzed by an AI model that assigns a sentiment and a confidence score. Signals that have not been analyzed yet are shown as \"Not analyzed\" rather than given a default sentiment. AI assessments are marked as such and should be reviewed alongside the linked sources.",
    },
    {
      q: "How do alerts work?",
      a: "Narriv raises alerts automatically when it detects qualifying spikes in negative coverage, with links to the signals involved. Notifications are delivered only through integrations you have configured on the Integrations page.",
    },
    {
      q: "How do I add team members?",
      a: "Go to Settings → User & Access Management and add a registered user by email. Roles are Owner, Admin and Analyst; only owners and admins can change members, settings and monitoring keywords.",
    },
    {
      q: "What export formats are available?",
      a: "Signals can be exported as CSV or Excel from the Signals page, reports can be exported from the Reports page, and the Daily Brief can be printed or saved as PDF from your browser.",
    },
  ];

  // Simple search simulation
  const searchResults = searchQuery
    ? faqs.filter((f) =>
        `${f.q} ${f.a}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm mb-6">
            <Book size={16} />
            Knowledge Base
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">How can we help you?</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Search our knowledge base or browse categories below
          </p>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-12 pr-4 text-white placeholder:text-slate-300 backdrop-blur-sm focus:border-indigo-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        {/* Search Results */}
        {searchQuery ? (
          <SearchResults query={searchQuery} results={searchResults} />
        ) : selectedCategory ? (
          <TopicList category={selectedCategory} onBack={() => setSelectedCategory(null)} />
        ) : (
          <>
            {/* Categories Grid */}
            <section className="mx-auto max-w-6xl">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Browse by Category</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="mx-auto max-w-4xl mt-16">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left"
                    >
                      <span className="font-medium text-slate-900">{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-[#5A6478] transition-transform ${
                          expandedFaq === idx ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Contact Support CTA */}
            <section id="contact" className="mx-auto max-w-4xl mt-16 scroll-mt-24">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white">
                <MessageCircle size={40} className="mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-bold">Still need help?</h2>
                {SUPPORT_EMAIL ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10 transition-colors"
                    >
                      <Mail size={18} />
                      Email Support ({SUPPORT_EMAIL})
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-white/80">
                    A support mailbox has not been published yet. Please contact your Narriv account representative or your workspace owner.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-[#5A6478]">
            <Link href="/help#contact" className="hover:text-slate-900">Contact</Link>
          </div>
          <p className="text-sm text-[#5A6478]">© {new Date().getFullYear()} Narriv. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

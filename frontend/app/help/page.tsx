"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
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

import { videoWalkthroughs, type VideoWalkthrough } from "@/components/help/video-walkthroughs";
import { VideoCard, VideoScriptOutline } from "@/components/help/VideoCard";
import { VideoPlayer } from "@/components/help/VideoPlayer";
import { X, BookOpen } from "lucide-react";

const categories = [
  {
    id: "getting-started",
    icon: Zap,
    color: "bg-blue-500",
    title: "Getting Started",
    description: "Learn the basics of Narriv",
    articles: 8,
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
    articles: 12,
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
    articles: 15,
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
    articles: 10,
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
    articles: 9,
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
    articles: 7,
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
    articles: 6,
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
    articles: 5,
    topics: [
      { title: "Data Encryption", slug: "data-encryption" },
      { title: "GDPR Compliance", slug: "gdpr-compliance" },
      { title: "API Security", slug: "api-security" },
    ],
  },
];

const popularArticles = [
  { title: "How to set up your first data source", views: 12500, slug: "first-data-source" },
  { title: "Understanding sentiment analysis", views: 8900, slug: "understanding-sentiment" },
  { title: "Creating effective alert rules", views: 7200, slug: "effective-alert-rules" },
  { title: "API authentication guide", views: 6800, slug: "api-authentication" },
  { title: "Team roles and permissions", views: 5400, slug: "team-roles" },
  { title: "Scheduled reports setup", views: 4200, slug: "scheduled-reports-setup" },
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
      <Link href="/help" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
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

        <p className="text-sm text-slate-500 mb-8">Last updated: {article.lastUpdated}</p>

        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-900 mb-4">Was this article helpful?</p>
          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              👍 Yes, helpful
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              👎 Not helpful
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
            href="/help/contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Contact Support
            <ChevronRight size={14} />
          </Link>
        </div>
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Related Articles</h3>
          <ul className="space-y-3">
            <li>
              <Link
                href="/help/article/quick-start"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Getting Started Guide →
              </Link>
            </li>
            <li>
              <Link
                href="/help/article/dashboard-overview"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Dashboard Overview →
              </Link>
            </li>
            <li>
              <Link
                href="/help/article/api-authentication"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                API Authentication →
              </Link>
            </li>
          </ul>
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
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{category.description}</p>
          <p className="mt-2 text-xs text-slate-400">{category.articles} articles</p>
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
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
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
          <p className="text-slate-500">{category.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {category.topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/help/article/${topic.slug}`}
            className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-slate-900">{topic.title}</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
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
  results: typeof popularArticles;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-sm text-slate-500 mb-6">
        {results.length} results for "{query}"
      </p>

      <div className="space-y-4">
        {results.map((result) => (
          <Link
            key={result.slug}
            href={`/help/article/${result.slug}`}
            className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all"
          >
            <h3 className="font-bold text-slate-900 hover:text-indigo-600">{result.title}</h3>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">
              Learn how to accomplish this task with our step-by-step guide...
            </p>
            <p className="mt-2 text-xs text-slate-400">{result.views.toLocaleString()} views</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HelpCenterPage() {
  const t = useTranslations("HelpCenter");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[0] | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoWalkthrough | null>(null);

  const faqs = [
    {
      q: "How do I get started with Narriv?",
      a: "Getting started is easy! First, sign up for an account and complete the onboarding flow. Then, add your first data source, configure your monitoring keywords, and set up alerts. Our AI will automatically analyze signals and generate insights.",
    },
    {
      q: "What data sources does Narriv support?",
      a: "Narriv supports various data sources including Twitter/X, Facebook, Instagram, Reddit, news websites, blogs, forums, and custom webhooks. You can connect multiple sources to monitor your brand's narrative across the internet.",
    },
    {
      q: "How does AI sentiment analysis work?",
      a: "Our AI uses advanced natural language processing to analyze signal content and determine sentiment (positive, negative, neutral, or mixed). The analysis includes confidence scores and key talking points to help you understand public perception.",
    },
    {
      q: "Can I set up custom alerts?",
      a: "Yes! Narriv's alert system automatically detects narrative trends and risk signals. You can also create custom alerts based on keywords, sentiment changes, or volume spikes. Alerts can be sent via email, Slack, Teams, or webhook.",
    },
    {
      q: "How do I add team members?",
      a: "Go to Workspace Settings > Team Members and click 'Invite Member'. Enter their email address and select a role (Admin, Editor, or Viewer). They'll receive an invitation email to join your workspace.",
    },
    {
      q: "What export formats are available?",
      a: "Narriv supports exporting data in multiple formats including CSV, JSON, and PDF. Reports can be scheduled for automatic delivery via email. Custom exports can be created using our API.",
    },
  ];

  // Simple search simulation
  const searchResults = searchQuery
    ? popularArticles.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
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
              className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-12 pr-4 text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-indigo-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all"
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

            {/* Popular Articles */}
            <section className="mx-auto max-w-6xl mt-16">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Popular Articles</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {popularArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/article/${article.slug}`}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all group"
                  >
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400">
                      {article.views.toLocaleString()} views
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Video Tutorials */}
            <section className="mx-auto max-w-6xl mt-16">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Video size={20} className="text-indigo-500" />
                Video Tutorials
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {videoWalkthroughs.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onSelect={setSelectedVideo}
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
                        className={`shrink-0 text-slate-400 transition-transform ${
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
            <section className="mx-auto max-w-4xl mt-16">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white">
                <MessageCircle size={40} className="mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-bold">Still need help?</h2>
                <p className="mt-2 text-white/80">
                  Our support team is available Monday to Friday, 9 AM to 6 PM WIB
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/help/contact"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-indigo-600 hover:bg-white/90 transition-colors"
                  >
                    <MessageCircle size={18} />
                    Live Chat
                  </Link>
                  <a
                    href="mailto:support@narriv.ai"
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    <Mail size={18} />
                    Email Support
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedVideo.title}</h2>
                <p className="text-sm text-slate-500">Tutorial Video</p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Video Player */}
            <div className="p-4">
              <VideoPlayer video={selectedVideo} />
            </div>

            {/* Video Details */}
            <div className="p-6 border-t border-slate-100">
              <p className="text-slate-600">{selectedVideo.description}</p>

              {/* Meta info */}
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {selectedVideo.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  <span>Target: {selectedVideo.targetAudience.join(", ")}</span>
                </div>
              </div>

              {/* Target Audience */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Target Audience
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedVideo.targetAudience.map((audience, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full"
                    >
                      {audience}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Topics */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Key Topics Covered
                </h4>
                <ul className="mt-2 space-y-1">
                  {selectedVideo.keyTopics.map((topic, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Script Outline */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Script Outline Preview</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedVideo.scriptOutline.slice(0, 4).map((section, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">{section.timestamp}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{section.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{section.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedVideo.scriptOutline.length > 4 && (
                  <p className="mt-3 text-sm text-slate-500 text-center">
                    + {selectedVideo.scriptOutline.length - 4} more sections in the full video
                  </p>
                )}
              </div>

              {/* Prerequisites */}
              {selectedVideo.prerequisites.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-medium text-amber-800">Prerequisites</h4>
                  <ul className="mt-2 space-y-1">
                    {selectedVideo.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="text-sm text-amber-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/help/contact" className="hover:text-slate-900">Contact</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/api-docs" className="hover:text-slate-900 flex items-center gap-1">
              API Docs
              <ExternalLink size={12} />
            </Link>
          </div>
          <p className="text-sm text-slate-400">© 2024 Narriv. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

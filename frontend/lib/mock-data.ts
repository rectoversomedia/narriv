import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Globe2,
  Headphones,
  Home,
  LineChart,
  MessageCircle,
  Newspaper,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export type AppLanguage = "en" | "id";
export type Localized = Record<AppLanguage, string>;
export type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";

export function text(value: Localized, language: AppLanguage) {
  return value[language];
}

export const navGroups = [
  {
    key: "main",
    items: [
      { key: "command", href: "/", icon: Home },
      { key: "signals", href: "/signals", icon: Activity },
      { key: "alerts", href: "/alerts", icon: Bell },
      { key: "visibility", href: "/visibility", icon: Search },
    ],
  },
  {
    key: "analysis",
    items: [
      { key: "intelligence", href: "/intelligence", icon: BarChart3 },
      { key: "reports", href: "/reports", icon: FileText },
    ],
  },
  {
    key: "action",
    items: [{ key: "actionCenter", href: "/action-plans", icon: Target }],
  },
  {
    key: "system",
    items: [
      { key: "dataSources", href: "/workspace/sources", icon: Database },
      { key: "settings", href: "/workspace/settings", icon: Settings },
    ],
  },
];

export const dashboardMetrics: Array<{ label: Localized; value: string; helper: Localized; icon: LucideIcon; tone: Tone }> = [
  { label: { en: "Total Signals (24h)", id: "Total Sinyal (24 Jam)" }, value: "2.842", helper: { en: "+18.3% vs yesterday", id: "+18,3% vs kemarin" }, icon: Activity, tone: "purple" },
  { label: { en: "Critical Signals", id: "Sinyal Kritis" }, value: "128", helper: { en: "+12% vs yesterday", id: "+12% vs kemarin" }, icon: Shield, tone: "red" },
  { label: { en: "Active Signals", id: "Sinyal Aktif" }, value: "1.862", helper: { en: "+15.6% vs yesterday", id: "+15,6% vs kemarin" }, icon: CheckCircle2, tone: "green" },
  { label: { en: "AI Visibility Mentions", id: "AI Visibility Mentions" }, value: "2.451", helper: { en: "+18.7% vs yesterday", id: "+18,7% vs kemarin" }, icon: Sparkles, tone: "blue" },
  { label: { en: "Average Response", id: "Rata-rata Respon" }, value: "17m 24s", helper: { en: "8m 12s faster", id: "8m 12s lebih cepat" }, icon: Clock3, tone: "purple" },
  { label: { en: "Active Sources", id: "Sumber Aktif" }, value: "48 / 62", helper: { en: "77% connected", id: "77% terhubung" }, icon: Database, tone: "purple" },
];

export const activitySeries = [260, 330, 310, 500, 470, 520, 680, 760, 1120, 720, 820, 610, 790, 600, 680];

export const miniTopics = [
  { label: "Reputasi", value: "842", tone: "purple" as Tone },
  { label: "Operasional", value: "621", tone: "blue" as Tone },
  { label: "Produk", value: "498", tone: "green" as Tone },
  { label: "Keamanan", value: "368", tone: "amber" as Tone },
  { label: "Regulasi", value: "246", tone: "red" as Tone },
  { label: "Lainnya", value: "267", tone: "slate" as Tone },
];

export const alerts = [
  { id: "ALT-001", title: { en: "Negative sentiment spike", id: "Lonjakan Sentimen Negatif" }, source: "Social Media", time: "10:23 WIB", tone: "red" as Tone, issue: { en: "Payment delay complaints", id: "Keluhan keterlambatan pembayaran" } },
  { id: "ALT-002", title: { en: "Data security issue", id: "Isu Keamanan Data" }, source: "News", time: "09:45 WIB", tone: "amber" as Tone, issue: { en: "Account security", id: "Keamanan akun" } },
  { id: "ALT-003", title: { en: "Service disruption", id: "Gangguan Layanan" }, source: "Support Tickets", time: "09:10 WIB", tone: "purple" as Tone, issue: { en: "Mobile app issue", id: "Gangguan aplikasi mobile" } },
  { id: "ALT-004", title: { en: "Regulatory policy change", id: "Perubahan Kebijakan Regulasi" }, source: "Government", time: "08:20 WIB", tone: "amber" as Tone, issue: { en: "Regulation", id: "Regulasi" } },
  { id: "ALT-005", title: { en: "Positive viral campaign", id: "Kampanye Viral Positif" }, source: "Social Media", time: "08:15 WIB", tone: "green" as Tone, issue: { en: "Campaign", id: "Kampanye" } },
];

export const topTopics = [
  { name: { en: "Service disruption", id: "Layanan Gangguan" }, mentions: "1.248", delta: "+24,5%", tone: "green" as Tone },
  { name: { en: "App update", id: "Update Aplikasi" }, mentions: "842", delta: "+18,3%", tone: "green" as Tone },
  { name: { en: "New promo", id: "Promo Terbaru" }, mentions: "621", delta: "+12,7%", tone: "green" as Tone },
  { name: { en: "Account security", id: "Keamanan Akun" }, mentions: "498", delta: "-4,3%", tone: "red" as Tone },
  { name: { en: "Privacy policy", id: "Kebijakan Privasi" }, mentions: "368", delta: "-6,2%", tone: "red" as Tone },
];

export const sources = [
  { name: "Social Media", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "1.248", icon: MessageCircle, tone: "purple" as Tone },
  { name: "News", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "643", icon: Newspaper, tone: "blue" as Tone },
  { name: "Forums", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "398", icon: Users, tone: "green" as Tone },
  { name: "Support Tickets", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "287", icon: Headphones, tone: "amber" as Tone },
  { name: "App Reviews", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "182", icon: LineChart, tone: "purple" as Tone },
];

export const visibilityMetrics = [
  { label: { en: "Total AI Mentions", id: "Total AI Mentions" }, value: "2.451", helper: "+18,7%", icon: MessageCircle, tone: "purple" as Tone },
  { label: { en: "Brand Mentions", id: "Brand Mentions" }, value: "1.289", helper: "+22,1%", icon: Target, tone: "blue" as Tone },
  { label: { en: "Share of Voice", id: "Share of Voice" }, value: "24,3%", helper: "+4,6 p.p.", icon: CheckCircle2, tone: "green" as Tone },
  { label: { en: "Average Position", id: "Average Position" }, value: "2,8", helper: "-0,4", icon: TrendingUp, tone: "amber" as Tone },
  { label: { en: "AI Sentiment (Net)", id: "AI Sentiment (Net)" }, value: "+0,42", helper: "+0,15", icon: Sparkles, tone: "purple" as Tone },
];

export const aiPlatforms = [
  { name: "ChatGPT", value: 1248, percent: "50,9%", tone: "green" as Tone },
  { name: "Google Gemini", value: 643, percent: "26,2%", tone: "blue" as Tone },
  { name: "Microsoft Copilot", value: 321, percent: "13,1%", tone: "purple" as Tone },
  { name: "Perplexity", value: 156, percent: "6,4%", tone: "slate" as Tone },
  { name: "Claude", value: 83, percent: "3,4%", tone: "amber" as Tone },
];

export const signals = [
  { title: { en: "Payment delay complaints are rising", id: "Keluhan keterlambatan pembayaran meningkat" }, source: "Social Media", sentiment: { en: "Negative", id: "Negatif" }, mentions: "1.248", confidence: "94%", time: "10:23 WIB", tone: "red" as Tone },
  { title: { en: "Mobile app stability disruption", id: "Gangguan stabilitas aplikasi mobile" }, source: "App Reviews", sentiment: { en: "Negative", id: "Negatif" }, mentions: "842", confidence: "89%", time: "09:45 WIB", tone: "amber" as Tone },
  { title: { en: "New promo receives positive response", id: "Promo baru mendapat respons positif" }, source: "Social Media", sentiment: { en: "Positive", id: "Positif" }, mentions: "621", confidence: "87%", time: "09:10 WIB", tone: "green" as Tone },
  { title: { en: "FAQ confusion around credit terms", id: "Kebingungan FAQ seputar syarat kredit" }, source: "Support Tickets", sentiment: { en: "Mixed", id: "Campuran" }, mentions: "398", confidence: "81%", time: "08:20 WIB", tone: "purple" as Tone },
];

export const actions = [
  { title: { en: "Respond to payment delay complaints", id: "Tanggapi keluhan keterlambatan pembayaran" }, issue: { en: "Payment Delay", id: "Keterlambatan Pembayaran" }, priority: { en: "High", id: "Tinggi" }, owner: "Arif Rahman", role: "PR Manager", due: "23 Mei 2025", status: { en: "Active", id: "Aktif" }, progress: 60, tone: "red" as Tone },
  { title: { en: "Improve mobile app stability", id: "Perbaiki stabilitas aplikasi mobile" }, issue: { en: "Mobile App Issue", id: "Gangguan Aplikasi Mobile" }, priority: { en: "High", id: "Tinggi" }, owner: "Dewi Lestari", role: "Product Manager", due: "25 Mei 2025", status: { en: "In Progress", id: "Dalam Proses" }, progress: 40, tone: "amber" as Tone },
  { title: { en: "Educate users about new features", id: "Tingkatkan edukasi fitur ke pengguna" }, issue: { en: "Customer Service", id: "Layanan Pelanggan" }, priority: { en: "Medium", id: "Sedang" }, owner: "Rina Sari", role: "Marketing Lead", due: "30 Mei 2025", status: { en: "Active", id: "Aktif" }, progress: 30, tone: "green" as Tone },
  { title: { en: "Monitor promo conversations", id: "Monitor percakapan terkait promo" }, issue: { en: "Promo Discount", id: "Isu Promo Diskon" }, priority: { en: "Medium", id: "Sedang" }, owner: "M. Hidayat", role: "Social Media Lead", due: "28 Mei 2025", status: { en: "In Progress", id: "Dalam Proses" }, progress: 50, tone: "purple" as Tone },
  { title: { en: "Evaluate FAQ and chatbot response", id: "Evaluasi FAQ & respon chatbot" }, issue: { en: "Customer Service", id: "Layanan Pelanggan" }, priority: { en: "Low", id: "Rendah" }, owner: "Anisa Nur", role: "CX Manager", due: "20 Mei 2025", status: { en: "Completed", id: "Selesai" }, progress: 100, tone: "green" as Tone },
];

export const reports = [
  { title: { en: "Daily executive narrative brief", id: "Ringkasan narasi eksekutif harian" }, sections: "Signals, alerts, AI visibility", readiness: 92, status: { en: "Ready", id: "Siap" } },
  { title: { en: "AI Visibility weekly report", id: "Laporan mingguan AI Visibility" }, sections: "AI platforms, mentions, sentiment", readiness: 84, status: { en: "Review", id: "Review" } },
  { title: { en: "Action Center performance", id: "Performa Action Center" }, sections: "Owners, SLA, progress", readiness: 78, status: { en: "Draft", id: "Draft" } },
];

export const intelligenceClusters = [
  {
    id: "payment_delay",
    topic: { en: "Payment delay", id: "Keterlambatan pembayaran" },
    signals: 1248,
    growth: "+24,5%",
    tone: "red" as Tone,
    sentiment: "negative" as const,
    x: 50,
    y: 48,
    size: "high" as const,
    priority: { en: "High Priority", id: "Prioritas Tinggi" },
    priorityTone: "red" as Tone,
    description: {
      en: "1,248 signals form this cluster. Conversations have increased significantly in the last 48 hours, especially regarding transaction delays and payment confirmations.",
      id: "1.248 sinyal membentuk cluster ini. Percakapan meningkat signifikan dalam 48 jam terakhir, terutama terkait keterlambatan transaksi dan konfirmasi pembayaran."
    },
    related: [
      { topic: { en: "Refund complaints", id: "Keluhan refund" }, growth: "+16,2%" },
      { topic: { en: "Mobile app stability", id: "Stabilitas aplikasi mobile" }, growth: "+18,3%" }
    ],
    aiRec: {
      en: "It is recommended to issue an official statement and strengthen communication regarding service status.",
      id: "Disarankan untuk mengeluarkan pernyataan resmi dan memperkuat komunikasi status layanan."
    }
  },
  {
    id: "mobile_app_stability",
    topic: { en: "Mobile app stability", id: "Stabilitas aplikasi mobile" },
    signals: 842,
    growth: "+18,3%",
    tone: "amber" as Tone,
    sentiment: "neutral" as const,
    x: 33,
    y: 28,
    size: "large" as const,
    priority: { en: "Medium Priority", id: "Prioritas Sedang" },
    priorityTone: "amber" as Tone,
    description: {
      en: "842 signals track app crashing and lag issues after the latest software update. Users report frustrations with loading times.",
      id: "842 sinyal melacak kegagalan aplikasi dan masalah lag setelah pembaruan perangkat lunak terbaru. Pengguna melaporkan frustrasi dengan waktu pemuatan."
    },
    related: [
      { topic: { en: "Payment delay", id: "Keterlambatan pembayaran" }, growth: "+24,5%" },
      { topic: { en: "Customer education", id: "Edukasi pelanggan" }, growth: "+12,7%" }
    ],
    aiRec: {
      en: "Prioritize hotfix release for the iOS and Android applications to restore stability.",
      id: "Prioritaskan rilis perbaikan bug (hotfix) untuk aplikasi iOS dan Android guna memulihkan stabilitas."
    }
  },
  {
    id: "customer_education",
    topic: { en: "Customer education", id: "Edukasi pelanggan" },
    signals: 621,
    growth: "+12,7%",
    tone: "green" as Tone,
    sentiment: "positive" as const,
    x: 25,
    y: 42,
    size: "medium" as const,
    priority: { en: "Low Priority", id: "Prioritas Rendah" },
    priorityTone: "green" as Tone,
    description: {
      en: "621 signals highlight positive user feedback on the new interactive tutorials and onboarding videos.",
      id: "621 sinyal menyoroti umpan balik pengguna yang positif tentang tutorial interaktif baru dan video onboarding."
    },
    related: [
      { topic: { en: "Mobile app stability", id: "Stabilitas aplikasi mobile" }, growth: "+18,3%" }
    ],
    aiRec: {
      en: "Expand the knowledge base library and continue promoting self-help video guides.",
      id: "Perluas pustaka basis pengetahuan dan terus promosikan panduan video bantuan mandiri."
    }
  },
  {
    id: "privacy_policy",
    topic: { en: "Privacy policy", id: "Kebijakan privasi" },
    signals: 368,
    growth: "-6,2%",
    tone: "purple" as Tone,
    sentiment: "neutral" as const,
    x: 73,
    y: 55,
    size: "medium" as const,
    priority: { en: "Medium Priority", id: "Prioritas Sedang" },
    priorityTone: "amber" as Tone,
    description: {
      en: "368 signals discuss the updated privacy terms. Sentiment is steady with low risk of user attrition.",
      id: "368 sinyal membahas pembaruan ketentuan privasi. Sentimen stabil dengan risiko rendah terhadap pengurangan pengguna."
    },
    related: [
      { topic: { en: "KYC process", id: "Proses KYC" }, growth: "+3,4%" },
      { topic: { en: "Pricing transparency", id: "Transparansi harga" }, growth: "+7,3%" }
    ],
    aiRec: {
      en: "Keep user data consent options clear and comply with local data security regulations.",
      id: "Jaga agar opsi persetujuan data pengguna tetap jelas dan patuhi regulasi keamanan data lokal."
    }
  },
  {
    id: "refund_complaints",
    topic: { en: "Refund complaints", id: "Keluhan refund" },
    signals: 512,
    growth: "+16,2%",
    tone: "red" as Tone,
    sentiment: "negative" as const,
    x: 50,
    y: 17,
    size: "medium" as const,
    priority: { en: "High Priority", id: "Prioritas Tinggi" },
    priorityTone: "red" as Tone,
    description: {
      en: "512 signals focus on delayed refund processing times. Users are venting on forums about missing funds.",
      id: "512 sinyal berfokus pada keterlambatan waktu pemrosesan pengembalian dana. Pengguna meluapkan keluhan di forum tentang dana yang belum masuk."
    },
    related: [
      { topic: { en: "Payment delay", id: "Keterlambatan pembayaran" }, growth: "+24,5%" }
    ],
    aiRec: {
      en: "Speed up the refund approval queue and notify affected customers proactively.",
      id: "Percepat antrean persetujuan pengembalian dana dan beri tahu pelanggan yang terdampak secara proaktif."
    }
  },
  {
    id: "pricing_transparency",
    topic: { en: "Pricing transparency", id: "Transparansi harga" },
    signals: 421,
    growth: "+7,3%",
    tone: "green" as Tone,
    sentiment: "positive" as const,
    x: 65,
    y: 28,
    size: "medium" as const,
    priority: { en: "Low Priority", id: "Prioritas Rendah" },
    priorityTone: "green" as Tone,
    description: {
      en: "421 signals reflect customer appreciation for clear pricing breakdowns and no hidden fees.",
      id: "421 sinyal mencerminkan apresiasi pelanggan atas rincian harga yang jelas dan tidak adanya biaya tersembunyi."
    },
    related: [
      { topic: { en: "Privacy policy", id: "Kebijakan privasi" }, growth: "-6,2%" }
    ],
    aiRec: {
      en: "Maintain transparent communications and highlight pricing policy in promotional materials.",
      id: "Pertahankan komunikasi transparan dan soroti kebijakan harga dalam materi promosi."
    }
  },
  {
    id: "kyc_process",
    topic: { en: "KYC process", id: "Proses KYC" },
    signals: 287,
    growth: "+3,4%",
    tone: "amber" as Tone,
    sentiment: "neutral" as const,
    x: 68,
    y: 78,
    size: "small" as const,
    priority: { en: "Medium Priority", id: "Prioritas Sedang" },
    priorityTone: "amber" as Tone,
    description: {
      en: "287 signals track user friction during identity verification steps. High dropoff rate detected.",
      id: "287 sinyal melacak hambatan pengguna selama langkah verifikasi identitas. Tingkat kegagalan yang tinggi terdeteksi."
    },
    related: [
      { topic: { en: "Privacy policy", id: "Kebijakan privasi" }, growth: "-6,2%" }
    ],
    aiRec: {
      en: "Simplify the image upload step and add real-time feedback for scanning errors.",
      id: "Sederhanakan langkah unggah gambar dan tambahkan umpan balik real-time untuk kesalahan pemindaian."
    }
  },
  {
    id: "security_concerns",
    topic: { en: "Security concerns", id: "Keamanan akun" },
    signals: 368,
    growth: "+8,9%",
    tone: "red" as Tone,
    sentiment: "negative" as const,
    x: 45,
    y: 78,
    size: "medium" as const,
    priority: { en: "High Priority", id: "Prioritas Tinggi" },
    priorityTone: "red" as Tone,
    description: {
      en: "368 signals report phishing attempt warnings and account security discussions in community forums.",
      id: "368 sinyal melaporkan peringatan upaya phishing dan diskusi keamanan akun di forum komunitas."
    },
    related: [
      { topic: { en: "Payment delay", id: "Keterlambatan pembayaran" }, growth: "+24,5%" }
    ],
    aiRec: {
      en: "Publish security advisories and enforce multi-factor authentication (MFA) tips in-app.",
      id: "Publikasikan maklumat keamanan dan tegaskan tips autentikasi multi-faktor (MFA) di dalam aplikasi."
    }
  },
  {
    id: "service_quality",
    topic: { en: "Service quality", id: "Kualitas layanan" },
    signals: 498,
    growth: "-4,1%",
    tone: "blue" as Tone,
    sentiment: "neutral" as const,
    x: 33,
    y: 72,
    size: "medium" as const,
    priority: { en: "Medium Priority", id: "Prioritas Sedang" },
    priorityTone: "amber" as Tone,
    description: {
      en: "498 signals note discussions about live support response times. Users appreciate fast chat agent responses.",
      id: "498 sinyal mencatat diskusi tentang waktu respons dukungan langsung. Pengguna mengapresiasi respons agen obrolan yang cepat."
    },
    related: [
      { topic: { en: "Payment delay", id: "Keterlambatan pembayaran" }, growth: "+24,5%" }
    ],
    aiRec: {
      en: "Optimize support agent shifts to match peak hours and reduce initial wait times.",
      id: "Optimalkan giliran kerja agen dukungan untuk menyesuaikan dengan jam-jam sibuk dan kurangi waktu tunggu awal."
    }
  }
];

export const quickActions = [
  { key: "newAlert", icon: Bell },
  { key: "report", icon: FileText },
  { key: "analyze", icon: BarChart3 },
  { key: "sources", icon: Database },
  { key: "settings", icon: Settings },
  { key: "help", icon: Headphones },
];

export const systemStatus = ["Platform", "AI Engine", "Data Pipeline", "Integrasi", "Penyimpanan"];

export const settingsCards = [
  { key: "profile", icon: Users, tone: "purple" as Tone },
  { key: "notifications", icon: Bell, tone: "blue" as Tone },
  { key: "analysis", icon: BarChart3, tone: "green" as Tone },
  { key: "team", icon: Users, tone: "amber" as Tone },
  { key: "security", icon: Shield, tone: "red" as Tone },
  { key: "language", icon: Globe2, tone: "purple" as Tone },
];

export const signalFilters = ["Semua", "Negatif", "Positif", "Campuran", "Kritis"];

export const signalEvidence = [
  { source: "X/Twitter", snippet: "Keluhan pembayaran tertunda melonjak di kota besar", reach: "128K", tone: "red" as Tone },
  { source: "App Reviews", snippet: "Pengguna menyorot stabilitas versi terbaru aplikasi", reach: "42K", tone: "amber" as Tone },
  { source: "Support", snippet: "Tim CS menerima pertanyaan berulang soal syarat kredit", reach: "18K", tone: "purple" as Tone },
];

export const alertRules = [
  { name: "Lonjakan Penyebutan Brand", category: "Brand", level: "Kritis", status: "Aktif", activated: "12 Mei 2025 08:30", tone: "red" as Tone },
  { name: "Sentimen Negatif Tinggi", category: "Sentimen", level: "Peringatan", status: "Aktif", activated: "12 Mei 2025 07:15", tone: "amber" as Tone },
  { name: "Isu Viral", category: "Isu", level: "Kritis", status: "Aktif", activated: "12 Mei 2025 06:45", tone: "red" as Tone },
  { name: "Kegagalan Data Source", category: "Sistem", level: "Peringatan", status: "Aktif", activated: "12 Mei 2025 06:30", tone: "amber" as Tone },
  { name: "Laporan Harian", category: "Laporan", level: "Informasi", status: "Aktif", activated: "12 Mei 2025 05:00", tone: "blue" as Tone },
];

export const notificationChannels = [
  { name: "Email", target: "email@company.com", active: true, tone: "blue" as Tone },
  { name: "Slack", target: "#narriv-alerts", active: true, tone: "green" as Tone },
  { name: "Microsoft Teams", target: "Narriv Alerts", active: true, tone: "purple" as Tone },
  { name: "Webhook", target: "2 endpoint aktif", active: true, tone: "amber" as Tone },
  { name: "SMS", target: "+62 812-3456-7890", active: false, tone: "slate" as Tone },
];

export const aiMentionExamples = [
  { platform: "ChatGPT", date: "Hari ini, 12:03", quote: "Narriv adalah platform intelligence yang membantu organisasi memantau sinyal dan menganalisis data reputasi...", tone: "green" as Tone },
  { platform: "Google Gemini", date: "Hari ini, 10:28", quote: "Untuk kebutuhan monitoring sinyal dan analisis data real-time, Narriv bisa menjadi solusi yang tepat...", tone: "blue" as Tone },
  { platform: "Perplexity", date: "Hari ini, 08:15", quote: "Narriv menyediakan dashboard intelligence yang powerful untuk pengambilan keputusan berbasis data...", tone: "slate" as Tone },
];

export const reportVault = [
  { name: "Executive Narrative Brief", type: "PDF", cadence: "Harian", status: "Siap", readiness: 96, tone: "green" as Tone },
  { name: "AI Visibility Weekly", type: "Slides", cadence: "Mingguan", status: "Review", readiness: 84, tone: "amber" as Tone },
  { name: "Crisis Response Pack", type: "PDF + CSV", cadence: "On-demand", status: "Draft", readiness: 72, tone: "purple" as Tone },
  { name: "Source Health Audit", type: "CSV", cadence: "Mingguan", status: "Siap", readiness: 91, tone: "blue" as Tone },
];

export const connectors = [
  { name: "Instagram", status: "Live Ingestion", health: "99.8%", signals: "842", active: true, tone: "purple" as Tone },
  { name: "News Sites", status: "Auto Sync", health: "99.2%", signals: "643", active: true, tone: "blue" as Tone },
  { name: "YouTube", status: "Scheduled", health: "97.4%", signals: "318", active: true, tone: "red" as Tone },
  { name: "Podcast", status: "Scheduled", health: "94.1%", signals: "104", active: false, tone: "amber" as Tone },
  { name: "Support Tickets", status: "Live Ingestion", health: "100%", signals: "287", active: true, tone: "green" as Tone },
  { name: "Forums", status: "Auto Sync", health: "98.1%", signals: "398", active: true, tone: "slate" as Tone },
];

export const teamMembers = [
  { name: "Arif Rahman", role: "PR Manager", email: "arif.rahman@narriv.ai", status: "Admin", tone: "purple" as Tone },
  { name: "Dewi Lestari", role: "Product Manager", email: "dewi.lestari@narriv.ai", status: "Editor", tone: "blue" as Tone },
  { name: "Rina Sari", role: "Marketing Lead", email: "rina.sari@narriv.ai", status: "Analyst", tone: "green" as Tone },
  { name: "Anisa Nur", role: "CX Manager", email: "anisa.nur@narriv.ai", status: "Viewer", tone: "amber" as Tone },
];

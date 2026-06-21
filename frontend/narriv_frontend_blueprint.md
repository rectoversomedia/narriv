# 🎨 Narriv Frontend — Development Blueprint

> **Dokumen ini adalah panduan lengkap untuk development frontend Narriv.**
> Digunakan sebagai referensi oleh AI agents dan developer untuk memahami semua halaman, fitur, komponen, dan status pengembangan.
> AI agent wajib memperbarui checklist di bagian Development Tracker: centang `[x]` setiap tugas yang sudah selesai agar progres development tetap ter-track.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Page Inventory & Feature Map](#3-page-inventory--feature-map)
4. [Component Architecture](#4-component-architecture)
5. [State Management](#5-state-management)
6. [API Integration Status](#6-api-integration-status)
7. [Internationalization (i18n)](#7-internationalization-i18n)
8. [Current State Assessment](#8-current-state-assessment)
9. [Development Operating Notes](#81-development-operating-notes)
10. [Development Tracker](#9-development-tracker)

---

## 1. Project Overview

**Narriv** adalah platform *Narrative Intelligence & Operational Response* yang membantu organisasi memantau sinyal digital, menganalisis narasi, mendeteksi risiko, dan merespon secara proaktif menggunakan AI.

**Frontend Path**: `c:\MyProject\narriv\frontend`
**Framework**: Next.js 16.2.7 (App Router, Turbopack)
**Port**: `localhost:3001`
**Backend API**: `localhost:3000`

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | Turbopack dev server |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | `@theme inline` in `globals.css` |
| UI Components | shadcn/ui (modified) | Custom dashboard primitives |
| State | Zustand (persisted) | `useUiStore`, `useAuthStore` |
| i18n | `next-intl` (client) | EN/ID, JSON message files |
| Forms | `react-hook-form` + `zod` | Auth pages |
| Charts | Custom SVG/CSS + Recharts + React 19-compatible `react-simple-maps` fork | Recharts charts are lazy-loaded on dashboard home; `WorldActivityMap` is split into a separate dynamic map module via `@vnedyalk0v/react19-simple-maps` |
| Icons | Lucide React + SVGL + `react-icons` | Lucide for UI, SVGL/React Icons for brand/source logos |
| Font | Poppins (Google Fonts) | Via `next/font` |
| Animation | `tw-animate-css` + custom chart utilities | `animate-in`, `fade-in`, `slide-in-*`, chart entry/draw/donut animations with reduced-motion support |
| Data Fetching | Ky, typed `api-service.ts`, React Query provider | `apiClient.ts` uses Ky for all frontend-to-backend calls; dashboard pages use React Query + `api-service` with preview/mock fallbacks where live coverage is incomplete |
| Deployment | DigitalOcean VPS + Hostinger DNS target | Production readiness runbook lives at `process/general-plans/references/production-readiness-runbook.md`; real VPS execution still pending |

---

## 3. Page Inventory & Feature Map

### 3.1 Auth Pages (`/app/(auth)/`)

#### 🔐 Login (`/login`)
| Element | Detail |
|---------|--------|
| Layout | Split: Left brand panel (dark blue, illustrations) + Right form |
| Brand Panel | Logo, tagline, world map glow, animated dashboard illustration |
| Language Selector | Globe icon + text toggle (EN/ID), view transition animation |
| Form Fields | Email (with icon), Password (with show/hide toggle) |
| Remember Me | Checkbox, default checked |
| Forgot Password | Link → `/reset-password` |
| Submit Button | Gradient primary button with loading state |
| Social Login | Google OAuth2 button |
| Sign Up Link | Bottom link → `/signup` |
| Security Footer | Shield icons + trust badges |
| API Integration | `POST /auth/login` → sets token/user in `useAuthStore` |

#### 📝 Sign Up (`/signup`)
| Element | Detail |
|---------|--------|
| Layout | Same split layout, "features" illustration on left |
| Form Fields | Full Name, Company Name, Work Email, Password |
| Password Strength | Visual meter (Weak/Medium/Strong) with colored bars |
| Password Requirements | Length, uppercase, number, special character indicators |
| Submit Button | "Create Account" with loading state |
| Social Sign Up | Google OAuth2 |
| Login Link | Bottom link → `/login` |
| API Integration | `POST /auth/register` |

#### 🔑 Reset Password (`/reset-password`)
| Element | Detail |
|---------|--------|
| Layout | Same split layout, "security" illustration |
| Center Icon | Lock icon in circular container |
| Form Fields | Email input |
| Info Banner | Explanation text about reset process |
| Submit Button | "Send Reset Code" |
| Back Link | → `/login` |
| API Integration | `POST /auth/forgot-password` via Ky-backed `requestPasswordReset()` |

#### ✅ Verify Code (`/verify-code`)
| Element | Detail |
|---------|--------|
| Layout | Same split layout, "verification" illustration |
| Center Icon | Lock with checkmark |
| OTP Input | 6-digit code input boxes with auto-advance |
| Paste Support | Clipboard paste handler for full code |
| Info Banner | Instructions about verification code |
| Verify Button | Primary submit |
| Resend Link | Resend code action |
| Back Link | → `/reset-password` |
| API Integration | `POST /auth/verify-reset-code` via Ky-backed `verifyPasswordResetCode()` |

#### ✅ Verify Email (`/verify-email`)
| Element | Detail |
|---------|--------|
| Layout | Same split layout, "verification" illustration |
| Center Icon | Shield |
| OTP Input | 6-digit code input boxes with auto-advance |
| Verify Button | Primary submit |
| Resend Link | Resend code action |
| Back Link | → `/signup` |
| API Integration | `POST /auth/verify-email` via Ky-backed `verifyEmailCode()` |

#### 🔐 OAuth Callback (`/oauth/callback`)
| Element | Detail |
|---------|--------|
| Layout | Security split layout |
| API Integration | Captures one-time `code` from backend redirect and exchanges it through Ky-backed `exchangeOAuthCode()` (`POST /auth/oauth/exchange`) |

#### 🆕 New Password (`/new-password`)
| Element | Detail |
|---------|--------|
| Layout | Same split layout, "security" illustration |
| Center Icon | Shield icon |
| Form Fields | New Password, Confirm Password |
| Password Strength | Visual meter |
| Password Requirements | Same indicators as signup |
| Submit Button | "Reset Password" |
| Back Link | → `/login` |
| API Integration | `POST /auth/reset-password` via Ky-backed `resetPasswordWithToken()` |

---

### 3.2 Onboarding (`/onboarding`)

| Element | Detail |
|---------|--------|
| Layout | Full-page multi-step wizard with particles background |
| Step 1 | Profile/company setup |
| Step 2 | Keyword setup |
| Step 3 | Data Sources — Select monitoring sources |
| Step 4 | Notification preferences |
| Step 5 | Preview/confirmation, then processing screen |
| Progress | Step indicator with completion status |
| Navigation | Back/Next buttons per step |
| API Integration | Calls workspace setup endpoints (`createOnboardingWorkspace`, etc) on Processing screen and redirects to dashboard |

---

### 3.3 Dashboard Pages (`/app/(dashboard)/`)

#### Layout Components
| Component | Detail |
|-----------|--------|
| Sidebar | Collapsible (292px → 92px), gradient background, nav groups: Main, Analysis, Action (includes Cases), System — all labels bilingual via `next-intl` |
| Topbar | Sticky, global search across alerts/narratives/pages, language toggle (EN/ID), notification popover, user avatar, logout |
| Mobile Nav | Bottom navigation bar for mobile viewports |

#### 🏠 Command Center (`/` — Dashboard Home)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (6x) | Total Signals, Critical Signals, Active Signals, AI Visibility Mentions, Avg Response, Active Sources | `getDashboardSummary()` for live KPI subset; preview fallback remains. Real-time updates via SSE (`dashboard_update` event) |
| Activity Chart | Area chart showing signal volume over time (15 data points) | `getDashboardSummary().trends` with `activitySeries` fallback; 24h/7d/30d query params wired. Real-time updates via SSE |
| Signal Category Donut | Pie chart: Reputasi, Operasional, Produk, Keamanan, Regulasi, Lainnya | `getDashboardSummary().sentiment_distribution` for sentiment donut; topic breakdown remains preview/static |
| Latest Alerts | List of 5 alert items with severity colors, source, time | `getDashboardSummary().latest_signals` with `alerts` fallback |
| Trending Topics | Top 5 topics with mention counts and trend deltas | `getDashboardSummary().top_topics` (live data from `narrativeCluster` table) |
| Active Sources | Table with source name, icon, status, health, signal count | `getDashboardSummary().sources_health` (live data from `source` + `rawDocument` count) |
| System Status | 5 system indicators (Platform, AI Engine, Data Pipeline, etc.) | `getDashboardSummary().system_status` (live health checks: API Server, Database, Redis Queue, OpenAI) |
| Quick Actions | 6 action buttons (New Alert, Report, Analyze, Sources, Settings, Help) | `quickActions` mock |

#### 📡 Signals (`/signals`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| AI Summary + KPIs | Executive summary, signal metrics, investigation health | `getSignals()` pagination total plus `getSignalsMeta().timeline` and `getSignalsMeta().totalSignals` |
| Follow-up Panel | Recommended next response and ownership context | `getSignalsMeta().followUps` with translated preview fallback only when API unavailable; empty state when no data |
| Filter Row | Source/severity/status filters — fully bilingual (EN/ID) | Local state; filter labels, search placeholder, sort button all use `next-intl` |
| Signals Table | Main table with source, narrative, severity, confidence, status — all 9 column headers bilingual | Wired to `getSignals()` with search, 24h/7d/30d params (bilingual labels), pagination, and translated preview fallback |
| Recommendations | AI action suggestions beside the table | `getSignalsMeta().recommendations` with translated preview fallback only when API unavailable; empty state when no data |
| Source Donut | Source distribution donut — bilingual title, labels, empty state | `getSignalsMeta().sourceDistribution` and `totalSignals`; dynamic conic gradient from API data; center total is live |
| Timeline + Queue | Investigation timeline (interactive hover tooltip, loading skeleton) and queue cards — fully bilingual | `getSignalsMeta().timeline`, `timelineLabels`, and `investigationQueue`; TimelineChart has hover tooltip with bilingual value labels; InvestigationQueue links to `/cases` via redirect page |
| Create Investigation Modal | Modal form for creating cases — fully bilingual | Wired to `createCase()` API |
| Mutation Safety | Create investigation only shows success after `createCase()` returns a record | `createCase()` null result shows localized error and keeps the modal open |
| Bilingual Coverage | All UI text (titles, descriptions, filters, headers, footers, error states, empty states, mock fallback data) translated to EN/ID | `next-intl` via `useTranslations("Signals.*")`; 80+ translation keys |

#### 🔔 Alerts (`/alerts`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Metric Cards | Alert volume, SLA, severity, confidence KPIs | `getAlertsSummary()` total/severity/status counts plus live timeline sparklines |
| AI Summary | AI assistant panel using `/mainapp/alerts-ai-agent.png` | Static asset |
| Quick Filters | Severity/status/source filters | Local state |
| Alert Table | Main alert list with source, confidence, owner, status | Wired to `getAlerts()` with pagination and preview fallback |
| Action Panels | Response playbook, source mix, timeline, investigation status | Source distribution and timeline consume `getAlertsSummary().by_type`, `timeline`, and `timeline_labels`; response/AI recommendation panels remain preview until dedicated backend contracts exist |
| Alert Detail | Drill-down page at `/alerts/[id]` | Wired to `getAlertById()` with preview/error state handling |
| Status Actions | `updateAlertStatus()` and `updateAlertAssignment()` wired | Status dropdown menu on alert list, editable assignment fields on detail page |

#### 🔍 AI Visibility (`/visibility`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (4x) | Total Penyebutan AI, Penyebutan Brand, Pangsa Suara, Rata-rata Posisi — computed deltas from trend data | `getVisibility()` + `getVisibilitySummary()` + `getVisibilityTrends()` — 100% API-driven, no mock fallback; empty state shows `"-"` |
| Date Filter | Dropdown 7/14/30/90 days + quick toggle buttons (7d/30d) | `selectedDays` state → `getVisibilityTrends(days)` refetch |
| Export Button | CSV export with summary metrics, trend data, topics, platforms, mentions | Client-side CSV generation from API data |
| Executive Summary | Dynamic heading/body from trend deltas + top prompt; "Dibuat oleh AI" badge; opportunity/risk/actions from live data | `getVisibility()` + `getVisibilitySummary()` + `getVisibilityTrends()` — computed from real data |
| AI Recommended Actions | GeoActions from visibility analysis; "See all" opens modal | `getVisibility().geoActions[]` — empty state when no data |
| AI Mentions Trend Chart | SVG line chart per engine or brand/competitor; 7d/30d toggle; dynamic Y-axis | `getVisibilityTrends().engine_trends` or `brand/competitor_trend` — empty state when no data |
| Top Topics Table | Topic, Mentions, Direction, Type (5 rows max); "See all topics" → `/intelligence` | `getVisibility().prompts[]` — empty state when no data |
| AI Search Sandbox | Search input → real API call `POST /api/visibility/analyze`; loading spinner; bilingual response parsing | `triggerVisibilityAnalysis()` — displays response in active language (EN/ID) |
| Visibility vs Competitors Chart | SVG line chart: Narriv vs Competitors trend | `getVisibilityTrends()` brand/competitor rates — empty state when no data |
| Top AI Platforms | Bar chart with logos (ChatGPT, Gemini, Copilot, Perplexity, Claude); sorted by score | `getVisibilitySummary().engine_breakdown` — empty state when no data |
| Competitor Share of Voice | Donut chart + legend: Narriv, Competitors, Others | Computed from `visibilityData.presence` + `competitor` rates — empty state when no data |
| Latest Mention Examples | Top 3 prompt-test cards with engine logo, quote; "View all" opens modal (all mentions) | `getVisibility().prompts[]` — empty state when no data |
| AI Search Sandbox Modal | Full list of all prompt-test mentions | `visibilityData.prompts[]` — all items |
| i18n Coverage | All labels, empty states, error messages, date ranges, AI badge, metric labels bilingual (EN/ID) | `next-intl` via `useTranslations("Visibility.*")` — 60+ keys including `empty.*`, `dateRange.*`, `ariaLabels.*`, `mentionQuote.*` |
| Bilingual AI Responses | Backend returns `{ en, id }` JSON; frontend parses per active language | `response` (EN) / `responseId` (ID) from `rawResponse[]` |

#### 🧠 Intelligence (`/intelligence`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Topic Map | Interactive bubble map showing narrative clusters with zoom/expand controls and impact/sentiment filters | Wired to `getNarratives()` with live data; mock-data fallbacks removed |
| Cluster Bubbles | Sized by signal count, colored by sentiment | Position: x/y derived from `mapSpecks` (static decoration array); size determined by `record.signalCount` |
| Cluster Detail Panel | Selected cluster: title, description, signal count, priority, AI recommendation, full analysis modal, and action dropdown | Click interaction on map or cluster list; "See Full Analysis" triggers `getNarrativeById()` and opens a React Portal modal |
| Related Topics | Tags showing related clusters with growth deltas | `related[]` in cluster data |
| Cluster List | Sidebar list of growing clusters with signal counts; "View All" opens a full scrollable React Portal modal | Same data source |
| Time Filter | 24h, 7 days, 30 days dropdown | Local state triggering API refetch |
| Competitor Donut | "Pangsa Narasi Kompetitor" share breakdown; "View Landscape" opens a React Portal modal | Live-derived from `getNarratives()` cluster signal share; shows empty-data segment when no signals exist |
| Lifecycle Metrics | Emerging / Accelerating / Peaking / Declining / Dormant counts and trends | Live-derived from `getNarratives()` cluster velocity, impact, and signal counts with sparkline fallbacks for empty phases |
| AI Summary | Executive summary box and bullet points | Dynamically generated in frontend based on top signals, velocity, and sentiment trends from live narrative data |
| Footer Metrics | Data Coverage, Update Frequency, AI Model Status | Wired to `getSources()` to calculate active vs total source coverage and reflect real-time API health |

#### 📊 Reports (`/reports`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| AI Report Summary | Executive summary box with dynamic insight, risk, movement, recommendation | `getNarratives()` + `getDashboardSummary()` — dynamically generated from live cluster data; empty state text when no data |
| Sentiment Chart | 3-line sentiment trend chart (positive/neutral/negative) | `getDashboardSummary().trends` + `sentiment_distribution` — dynamic SVG path generation; flat line empty state |
| Metric Cards (4x) | Templates, Reports Created, In Progress, Ready | `getReportTemplates()` + `getReports()` — loading state `"..."`, no mock fallback |
| Reports Table | Report vault with title, type, period, status, progress, created | `getReports()` with pagination, filter tabs (All/Ready/Review/Draft/Scheduled), empty state, loading skeleton |
| Report Preview Sidebar | Latest report preview with title, status badge, sections list, View Preview link, Download PDF button | `reportsQuery.data.data[0]` — shows actual report data; View Preview navigates to `/reports/{id}`; empty state when no reports |
| Format Donut | Dynamic conic-gradient donut showing PDF vs JSON distribution | `getReportsAnalytics().format_distribution` — gradient calculated from actual proportions; empty state with icon |
| Timeline Chart | Report creation trend line chart with dynamic Y-axis and peak tooltip | `getReportsAnalytics().trend_timeline` — Y-axis calculated from data max; peak position from actual index; empty state with icon |
| Popular Reports | Top 5 most-created report titles with View All modal | `getReportsAnalytics().popular_templates` — View All opens full list modal; empty state |
| Quick Actions | 4 buttons: Share, Schedule, Create, History | Share → email modal; Schedule → schedule settings modal; Create → create report modal; History → `/workspace/activity` |
| Manage Templates | Full CRUD modal with system templates (read-only) and custom templates | `getReportTemplates()` + `createReportTemplate()` + `updateReportTemplate()` + `deleteReportTemplate()` — form with name, cadence; system templates show badge |
| Schedule Settings | Full CRUD modal for recurring report schedules | `getReportSchedules()` + `createReportSchedule()` + `updateReportSchedule()` + `deleteReportSchedule()` + `toggleReportSchedule()` — form with template, cadence, day, time |
| Create New Report | Form modal to generate report from template | `generateReportFromTemplate()` — template selector, title, date range; generates via `POST /api/reports/generate` |
| Share to Stakeholder | Email sharing modal | `sendReportEmail()` — recipient email, subject; empty state when no reports |
| PDF Export | Export with polling and auto-download | `createReportExport()` + `getReportExportStatus()` with polling |
| Pagination | Prev/Next with page info | `DashboardPagination` component |
| Empty States | All panels show contextual empty views when no data | Icons, titles, descriptions via `next-intl` |
| Bilingual Coverage | All UI text translated to EN/ID | `next-intl` via `useTranslations("Reports.*")` — 100+ translation keys including `scheduleModal.*`, `shareModal.*`, `createModal.*`, `templateForm.*` |

#### 🎯 Action Center (`/action-plans`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Active, in-progress, done, needs-attention, and resolution/current-state metrics | `getActionPlansMetrics()` / `GET /api/action-plans/metrics`; no mock fallback |
| Filters | Search, priority/status filter dropdown, lane filtering, time range toggle | Local state applied to `getActionQueue()` data |
| Kanban Board | 4-column action workflow with priority/status cards, View All/Show Less controls | `getActionQueue()` / `GET /api/actions`; empty API results show empty state |
| Create Action Plan Modal | Bilingual strategy selector for PR/content/influencer/crisis plans | `createActionPlan()` / `POST /api/actions`; successful create invalidates queue, metrics, and latest-plan queries |
| Action Detail | Selected action detail with evidence and execution plan steps | `getActionPlanById()` / `GET /api/action-plans/:id`; backend supports multi-step `option.steps`; no fallback plan text |
| Performance + AI Learning | AI accuracy score, acceptance rate, rejection rate, per-category accuracy, learning insights/templates | `getFeedbackAccuracy()` / `GET /api/feedback/accuracy` and `getActionPlanLearning()` / `GET /api/action-plans/:id/learning` |
| API Functions | Action-plan/feedback/assignment functions exist in `api-service.ts` | `getActionPlans()`, `getActionPlanById()`, `getActionPlansMetrics()`, `getActionQueue()`, `createActionPlan()`, `getActionPlanLearning()`, and `submitActionPlanFeedback()` are wired |

---

### 3.4 Workspace Pages (`/workspace/`)

#### ⚙️ Settings (`/workspace/settings`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Workspace Logo | Upload/change logo with preview | Wired to `uploadWorkspaceLogo()` / `POST /api/workspace/logo` using base64 JSON; persistently loads `logoUrl` from DB via `getWorkspaceSettings()` |
| Brand Name | Text input | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Industry | Dropdown selector | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Timezone | Dropdown (WIB, WITA, WIT) | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Language | Dropdown (Bahasa Indonesia, English) | Local state/UI control |
| Notification Email | Text input | Loaded/saved via workspace settings API with local fallback |
| WhatsApp PIC | Text input | Loaded/saved via workspace settings API with local fallback |
| Global Source Configuration | Sync frequency, source language, dedupe policy, retention controls | Future Settings-page scope; currently not implemented/persisted and should not be treated as complete from the Sources page |
| Team Members Table | Name, Role, Email, Status, Actions | Loaded via `getWorkspaceMembers()` with preview fallback |
| Invite Member | Add member form | Wired to `createWorkspaceMember()` API with validation |
| Remove Member | Delete action | Wired to `deleteWorkspaceMember()` API with confirmation dialog |
| Settings Cards | Profile, Notifications, Analysis, Team, Security, Language | Quick access grid |
| Save Button | Submit all changes | Calls `updateWorkspaceSettings()` for supported fields |
| Change Password | Current + New password form | Wired to `changePassword()` API with validation (min 10 chars, uppercase, number, symbol) |

#### 📊 Sources (`/workspace/sources`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Connected sources, ingestion volume, health, latency — fully bilingual labels | `getSourceHealth()` and `getSourceCoverage()` live summaries; all metric card labels, helpers, and health status labels use `next-intl` |
| Connector Grid | Connector tiles: Instagram, YouTube, X, Blogger, Discourse, etc. | Wired to `getSources()`; connector identity, keys, toggle, and delete actions use source IDs to handle duplicate names |
| Individual Sync | Sync button per source (hover on card/list row) | `runSourceIngestion()` → `POST /ingestion/run/:sourceId` |
| Search | Filter sources by name or category | Local state filtering on `liveConnectors` array |
| Empty States | VolumeBars, DistributionDonut, HealthDonut show contextual empty views when no data — bilingual | Inline components with icons and descriptive text using `next-intl` |
| Add Source / Connect | Adds default Apify actor presets, including blog/news domains via `apify/web-scraper` | `bootstrapDefaultSources()` → `POST /sources/bootstrap-defaults` |
| Sync All | Batch syncs all active sources while respecting backend batch limit | `runBatchSourceIngestion()` chunks source IDs into 25-item `POST /ingestion/run` requests and aggregates queued/failed counts |
| Health Sidebar | Pipeline health and recent incidents — bilingual labels (Sehat/Peringatan/Bermasalah/Perlu perhatian) | Inline data with `next-intl` translations |
| Recent Activity | Source sync/activity list | Inline/static page data |
| Global Settings | Sync frequency, language, dedupe, retention controls — not part of completed Data Sources scope | Deferred to Settings page because these controls are workspace-wide configuration, not source-list CRUD |
| Charts | Volume chart and source distribution donut | Inline SVG/CSS with empty state fallbacks |
| Distribution Panel | Source type distribution — bilingual title, empty state | `next-intl` translations for title, description, empty state |
| API Functions | Source CRUD/ingestion functions exist in `api-service.ts` | `getSources()`, `getSourcePresets()`, `bootstrapDefaultSources()`, `updateSource()` (toggle), `deleteSource()`, `runSourceIngestion()` (single sync), and `runBatchSourceIngestion()` (chunked Sync All) are wired. Delete failures no longer show success toasts. |

#### 🧾 Activity Log (`/workspace/activity`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Header + Metrics | Audit trail summary, actor count, event count, today count | Derived from `getActivityLogs()` response and pagination meta |
| Filters | Event type, date from, date to, reset action | Local state driving API query params |
| Activity Table | Event badge, actor, metadata summary, relative/absolute timestamp | Wired to `getActivityLogs()` with pagination and error/empty states |
| Navigation | Sidebar System menu entry | `navGroups` includes `/workspace/activity` |

#### 🔌 Integrations (`/workspace/integrations`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Header + Metrics | Total integrations, active count, platform count, error count | Derived from `getIntegrations()` response |
| Connect Form | Name, platform, optional JSON config | Wired to `createIntegration()` / `POST /api/workspace/integrations` |
| Filters | Platform and status filters | Local state driving API query params |
| Integrations Table | Integration, inline status update, config summary, sync timestamps, disconnect action | Wired to `getIntegrations()`, `updateIntegration()`, and `deleteIntegration()` |
| Navigation | Sidebar System menu entry | `navGroups` includes `/workspace/integrations` |

#### `/settings`

`/settings` exists as a route alias that re-exports `/workspace/settings`.

#### 🗂️ Cases & Investigations (`/workspace/cases`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Header | Title and "Create Case" button | Static UI |
| Filters | Status (Open, In Progress, Resolved, Closed) & Priority filters | Local state driving API `status`/`priority` queries |
| Cases Table | List of cases with Title, Status dropdown, Priority badge, Assignee, Actions | Wired to `getCases()` with pagination and error/empty states |
| Status Actions | Inline dropdown to change status | Wired to `updateCase()` mutation |
| Delete Action | Trash icon with confirmation dialog | Wired to `deleteCase()` mutation |
| Sidebar Navigation | Listed under "Action" group in sidebar | `navGroups` in `mock-data.ts` includes `/workspace/cases` with `FileText` icon |
| Redirect Page | `/cases` → `/workspace/cases` | `app/(dashboard)/cases/page.tsx` redirects via `next/navigation` |

---

## 4. Component Architecture

### 4.1 UI Primitives (`components/ui/`)

| Component | File | Usage |
|-----------|------|-------|
| Badge | `badge.tsx` | Status tags, severity indicators |
| Button | `button.tsx` | All action buttons, variant system |
| Card | `card.tsx` | Container cards throughout dashboard |
| Checkbox | `checkbox.tsx` | Form checkboxes |
| CountUp | `count-up.tsx` | Animated number counting |
| Dashboard Primitives | `dashboard-primitives.tsx` | `Panel`, `MetricRow`, `ProgressBar`, `TrendBadge`, `ToneBar` |
| DecryptedText | `decrypted-text.tsx` | Text reveal animation |
| EmptyState | `EmptyState.tsx` | Empty data placeholders |
| FeedbackBanner | `FeedbackBanner.tsx` | User feedback notification |
| Field | `field.tsx` | Form field wrapper with label/error |
| Input | `input.tsx` | Text input component |
| Label | `label.tsx` | Form labels |
| Particles | `particles.tsx` | Background particle animation |
| Popover | `popover.tsx` | Dropdown/popup content |
| Separator | `separator.tsx` | Visual dividers |
| Skeleton | `Skeleton.tsx` | Loading placeholders |
| Switch | `switch.tsx` | Toggle switches |
| Table | `table.tsx` | Data tables |
| Tabs | `tabs.tsx` | Tab navigation |
| Toast | `toast.tsx` | Shared success/error/info notification provider with localized default titles and close label |
| ConfirmationDialog | `confirmation-dialog.tsx` | Reusable confirmation modal for destructive actions |

### 4.2 Dashboard Components (`components/dashboard/`)

| Component | File | Usage |
|-----------|------|-------|
| DashboardSkeleton | `DashboardSkeleton.tsx` | Full-page loading state |
| DashboardStates | `dashboard-states.tsx` | Reusable dashboard loading, error, empty, pagination, table, metric, and panel skeleton states |
| DistributionChart | `DistributionChart.tsx` | Sentiment distribution pie |
| KpiCard | `KpiCard.tsx` | Single metric card |
| LatestSignalsTable | `LatestSignalsTable.tsx` | Signal list table |
| PlatformBarChart | `PlatformBarChart.tsx` | Platform distribution bars |
| TrendChart | `TrendChart.tsx` | Time series area chart |
| Charts | `charts.tsx` | Reusable chart primitives (DonutChart, BarChart, AreaChart) |
| DashboardKit | `dashboard-kit.tsx` | `AppCard`, `GlowButton`, `SectionHeader` wrappers |
| WorldActivityMap | `world-activity-map.tsx` | Dynamic simple-maps module split out of Recharts bundle; imports `@vnedyalk0v/react19-simple-maps` to keep map behavior compatible with React 19 |

### 4.3 Layout Components (`components/layout/`)

| Component | File | Usage |
|-----------|------|-------|
| Sidebar | `Sidebar.tsx` | Navigation sidebar with collapse toggle |
| Topbar | `Topbar.tsx` | Top header with search, notifications, user |
| DashboardShell | `dashboard-shell.tsx` | Client dashboard shell with auth guard, sidebar, topbar, particles, and layout state |

### 4.4 Auth Components (`components/auth/`)

| Component | File | Usage |
|-----------|------|-------|
| AuthShell | `auth-shell.tsx` | Split layout wrapper for all auth pages |
| BrandPanel | `auth-shell.tsx` | Left panel with branding/illustrations |
| LanguageSelector | `auth-shell.tsx` | Language toggle with animation |
| AuthInput | `auth-shell.tsx` | Styled form input with icon |
| PasswordInput | `auth-shell.tsx` | Password field with visibility toggle |
| PrimaryButton | `auth-shell.tsx` | Gradient submit button |
| SocialButtons | `auth-shell.tsx` | Google login button (Microsoft removed 2026-06-12) |
| OTPInput | `auth-shell.tsx` | 6-digit verification code input |

---

## 5. State Management

### 5.1 `useUiStore` (Zustand, persisted)

```typescript
{
  language: "en" | "id",           // Active language
  sidebarCollapsed: boolean,       // Sidebar state
  setLanguage, toggleLanguage, toggleSidebar
}
```

**Persistence Key**: `narriv-ui-settings`

### 5.2 `useAuthStore` (Zustand, persisted)

```typescript
{
  token: string | null,            // JWT access token
  refreshToken: string | null,     // Refresh token
  user: AuthUser | null,           // { name, email, provider, workspace }
  isAuthenticated: boolean,        // Derived from token presence
  setSession, logout
}
```

**Persistence Key**: `narriv-auth`

---

## 6. API Integration Status

### 6.1 Current Truth

`frontend/lib/api-service.ts` defines typed fetchers for backend endpoints, and `frontend/lib/apiClient.ts` uses Ky with bearer tokens plus one refresh-token retry on `401`. Dashboard pages now use React Query + `api-service.ts` for their primary live list/detail/settings reads, with preview/mock fallbacks retained where backend coverage or UX flows are incomplete.

All frontend-to-backend calls should go through the Ky-backed `apiClient.ts`/`api-service.ts` layer. The remaining native `fetch()` usage is for static local assets only, such as `public/maps/world-110m.json`.

### 6.2 Service Functions vs Page Usage

| Frontend Function / Flow | Endpoint | Service Exists | Used By Current Pages |
|---|---|---:|---:|
| Login form | `POST /auth/login` | Yes — Ky-backed `loginWithPassword()` | Yes |
| Signup form | `POST /auth/register` | Yes — Ky-backed `registerWithPassword()` | Yes |
| Reset password flow | `POST /auth/forgot-password`, `POST /auth/verify-reset-code`, `POST /auth/reset-password` | Yes — Ky-backed reset service functions | Yes — reset, verify, and new-password pages |
| `logoutSession()` | `POST /auth/logout` | Yes | Yes — topbar logout calls API to revoke refresh token before clearing local state |
| `getCurrentUser()` | `GET /auth/me` | Yes | No |
| `getActivityLogs()` | `GET /api/workspace/activity` | Yes | Yes — `/workspace/activity` page uses filters, table rendering, and pagination |
| `getDashboardSummary()` | `GET /api/dashboard/summary` | Yes | Yes — dashboard home uses KPI/trend/sentiment/latest signal fields, fully unmocked |
| `getSignals()` / `getSignalsMeta()` | `GET /signals`, `GET /signals/meta` | Yes | Yes — `/signals` maps table, summary metrics, follow-ups, recommendations, source donut, timeline labels/peak, and investigation queue |
| `getAlerts()` / `getAlertById()` | `GET /api/alerts`, `GET /api/alerts/:id` | Yes | Yes — list page and detail page use React Query |
| Alert status/assignment functions | `PATCH /api/alerts/:id/status`, `PATCH /api/alerts/:id/assign` | Yes | Yes — alerts page dropdown for status change, alert detail page editable assignment fields |
| `getVisibility()` / `getVisibilitySummary()` / `getVisibilityTrends()` | `GET /api/visibility`, `GET /api/visibility/summary`, `GET /api/visibility/trends` | Yes | Yes — `/visibility` maps all KPIs, prompt rows, platform distribution, trend charts, competitor share, latest mentions, and geo actions; 100% API-driven with empty states; no mock fallback |
| `triggerVisibilityAnalysis()` | `POST /api/visibility/analyze` | Yes | Yes — AI Search Sandbox calls this for real-time query simulation with bilingual response parsing |
| Action-plan functions | `/api/action-plans`, `/api/action-plans/:id`, `/api/action-plans/metrics`, `/api/action-plans/:id/learning`, `/api/actions`, `/api/feedback/accuracy` | Yes | Yes — `getActionPlans()`, `getActionPlanById()`, `getActionPlansMetrics()`, `getActionQueue()`, `createActionPlan()`, `getActionPlanLearning()`, `getFeedbackAccuracy()`, and `submitActionPlanFeedback()` are wired; create invalidates affected queries and accept/reject buttons update feedback |
| Report/export functions | `/api/reports`, `/api/reports/:id/export`, `/api/reports/exports/:jobId` | Yes | Yes — `getReports()` and `createReportExport()` with polling via `getReportExportStatus()` wired to PDF download |
| Report templates | `/api/reports/templates` | Yes | Yes — `getReportTemplates()` + `createReportTemplate()` + `updateReportTemplate()` + `deleteReportTemplate()` — full CRUD for custom templates |
| Report schedules | `/api/reports/schedules` | Yes | Yes — `getReportSchedules()` + `createReportSchedule()` + `updateReportSchedule()` + `deleteReportSchedule()` + `toggleReportSchedule()` — full CRUD with enable/disable |
| Report generation | `/api/reports/generate` | Yes | Yes — `generateReportFromTemplate()` — form modal with template selector, title, date range |
| Report email | `/api/reports/:id/send-email` | Yes | Yes — `sendReportEmail()` — share modal with recipient email and subject |
| Report analytics | `/api/reports/analytics` | Yes | Yes — `getReportsAnalytics()` — format donut, popular templates, timeline chart |
| `getNarratives()` | `GET /api/narratives` | Yes | Yes — `/intelligence` maps topic map, cluster list/detail, narrative share donut, lifecycle counts, and metric cards |
| Source/ingestion functions | `/sources`, `/sources/presets`, `/sources/bootstrap-defaults`, `/sources/health`, `/sources/coverage`, `/ingestion/run`, `/ingestion/run/:sourceId`, `/ingestion/status/:jobId` | Yes | Yes — `getSources()`, `getSourcePresets()`, `bootstrapDefaultSources()`, `updateSource()` (toggle), `deleteSource()`, `runSourceIngestion()` (single sync), `runBatchSourceIngestion()` (chunked Sync All), `getSourceHealth()`, and `getSourceCoverage()` are wired |
| Workspace settings/member functions | `/api/workspace/settings`, `/api/workspace/members` | Yes | Yes — `getWorkspaceSettings()`, `updateWorkspaceSettings()`, `getWorkspaceMembers()`, `createWorkspaceMember()` by registered-user email, and `deleteWorkspaceMember()` are wired |
| Workspace logo upload | `POST /api/workspace/logo` | Yes — Ky-backed `uploadWorkspaceLogo()` | Yes — settings logo picker validates image type/size and uploads base64 JSON to backend |
| Integrations functions | `GET/POST/PATCH/DELETE /api/workspace/integrations` | Yes | Yes — `/workspace/integrations` page supports create, filter, inline status update, and disconnect |
| In-App Notifications & SSE | `/api/notifications`, `/api/notifications/stream` | Yes | Yes — `getNotifications()` and SSE listeners wired to Topbar notification bell; mark as read mutations wired |
| `changePassword()` | `POST /auth/change-password` | Yes | Yes — settings page change password form with validation |
| `getNotificationSettings()` / `updateNotificationSettings()` | `GET/PATCH /api/workspace/notification-settings` | Yes | Yes — settings page notification toggles wired |

### 6.3 Known Contract Issues

| Area | Issue |
|------|-------|
| Pagination | Backend list endpoints use mixed wrappers: most return `pagination`, while `/api/actions` returns `meta`. `api-service.ts` now models both shapes explicitly. |
| Page Wiring | Primary dashboard reads are now wired to `api-service.ts`, but many secondary cards/actions still use preview/static data until backend coverage is complete. |
| Token Refresh | Implemented in `apiClient.ts` and exercised by dashboard pages through React Query + `api-service.ts`. |
| Workspace Member Invite | Backend accepts registered-user `email` or `userId`; full pending-user invite tokens and email delivery are not implemented yet. |
| Endpoint Alignment | OAuth exchange, source bootstrap, and Sync All source ingestion paths are aligned with backend routes: `/auth/oauth/exchange`, `/sources/bootstrap-defaults`, and `/ingestion/run`. |

---

## 7. Internationalization (i18n)

| Aspect | Detail |
|--------|--------|
| Library | `next-intl` (client-side only) |
| Languages | English (`en`), Indonesian (`id`) |
| Message Files | `frontend/messages/en.json` (58KB+), `frontend/messages/id.json` (59KB+) |
| Provider | `IntlProvider` wraps all pages |
| Toggle | `useUiStore.toggleLanguage()` |
| Namespaces | `AuthDesign`, `DemoApp` (topbar, sidebar nav, dashboard, settings, etc.), `Signals.*`, `Sources.*`, `Alerts.*`, `Visibility.*`, `Intelligence.*`, `Reports.*`, `ActionPlans.*`, `Workspace.*`, `Cases.*`, `Integrations.*`, `DashboardStates.*` |
| Coverage | All pages now use `next-intl` message files; no remaining inline dictionaries or hardcoded UI text. Sidebar nav labels, metric card labels, filter tabs, table headers, footer text, empty states, error states, and mock fallback data all translated. |

---

## 8. Current State Assessment

### ✅ What's Working
- All auth pages render and function (login, signup, reset, verify, new-password)
- Dashboard layout with sidebar, topbar with global search, responsive design
- Implemented dashboard routes render: `/`, `/signals`, `/alerts`, `/alerts/[id]`, `/visibility`, `/intelligence`, `/reports`, `/action-plans`, `/workspace/sources`, `/workspace/activity`, `/workspace/integrations`, `/workspace/settings`, plus `/settings` alias
- i18n toggle works on auth and dashboard pages
- Language transition animation (View Transitions API)
- API client/service layer for all backend endpoints with React Query integration
- Zustand stores with persistence (auth + UI settings)
- All CRUD mutations wired: alerts, sources, reports, action plans, settings
- Mutation result handling fixed for investigation creation, case delete/status update, and source delete so `null`/`false` API helper results no longer show success toasts
- Auth guard via `proxy.ts` (Next.js 16), logout with refresh token revocation
- Form validation on invite member, workspace settings, and change password
- Dashboard quick actions wired to slide-over drawer
- Global search across alerts, narratives, and navigation
- Chart components with entry/draw/donut animations and reduced-motion support
- Loading/error/empty states, toasts, confirmation dialogs, pagination, date filters
- Mock data cleanup: 16 unused exports removed from `mock-data.ts`

### ⚠️ Known Issues & Gaps
1. **Static/Mock Data Dependency**: All primary and secondary dashboard widgets are now fully un-mocked and use API data. Empty arrays are used as fallbacks. Visibility page is 100% production-ready with no mock data remaining.
2. **Onboarding Flow**: UI wired to backend API using `OnboardingContext` state and `api-service.ts` functions. Submits default initial configuration and redirects to dashboard.
3. **Social Login**: Google OAuth2 button functional (requires `GOOGLE_CLIENT_ID` in `.env`). Microsoft OAuth removed — only Google supported.
4. **Workspace Logo Upload**: Settings page is wired to the backend logo upload API using base64 JSON. Backend currently stores uploads locally; S3/Supabase Storage remains a future production storage upgrade.
5. **Notification Channels**: Push/dispatch for email/whatsapp not fully implemented (settings exist). However, **In-App Notification Bell** is fully wired and functional using SSE.
6. **Real-time Updates**: SSE is now active for `/api/notifications/stream` replacing polling for notification updates. Live dashboard KPI updates also wired via `dashboard_update` event.
7. **Reset Password Email Delivery**: Reset flow calls backend endpoints, but production email/SMS delivery provider is still future integration; non-production exposes dev reset code for local testing.
8. **Global Configuration & Settings**: Data Sources global configuration controls are intentionally not complete. They are tightly coupled to the main Settings page and should be implemented there as workspace-wide settings, then optionally surfaced in Data Sources as a read-only shortcut or deep link.

---

## 8.1 Development Operating Notes

These replace the removed frontend checklist/guidelines and should be treated as the current working rules.

| Area | Current Rule |
|------|--------------|
| Source of Truth | Use this blueprint for route inventory, API status, and frontend development tracking. |
| Visual Direction | Preserve the current light enterprise SaaS dashboard with dark navy sidebar, compact white cards, rounded 8-16px surfaces, soft borders, and blue/purple accent language. |
| UI Fidelity | Match approved screenshots/rebuild direction closely before wiring API data. Avoid generic dashboard layouts. |
| Auth Pages | Auth pages are implemented and should only be changed for explicit auth/design fixes. |
| Dashboard Data | Dashboard pages use API-first reads with preview/static fallback. Do not delete fallback/mock data until all secondary widgets and mutation flows are backed by API data. |
| API Migration | Move page by page from inline/static/mock data to `api-service.ts` or React Query while preserving the approved UI. |
| i18n | Prefer `next-intl` messages for stable UI copy; inline dictionaries/static text should be migrated gradually. |
| Validation | After frontend code edits, run `rtk lint` and `rtk npm run build`. |
| Deployment Target | Frontend production target is DigitalOcean VPS behind Hostinger-managed DNS, not Vercel. |
| Production Runbook | Use `process/general-plans/references/production-readiness-runbook.md` for DNS, Nginx, SSL, env, storage, backup, monitoring, and final QA gates. |

---

## 9. Development Tracker

> **Tracking rule for AI agents**: setelah menyelesaikan task frontend apa pun yang tercantum di bawah, update file ini dan ubah checkbox dari `[ ]` menjadi `[x]`. Jika scope task berubah, tambahkan catatan singkat agar developer berikutnya memahami status terakhir.

### Phase 1: Mock → API Migration (Critical)

> [!IMPORTANT]
> These tasks convert pages from mock data to real backend API data.

- [x] **API Contract Cleanup** — Fixed `getReports()`, `getNarratives()`, `getSources()`, and pagination typings to match backend response shapes. Completed 2026-05-30.
- [x] **Dashboard Home** — Wired to `getDashboardSummary()` for KPIs, trends, sentiment donut, latest signals, trending topics, sources health, system status, and date filters. Quick actions wired to slide-over drawer. All secondary widgets (topics, sources, system status) now consume live data; empty arrays used as fallback. Mock fallbacks (`activitySeries`, `miniTopics`, `alerts`, `dashboardMetrics`) removed from `mock-data.ts` 2026-06-05. Completed 2026-05-31; mock fallbacks removed 2026-06-05.
- [x] **Signals Page** — Wired the main table to `getSignals()` with API field mapping, search, 24h/7d/30d params, pagination, loading/error/empty states, and preview fallback. Expanded `getSignalsMeta()` usage for live sidebar panels, source donut total, timeline labels, and peak tooltip; backend `/signals/meta` timeline now uses 24h Signal data. Completed 2026-05-31; expanded 2026-06-06. Fully bilingual 2026-06-13: all panels (SummaryPanel, FollowUpPanel, RecommendationPanel, SourceDonut, TimelineChart, InvestigationQueue), filter tabs, time range options, table headers, search placeholder, footer text, error states, and mock fallback data translated via 80+ `next-intl` keys. Mock fallback functions (getSignalRows, getFollowUps, getRecommendations) removed 2026-06-13 (100% API-driven). TimelineChart has interactive hover tooltip with bilingual labels. SourceDonut builds dynamic conic gradient from API data. InvestigationQueue links to `/cases` via redirect page.
- [x] **Alerts Page** — Main list wired to `getAlerts()` with pagination. Status/assignment mutations wired via dropdown menu and editable assignment fields on detail page. Expanded `getAlertsSummary()` usage for live severity/status metric cards, source distribution donut, and 24h timeline/peak tooltip on 2026-06-06. Completed 2026-05-31; expanded 2026-06-06.
- [x] **Alert Detail Page** — Replaced mock lookup with `getAlertById()` and React Query state handling. Mock fallbacks removed 2026-06-05. Completed 2026-05-30.
- [x] **Visibility Page** — Complete production-ready overhaul. Removed all mock/fallback data. 100% API-driven: `getVisibility()`, `getVisibilitySummary()`, `getVisibilityTrends()`. Features: date filter (7/14/30/90 days) with quick toggle; CSV export; dynamic executive summary from trend deltas; AI Search Sandbox with real `triggerVisibilityAnalysis()` API call and bilingual response parsing; SVG line charts (Mentions Trend, Competitor vs); donut chart (Share of Voice); Top Platforms bar chart; Top Topics table with link to Intelligence page; Latest Mentions with "View all" modal; AI Actions with "See all" modal; all empty states; all i18n (EN/ID) with 60+ translation keys; bilingual AI responses (EN/ID). Completed 2026-05-31; expanded 2026-06-06; production-ready 2026-06-21.
- [x] **Intelligence Page** — Wired to `getNarratives()` with `buildNarrativeClusters` mapping. Competitor narrative share donut and lifecycle cards are live-derived from cluster signal counts, velocity, and impact. AI Summary is generated dynamically from live cluster data. Footer metrics wired to `getSources()`. Interactive panels (Analysis, Landscape, All Clusters) wired to React Portal modals. Completed 2026-05-31; mock fallbacks removed 2026-06-05; secondary panels and dynamic interactions expanded 2026-06-19.
- [x] **Reports Page** — `getReports()` with pagination wired. PDF export via `createReportExport()` with polling and auto-download wired. Removed all residual `mockRows` fallback logic and aligned internal enum tags to English (`READY`) for dynamic translations on 2026-06-19. AI Report Summary dynamic from `getNarratives()` + `getDashboardSummary()`. Format Donut dynamic gradient from `getReportsAnalytics()`. Timeline Chart with dynamic Y-axis and peak tooltip. Popular Reports with View All modal. Report Preview Sidebar connected to real data with View Preview navigation. Quick Actions all 4 buttons wired (Share, Schedule, Create, History). Manage Templates full CRUD (system read-only + custom). Schedule Settings full CRUD with enable/disable. Create New Report form with template selector and date range via `generateReportFromTemplate()`. Share to Stakeholder email modal via `sendReportEmail()`. All components 100% i18n with empty/loading states. Completed 2026-05-31; modernized 2026-06-19; full production readiness 2026-06-19.
- [x] **Action Plans Page** — `getActionPlans()`, `getActionPlanById()`, `getActionPlansMetrics()`, `getActionQueue()`, `createActionPlan()`, `getActionPlanLearning()`, and `submitActionPlanFeedback()` wired. Accept/reject buttons on action detail. Removed `mockActions` and static fallback UI logic making it 100% API-driven. Fixed i18n translation keys 2026-06-13. Create modal invalidates queue/metrics/latest plan after successful create; backend multi-step `option.steps` rendering fixed. Completed 2026-05-31; finalized 2026-06-17.
- [x] **Sources Page** — `getSources()` with toggle, sync all, and delete mutations wired. Add/connect controls now call `bootstrapDefaultSources()` to create Apify actor presets only; blog/news domains use `apify/web-scraper`. Completed 2026-05-31; preset bootstrap wired 2026-06-07; RSS presets removed 2026-06-07; Fixed "Sync All" POST body/error handling and switched Sync All to batch endpoint plus source-ID identity for duplicate names 2026-06-08. Individual sync per-source added 2026-06-12. Search by name/category added 2026-06-12. Empty states for VolumeBars, DistributionDonut, HealthDonut added 2026-06-12. All hardcoded Indonesian/English strings translated to bilingual (metric cards, health labels, distribution panel, empty states, settings labels) 2026-06-13. Endpoint alignment and chunked Sync All for 25-source backend batch limit finalized 2026-06-17. Global configuration/settings controls are explicitly excluded from this completed scope and deferred to Settings page work.
- [x] **Settings Page** — `getWorkspaceSettings()`, `updateWorkspaceSettings()`, `getWorkspaceMembers()`, `createWorkspaceMember()`, `deleteWorkspaceMember()`, and `changePassword()` wired with validation. UI polished including icon-only logo upload button. Completed 2026-05-31.
- [ ] **Settings Page — Global Source Configuration** — Implement workspace-wide source defaults such as sync frequency, source language, dedupe policy, and retention controls. This should own the persistence/API contract before Data Sources links to or reflects these settings.

### Phase 2: Missing Features (High Priority)

- [x] **Onboarding API** — Connect onboarding steps to workspace setup endpoints. Flow processes and saves dummy default configuration, then redirects to dashboard. Completed 2026-06-04.
- [ ] **File Upload** — Settings logo upload is wired to the backend local upload API. Remaining scope: migrate storage to cloud storage (S3/Supabase Storage) before production-scale deployment.
- [x] **Activity Log** — Created `/workspace/activity` page and wired it to `getActivityLogs()` / `GET /api/workspace/activity` with filters, metrics, table states, sidebar navigation, and pagination. Completed 2026-06-05. Fully translated to bilingual (metric cards, headers, event badge names, relative time format using `numeric: "always"`) 2026-06-13.
- [x] **Cases Page** — Create `/workspace/cases` page and wire it to the cases API endpoints. Added sidebar navigation entry under "Action" group. Added `/cases` → `/workspace/cases` redirect page. Completed 2026-06-04.
- [x] **Integrations Page** — Created `/workspace/integrations` page and wired it to integration CRUD endpoints with create form, filters, inline status update, disconnect confirmation, sidebar navigation, and table states. Completed 2026-06-05.
- [x] **Real-time Notifications** — Added SSE (`/api/notifications/stream`) to automatically push new notifications to the frontend bell icon without polling. Completed 2026-06-04.
- [x] **Export Downloads** — PDF export via `createReportExport()` with polling via `getReportExportStatus()` and auto-download on completion. Completed 2026-05-31.
- [x] **Notification Settings** — Wired to `GET/PATCH /api/workspace/notification-settings` via workspace-settings API. Backend endpoints implemented. Completed 2026-05-31.
- [x] **Mobile Responsive** — Completed code-level mobile audit and fixed high-risk overflow/button wrapping patterns across dashboard pages. Completed 2026-05-30. Final device/browser visual QA is still recommended before release.

### Phase 3: UX Polish (Medium Priority)

- [x] **Reusable State Components** — Added `components/dashboard/dashboard-states.tsx` with dashboard empty/error/loading states and metric/table/panel skeletons. Completed 2026-05-30.
- [x] **Loading States** — Ensure all pages show skeleton loaders during API fetch. All dashboard pages now use skeletons/loading states while API data loads.
- [x] **Error States** — Show meaningful error messages when API fails (not just empty state). All dashboard pages show reusable error states and fall back to preview data when live data is unavailable.
- [x] **Empty States** — Design and implement empty states for all data tables/lists. All dashboard pages show reusable empty states for successful empty API responses. Sources page VolumeBars, DistributionDonut, and HealthDonut now show contextual empty views with icons and descriptive text when no data is available. Completed 2026-05-30; Sources page empty states added 2026-06-12.
- [x] **Toast Notifications** — Added shared `ToastProvider`/`useToast` and replaced the settings page local toast with standardized success, error, and info feedback for existing mutation/action flows. Default toast titles/close labels and Action Plans feedback toasts now use `next-intl` so EN/ID follows the active user language. Completed 2026-05-31; localization tightened 2026-06-08.
- [x] **Confirmation Dialogs** — Added reusable `ConfirmationDialog` and wired existing destructive settings actions: pause/reset/delete workspace and remove member. Completed 2026-05-31.
- [x] **Search Functionality** — Implemented topbar global search across alerts, narratives/clusters, and navigation pages with debounced input, dropdown results, type badges, empty state, and keyboard support. Search now consumes live `getAlerts()` and `getNarratives()` data; mock-data fallbacks removed. Sources page also has per-page search by name/category. Completed 2026-05-31; live data 2026-06-05; Sources page search added 2026-06-12.
- [x] **Pagination** — Added shared dashboard pagination controls and wired Signals, Alerts, and Reports tables to API `page`/`pagination` data with Prev/Next navigation. Completed 2026-05-31.
- [x] **Date Filters** — Wired 24h/7d/30d filters to API query params for dashboard summary and signals. Added shared date-range option builder and backend dashboard `startDate`/`endDate` support. Completed 2026-05-31.
- [x] **Chart Animations** — Added reusable chart entry/draw/donut animation utilities with reduced-motion support, then applied them to Recharts components and inline SVG/CSS charts across dashboard pages. Completed 2026-05-31.
- [x] **i18n Consistency** — Migrate all inline `dictionary` objects to `next-intl` message files. Extracted `ActionPlans`, `Sources`, and `Visibility` dictionaries to `messages/*.json`. Completed final migration for `Cases`, `Integrations`, `Alerts`, `Reports`, `Settings`, and `Intelligence` pages 2026-06-08, removing all remaining hardcoded UI text and inline dictionaries. Sidebar nav labels (DemoApp.nav + OnboardingDesign.sidebar) fully translated to Indonesian 2026-06-13. Signals page 80+ keys added for filters, headers, footers, error states, mock data 2026-06-13. Sources page metric cards, health labels, distribution panel, empty states, settings labels translated 2026-06-13.

### Phase 4: Production Readiness (Before Launch)

- [x] **Auth Guard** — Implement middleware to redirect unauthenticated users to `/login`. Added Next 16 `proxy.ts` route guard backed by a client-set auth marker cookie, with dashboard client guard still validating the stored token.
- [x] **Token Refresh Adoption** — Use `apiClient.ts`/`api-service.ts` from pages so the existing refresh retry is exercised. Primary dashboard reads now fetch through React Query + `api-service`, which calls `apiClient` and its refresh-token retry path.
- [x] **SEO Meta Tags** — Add proper title/description for each page. Added root title template, Open Graph/Twitter defaults, and route-level metadata layouts for dashboard, auth, onboarding, and detail pages.
- [x] **Error Boundary** — Ensure `error.tsx` catches and displays errors gracefully. Added dashboard, app, and global error boundaries with simple retry-focused copy.
- [x] **Performance** — Audited chart/map bundle hotspots and lazy-loaded dashboard chart components with `next/dynamic`. Split `WorldActivityMap` into its own `react-simple-maps` module so map code is not bundled with Recharts charts. Completed 2026-05-31.
- [x] **Accessibility** — Completed targeted code-level audit for updated dashboard controls. Added dialog focus management/trapping, pagination navigation labels/live status, and labels for icon-only source view toggles. Completed 2026-05-31. Manual screen-reader/browser QA is still recommended before launch.
- [x] **E2E Tests** — Added Playwright setup, npm scripts, smoke coverage for auth redirects/login controls, and workspace coverage for Activity Log, Integrations CRUD/status/disconnect, and Settings logo upload. Completed 2026-05-31; expanded workspace coverage 2026-06-05.
- [ ] **VPS Deployment** — Prepare DigitalOcean VPS + Hostinger DNS deployment readiness. Production runbook created 2026-06-06 with env docs, PM2/systemd guidance, Nginx reverse proxy shape, SSL, storage/backup, monitoring, and frontend/backend domain mapping. Remaining scope: execute on real VPS and complete final production QA.
- [x] **Remove Mock Data** — All primary and secondary dashboard widgets (topics, sources, system status, signals sidebar panels) now use live API endpoints (`getDashboardSummary` and `getSignalsMeta`). Some mock arrays remain only as fallback data when the DB is entirely empty or API fails.
- [x] **Console Cleanup** — Remove all `console.log` debug statements. Frontend was already clean. Backend: replaced 45+ raw `console.log` calls across 13 files with structured `logStructured()` from shared logger. Only `logger.js` itself retains `console.log` as the centralized output.
- [x] **NPM Audit Security Fix** — Upgraded `next` to `16.2.7` and added `postcss` override in `package.json` to resolve high/moderate vulnerabilities.
- [x] **Remove Microsoft OAuth** — Removed Microsoft login button from auth pages, `MicrosoftLogo` component, and `microsoft` from `AuthUser.provider` type. Only Google OAuth2 remains for social login. Completed 2026-06-12.
- [x] **Invite Member Modal Fix** — Fixed backdrop blur not covering Topbar by wrapping modal in `createPortal` to escape `z-10` stacking context in `dashboard-shell.tsx`. Completed 2026-06-12.

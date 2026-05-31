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
**Framework**: Next.js 16.2.4 (App Router, Turbopack)
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
| Charts | Custom SVG/CSS + Recharts + `react-simple-maps` | Recharts charts are lazy-loaded on dashboard home; `WorldActivityMap` is split into a separate dynamic map module |
| Icons | Lucide React + SVGL + `react-icons` | Lucide for UI, SVGL/React Icons for brand/source logos |
| Font | Poppins (Google Fonts) | Via `next/font` |
| Animation | `tw-animate-css` + custom chart utilities | `animate-in`, `fade-in`, `slide-in-*`, chart entry/draw/donut animations with reduced-motion support |
| Data Fetching | Native `fetch`, typed `api-service.ts`, React Query provider | Auth uses native `fetch`; dashboard pages now use React Query + `api-service` with preview/mock fallbacks where live coverage is incomplete |

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
| Demo Login | "Try Demo Mode" button — bypasses API, uses hardcoded session |
| Social Login | Apple, Google, Microsoft buttons (currently show "unavailable" toast) |
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
| Social Sign Up | Apple, Google, Microsoft |
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
| API Integration | Should call workspace setup endpoints (currently UI-only) |

---

### 3.3 Dashboard Pages (`/app/(dashboard)/`)

#### Layout Components
| Component | Detail |
|-----------|--------|
| Sidebar | Collapsible (292px → 92px), gradient background, nav groups: Main, Analysis, Action, System |
| Topbar | Sticky, global search across alerts/narratives/pages, language toggle (EN/ID), notification popover, user avatar, logout |
| Mobile Nav | Bottom navigation bar for mobile viewports |

#### 🏠 Command Center (`/` — Dashboard Home)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (6x) | Total Signals, Critical Signals, Active Signals, AI Visibility Mentions, Avg Response, Active Sources | `getDashboardSummary()` for live KPI subset; preview fallback remains |
| Activity Chart | Area chart showing signal volume over time (15 data points) | `getDashboardSummary().trends` with `activitySeries` fallback; 24h/7d/30d query params wired |
| Signal Category Donut | Pie chart: Reputasi, Operasional, Produk, Keamanan, Regulasi, Lainnya | `getDashboardSummary().sentiment_distribution` for sentiment donut; topic breakdown remains preview/static |
| Latest Alerts | List of 5 alert items with severity colors, source, time | `getDashboardSummary().latest_signals` with `alerts` fallback |
| Trending Topics | Top 5 topics with mention counts and trend deltas | `topTopics` mock |
| Active Sources | Table with source name, icon, status, health, signal count | `sources` mock |
| System Status | 5 system indicators (Platform, AI Engine, Data Pipeline, etc.) | `systemStatus` mock |
| Quick Actions | 6 action buttons (New Alert, Report, Analyze, Sources, Settings, Help) | `quickActions` mock |

#### 📡 Signals (`/signals`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| AI Summary + KPIs | Executive summary, signal metrics, investigation health | Inline/static page data |
| Follow-up Panel | Recommended next response and ownership context | Inline/static page data |
| Filter Row | Source/severity/status filters | Local state |
| Signals Table | Main table with source, narrative, severity, confidence, status | Wired to `getSignals()` with search, 24h/7d/30d params, pagination, and preview fallback |
| Recommendations | AI action suggestions beside the table | Inline/static page data |
| Source Donut | Source distribution donut | Inline SVG/CSS |
| Timeline + Queue | Investigation timeline and queue cards | Inline/static page data |

#### 🔔 Alerts (`/alerts`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Metric Cards | Alert volume, SLA, severity, confidence KPIs | Inline/static page data |
| AI Summary | AI assistant panel using `/mainapp/alerts-ai-agent.png` | Static asset |
| Quick Filters | Severity/status/source filters | Local state |
| Alert Table | Main alert list with source, confidence, owner, status | Wired to `getAlerts()` with pagination and preview fallback |
| Action Panels | Response playbook, source mix, timeline, investigation status | Inline SVG/CSS + static data |
| Alert Detail | Drill-down page at `/alerts/[id]` | Wired to `getAlertById()` with preview/error state handling |
| Status Actions | `updateAlertStatus()` and `updateAlertAssignment()` wired | Status dropdown menu on alert list, editable assignment fields on detail page |

#### 🔍 AI Visibility (`/visibility`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (5x) | Total AI Mentions, Brand Mentions, Share of Voice, Average Position, AI Sentiment | Partially wired to `getVisibility()` with static sections retained where backend fields are missing |
| AI Platform Distribution | Bar chart: ChatGPT, Gemini, Copilot, Perplexity, Claude | Inline/static data with SVGL icons |
| Executive Summary | AI-generated summary text with "See all" button | Local dict |
| Prompt Test Table | Table: Prompt, Engine, Brand Response, Competitor Response, Tone comparison | Inline/static data; backend `prompts[]` contract exists |
| Competitor Share | Horizontal bars comparing brand vs competitors | Inline/static data |
| AI Mention Examples | Cards showing actual AI platform responses mentioning Narriv | Inline/static data |
| Trending Topics Table | Topic, Mentions, Direction, Type | Inline/static data |
| AI Agent Card | Avatar image, brand personality description | Static content using `/mainapp/ai-avatar.png` |
| Global Map | Indonesia-focused map with geo-distributed data points | SVG/CSS map |
| Geo Actions | Localized action recommendations per region | Inline/static data; backend `geoActions[]` contract exists |

#### 🧠 Intelligence (`/intelligence`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Topic Map | Interactive bubble map showing narrative clusters | Partially wired to `getNarratives()` with preview cluster fallback; map/detail UI still needs fuller backend field coverage |
| Cluster Bubbles | Sized by signal count, colored by sentiment | Position: x/y coordinates in mock |
| Cluster Detail Panel | Selected cluster: title, description, signal count, priority, AI recommendation | Click interaction |
| Related Topics | Tags showing related clusters with growth deltas | `related[]` in cluster data |
| Cluster List | Sidebar list of all clusters with signal counts | Same data source |
| Time Filter | 24h, 7 days, 30 days dropdown | Local state |

#### 📊 Reports (`/reports`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| AI Report Summary | AI assistant panel using `/mainapp/reports-ai-agent.png` | Static asset |
| Preview + Metrics | Report preview, KPI cards, readiness indicators | Inline/static page data |
| Report Table | Report vault table with owner, cadence, readiness, status | Wired to `getReports()` with pagination and preview fallback |
| Quick Actions | Generate, export, schedule, share actions | Export wired via `createReportExport()` with polling |
| Bottom Cards | Format mix, trend chart, popular templates | Inline SVG/CSS + static data |
| Export API | Backend/API service functions exist | Export wired: `createReportExport()` + `getReportExportStatus()` with polling and auto-download |

#### 🎯 Action Center (`/action-plans`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Open actions, SLA, auto-resolved, response velocity | Inline/static page data |
| Filters | Queue/status filters | Local state |
| Kanban Board | 4-column action workflow with avatars and priority | Inline/static page data |
| Action Detail | Selected action detail with evidence and plan steps | Inline/static page data |
| Performance + AI Learning | Performance metrics and feedback learning panels | Inline/static page data |
| API Functions | Action-plan/feedback/assignment functions exist in `api-service.ts` | `getActionPlans()`, `getActionQueue()`, and `submitActionPlanFeedback()` are wired; accept/reject buttons on detail |

---

### 3.4 Workspace Pages (`/workspace/`)

#### ⚙️ Settings (`/workspace/settings`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Workspace Logo | Upload/change logo with preview | Local state |
| Brand Name | Text input | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Industry | Dropdown selector | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Timezone | Dropdown (WIB, WITA, WIT) | Loaded/saved via `getWorkspaceSettings()` / `updateWorkspaceSettings()` with local fallback |
| Language | Dropdown (Bahasa Indonesia, English) | Local state/UI control |
| Notification Email | Text input | Loaded/saved via workspace settings API with local fallback |
| WhatsApp PIC | Text input | Loaded/saved via workspace settings API with local fallback |
| Team Members Table | Name, Role, Email, Status, Actions | Loaded via `getWorkspaceMembers()` with preview fallback |
| Invite Member | Add member form | Wired to `createWorkspaceMember()` API with validation |
| Remove Member | Delete action | Wired to `deleteWorkspaceMember()` API with confirmation dialog |
| Settings Cards | Profile, Notifications, Analysis, Team, Security, Language | Quick access grid |
| Save Button | Submit all changes | Calls `updateWorkspaceSettings()` for supported fields |
| Change Password | Current + New password form | Wired to `changePassword()` API with validation (min 10 chars, uppercase, number, symbol) |

#### 📊 Sources (`/workspace/sources`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Connected sources, ingestion volume, health, latency | Inline/static page data |
| Connector Grid | Connector tiles: Instagram, YouTube, X, Blogger, Discourse, etc. | Wired to `getSources()` with preview connector fallback; toggle/sync/delete mutations wired |
| Health Sidebar | Pipeline health and recent incidents | Inline/static page data |
| Recent Activity | Source sync/activity list | Inline/static page data |
| Global Settings | Sync frequency, language, dedupe, retention controls | UI-only |
| Charts | Volume chart and source distribution donut | Inline SVG/CSS |
| API Functions | Source CRUD/ingestion functions exist in `api-service.ts` | `getSources()`, `updateSource()` (toggle), `deleteSource()`, and `runSourceIngestion()` (sync) are wired |

#### `/settings`

`/settings` exists as a route alias that re-exports `/workspace/settings`.

#### Not Present As Frontend Routes

| Planned Route | Current Status |
|---------------|----------------|
| `/workspace/integrations` | No `page.tsx` exists |
| `/workspace/activity` | No `page.tsx` exists |
| `/workspace/cases` | No `page.tsx` exists |

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
| Toast | `toast.tsx` | Shared success/error/info notification provider |
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
| WorldActivityMap | `world-activity-map.tsx` | Dynamic `react-simple-maps` map module split out of Recharts bundle |

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
| SocialButtons | `auth-shell.tsx` | Apple/Google/Microsoft login buttons |
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

`frontend/lib/api-service.ts` defines typed fetchers for most backend endpoints, and `frontend/lib/apiClient.ts` adds bearer tokens plus one refresh-token retry on `401`. Dashboard pages now use React Query + `api-service.ts` for their primary live list/detail/settings reads, with preview/mock fallbacks retained where backend coverage or UX flows are incomplete.

Auth is the exception: `/login` and `/signup` call the backend directly with native `fetch`.

### 6.2 Service Functions vs Page Usage

| Frontend Function / Flow | Endpoint | Service Exists | Used By Current Pages |
|---|---|---:|---:|
| Login form | `POST /auth/login` | Direct `fetch` | Yes |
| Signup form | `POST /auth/register` | Direct `fetch` | Yes |
| `logoutSession()` | `POST /auth/logout` | Yes | Yes — topbar logout calls API to revoke refresh token before clearing local state |
| `getCurrentUser()` | `GET /auth/me` | Yes | No |
| `getDashboardSummary()` | `GET /api/dashboard/summary` | Yes | Yes — dashboard home uses KPI/trend/sentiment/latest signal fields with date filters |
| `getSignals()` / `getSignalById()` | `GET /signals`, `GET /signals/:id` | Yes | `getSignals()` yes on `/signals`; `getSignalById()` not currently used by a route |
| `getAlerts()` / `getAlertById()` | `GET /api/alerts`, `GET /api/alerts/:id` | Yes | Yes — list page and detail page use React Query |
| Alert status/assignment functions | `PATCH /api/alerts/:id/status`, `PATCH /api/alerts/:id/assign` | Yes | Yes — alerts page dropdown for status change, alert detail page editable assignment fields |
| `getVisibility()` | `GET /api/visibility` | Yes | Yes — partially mapped with static fallback sections |
| Action-plan functions | `/api/action-plans`, `/api/actions` | Yes | Yes — `getActionPlans()`, `getActionQueue()`, and `submitActionPlanFeedback()` are wired; accept/reject buttons on action detail |
| Report/export functions | `/api/reports`, `/api/reports/:id/export`, `/api/reports/exports/:jobId` | Yes | Yes — `getReports()` and `createReportExport()` with polling via `getReportExportStatus()` wired to PDF download |
| `getNarratives()` | `GET /api/narratives` | Yes | Yes — partially mapped to intelligence UI with preview fallback |
| Source/ingestion functions | `/sources`, `/ingestion/run/:sourceId`, `/ingestion/status/:jobId` | Yes | Yes — `getSources()`, `updateSource()` (toggle), `deleteSource()`, and `runSourceIngestion()` (sync) are wired |
| Workspace settings/member functions | `/api/workspace/settings`, `/api/workspace/members` | Yes | Yes — `getWorkspaceSettings()`, `updateWorkspaceSettings()`, `getWorkspaceMembers()`, `createWorkspaceMember()`, `deleteWorkspaceMember()` are wired |
| `changePassword()` | `POST /auth/change-password` | Yes | Yes — settings page change password form with validation |

### 6.3 Known Contract Issues

| Area | Issue |
|------|-------|
| Pagination | Backend list endpoints use mixed wrappers: most return `pagination`, while `/api/actions` returns `meta`. `api-service.ts` now models both shapes explicitly. |
| Page Wiring | Primary dashboard reads are now wired to `api-service.ts`, but many secondary cards/actions still use preview/static data until backend coverage is complete. |
| Token Refresh | Implemented in `apiClient.ts` and exercised by dashboard pages through React Query + `api-service.ts`. |

---

## 7. Internationalization (i18n)

| Aspect | Detail |
|--------|--------|
| Library | `next-intl` (client-side only) |
| Languages | English (`en`), Indonesian (`id`) |
| Message Files | `frontend/messages/en.json` (54KB), `frontend/messages/id.json` (55KB) |
| Provider | `IntlProvider` wraps all pages |
| Toggle | `useUiStore.toggleLanguage()` |
| Namespaces | `AuthDesign`, `DemoApp` (topbar, sidebar, dashboard, settings, etc.) |
| Some pages | Use inline `dictionary` objects or static copy instead of `next-intl` (visibility, intelligence, signals, alerts, reports, action-plans, workspace pages) |

---

## 8. Current State Assessment

### ✅ What's Working
- All auth pages render and function (login, signup, reset, verify, new-password)
- Demo login bypasses API for UI testing
- Dashboard layout with sidebar, topbar with global search, responsive design
- Implemented dashboard routes render: `/`, `/signals`, `/alerts`, `/alerts/[id]`, `/visibility`, `/intelligence`, `/reports`, `/action-plans`, `/workspace/sources`, `/workspace/settings`, plus `/settings` alias
- i18n toggle works on auth and dashboard pages
- Language transition animation (View Transitions API)
- API client/service layer for all backend endpoints with React Query integration
- Zustand stores with persistence (auth + UI settings)
- All CRUD mutations wired: alerts, sources, reports, action plans, settings
- Auth guard via `proxy.ts` (Next.js 16), logout with refresh token revocation
- Form validation on invite member, workspace settings, and change password
- Dashboard quick actions wired to slide-over drawer
- Global search across alerts, narratives, and navigation
- Chart components with entry/draw/donut animations and reduced-motion support
- Loading/error/empty states, toasts, confirmation dialogs, pagination, date filters
- Mock data cleanup: 16 unused exports removed from `mock-data.ts`

### ⚠️ Known Issues & Gaps
1. **Static/Mock Data Dependency**: Dashboard pages use live API reads for primary data, but secondary widgets (topics, sources, system status) and preview fallbacks still rely on `mock-data.ts`. 16 unused exports have been removed; remaining mocks serve as fallback data.
2. **Onboarding Flow**: UI-only, no API integration. Steps don't save to backend.
3. **Social Login**: Apple/Google/Microsoft buttons show "unavailable" toast.
4. **Workspace Logo Upload**: UI exists but no file upload API endpoint.
5. **Missing Workspace Routes**: `/workspace/activity`, `/workspace/cases`, and `/workspace/integrations` do not currently exist as frontend pages.
6. **Notification Channels**: UI toggles exist but no real push/dispatch integration.
7. **Real-time Updates**: No WebSocket or polling for live signal/alert updates.
8. **Reset Password**: UI exists at `/reset-password` but no backend API endpoint — flow is mocked.

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

---

## 9. Development Tracker

> **Tracking rule for AI agents**: setelah menyelesaikan task frontend apa pun yang tercantum di bawah, update file ini dan ubah checkbox dari `[ ]` menjadi `[x]`. Jika scope task berubah, tambahkan catatan singkat agar developer berikutnya memahami status terakhir.

### Phase 1: Mock → API Migration (Critical)

> [!IMPORTANT]
> These tasks convert pages from mock data to real backend API data.

- [x] **API Contract Cleanup** — Fixed `getReports()`, `getNarratives()`, `getSources()`, and pagination typings to match backend response shapes. Completed 2026-05-30.
- [x] **Dashboard Home** — Wired to `getDashboardSummary()` for KPIs, trends, sentiment donut, latest signals, and date filters. Quick actions wired to slide-over drawer. Secondary widgets (topics, sources, system status) still use mock fallback. Completed 2026-05-31.
- [x] **Signals Page** — Wired the main table to `getSignals()` with API field mapping, search, 24h/7d/30d params, pagination, loading/error/empty states, and preview fallback. Completed 2026-05-31.
- [x] **Alerts Page** — Main list wired to `getAlerts()` with pagination. Status/assignment mutations wired via dropdown menu and editable assignment fields on detail page. Completed 2026-05-31.
- [x] **Alert Detail Page** — Replaced mock lookup with `getAlertById()` and React Query state handling. Completed 2026-05-30.
- [x] **Visibility Page** — Wired to `getVisibility()` with fallback handling. Completed 2026-05-31.
- [x] **Intelligence Page** — Wired to `getNarratives()` with `buildNarrativeClusters` mapping and fallback. Completed 2026-05-31.
- [x] **Reports Page** — `getReports()` with pagination wired. PDF export via `createReportExport()` with polling and auto-download wired. Completed 2026-05-31.
- [x] **Action Plans Page** — `getActionPlans()`, `getActionQueue()`, and `submitActionPlanFeedback()` wired. Accept/reject buttons on action detail. Completed 2026-05-31.
- [x] **Sources Page** — `getSources()` with toggle, sync all, and delete mutations wired. Completed 2026-05-31.
- [x] **Settings Page** — `getWorkspaceSettings()`, `updateWorkspaceSettings()`, `getWorkspaceMembers()`, `createWorkspaceMember()`, `deleteWorkspaceMember()`, and `changePassword()` wired with validation. Completed 2026-05-31.

### Phase 2: Missing Features (High Priority)

- [ ] **Onboarding API** — Connect onboarding steps to workspace setup endpoints
- [ ] **File Upload** — Implement logo upload with cloud storage (S3/Supabase Storage)
- [ ] **Activity Log** — Create `/workspace/activity` page and wire it to a new `AuditLog` API
- [ ] **Cases Page** — Create `/workspace/cases` page after the backend case model/API is designed
- [ ] **Integrations Page** — Create `/workspace/integrations` page after integration/OAuth endpoints exist
- [ ] **Real-time Signals** — Add polling or WebSocket for live signal/alert updates
- [x] **Export Downloads** — PDF export via `createReportExport()` with polling via `getReportExportStatus()` and auto-download on completion. Completed 2026-05-31.
- [ ] **Notification Settings** — Wire notification channel toggles to backend API
- [x] **Mobile Responsive** — Completed code-level mobile audit and fixed high-risk overflow/button wrapping patterns across dashboard pages. Completed 2026-05-30. Final device/browser visual QA is still recommended before release.

### Phase 3: UX Polish (Medium Priority)

- [x] **Reusable State Components** — Added `components/dashboard/dashboard-states.tsx` with dashboard empty/error/loading states and metric/table/panel skeletons. Completed 2026-05-30.
- [x] **Loading States** — Ensure all pages show skeleton loaders during API fetch. All dashboard pages now use skeletons/loading states while API data loads.
- [x] **Error States** — Show meaningful error messages when API fails (not just empty state). All dashboard pages show reusable error states and fall back to preview data when live data is unavailable.
- [x] **Empty States** — Design and implement empty states for all data tables/lists. All dashboard pages show reusable empty states for successful empty API responses.
- [x] **Toast Notifications** — Added shared `ToastProvider`/`useToast` and replaced the settings page local toast with standardized success, error, and info feedback for existing mutation/action flows. Completed 2026-05-31.
- [x] **Confirmation Dialogs** — Added reusable `ConfirmationDialog` and wired existing destructive settings actions: pause/reset/delete workspace and remove member. Completed 2026-05-31.
- [x] **Search Functionality** — Implemented topbar global search across alerts, narratives/clusters, and navigation pages with debounced input, dropdown results, type badges, empty state, and keyboard support. Completed 2026-05-31.
- [x] **Pagination** — Added shared dashboard pagination controls and wired Signals, Alerts, and Reports tables to API `page`/`pagination` data with Prev/Next navigation. Completed 2026-05-31.
- [x] **Date Filters** — Wired 24h/7d/30d filters to API query params for dashboard summary and signals. Added shared date-range option builder and backend dashboard `startDate`/`endDate` support. Completed 2026-05-31.
- [x] **Chart Animations** — Added reusable chart entry/draw/donut animation utilities with reduced-motion support, then applied them to Recharts components and inline SVG/CSS charts across dashboard pages. Completed 2026-05-31.
- [x] **i18n Consistency** — Migrate all inline `dictionary` objects to `next-intl` message files. Extracted `ActionPlans`, `Sources`, and `Visibility` dictionaries to `messages/*.json`.

### Phase 4: Production Readiness (Before Launch)

- [x] **Auth Guard** — Implement middleware to redirect unauthenticated users to `/login`. Added Next 16 `proxy.ts` route guard backed by a client-set auth marker cookie, with dashboard client guard still validating the stored token.
- [x] **Token Refresh Adoption** — Use `apiClient.ts`/`api-service.ts` from pages so the existing refresh retry is exercised. Primary dashboard reads now fetch through React Query + `api-service`, which calls `apiClient` and its refresh-token retry path.
- [x] **SEO Meta Tags** — Add proper title/description for each page. Added root title template, Open Graph/Twitter defaults, and route-level metadata layouts for dashboard, auth, onboarding, and detail pages.
- [x] **Error Boundary** — Ensure `error.tsx` catches and displays errors gracefully. Added dashboard, app, and global error boundaries with simple retry-focused copy.
- [x] **Performance** — Audited chart/map bundle hotspots and lazy-loaded dashboard chart components with `next/dynamic`. Split `WorldActivityMap` into its own `react-simple-maps` module so map code is not bundled with Recharts charts. Completed 2026-05-31.
- [x] **Accessibility** — Completed targeted code-level audit for updated dashboard controls. Added dialog focus management/trapping, pagination navigation labels/live status, and labels for icon-only source view toggles. Completed 2026-05-31. Manual screen-reader/browser QA is still recommended before launch.
- [x] **E2E Tests** — Added Playwright setup, npm scripts, and smoke coverage for protected-route redirect, authenticated auth-route redirect, and primary login controls. Completed 2026-05-31. CRUD flow coverage should be expanded once live mutation endpoints are finalized.
- [ ] **VPS Deployment** — Prepare DigitalOcean VPS + Hostinger DNS deployment readiness: production env docs, PM2/systemd process notes, Nginx reverse proxy, SSL, and frontend/backend domain mapping
- [ ] **Remove Mock Data** — Partially done: 16 unused exports removed from `mock-data.ts`. Remaining mocks serve as fallback data for dashboard widgets and need backend API coverage before full removal.
- [x] **Console Cleanup** — Remove all `console.log` debug statements. Frontend was already clean. Backend: replaced 45+ raw `console.log` calls across 13 files with structured `logStructured()` from shared logger. Only `logger.js` itself retains `console.log` as the centralized output.

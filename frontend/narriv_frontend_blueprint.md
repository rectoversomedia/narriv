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
| Charts | Custom SVG/CSS + Recharts + `react-simple-maps` | Dashboard chart components still import external chart/map libraries |
| Icons | Lucide React + SVGL + `react-icons` | Lucide for UI, SVGL/React Icons for brand/source logos |
| Font | Poppins (Google Fonts) | Via `next/font` |
| Animation | `tw-animate-css` | `animate-in`, `fade-in`, `slide-in-*` |
| Data Fetching | Native `fetch`, typed `api-service.ts`, React Query provider | API service exists, but dashboard pages are not yet wired to it |

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
| Topbar | Sticky, search bar, language toggle (EN/ID), notification popover, user avatar, logout |
| Mobile Nav | Bottom navigation bar for mobile viewports |

#### 🏠 Command Center (`/` — Dashboard Home)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (6x) | Total Signals, Critical Signals, Active Signals, AI Visibility Mentions, Avg Response, Active Sources | `mock-data.ts` → should be `GET /api/dashboard/summary` |
| Activity Chart | Area chart showing signal volume over time (15 data points) | `activitySeries` mock |
| Signal Category Donut | Pie chart: Reputasi, Operasional, Produk, Keamanan, Regulasi, Lainnya | `miniTopics` mock |
| Latest Alerts | List of 5 alert items with severity colors, source, time | `alerts` mock |
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
| Signals Table | Main table with source, narrative, severity, confidence, status | Inline/static data; not wired to `getSignals()` |
| Recommendations | AI action suggestions beside the table | Inline/static page data |
| Source Donut | Source distribution donut | Inline SVG/CSS |
| Timeline + Queue | Investigation timeline and queue cards | Inline/static page data |

#### 🔔 Alerts (`/alerts`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Metric Cards | Alert volume, SLA, severity, confidence KPIs | Inline/static page data |
| AI Summary | AI assistant panel using `/mainapp/alerts-ai-agent.png` | Static asset |
| Quick Filters | Severity/status/source filters | Local state |
| Alert Table | Main alert list with source, confidence, owner, status | Inline/static data; not wired to `getAlerts()` |
| Action Panels | Response playbook, source mix, timeline, investigation status | Inline SVG/CSS + static data |
| Alert Detail | Drill-down page at `/alerts/[id]` | Uses `alerts` from `mock-data.ts`, not `getAlertById()` |
| Status Actions | Backend function exists in `api-service.ts` | Not currently used by the page |

#### 🔍 AI Visibility (`/visibility`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Cards (5x) | Total AI Mentions, Brand Mentions, Share of Voice, Average Position, AI Sentiment | Inline dictionary/static data; not wired to `getVisibility()` |
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
| Topic Map | Interactive bubble map showing narrative clusters | `intelligenceClusters` mock; not wired to `getNarratives()` |
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
| Report Table | Report vault table with owner, cadence, readiness, status | Inline/static data; not wired to `getReports()` |
| Quick Actions | Generate, export, schedule, share actions | UI-only |
| Bottom Cards | Format mix, trend chart, popular templates | Inline SVG/CSS + static data |
| Export API | Backend/API service functions exist | Not currently called by the page |

#### 🎯 Action Center (`/action-plans`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Open actions, SLA, auto-resolved, response velocity | Inline/static page data |
| Filters | Queue/status filters | Local state |
| Kanban Board | 4-column action workflow with avatars and priority | Inline/static page data |
| Action Detail | Selected action detail with evidence and plan steps | Inline/static page data |
| Performance + AI Learning | Performance metrics and feedback learning panels | Inline/static page data |
| API Functions | Action-plan/feedback/assignment functions exist in `api-service.ts` | Not currently called by the page |

---

### 3.4 Workspace Pages (`/workspace/`)

#### ⚙️ Settings (`/workspace/settings`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| Workspace Logo | Upload/change logo with preview | Local state |
| Brand Name | Text input | Local state; API exists but page is not wired |
| Industry | Dropdown selector | Local state; API exists but page is not wired |
| Timezone | Dropdown (WIB, WITA, WIT) | Local state; API exists but page is not wired |
| Language | Dropdown (Bahasa Indonesia, English) | Local state/UI control |
| Notification Email | Text input | Local state; API exists but page is not wired |
| WhatsApp PIC | Text input | Local state; API exists but page is not wired |
| Team Members Table | Name, Role, Email, Status, Actions | Inline/static data; API exists but page is not wired |
| Invite Member | Add member form | UI-only; API exists but page is not wired |
| Remove Member | Delete action | UI-only; API exists but page is not wired |
| Settings Cards | Profile, Notifications, Analysis, Team, Security, Language | Quick access grid |
| Save Button | Submit all changes | UI-only; API exists but page is not wired |
| Change Password | Current + New password form | UI-only; API exists but page is not wired |

#### 📊 Sources (`/workspace/sources`)
| Widget | Detail | Data Source |
|--------|--------|-------------|
| KPI Row | Connected sources, ingestion volume, health, latency | Inline/static page data |
| Connector Grid | Connector tiles: Instagram, YouTube, X, Blogger, Discourse, etc. | Inline/static page data with SVGL/React Icons |
| Health Sidebar | Pipeline health and recent incidents | Inline/static page data |
| Recent Activity | Source sync/activity list | Inline/static page data |
| Global Settings | Sync frequency, language, dedupe, retention controls | UI-only |
| Charts | Volume chart and source distribution donut | Inline SVG/CSS |
| API Functions | Source CRUD/ingestion functions exist in `api-service.ts` | Not currently called by the page |

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

### 4.2 Dashboard Components (`components/dashboard/`)

| Component | File | Usage |
|-----------|------|-------|
| DashboardSkeleton | `DashboardSkeleton.tsx` | Full-page loading state |
| DistributionChart | `DistributionChart.tsx` | Sentiment distribution pie |
| KpiCard | `KpiCard.tsx` | Single metric card |
| LatestSignalsTable | `LatestSignalsTable.tsx` | Signal list table |
| PlatformBarChart | `PlatformBarChart.tsx` | Platform distribution bars |
| TrendChart | `TrendChart.tsx` | Time series area chart |
| Charts | `charts.tsx` | Reusable chart primitives (DonutChart, BarChart, AreaChart) |
| DashboardKit | `dashboard-kit.tsx` | `AppCard`, `GlowButton`, `SectionHeader` wrappers |

### 4.3 Layout Components (`components/layout/`)

| Component | File | Usage |
|-----------|------|-------|
| Sidebar | `Sidebar.tsx` | Navigation sidebar with collapse toggle |
| Topbar | `Topbar.tsx` | Top header with search, notifications, user |

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
  theme: "light" | "dark",        // Not fully implemented in UI
  language: "en" | "id",           // Active language
  sidebarCollapsed: boolean,       // Sidebar state
  setTheme, setLanguage, toggleTheme, toggleLanguage, toggleSidebar
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

`frontend/lib/api-service.ts` defines typed fetchers for most backend endpoints, and `frontend/lib/apiClient.ts` adds bearer tokens plus one refresh-token retry on `401`. However, dashboard pages currently do **not** import `@/lib/api-service`; they render inline/static data or `mock-data.ts`. React Query is provided globally but no page currently uses `useQuery` or `useMutation`.

Auth is the exception: `/login` and `/signup` call the backend directly with native `fetch`.

### 6.2 Service Functions vs Page Usage

| Frontend Function / Flow | Endpoint | Service Exists | Used By Current Pages |
|---|---|---:|---:|
| Login form | `POST /auth/login` | Direct `fetch` | Yes |
| Signup form | `POST /auth/register` | Direct `fetch` | Yes |
| `logoutSession()` | `POST /auth/logout` | Yes | No; topbar logout only clears local store |
| `getCurrentUser()` | `GET /auth/me` | Yes | No |
| `getDashboardSummary()` | `GET /api/dashboard/summary` | Yes | No |
| `getSignals()` / `getSignalById()` | `GET /signals`, `GET /signals/:id` | Yes | No |
| `getAlerts()` / `getAlertById()` | `GET /api/alerts`, `GET /api/alerts/:id` | Yes | No |
| Alert status/assignment functions | `PATCH /api/alerts/:id/status`, `PATCH /api/alerts/:id/assign` | Yes | No |
| `getVisibility()` | `GET /api/visibility` | Yes | No |
| Action-plan functions | `/api/action-plans`, `/api/actions` | Yes | No |
| Report/export functions | `/api/reports`, `/api/reports/:id/export`, `/api/reports/exports/:jobId` | Yes | No |
| `getNarratives()` | `GET /api/narratives` | Yes | No |
| Source/ingestion functions | `/sources`, `/ingestion/run/:sourceId`, `/ingestion/status/:jobId` | Yes | No |
| Workspace settings/member functions | `/api/workspace/settings`, `/api/workspace/members` | Yes | No |
| `changePassword()` | `POST /auth/change-password` | Yes | No |

### 6.3 Known Contract Issues

| Area | Issue |
|------|-------|
| Reports | `getReports()` is typed as `{ reports: ReportRecord[] }`, but the backend returns `{ data, pagination }`. |
| Pagination | `PaginatedResponse<T>` uses `meta`, while several backend list endpoints return `pagination`; `/api/actions` returns `meta`. |
| Page Wiring | Most pages cannot fall back from API to mock data because they never call the API in the first place. |
| Token Refresh | Implemented in `apiClient.ts`, but unused by dashboard pages until they move to `api-service.ts` or React Query. |

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
- Dashboard layout with sidebar, topbar, responsive design
- Implemented dashboard routes render: `/`, `/signals`, `/alerts`, `/alerts/[id]`, `/visibility`, `/intelligence`, `/reports`, `/action-plans`, `/workspace/sources`, `/workspace/settings`, plus `/settings` alias
- i18n toggle works on auth and dashboard pages
- Language transition animation (View Transitions API)
- API client/service layer exists for most backend endpoints
- Zustand stores with persistence
- Chart components render correctly

### ⚠️ Known Issues & Gaps
1. **Static/Mock Data Dependency**: Dashboard pages rely on `mock-data.ts` or inline/static arrays. They do not currently import `@/lib/api-service`.
2. **Dark Mode**: `useUiStore` has `theme` but dark mode is not implemented in the UI.
3. **Onboarding Flow**: UI-only, no API integration. Steps don't save to backend.
4. **Social Login**: Apple/Google/Microsoft buttons show "unavailable" toast.
5. **Workspace Logo Upload**: UI exists but no file upload API endpoint.
6. **Missing Workspace Routes**: `/workspace/activity`, `/workspace/cases`, and `/workspace/integrations` do not currently exist as frontend pages.
7. **Notification Channels**: UI toggles exist but no real push/dispatch integration.
8. **Real-time Updates**: No WebSocket or polling for live signal/alert updates.
9. **Settings Page**: Has local form state for several controls; backend save/load is not wired into the page.
10. **Report Contract Mismatch**: `getReports()` expects `{ reports }` but backend returns `{ data, pagination }`.

---

## 8.1 Development Operating Notes

These replace the removed frontend checklist/guidelines and should be treated as the current working rules.

| Area | Current Rule |
|------|--------------|
| Source of Truth | Use this blueprint for route inventory, API status, and frontend development tracking. |
| Visual Direction | Preserve the current light enterprise SaaS dashboard with dark navy sidebar, compact white cards, rounded 8-16px surfaces, soft borders, and blue/purple accent language. |
| UI Fidelity | Match approved screenshots/rebuild direction closely before wiring API data. Avoid generic dashboard layouts. |
| Auth Pages | Auth pages are implemented and should only be changed for explicit auth/design fixes. |
| Dashboard Data | Current dashboard pages are static/mock. Do not assume API wiring exists until page imports prove it. |
| API Migration | Move page by page from inline/static/mock data to `api-service.ts` or React Query while preserving the approved UI. |
| i18n | Prefer `next-intl` messages for stable UI copy; inline dictionaries/static text should be migrated gradually. |
| Validation | After frontend code edits, run `rtk lint` and `rtk npm run build`. |

---

## 9. Development Tracker

> **Tracking rule for AI agents**: setelah menyelesaikan task frontend apa pun yang tercantum di bawah, update file ini dan ubah checkbox dari `[ ]` menjadi `[x]`. Jika scope task berubah, tambahkan catatan singkat agar developer berikutnya memahami status terakhir.

### Phase 1: Mock → API Migration (Critical)

> [!IMPORTANT]
> These tasks convert pages from mock data to real backend API data.

- [ ] **API Contract Cleanup** — Fix `getReports()` and pagination typings to match backend response shapes
- [ ] **Dashboard Home** — Replace `dashboardMetrics`, `activitySeries`, `miniTopics`, `alerts`, `topTopics`, `sources` mock data with `getDashboardSummary()` API response
- [ ] **Signals Page** — Wire the rebuilt page to `getSignals()` and map API fields to the current table/card layout
- [ ] **Alerts Page** — Wire the rebuilt page to `getAlerts()` and wire status/assignment mutations where controls exist
- [ ] **Alert Detail Page** — Replace `mock-data.ts` lookup with `getAlertById()`
- [ ] **Visibility Page** — Map `getVisibility()` response to all widget sections; decide which static sections need backend support
- [ ] **Intelligence Page** — Map `getNarratives()` response to the current topic map/detail UI
- [ ] **Reports Page** — Fix `getReports()` response typing, wire table/export actions, remove static report rows
- [ ] **Action Plans Page** — Wire `getActionPlans()`, `getActionQueue()`, create, assignment, and feedback flows
- [ ] **Sources Page** — Wire `getSources()` and source CRUD/ingestion actions into the rebuilt connector UI
- [ ] **Settings Page** — Wire all settings fields to `getWorkspaceSettings()` / `updateWorkspaceSettings()`; test team management

### Phase 2: Missing Features (High Priority)

- [ ] **Dark Mode** — Implement theme toggle across all pages using CSS variables and `useUiStore.theme`
- [ ] **Onboarding API** — Connect onboarding steps to workspace setup endpoints
- [ ] **File Upload** — Implement logo upload with cloud storage (S3/Supabase Storage)
- [ ] **Activity Log** — Create `/workspace/activity` page and wire it to a new `AuditLog` API
- [ ] **Cases Page** — Create `/workspace/cases` page after the backend case model/API is designed
- [ ] **Integrations Page** — Create `/workspace/integrations` page after integration/OAuth endpoints exist
- [ ] **Real-time Signals** — Add polling or WebSocket for live signal/alert updates
- [ ] **Export Downloads** — Complete report export download flow with signed URLs
- [ ] **Notification Settings** — Wire notification channel toggles to backend API
- [ ] **Mobile Responsive** — Audit and fix responsive breakpoints across all pages

### Phase 3: UX Polish (Medium Priority)

- [ ] **Loading States** — Ensure all pages show skeleton loaders during API fetch
- [ ] **Error States** — Show meaningful error messages when API fails (not just empty state)
- [ ] **Empty States** — Design and implement empty states for all data tables/lists
- [ ] **Toast Notifications** — Standardize success/error toasts across all mutations
- [ ] **Confirmation Dialogs** — Add confirm dialogs for destructive actions (delete source, remove member)
- [ ] **Search Functionality** — Implement topbar global search across signals, alerts, clusters
- [ ] **Pagination** — Add pagination controls for signals, alerts, reports tables
- [ ] **Date Filters** — Wire time range filters (24h, 7d, 30d) to API query params
- [ ] **Chart Animations** — Add entry animations to all chart components
- [ ] **i18n Consistency** — Migrate all inline `dictionary` objects to `next-intl` message files

### Phase 4: Production Readiness (Before Launch)

- [ ] **Auth Guard** — Implement middleware to redirect unauthenticated users to `/login`
- [ ] **Token Refresh Adoption** — Use `apiClient.ts`/`api-service.ts` from pages so the existing refresh retry is exercised
- [ ] **SEO Meta Tags** — Add proper title/description for each page
- [ ] **Error Boundary** — Ensure `error.tsx` catches and displays errors gracefully
- [ ] **Performance** — Audit bundle size; lazy load heavy pages and chart components
- [ ] **Accessibility** — Audit ARIA labels, keyboard navigation, focus management
- [ ] **E2E Tests** — Write Playwright tests for critical flows (login, dashboard, CRUD)
- [ ] **Vercel Deployment** — Configure build settings, environment variables, domain
- [ ] **Remove Mock Data** — Delete `mock-data.ts` after all pages use real API
- [ ] **Console Cleanup** — Remove all `console.log` debug statements

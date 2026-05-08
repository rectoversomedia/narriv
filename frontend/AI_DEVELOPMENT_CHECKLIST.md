# Frontend AI Development Checklist

This checklist is generated from the Narriv knowledge graph and Frontend Development Guidelines. As an AI Agent working on this repository, you should check off these items (`- [x]`) when you have completed them.

## About Narriv (Application Overview)
Narriv is a **Narrative Intelligence & GEO (Generative Engine Optimization) Platform** designed to monitor, analyze, and act upon omnichannel data. It tracks brand presence and narratives across news, social media, videos, and podcasts. 

Core capabilities include:
1. **Omnichannel Ingestion:** Pulling multi-source data into a core data model.
2. **AI Intelligence Engine:** Processing signals to extract sentiment, detect themes, and cluster data into dominant narratives.
3. **Predictive Alerts:** Identifying emerging risks and opportunities.
4. **GEO AI Visibility:** Monitoring brand presence and competitor mentions on AI search engines (ChatGPT, Perplexity).
5. **Action Engine:** Generating structured, actionable recommendations.
6. **AI Learning Loop:** Continuously improving the system based on user feedback.

## Phase 1: Foundation & Theme
- [x] Read `frontend/FRONTEND_DEVELOPMENT_GUIDELINES.md` completely.
- [x] Update global theme and font tokens to use `Outfit`, brand blue (`#465FFF`), and light/dark surface tokens (`app/globals.css`).
- [x] Remove all old zinc/red-orange UI themes.

## Phase 2: Mock Data & Demo Architecture
- [x] Create `lib/mock-data.ts` to hold dummy data for all dashboard modules.
- [x] Convert `lib/apiClient.ts` to be API-ready but non-blocking (use dummy data for Vercel demo).

## Phase 3: Auth & Shell Updates
- [x] Convert auth flow to use demo `localStorage` auth (no backend dependency for demo).
- [x] Add "Continue with Google" demo button to the login page.
- [x] Rebuild the Dashboard Shell (`app/(dashboard)/layout.tsx`): Update Sidebar and Topbar using stakeholder-v2 naming.
- [x] Ensure responsive behavior (Desktop: full sidebar, Tablet: narrow/rail, Mobile: top app bar + sticky action controls).

## Phase 4: Core Pages Implementation (V2)
- [x] **Command Center** (`/`): Build the 4 metric cards, Narrative Intelligence Layer, Predictive Alerts, Structured Recommendations, GEO Watch, and Learning Loop panels using `mock-data.ts`.
- [x] **GEO / AI Visibility** (`/visibility`): Build AI Visibility Score, Brand Presence Rate, Competitor Mention Rate, and prompt-level result tables.
- [x] **Action Engine** (`/action-plans`): Build Intelligence Input card, Recommendation Outputs matrix, Generated Execution Plan, and feedback controls (Accept/Edit/Reject) with local state.
- [x] **Predictive Alerts + Learning Loop** (`/alerts`): Build Predictive Alert Queue, Explainable Drivers, Adaptive Model Scoring, and Triage CTA.

## Phase 5: Secondary Pages & Finalization
- [x] **Narrative Signals** (`/signals`): Build Signal feed with sentiment badges and signal detail panel.
- [x] **Narrative Intelligence** (`/intelligence`): Build cluster list/map approximation and dominant narrative details.
- [x] Update remaining placeholder pages (Reports, Workspace Sources, Settings) enough for navigation completeness.
- [x] Run `npm run lint` and resolve issues.
- [x] Run `npm run build` to verify Vercel deployment readiness (no secret env vars required).

## Phase 6: Production API Integration
- [x] Create `lib/api-service.ts` — typed API fetcher layer with graceful fallback to mock data.
- [x] Update `lib/apiClient.ts` — skip `demo-token` for Authorization, add `credentials: "omit"`.
- [x] Update `app/(auth)/login/page.tsx` — call real `POST /auth/login` backend endpoint; fallback to demo session if backend unreachable; display auth errors.
- [x] Update `app/(dashboard)/page.tsx` (Command Center) — fetch live KPI metrics from `GET /api/dashboard`; render mock metrics as fallback.
- [x] Update `app/(dashboard)/signals/page.tsx` — fetch signals from `GET /signals`; initialize with mock data to avoid blank screen.
- [x] Update `app/(dashboard)/alerts/page.tsx` — fetch alerts from `GET /api/alerts`; expose Acknowledge/Resolve actions when backend is live.
- [x] Update `backend/src/index.js` — configure CORS to explicitly allow `localhost:3001` and `*.vercel.app` origins.

## Phase 7: Remaining API Connections (TODO)
- [x] Connect `app/(dashboard)/visibility/page.tsx` to a future `GET /api/visibility` endpoint.
- [x] Connect `app/(dashboard)/action-plans/page.tsx` to a future `GET /api/action-plans` endpoint.
- [x] Connect `app/(auth)/signup/page.tsx` to `POST /auth/register` backend endpoint.
- [x] Redesign `login` and `signup` pages to match premium dark OLED style and design guidelines using `ui-ux-pro-max` skill.
- [x] Add loading skeleton states to all pages that fetch from backend.
- [x] Add error boundary for failed API fetches.

## Phase 8: Page Polish, API Detail Flows, and Localization
- [x] Remove the Topbar global search field to simplify dashboard chrome.
- [x] Redesign `app/(dashboard)/signals/page.tsx` into a clean shadcn-style responsive data table.
- [x] Add search, sentiment filter, source/resource filter, and icon-only pagination to Narrative Signals.
- [x] Replace the old right-side Signal Detail panel with a responsive scrollable Review modal.
- [x] Connect the Signal Review modal to `GET /signals/:id` through `getSignalById()`.
- [x] Show Signal Review details from backend analysis when available: AI summary, raw scraped content, sentiment, narrative type, stakeholder, impact, confidence score, published/captured dates, and recommended action.
- [x] Preserve graceful fallback behavior for Signal Review when detail API or analysis data is unavailable.
- [x] Redesign `app/(dashboard)/workspace/sources/page.tsx` into a clean shadcn-style Data Sources page.
- [x] Correct Data Sources API integration from `/api/sources` to backend `/sources`.
- [x] Add `createSource()`, `runSourceIngestion()`, and `getIngestionStatus()` API helpers in `lib/api-service.ts`.
- [x] Add Data Sources create form, type filter, search, responsive desktop table, mobile cards, and icon-only pagination.
- [x] Connect Data Sources run action to `POST /ingestion/run/:sourceId` with status polling via `GET /ingestion/status/:jobId`.
- [x] Fix dark-theme dropdown styling for Data Sources type filter by replacing the native filter select with a custom dropdown.
- [x] Add `next-intl` dependency and client provider wired to the existing Zustand language setting.
- [x] Add `messages/en.json` and `messages/id.json` and migrate Data Sources copy to `useTranslations("DataSources")`.
- [x] Update Sidebar Indonesian navigation labels to match the simplified product language.
- [x] Run `npm run lint` after the latest frontend changes.
- [x] Run `npm run build` after the latest frontend changes.

## Phase 9: Light Theme Stabilization and Dashboard Polish
- [x] Set the app light theme as the safe visual baseline by removing the broad light-mode `.text-white` override that could affect primary buttons.
- [x] Add shared theme hover/surface/accent utilities in `app/globals.css` for consistent light/dark interactions.
- [x] Polish dashboard shell interactions in `Sidebar` and `Topbar` with theme-aware hover states.
- [x] Update shared dashboard primitives (`SurfaceCard`, `InnerPanel`, `StatusBadge`, `ProgressBar`, `Skeleton`) to render cleanly in light theme.
- [x] Audit and replace dark-first surface/hover classes across Command Center, Narrative Signals, Data Sources, Visibility, Action Plans, Alerts, Reports, Alert Detail, and workspace pages.
- [x] Preserve primary CTA and active-navigation white text now that light-mode content text is handled explicitly with theme utilities.
- [x] Redesign `app/(dashboard)/reports/page.tsx` into a shadcn-style Reporting & Export workspace with summary metrics, search/filter controls, readiness table, mobile cards, and distribution package panel.
- [x] Keep Reports connected to `getReports()` with graceful mock fallback while documenting the next backend export contract in the UI.
- [x] Add `next-intl` English/Indonesian copy for Reports and migrate `app/(dashboard)/reports/page.tsx` to `useTranslations("Reports")`.
- [x] Add `next-intl` English/Indonesian copy for Narrative Signals and migrate `app/(dashboard)/signals/page.tsx` to `useTranslations("Signals")`.
- [x] Add `next-intl` English/Indonesian copy for Command Center and migrate `app/(dashboard)/page.tsx` to `useTranslations("CommandCenter")`, including localized KPI labels and pipeline steps.
- [x] Add `next-intl` English/Indonesian copy for Visibility / GEO and migrate `app/(dashboard)/visibility/page.tsx` to `useTranslations("Visibility")`.
- [x] Add `next-intl` English/Indonesian copy for Action Plans and migrate `app/(dashboard)/action-plans/page.tsx` to `useTranslations("ActionPlans")`, including feedback state labels and fallback action-plan copy.
- [x] Add `next-intl` English/Indonesian copy for Alerts and migrate `app/(dashboard)/alerts/page.tsx` to `useTranslations("Alerts")`.
- [x] Add `next-intl` English/Indonesian copy for Narrative Intelligence and migrate `app/(dashboard)/intelligence/page.tsx` to `useTranslations("Intelligence")`.
- [x] Run `npm run lint` after Phase 9 light-theme stabilization.
- [x] Run `npm run build` after Phase 9 light-theme stabilization.

## Phase 10: Shell and Remaining UI Localization
- [x] Add `next-intl` English/Indonesian copy for Sidebar including menu, support, demo labels, and navigation labels.
- [x] Migrate `components/layout/Sidebar.tsx` to `useTranslations("Sidebar")` and `useTranslations("Sidebar.nav")`.
- [x] Add `next-intl` English/Indonesian copy for Topbar including dark/light toggle, language toggle, and logout labels.
- [x] Migrate `components/layout/Topbar.tsx` to `useTranslations("Topbar")`.
- [x] Add `next-intl` English/Indonesian copy for Alert Detail and migrate `app/(dashboard)/alerts/[id]/page.tsx` to `useTranslations("AlertDetail")`.
- [x] Add `next-intl` English/Indonesian copy for Workspace pages including activity, cases, integrations, and settings.
- [x] Migrate `app/(dashboard)/workspace/activity/page.tsx` to `useTranslations("Workspace.activity")`.
- [x] Migrate `app/(dashboard)/workspace/cases/page.tsx` to `useTranslations("Workspace.cases")`.
- [x] Migrate `app/(dashboard)/workspace/integrations/page.tsx` to `useTranslations("Workspace.integrations")`.
- [x] Migrate `app/(dashboard)/workspace/settings/page.tsx` to `useTranslations("Workspace.settings")`.
- [x] Configure next-intl with `src/i18n/request.ts` request config and `next.config.ts` plugin for static generation compatibility.
- [x] Run `npm run lint` after Phase 10 localization work.
- [x] Run `npm run build` after Phase 10 localization work.

## Phase 11: Plain-Language Copy Audit
- [x] Rewrite `messages/en.json` into clear English for non-technical users while preserving the Narrative Signals namespace.
- [x] Rewrite `messages/id.json` into clear Indonesian for non-technical users while preserving the Narrative Signals namespace.
- [x] Remove mixed-language and corrupted copy tokens from frontend messages (`citados`, `citada`, Cyrillic, Han characters, and mixed Indonesian text in English copy).
- [x] Simplify copy for Dashboard, Data Sources, AI Visibility, Action Plans, Early Warnings, Topic Map, Reports, Sidebar, Alert Detail, and Workspace pages.
- [x] Localize remaining hardcoded Workspace Cases and Integrations content through `next-intl` messages.
- [x] Delete unused legacy `lib/i18n.ts` copy dictionary after all UI copy moved to `next-intl`.
- [x] Simplify fallback/mock copy in `lib/api-service.ts` and `lib/mock-data.ts` for backend-offline demo mode.
- [x] Validate `messages/en.json` and `messages/id.json` with JSON parsing.
- [x] Run `npm run lint` after plain-language copy audit.
- [x] Run `npm run build` after plain-language copy audit.

## Phase 12: Pencil Stakeholder Copy Review Screens
- [x] Add light-theme EN screenshot reference screens to `narriv-ui-design.pen` for Dashboard, Narrative Signals, Topic Map, Early Warnings, AI Visibility, Reports, Action Plans, Data Sources, and Workspace Settings.
- [x] Add light-theme ID screenshot reference screens to `narriv-ui-design.pen` for Dashboard, Temuan Naratif, Peta Topik, Peringatan Dini, Visibilitas AI, Laporan, Rencana Aksi, Sumber Data, and Pengaturan Workspace.
- [x] Add a clearly labeled Stakeholder Copy Review header in the Pencil canvas.
- [x] Verify Pencil layout has no clipping or overflow problems after adding the review screens.

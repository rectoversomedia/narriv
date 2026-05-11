# Narriv Frontend Development Guidelines

This document is the working handoff guide for developing the Narriv frontend in `frontend/`. It is written so another model/session can continue implementation without needing the previous chat context.

## Current Goal

Maintain a production/live-only frontend for stakeholder review and deployment. Implemented pages must show live API data, loading states, empty states, or clear errors without mock/demo fallback.

The goal is now an operational response platform, not a scraping or monitoring dashboard. UI should make the flow clear for non-technical users: data is synced automatically, risks are prioritized, recommended actions are generated, owners respond, and feedback improves future recommendations.

## Primary References

Use these files as the source of truth before implementing UI:

- `../narriv-ui-design.pen`: Pencil design source.
- `../NARRIV_UI_DESIGN_GUIDELINES.md`: design system, frame inventory, responsive rules, and interaction specs.
- `../graphify-out/GRAPH_REPORT.md`: knowledge graph report with latest design/product concepts.
- `../graphify-out/graph.json`: graph data for querying design/product relationships.

Most important Pencil frames for development:

- `20 Command Center v2 - Narrative Intelligence`
- `21 GEO AI Visibility - Reference Dark`
- `22 Structured Action Engine - Reference Dark`
- `23 Learning Loop + Predictive Alerts`
- `24-27` light variants
- `28-33` responsive references
- `20A-23B` page-flow and interaction-detail boards

## Existing Frontend State

Project folder: `frontend/`

Stack:

- Next.js `16.2.4`
- React `19.2.4`
- Tailwind CSS v4
- TypeScript
- Zustand
- React Hook Form + Zod
- Recharts
- Lucide React
- TanStack React Query

Available scripts:

- `npm run dev`: local dev server on port `3001`
- `npm run build`: production build
- `npm run start`: production server
- `npm run lint`: ESLint

Important existing files:

- `app/layout.tsx`: root layout and React Query provider.
- `app/globals.css`: Tailwind v4 globals and theme tokens.
- `app/(dashboard)/layout.tsx`: protected dashboard shell.
- `components/layout/Sidebar.tsx`: current sidebar.
- `components/layout/Topbar.tsx`: current topbar.
- `store/useAuthStore.ts`: Zustand auth store with persisted local storage.
- `lib/apiClient.ts`: API client scaffold.
- `app/(auth)/login/page.tsx`: current login page.
- `app/(auth)/signup/page.tsx`: current signup page.

Important current gaps:

- Full browser QA is still needed against the live backend in light/dark mode and mobile/desktop sizes.
- Dedicated backend settings/team workflow endpoints are still pending.
- Notification, assignment, deadline, and escalation workflows are roadmap items and should not be faked in UI.
- Existing `/workspace/activity`, `/workspace/cases`, and `/workspace/integrations` routes were removed; do not re-add them unless product scope changes.

## Development Strategy

Implement the frontend as production/live-only:

- Use backend API helpers in `lib/api-service.ts` and `lib/apiClient.ts`.
- Do not introduce dummy data, mock auth, `demo-token`, or local-only fallback sessions.
- If an endpoint is unavailable, show an empty or unavailable state with plain user-facing copy.
- Keep light mode as the safe visual baseline while preserving dark theme support.
- Keep sidebar/topbar aligned with the established shell; mobile navigation uses bottom nav plus a `More` drawer.

Recommended structure:

- `lib/api-service.ts`: typed production API helpers for dashboard, sources, signals, alerts, visibility, action plans, reports, narratives, and action creation.
- `lib/routes.ts`: route/nav definitions if shared by sidebar/mobile nav.
- `lib/apiClient.ts`: bearer-token API client with refresh handling.
- `store/useAuthStore.ts`: persisted authenticated session state using backend auth responses.
- `components/ui/`: reusable primitive components if needed: `Card`, `Button`, `Badge`, `MetricCard`, `PageHeader`, `ShellCard`.
- `components/dashboard/`: product-specific dashboard components.

Keep changes pragmatic and shippable. Avoid overbuilding a full design system if a few reusable components cover the production app.

## Visual Direction

Follow `../NARRIV_UI_DESIGN_GUIDELINES.md`.

Core tokens:

- Primary blue: `#465FFF`
- Dark app background: `#101828`
- Dark card: `#FFFFFF08`
- Dark border: `#1D2939`
- Light app background: `#F9FAFB`
- Light card: `#FFFFFF`
- Light border: `#E4E7EC`
- Primary dark text: `#FFFFFF`
- Primary light text: `#101828`
- Muted dark text: `#98A2B3`
- Muted light text: `#667085`
- Negative: `#F04438` / `#F97066` dark / `#D92D20` light
- Warning: `#F79009` / `#FDB022` dark / `#B54708` light
- Positive: `#12B76A`

Typography:

- Target font: `Outfit` via `next/font/google`.
- Page title: around `30px`, weight `600`.
- Card title: around `18px`, weight `600`.
- Body/table text: `12-14px`.

Rules:

- Do not use red/orange as brand primary.
- Do not use neon, cyberpunk, decorative blobs, or generic AI gradients.
- Use blue for primary actions only.
- Use red/amber/green only for semantic states.
- Match the calm enterprise dashboard feel from the Pencil frames.

## Product Navigation

Use stakeholder-v2 naming in navigation:

- Command Center: `/`
- Narrative Signals: `/signals`
- Narrative Intelligence: `/intelligence`
- Predictive Alerts: `/alerts`
- AI Visibility / GEO: `/visibility`
- Reports: `/reports`
- Action Engine: `/action-plans`
- Data Sources: `/workspace/sources`
- Learning Loop: can be a section on alerts/action pages first, or a dedicated future route.
- Settings: `/workspace/settings`

Current active workspace routes are `/workspace/sources` and `/workspace/settings`. Workspace Activity, Cases, and Integrations are intentionally removed until backend/product scope reintroduces them.

Latest stakeholder positioning:

- Elevate AI Visibility as a hero feature, not a secondary report.
- Prefer `Auto Sync`, `Live Monitoring`, or `Scheduled Collection` over `Collect Data` for ingestion language.
- Prefer `Predictive Alerts`, `Smart Alerts`, or `Risk Alerts` over generic `Early Warnings`.
- Use simple Topic Map copy, e.g. "See which issues are growing and how they connect." Indonesian: "Melihat isu mana yang mulai membesar dan saling terhubung."
- Plan notification surfaces for WhatsApp to PIC, email, and optional Slack/Telegram.
- Plan assignment workflows with PIC, team, deadline, and escalation level.

If time is limited, prioritize routes in this order:

1. `/login`
2. `/`
3. `/visibility`
4. `/action-plans`
5. `/alerts`
6. `/signals`
7. `/intelligence`
8. `/reports`
9. `/workspace/sources`
10. `/workspace/settings`

## Auth Plan

Use backend auth only.

Requirements:

- Login calls `POST /auth/login` and stores the returned user/session.
- Signup calls `POST /auth/register` and stores the returned user/session.
- Logout calls `POST /auth/logout` and clears local session state.
- Dashboard routes remain protected by localStorage/Zustand state.
- Refresh behavior uses `POST /auth/refresh` where available.

Rules:

- Do not create fallback sessions if the backend is unavailable.
- Do not accept arbitrary demo credentials.
- Do not store or special-case fake tokens such as `demo-token`.
- Google SSO UI must not create a fake session unless a real backend SSO contract exists.

Keep `apiClient.ts` and auth store production-ready:

- Keep token/user shape simple.
- Keep protected-route behavior explicit and easy to debug.

## Production Data Plan

All dashboard pages should render from live API data or clear empty/unavailable states.

API helpers should cover:

- Command center metrics: AI Visibility Score, Narratives Detected, Predictive Alerts, Actions Accepted.
- Narrative clusters: title, confidence, sources, sentiment, velocity, evidence count.
- Predictive alerts: probability, response window, drivers, status, owner.
- GEO visibility: score, brand presence rate, competitor mention rate, prompt-level results, recommended GEO actions.
- Action engine: intelligence input, recommendation outputs, execution plan steps, feedback controls.
- Signals: source, sentiment, excerpt, confidence, narrative link, recommendation.
- Reports: report readiness, sections, distribution status.
- Data sources: source type, sync health, coverage, latency.
- Settings: profile/workspace preferences from current session until dedicated settings endpoints exist.

Keep types close to data in the same file unless they become widely reused. Do not introduce a large domain model prematurely.

## API Integration Plan

Do not hide backend unavailability with mock data.

Recommended approach:

- Pages call typed helpers in `lib/api-service.ts`.
- Keep `lib/apiClient.ts` responsible for auth headers, refresh, and consistent request behavior.
- Avoid frontend route handlers unless the UI truly needs a frontend-owned endpoint.
- Keep component props stable where possible.
- Preserve loading/error/empty states for every live data surface.

## Page Implementation Targets

### Auth

Reference frames:

- `14-18` auth frames in Pencil.

Implement:

- Light enterprise auth style.
- Logo asset usage where available.
- `Continue with Google` button.
- Workspace/security copy.
- Backend login/signup with no demo fallback.

### Command Center `/`

Reference frames:

- `20 Command Center v2 - Narrative Intelligence`
- `24 Command Center v2 - Narrative Intelligence Light`
- `28 Tablet Command Center v2 - Responsive`
- `30 Mobile Narrative Command - Responsive`
- `20A`, `20B`

Implement:

- Four metric cards.
- Narrative Intelligence Layer panel.
- Predictive Alert panel.
- Structured Recommendations card.
- GEO Watch card.
- Learning Loop card.
- Responsive layout with mobile sticky CTA if useful.

### GEO / AI Visibility `/visibility`

Reference frames:

- `21 GEO AI Visibility - Reference Dark`
- `25 GEO AI Visibility - Reference Light`
- `29 Tablet GEO + Action Engine - Responsive`
- `31 Mobile GEO Visibility - Responsive`
- `21A`, `21B`

Implement:

- AI Visibility Score.
- Brand Presence Rate.
- Competitor Mention Rate.
- Prompt-level result table/cards.
- GEO Action Engine recommendations.

### Action Engine `/action-plans`

Reference frames:

- `22 Structured Action Engine - Reference Dark`
- `26 Structured Action Engine - Reference Light`
- `32 Mobile Action Review - Responsive`
- `22A`, `22B`

Implement:

- Intelligence Input card.
- Recommendation Outputs matrix.
- Generated Execution Plan.
- Accept/Edit/Reject feedback controls.
- Feedback controls call the backend feedback endpoint and update page state from the response.

### Predictive Alerts `/alerts`

Reference frames:

- `23 Learning Loop + Predictive Alerts`
- `27 Learning Loop + Predictive Alerts Light`
- `33 Mobile Predictive Alert - Responsive`
- `23A`, `23B`

Implement:

- Predictive Alert Queue.
- Explainable drivers.
- Adaptive Model Scoring.
- Learning Loop Workflow.
- Triage/status CTA calls backend alert status or action creation endpoints.

### Narrative Signals `/signals`

Reference frames:

- `03 Signals Intelligence - Reference Dark`
- `03A`, `03B`

Implement:

- Signal feed with aligned columns/cards.
- Sentiment badges.
- Selected signal detail panel.
- Create action CTA linking to `/action-plans` or local selected state.

### Narrative Intelligence `/intelligence`

Reference frames:

- `05 Intelligence Clusters - Reference Dark`
- `05A`, `05B`

Implement:

- Narrative cluster list/map approximation.
- Dominant narrative detail.
- Evidence/source summary.

## Responsive Requirements

Minimum viewport targets:

- Mobile: `390px` wide.
- Tablet: `1024px` wide.
- Desktop: `1440px` wide.

Rules:

- Desktop uses full sidebar.
- Tablet may use collapsed rail or narrower sidebar.
- Mobile should not show desktop sidebar; use top app bar and bottom/sticky action controls.
- Avoid horizontal scrolling.
- Dense tables become cards on mobile.
- Sticky bottom CTA is acceptable for primary workflow actions.

## Next.js 16 / React 19 Rules

This project uses Next.js `16.2.4`, so do not rely on outdated assumptions.

Rules:

- Read `AGENTS.md` before code changes.
- Prefer Server Components by default, but dashboard pages can be client components where auth state, filters, modals, or live interactions require client state.
- Do not make async Client Components.
- If using `useSearchParams`, wrap with `Suspense` where required.
- Use `next/font/google` for `Outfit`.
- Use `next/image` for image assets when possible.
- Avoid browser APIs during server render; read `localStorage` only in client code/effects/Zustand persist.
- Run `npm run lint` and `npm run build` before Vercel deployment handoff.

React guidance:

- Do not add `useMemo`/`useCallback` by default.
- Use plain derived values unless there is a measured issue or existing code pattern.
- Keep client interactions simple and tied to live API contracts.

## Vercel Deployment Requirements

The frontend must build without connecting to backend services, but runtime stakeholder review should use a real API through `NEXT_PUBLIC_API_URL`.

Before deployment:

- Document `NEXT_PUBLIC_API_URL` and fail gracefully at runtime if it is missing.
- Ensure login works on Vercel through backend auth and persisted frontend session state.
- Ensure `npm run build` passes.
- Ensure no `.env` secrets are required.
- Keep `.env.example` if environment variables are documented.

Recommended Vercel settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Install command: default `npm install`
- Output: Next.js default

No backend secrets should be required in the frontend build.

## Implementation Order

Recommended sequence for the next coding session:

1. Keep production/live-only API behavior intact.
2. Run browser QA across all active routes in light and dark mode.
3. Review copy for operational-response positioning and non-technical language.
4. Elevate AI Visibility on dashboard and action/report CTAs where product hierarchy allows.
5. Add notification and assignment UI only after backend contracts exist.
6. Run lint/build and fix blockers.
7. Deploy to Vercel/staging with `NEXT_PUBLIC_API_URL` configured.

If time is constrained, prioritize live route stability, AI Visibility, alerts/action creation, and clear empty/error states.

## Verification Checklist

Before saying the frontend is ready for stakeholder preview:

- `npm run lint` passes.
- `npm run build` passes.
- Login works against backend auth.
- Logout calls backend and clears session.
- Refreshing a protected page preserves session through localStorage.
- App shows clear errors or empty states when backend data is unavailable.
- Command Center, GEO, Action Engine, and Predictive Alerts pages are navigable.
- Mobile layout has no horizontal overflow at `390px`.
- UI uses blue primary brand, not red/orange primary.
- Text and cards align with `NARRIV_UI_DESIGN_GUIDELINES.md`.
- Vercel deployment uses public frontend env vars only.

## Do Not Do Yet

- Do not reintroduce demo auth, mock data, or fake backend fallbacks.
- Do not add paid services directly from the frontend.
- Do not add complex RBAC.
- Do not overbuild charting if simple cards/tables communicate the progress better.
- Do not refactor unrelated backend code.
- Do not commit unless explicitly requested.

## Current Known Technical Debt

- Full end-to-end QA still depends on backend env readiness: OpenAI, ingestion provider, report storage, and database migration baseline.
- Dedicated workspace settings endpoint is still pending.
- Notification, assignment, deadline, and escalation contracts are not implemented yet.
- Copy should continue moving away from monitoring/scraping language toward operational response language.

## Handoff Note For Future Model

Start by reading this file, then read `../NARRIV_UI_DESIGN_GUIDELINES.md`. The current phase is production/live-only stabilization, copy refinement, and backend-aligned workflow expansion.

Do small, verifiable steps. After each major page, run at least lint if practical, and run full build before deployment handoff.

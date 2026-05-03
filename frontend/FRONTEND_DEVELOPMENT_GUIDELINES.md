# Narriv Frontend Development Guidelines

This document is the working handoff guide for developing the Narriv frontend in `frontend/`. It is written so another model/session can continue implementation without needing the previous chat context.

## Current Goal

Build a Vercel-deployable frontend preview for stakeholder progress review using dummy data first.

The goal is not backend completeness. The goal is a polished, navigable, responsive product demo that matches the completed design reference and can later be connected to real API/auth with minimal rewiring.

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

- UI still uses old zinc/red-orange direction in multiple places.
- Several dashboard pages are placeholders.
- Dashboard and alerts currently attempt backend fetches.
- Auth currently calls backend endpoints.
- Root layout still uses Geist; design target is `Outfit`.
- Existing sidebar labels need stakeholder-v2 naming.

## Development Strategy

Implement the frontend in two modes:

- Demo mode now: dummy data, localStorage auth, Vercel-safe, no backend dependency.
- API-ready mode later: API client and auth abstractions remain in place for real backend connection.

Do not delete API/auth scaffolding unless it directly blocks the demo. Instead, isolate dummy behavior behind clear modules.

Recommended structure:

- `lib/mock-data.ts`: all dummy dashboard/domain data.
- `lib/demo-auth.ts`: localStorage demo auth helpers if needed.
- `lib/routes.ts`: route/nav definitions if shared by sidebar/mobile nav.
- `lib/apiClient.ts`: keep as future backend adapter; do not make UI depend on live backend for Vercel preview.
- `store/useAuthStore.ts`: keep Zustand persist, but make it work fully without backend.
- `components/ui/`: reusable primitive components if needed: `Card`, `Button`, `Badge`, `MetricCard`, `PageHeader`, `ShellCard`.
- `components/dashboard/`: product-specific dashboard components.

Keep changes pragmatic and shippable. Avoid overbuilding a full design system if a few reusable components cover the demo.

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

## Auth Plan For Demo

Use localStorage auth first.

Requirements:

- Login works without backend.
- Signup/request-access can create a demo session or redirect to login with clear copy.
- Logout clears demo session.
- Dashboard routes remain protected by localStorage/Zustand state.
- Do not require `NEXT_PUBLIC_API_URL` for the Vercel preview.

Recommended demo credentials behavior:

- Accept any valid email and non-empty password on login.
- Store a fake token such as `demo-token`.
- Store user object from email, e.g. `{ name: "Demo User", email }`.
- Provide `Continue with Google` button that creates a demo Google Workspace-style session.
- Clearly mark this as demo auth in code comments and constants, not in stakeholder-facing UI unless useful.

Keep `apiClient.ts` and auth store API-ready:

- Future real auth can replace demo login logic without rewriting layouts.
- Keep token/user shape simple.

## Dummy Data Plan

All dashboard pages should render from local dummy data first.

Create one central dummy data module, preferably `lib/mock-data.ts`, containing typed data for:

- Command center metrics: AI Visibility Score, Narratives Detected, Predictive Alerts, Actions Accepted.
- Narrative clusters: title, confidence, sources, sentiment, velocity, evidence count.
- Predictive alerts: probability, response window, drivers, status, owner.
- GEO visibility: score, brand presence rate, competitor mention rate, prompt-level results, recommended GEO actions.
- Action engine: intelligence input, recommendation outputs, execution plan steps, feedback controls.
- Signals: source, sentiment, excerpt, confidence, narrative link, recommendation.
- Reports: report readiness, sections, distribution status.
- Data sources: source type, sync health, coverage, latency.
- Settings: profile/demo workspace preferences.

Keep types close to data in the same file unless they become widely reused. Do not introduce a large domain model prematurely.

## API Placeholder Plan

For now, do not block UI on backend availability.

Recommended approach:

- Pages import dummy data directly or through small functions like `getCommandCenterMock()`.
- Keep `lib/apiClient.ts` as a future real API adapter.
- If adding a service layer, name it explicitly as demo-safe, e.g. `lib/demo-api.ts`.
- Avoid route handlers unless needed for Vercel demo behavior. Static client data is enough for now.

When backend integration starts later:

- Replace dummy functions with API calls at module boundaries.
- Keep component props stable where possible.
- Preserve loading/error/empty states already designed for demo.

## Page Implementation Targets

### Auth

Reference frames:

- `14-18` auth frames in Pencil.

Implement:

- Light enterprise auth style.
- Logo asset usage where available.
- `Continue with Google` button.
- Workspace/security copy.
- LocalStorage demo login.

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
- Demo interactions can update local component state only.

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
- Triage CTA with local state.

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
- Prefer Server Components by default, but dashboard demo pages can be client components where localStorage/interactivity is needed.
- Do not make async Client Components.
- If using `useSearchParams`, wrap with `Suspense` where required.
- Use `next/font/google` for `Outfit`.
- Use `next/image` for image assets when possible.
- Avoid browser APIs during server render; read `localStorage` only in client code/effects/Zustand persist.
- Run `npm run lint` and `npm run build` before Vercel deployment handoff.

React guidance:

- Do not add `useMemo`/`useCallback` by default.
- Use plain derived values unless there is a measured issue or existing code pattern.
- Keep local demo interactions simple.

## Vercel Deployment Requirements

The preview must build without backend services.

Before deployment:

- Remove hard dependency on `NEXT_PUBLIC_API_URL` for demo pages.
- Ensure login works on Vercel through localStorage auth.
- Ensure `npm run build` passes.
- Ensure no `.env` secrets are required.
- Keep `.env.example` if environment variables are documented.

Recommended Vercel settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Install command: default `npm install`
- Output: Next.js default

No backend environment variables should be required for the first stakeholder demo.

## Implementation Order

Recommended sequence for the next coding session:

1. Update global theme/font tokens to `Outfit`, brand blue, and light/dark surfaces.
2. Add central mock data module.
3. Convert auth to demo localStorage auth with Google demo button.
4. Rebuild dashboard shell: sidebar, topbar, responsive behavior.
5. Implement Command Center v2 from dummy data.
6. Implement GEO / AI Visibility page.
7. Implement Action Engine page.
8. Implement Predictive Alerts + Learning Loop page.
9. Update remaining placeholder pages enough for navigation completeness.
10. Run lint/build and fix blockers.
11. Deploy to Vercel.

If time is constrained, ship steps `1-8` first and keep secondary pages simple but polished.

## Verification Checklist

Before saying the frontend is ready for stakeholder preview:

- `npm run lint` passes.
- `npm run build` passes.
- Login works with demo credentials.
- Logout clears session.
- Refreshing a protected page preserves session through localStorage.
- App works without backend running.
- Command Center, GEO, Action Engine, and Predictive Alerts pages are navigable.
- Mobile layout has no horizontal overflow at `390px`.
- UI uses blue primary brand, not red/orange primary.
- Text and cards align with `NARRIV_UI_DESIGN_GUIDELINES.md`.
- Vercel deployment does not require secret env vars.

## Do Not Do Yet

- Do not integrate real backend auth yet.
- Do not add database writes.
- Do not add paid services.
- Do not add complex RBAC.
- Do not overbuild charting if simple cards/tables communicate the progress better.
- Do not refactor unrelated backend code.
- Do not commit unless explicitly requested.

## Current Known Technical Debt

- Existing UI uses red/orange and zinc palette from earlier direction.
- Existing pages use live `fetch()` calls that will fail without backend.
- Existing auth pages call backend endpoints.
- Existing root font is Geist instead of Outfit.
- Existing placeholder pages need real stakeholder-v2 content.
- Existing route names are mostly usable, but labels must be updated to stakeholder-v2 naming.

## Handoff Note For Future Model

Start by reading this file, then read `../NARRIV_UI_DESIGN_GUIDELINES.md`. The design phase is complete; the next phase is implementation in `frontend/` for a Vercel stakeholder demo using dummy data and localStorage auth.

Do small, verifiable steps. After each major page, run at least lint if practical, and run full build before deployment handoff.

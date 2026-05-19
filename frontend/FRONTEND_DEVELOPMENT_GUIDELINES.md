# Narriv Frontend Development Guidelines

## Current Direction

The frontend is being rebuilt as a UI-first mock demo based on the screenshots in `../narriv-ui-design/`.

The goal is visual fidelity first. Backend/API integration must wait until the UI is approved.

## Non-Negotiable Rules

- Do not edit `app/(auth)/*`.
- Do not edit `components/auth/*`.
- Do not wire dashboard/onboarding pages to live backend APIs yet.
- Use mock data only for non-auth pages.
- Support both Indonesian and English through the existing `next-intl` setup.
- Preserve the official logo from `public/narriv-logo.svg`.
- Build with shadcn-style components in `components/ui/` and reusable composites in `components/dashboard/` or `components/layout/`.
- Use React Bits style interaction patterns: subtle motion, animated progress, hover lift, glow accents, and smooth state changes. Do not add heavy animation dependencies unless approved.

## Visual Reference Priority

1. `../narriv-ui-design/Onbourding/`
2. `../narriv-ui-design/MainApp/`
3. `../narriv-ui-design/Settings/`
4. `../narriv-ui-design/logo/`

## Visual Language

The screenshots use a light enterprise SaaS dashboard with a dark navy sidebar.

- Canvas: near-white `#FCFCFF` / `#FFFFFF`.
- Sidebar: deep navy `#020733` / `#030723`.
- Primary accent: vivid blue-purple `#351EFF` / `#3B20EA`.
- Secondary accents: green `#12B76A`, red `#F04438`, amber `#F79009`, soft blue `#EAF2FF`, soft purple `#F0EAFF`.
- Borders: soft blue-gray `#D6DDEC` / `#E6EAF4`.
- Text: dark navy `#101334`, secondary `#53608C`.
- Cards: white, rounded 10-16px, very soft shadow, thin border.
- Typography: Outfit via `next/font`; bold headings, compact dashboard labels.

## Page Scope

Auth pages are already completed and must remain untouched.

Non-auth pages should be rebuilt from scratch with mock data:

- `/onboarding`: five-step onboarding flow plus processing screen.
- `/`: Command Center.
- `/visibility`: AI Visibility.
- `/signals`: Signals.
- `/alerts`: Alerts.
- `/alerts/[id]`: Alert detail mock view.
- `/intelligence`: Intelligence topic map.
- `/reports`: Reports.
- `/action-plans`: Action Center.
- `/workspace/sources`: Data Sources.
- `/workspace/settings`: Settings.

## Implementation Pattern

- Keep feature/business API code in place, but do not call it from UI demo pages.
- Store demo content in `lib/mock-data.ts`.
- Keep route metadata in `lib/routes.ts`.
- Put shared shell components in `components/layout/`.
- Put reusable dashboard blocks in `components/dashboard/`.
- Prefer shadcn-style primitives from `components/ui/` for Button, Input, Card, Badge, Table, Tabs, Dialog, Dropdown, and Select-like controls.
- If a shadcn primitive is missing, add a minimal local shadcn-style implementation instead of installing broad dependencies.

## Bilingual Copy

- Use `messages/en.json` and `messages/id.json` for user-visible labels.
- Existing onboarding keys under `OnboardingDesign` should remain the source of truth for onboarding.
- New main app copy should live under `DemoApp`.
- Do not hard-code long user-facing strings in page components unless they are mock data values from `lib/mock-data.ts` with language variants.

## Quality Bar

- Desktop must match the screenshot composition closely: fixed dark sidebar, top search bar, white content cards, compact metrics, tables, and right-side widgets.
- Mobile must not break: sidebar becomes bottom/mobile menu, cards stack, tables can horizontally scroll.
- Empty/loading/backend states are not required for this UI phase unless they are visible in the design.
- Run `rtk lint` and `rtk npm run build` before handoff.

## Deferred Work

- Real auth flow changes.
- Real API integration.
- Mutations for sources, alerts, reports, settings, action plans.
- Persistence beyond local UI state.
- Advanced charting with live data.

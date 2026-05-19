# Narriv UI Rebuild Checklist

This checklist tracks the reset and rebuild of all non-auth frontend pages from `../narriv-ui-design/`.

## Global Rules

- [ ] Do not modify `app/(auth)/*`.
- [ ] Do not modify `components/auth/*`.
- [ ] Keep feature/API code available but unused by non-auth UI pages for now.
- [ ] Use mock data only from `lib/mock-data.ts`.
- [ ] Support Indonesian and English via `next-intl` messages.
- [ ] Use shadcn-style components and React Bits-style micro-interactions.

## Phase 1: Reset Foundation

- [ ] Remove old non-auth page implementations.
- [ ] Keep or recreate only the required non-auth routes: onboarding and MainApp routes.
- [ ] Establish light dashboard tokens in `app/globals.css` matching the screenshots.
- [ ] Ensure `public/narriv-logo.svg` is used in sidebar/topbar/onboarding.
- [ ] Define mock datasets in `lib/mock-data.ts` with bilingual labels where needed.

## Phase 2: UI Primitives

- [ ] Add/verify shadcn-style `Button`.
- [ ] Add/verify shadcn-style `Input`.
- [ ] Add/verify shadcn-style `Card`.
- [ ] Add/verify shadcn-style `Badge`.
- [ ] Add/verify shadcn-style `Table`.
- [ ] Add/verify shadcn-style `Tabs`.
- [ ] Add minimal `Select`, `Dropdown`, or `Dialog` primitives if required by screenshots.
- [ ] Create reusable dashboard cards, metric tiles, status badges, simple charts, and shell helpers.

## Phase 3: Onboarding First

- [ ] Match `Onbourding/01 Pengaturan awal - Langkah 1 1.png`.
- [ ] Match `Onbourding/01 pengaturan awal - langkah 2 1.png`.
- [ ] Match `Onbourding/01 Pengaturan Awal - Langkah 4 1.png` and related step 4 variant.
- [ ] Match `Onbourding/01 Pengaturan Awal - Langkah 5 1.png`.
- [ ] Match `Onbourding/01 Penyiapan sebelum dashboard 1.png`.
- [ ] Add responsive behavior for onboarding sidebar/topbar/cards.
- [ ] Verify language toggle works for onboarding copy.

## Phase 4: MainApp Shell

- [ ] Rebuild fixed dark sidebar to match MainApp screenshots.
- [ ] Rebuild topbar with search, notification, user avatar, and language toggle.
- [ ] Implement responsive mobile navigation.
- [ ] Preserve route active states.

## Phase 5: MainApp Pages

- [ ] Command Center from `MainApp/01 Command Center 1.png`.
- [ ] AI Visibility from `MainApp/01 AI Visibility 1.png`.
- [ ] Signals from `MainApp/01 SIgnals 1.png`.
- [ ] Alerts from `MainApp/01 Alert 1.png`.
- [ ] Intelligence from `MainApp/01 Intilligence 1.png`.
- [ ] Action Center from `MainApp/02 Action Center 1.png`.
- [ ] Reports from `MainApp/02 Reports 1.png`.
- [ ] Data Sources from `MainApp/02 Data Source 1.png`.
- [ ] Settings from `Settings/01 Setting 1.png` and related settings screenshots.
- [ ] Add useful mock detail pages/modals where screenshots imply them.

## Phase 6: Polish

- [ ] Add hover, active, focus-visible, and disabled states.
- [ ] Add React Bits-style animated progress/scanning effects where useful.
- [ ] Check desktop layout against screenshots.
- [ ] Check mobile layout does not break.
- [ ] Run `rtk lint`.
- [ ] Run `rtk npm run build`.

## Phase 7: Deferred API Integration

- [ ] Start only after UI approval.
- [ ] Replace mock data with `api-service.ts` calls page by page.
- [ ] Add loading, error, empty, and mutation states.
- [ ] Keep bilingual copy and visual style unchanged during API wiring.

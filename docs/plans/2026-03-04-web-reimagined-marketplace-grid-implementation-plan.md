# Implementation Plan — Web Reimagined Marketplace Grid

Date: 2026-03-04  
Depends on: `docs/plans/2026-03-04-web-reimagined-marketplace-grid-design.md`

## Phase 1 — Web Shell Foundations
1. Confirm desktop web remains no-sidebar in `app/(tabs)/_layout.tsx`.
2. Normalize top web tab/navigation visual baseline to white-surface style.
3. Standardize content max width and horizontal paddings via shared shell primitives.

## Phase 2 — Discover Recomposition
1. Refine web header/search strip for marketplace density.
2. Normalize rail hierarchy and spacing blocks.
3. Ensure hero + rails + communities use shared white card language.

## Phase 3 — Calendar + Community
1. Calendar: enforce split desktop layout and compact upcoming list cards.
2. Community: tighten search + chips + list rhythm.
3. Keep all council hooks/routes intact.

## Phase 4 — Perks + Profile
1. Perks: value-first card visuals and CTA consistency.
2. Profile: unify summary/stat/grouped cards with web spacing system.
3. Preserve all existing data and role-based behaviors.

## Phase 5 — QA + Hardening
1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Manual smoke check on web for all five tabs.
4. Validate no regressions on native navigation.

## Guardrails
- No backend schema/API contract changes.
- No hardcoded colors/sizes outside token system.
- No sidebar resurrection on desktop web.

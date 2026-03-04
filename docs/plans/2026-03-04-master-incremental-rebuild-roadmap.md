# CulturePass Incremental Rebuild — Master Roadmap

Date: 2026-03-04  
Status: In Progress  
Scope: Full tab rebuild with single adaptive codepath per screen (web + iOS + Android)

## Goal
Rebuild the core tab experience in controlled phases so UX is consistent across platforms while preserving existing API contracts and route structure.

## Non-Negotiables
- Keep one adaptive implementation per tab screen.
- Preserve backend contracts and navigation destinations.
- Use shared design tokens and `useColors()` for theme-aware styling.
- Validate each phase with typecheck and lint before moving on.

## Phased Plan

### Phase 1 — Foundations
- Add shared tab shell primitives for consistent page container behavior.
- Define reusable spacing/width conventions for web and native tab screens.
- Migrate Discover (`app/(tabs)/index.tsx`) onto the shared shell without changing business behavior.

### Phase 2 — Calendar + Community + Perks
- Move each tab screen onto shared shell primitives.
- Normalize header, summary chips, and section spacing patterns.
- Keep current queries, filtering, and route actions unchanged.

### Phase 3 — Profile + Settings Surfaces
- Refactor profile shell to align with same responsive patterns.
- Keep profile completion/admin tools behavior intact while improving maintainability.

### Phase 4 — Consistency Pass
- Remove duplicated style logic across tabs.
- Consolidate common tab-level style helpers into shared components.
- Tighten visual consistency with token-only color usage for touched areas.

### Phase 5 — Final Validation + Documentation
- Run `npm run typecheck` and `npm run lint`.
- Manual smoke checks on web desktop/compact and native layouts.
- Publish final implementation notes and follow-up backlog.

## Risk Controls
- Keep changes scoped to touched screens only.
- Avoid backend or schema modifications unless explicitly requested.
- Favor structural refactors over behavior changes in early phases.

## Current Sprint Focus
1. Create shared tab shell primitives.
2. Migrate Discover web shell to shared primitive.
3. Validate quality gates.
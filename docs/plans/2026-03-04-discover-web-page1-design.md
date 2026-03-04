# Discover Web Rebuild — Page 1 Design

Date: 2026-03-04
Status: Approved
Scope: `/(tabs)/index` (Discover/Home) web rebuild first pass

## Goal
Rebuild web Page 1 (`Discover/Home`) with mobile feature parity and web-optimized UX while keeping a single adaptive codepath. Requirement: no sidebar.

## Constraints
- Preserve all existing Discover functionality from iOS/Android behavior.
- Use single route/component (`app/(tabs)/index.tsx`) for parity.
- No sidebar on web for this phase.
- Keep existing API contracts and navigation targets unchanged.
- Keep changes focused to Page 1 and tab shell behavior needed to support no-sidebar web.

## Chosen Approach
Approach A: single adaptive screen.

### Why
- Lowest parity drift risk vs separate web-only route.
- Fastest path to improved web UX with minimal architecture churn.
- Keeps maintenance centralized.

## UX / Layout Decisions
- Desktop web uses top tab navigation (no left sidebar).
- Discover web content uses centered max-width shell with adaptive spacing and denser rails.
- Header row remains functional but adapts for compact widths (search wraps cleanly).
- Council strip includes direct action to open My Council.

## Feature Parity Mapping
Preserved:
- Discover feed sections and ordering logic.
- Event/community/activity/spotlight data queries and ranking.
- Location-aware sorting and filters.
- Existing routes for details and See All actions.
- Refresh behavior via same React Query refetch path.

## Implementation Notes
Files changed:
- `app/(tabs)/_layout.tsx`
  - Desktop web switched to top tab bar instead of sidebar.
- `app/(tabs)/index.tsx`
  - Responsive width calculations updated for no-sidebar web.
  - Compact web header behavior refined.
  - Council action CTA added.

## Validation Plan
- `npm run typecheck`
- `npm run lint`
- Manual web checks at desktop and compact desktop widths for:
  - header/search/actions layout
  - section rails rendering
  - council CTA navigation

## Out of Scope (for this page-1 pass)
- Rebuilding all other web pages.
- New backend endpoints.
- Full visual token normalization of historical hardcoded values outside touched areas.

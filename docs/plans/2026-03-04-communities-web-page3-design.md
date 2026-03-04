# Community Web Rebuild — Page 3 Design

Date: 2026-03-04
Status: Approved (continuation)
Scope: `/(tabs)/communities` web adaptive rebuild

## Goal
Rebuild Community (Page 3) with mobile feature parity and web-optimized UX in no-sidebar desktop mode.

## Constraints
- Keep all existing community features and routes.
- Keep one adaptive screen implementation.
- No sidebar assumptions on desktop web.
- Keep API contracts unchanged.

## UX / Layout Decisions
- Apply desktop top offset to clear top tab nav.
- Center content into adaptive max-width shell for web.
- Keep existing sections: header, My Council card, search, filters, featured rail, list.
- Preserve join/toggle interactions and council CTA flow.

## Implementation Notes
- Added `useLayout()` breakpoint-driven shell sizing.
- Wrapped header/search/filter blocks in centered shell containers.
- Applied web shell style to main list.
- Preserved all query/filter/saved behaviors.

## Validation
- `npm run typecheck`
- `npm run lint`
- Manual web checks at desktop and tablet widths.

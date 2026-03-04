# Perks Web Rebuild — Page 4 Design

Date: 2026-03-04
Status: Approved (continuation)
Scope: `/(tabs)/perks` web adaptive rebuild

## Goal
Rebuild Perks (Page 4) with mobile parity and web-optimized UX in no-sidebar desktop mode.

## Constraints
- Keep one adaptive implementation.
- Preserve existing perk redemption flows and route behavior.
- No backend/API contract changes.
- Respect no-sidebar web shell decisions from Page 1.

## UX / Layout Decisions
- Apply desktop top offset for top tab nav.
- Use adaptive centered shell width by breakpoint.
- Keep existing sections (header, hero, upgrade banner, grant banner, filter chips, perk list).
- Improve desktop spacing and readability without changing behavior.

## Implementation Notes
- Added `useLayout()` for breakpoints.
- Replaced window-dimension desktop check with layout-based desktop/tablet logic.
- Added web shell styles to header, hero, banners, section header, and list.

## Validation
- `npm run typecheck`
- `npm run lint`
- Manual web check for desktop/tablet/mobile widths.

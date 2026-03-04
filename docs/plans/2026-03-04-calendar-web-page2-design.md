# Calendar Web Rebuild — Page 2 Design

Date: 2026-03-04
Status: Approved (implicit continuation after Page 1)
Scope: `/(tabs)/calendar` web adaptive rebuild

## Goal
Bring Calendar (Page 2) to mobile-parity with web-optimized UX under no-sidebar desktop web navigation.

## Constraints
- Keep one adaptive codepath in `app/(tabs)/calendar.tsx`.
- Preserve existing API/data behavior (`events`, `council`, `waste`, reminders).
- No route changes, no backend changes.
- Keep mobile behavior unchanged as baseline.

## Key Decisions
- Add desktop web top offset handling to clear top tab bar.
- Center content in adaptive max-width shell with platform-aware horizontal padding.
- Keep desktop split view (calendar + upcoming rail), improve container responsiveness.
- Surface quick "Open Council" action in web summary chips.

## Implementation Notes
- Added `useLayout()` breakpoint usage.
- Replaced static web top inset with desktop-aware top inset.
- Added adaptive `contentMaxWidth` + centered ScrollView content shell.
- Kept all date/event/reminder interaction logic unchanged.

## Validation
- `npm run typecheck`
- `npm run lint`
- Manual desktop/tablet/mobile web checks for spacing and navigation.

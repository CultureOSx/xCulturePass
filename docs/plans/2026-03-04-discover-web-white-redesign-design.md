# Discover Web White Redesign — Approach A

Date: 2026-03-04  
Status: Approved  
Scope: Web path in `app/(tabs)/index.tsx` only (in-place rewrite)

## Objective
Adopt a clean, white, modern web Discover experience inspired by marketplace/event platforms while preserving all existing CulturePass data connections, queries, and navigation behavior.

## Guardrails
- Keep route and data flow unchanged (`/(tabs)/index`, same query keys and API calls).
- No backend contract changes.
- No mobile/native redesign in this pass.
- Re-skin web path only with improved hierarchy and readability.

## Chosen Implementation (A)
In-place rewrite of web composition/styles inside `app/(tabs)/index.tsx`.

### Why
- Lowest risk to feature parity.
- Fastest to ship visible web improvement.
- Avoids duplicate codepaths and route switching risk.

## Web Layout Plan
1. **Top Header Row (white surface)**
   - Greeting + location on left
   - Search input center
   - Notifications/map/profile actions right

2. **Category Chips Row**
   - Soft bordered pills on white background
   - Active state uses subtle primary tint

3. **Hero Rail + Council Card**
   - Keep existing components and data
   - Place on white card surfaces with neutral borders

4. **Content Rails**
   - Keep existing rail order and data sources:
     - Near You
     - Recommended/Featured
     - Activities
     - Artists
     - Upcoming

## Style Direction
- Replace dark gradient shell with white page background.
- Use token-driven text/surface/border colors for readability.
- Increase card contrast using subtle border + shadow.
- Preserve current responsive breakpoints and width logic.

## Out of Scope
- Reworking mobile/native Discover visuals.
- Changing recommendation logic or rail ranking.
- New backend endpoints or schema changes.

## Validation
- `npm run typecheck`
- `npm run lint`
- Manual check at `http://localhost:8083/` on Discover web

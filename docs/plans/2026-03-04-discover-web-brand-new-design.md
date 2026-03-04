# Discover Web — Brand New Page (Approach A)

Date: 2026-03-04  
Status: Approved  
Scope: `app/(tabs)/index.tsx` web path only

## Goal
Create a brand-new Discovery web page with a white modern marketplace look while preserving all existing data connections, queries, and feature behavior.

## Constraints
- Keep existing query keys and API calls unchanged.
- Keep current navigation targets unchanged.
- Rebuild web UI composition in-place only.
- Leave mobile/native experience untouched.

## UI Structure
1. Sticky utility header row (search + location + actions)
2. Hero area with one primary spotlight + secondary cards
3. Near You rail
4. Recommended rail
5. Activities rail
6. Community strip
7. Upcoming grid section

## Data Mapping
- Events: existing `/api/events` + discover feed derivations
- Communities: existing `/api/communities`
- Activities: existing `/api/activities`
- Spotlights/council: existing hooks and query calls

## Validation
- `npm run typecheck`
- `npm run lint`
- Manual check at `http://localhost:8083/` on `/(tabs)`

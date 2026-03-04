# Council Ecosystem Integration Design (Option A)

## Goal
Implement a well-integrated council ecosystem across CulturePass with a council monitoring + CRUD dashboard and shared data layer.

## Scope (approved)
- Shared council hook for unified access across tabs and dashboard
- Discover civic signals (alerts + trust metadata)
- Calendar civic reminders from waste schedule
- Perks cultural funding section from council grants
- Business trust signals via council verification + LGA display
- Communities hyper-local hints using LGA/facilities
- Council dashboard for monitoring and CRUD

## Architecture
1. `hooks/useCouncil.ts`
   - Centralizes `api.council.my` params derivation and query behavior.
   - Exposes dashboard payload + helpers (`activeAlerts`, `openGrants`, `isCouncilVerified`, `lgaCode`).

2. Council dashboard route
   - New `app/dashboard/council.tsx`.
   - Monitoring cards: active alerts, open grants, facilities, follow status.
   - CRUD surfaces for council alerts and grants (admin-level).

3. API extensions
   - Add admin council CRUD endpoints for alerts and grants in `functions/src/app.ts`.
   - Add corresponding client methods in `lib/api.ts` under `api.council.admin`.

4. Cross-screen integrations
   - Discover: civic signal card.
   - Perks: grant/funding panel.
   - Communities: LGA/facility hint bar.
   - Business detail: council verification + LGA trust signal.

## Data and Permissions
- Reuse existing council payload in `api.council.my`.
- Mutation actions remain auth-guarded.
- Dashboard CRUD protected by `requireRole('admin')` on backend.

## Failure handling
- If council is unresolved by location, each consumer falls back silently.
- UI sections hide when no council data is available.

## Validation
- `npm run lint`
- `npm run test:unit`
- Manual smoke: council tab, dashboard/council, discover, perks, communities, business detail

# My Council (Australia V1) — Design

Date: 2026-03-03
Status: Approved for implementation
Scope: Australia-only, postcode/suburb-first civic module

## 1) Goal

Ship a fully functioning My Council module that makes CulturePass useful weekly, not only event-driven.

Primary outcomes:
- Auto-resolve a user’s council from AU location context (postcode/suburb/city/state)
- Provide high-frequency utility surfaces (waste, alerts, facilities)
- Reuse existing Event and Profile infrastructure for council events and facilities
- Support follow, alert preferences, and waste reminders

## 2) Product scope (V1 AU)

In scope:
- New My Council tab/screen in Expo app (works on iOS/Android/web)
- Sidebar navigation entry for desktop web layout
- Backend council API namespace
- AU-first fallback data for pilot councils (NSW/VIC/QLD)
- Sections:
  - Council header (logo, verified badge, follow, contact links)
  - Council information
  - Waste and utilities (day/frequency + reminder toggle)
  - Council alerts (filter categories + severity)
  - Council events (from existing events entity)
  - Council facilities (from profile/venue-like data)
  - Grants and What’s On links

Out of scope (V2+):
- Polygon zoning (PostGIS)
- SMS/email delivery orchestration
- Full council admin portal and workflow engine
- Global/cross-country abstractions

## 3) Architecture

### 3.1 Data strategy

Use a hybrid strategy:
- Immediate functionality via in-memory AU fallback stores in functions/src/app.ts
- Firestore-ready route contracts that can be swapped to persisted collections

Collections modeled in V1 route contracts:
- institutions (council profiles)
- waste_schedules
- council_alerts
- council_grants
- institution_links
- user_council_links
- user_council_alert_preferences
- user_waste_reminders

Reuse existing:
- events for council events
- profiles (entityType=venue/business/community) for facilities

### 3.2 Location resolution

Resolution precedence:
1) postcode + suburb match
2) postcode only
3) city + state
4) city fallback

Inputs accepted from client:
- postcode, suburb, city, state, country

## 4) API design

Namespace: /api/council

Endpoints:
- GET /api/council/my
  - Query: postcode, suburb, city, state, country
  - Returns aggregated dashboard payload

- GET /api/council/:id
- GET /api/council/:id/waste
- GET /api/council/:id/alerts
- GET /api/council/:id/events
- GET /api/council/:id/facilities
- GET /api/council/:id/grants
- GET /api/council/:id/links

User actions:
- POST /api/council/:id/follow
- DELETE /api/council/:id/follow
- GET /api/council/:id/preferences
- PUT /api/council/:id/preferences
- GET /api/council/:id/waste-reminder
- PUT /api/council/:id/waste-reminder

## 5) Client integration

### 5.1 Native typed API

Add council namespace to lib/api.ts:
- my, get, waste, alerts, events, facilities, grants, links
- follow/unfollow
- get/update preferences
- get/update waste reminder

### 5.2 Navigation

- Add council tab to app/(tabs)/_layout.tsx
- Add My Council to components/web/WebSidebar.tsx

### 5.3 Screen

Create app/(tabs)/council.tsx:
- Resolve council using onboarding location + postcode helper fallback
- Render all sections from aggregate payload
- Support interactions:
  - follow/unfollow
  - alert category toggles
  - waste reminder toggle/time
  - tap links/contact actions

## 6) Reliability and safety

- Graceful empty states if no matching council
- Fallback to city-level council mapping when postcode unavailable
- Keep auth-required actions behind existing requireAuth middleware
- No breaking changes to existing event/activity APIs

## 7) Testing and verification

- Typecheck root project
- Route smoke tests:
  - council dashboard resolve by city/postcode
  - follow/unfollow
  - preferences and reminder update
- UI smoke:
  - council tab render on native and web-layout mode

## 8) Rollout plan

Pilot with three councils in fallback data:
- City of Parramatta Council (NSW)
- City of Melbourne (VIC)
- Brisbane City Council (QLD)

Success metrics:
- Weekly active usage of council tab
- Reminder opt-in rate
- Alert interaction CTR
- Council event click-through

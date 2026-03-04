# Release Day Checklist — 2026-03-04

Status: Ready for rollout verification

## Live Endpoints
- Production domain: https://culturepass.app
- Firebase hosting mirror: https://culturepass-b5f96.web.app

## Source of Truth
- Git branch: `main`
- Commit: `8ca7389`
- Message: Web parity, profile admin tools, upload fix, and release pipeline hardening

## Quality Gate
- `npm run qa:solid` → passed
- Includes lint, typecheck, unit/integration/smoke tests, functions build, web export

## Mobile Build Artifacts
- iOS preview build: `8cd4eb27-042b-4534-9658-a0ac4865cd02` (FINISHED)
  - IPA: https://expo.dev/artifacts/eas/ioDDiuKpiSWJsJzX4sxEa9.ipa
  - Build page: https://expo.dev/accounts/airpizza/projects/culturepass/builds/8cd4eb27-042b-4534-9658-a0ac4865cd02
- Android preview build: `1fafdc32-0b1b-444d-bc57-808702fb5f61` (FINISHED)
  - APK: https://expo.dev/artifacts/eas/4UWN4DLeh69ZxwFcQdJcfr.apk
  - Build page: https://expo.dev/accounts/airpizza/projects/culturepass/builds/1fafdc32-0b1b-444d-bc57-808702fb5f61

## Deployment Status
- Firebase Functions: deployed
- Firebase Hosting: deployed
- Web bundle export: successful

## Final Manual Checks (Owner)
- Install iOS IPA on at least 1 registered test device
- Install Android APK and verify first-launch flow
- Smoke paths:
  - Login/signup
  - Profile edit and avatar upload
  - Discover → Event detail
  - Perks redeem flow
  - Tickets list + QR screen
- Verify admin-only tools visible only for admin roles

## Production Promotion Commands (when ready)
- `npm run build:all`
- `npm run submit:ios:production`
- `npm run submit:android:production`

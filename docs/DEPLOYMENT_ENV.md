# Deployment environment setup

This document explains how to set required Expo/Firebase env vars for local dev, EAS builds, and CI.

Required Expo public env variables (client-side Firebase config):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Local dev
1. Copy `.env` from `.env.example` and fill values. Do not commit secrets.

EAS builds (recommended)
- Preferred: use `eas secret:create` for each variable (they will be available to builds) or add them as env in `eas.json` build profiles.

GitHub Actions
- Add the same values as repository secrets with the exact names used in `.github/workflows/eas-build.yml` (e.g., `EXPO_PUBLIC_FIREBASE_API_KEY`).
- Also set `EXPO_TOKEN` for EAS.

Cloud Run / Server
- Server-side credentials (service account JSON) should be stored in GCP Secret Manager and referenced by Cloud Run.

# Web Deployment Configuration — Unified Expo App

**Updated**: 3 March 2026  
**Status**: ✅ Active

## Overview

CulturePass web is deployed from the **same Expo app codebase** used for iOS and Android.

- Source of truth: root app (`app/`, `components/`, `lib/`, etc.)
- Web build output: `dist/`
- Hosting public folder: `dist/`
- API routing: Firebase Hosting rewrite `/api/**` → Cloud Function `api`

## Commands (run from repository root)

```bash
npm run web          # local Expo web dev
npm run build-web    # npx expo export --platform web
npm run deploy-web   # build + firebase deploy --only hosting
npm run deploy-all   # functions + hosting
```

## Firebase Hosting

`firebase.json` must point to:

```json
{
  "hosting": {
    "public": "dist"
  }
}
```

## Release workflow

```bash
# 1) Build backend
cd functions && npm run build && cd ..
firebase deploy --only functions

# 2) Export web
npm run build-web

# 3) Deploy hosting
firebase deploy --only hosting
```

## Policy

- Single app codebase for iOS, Android, and Web.
- Do not use standalone `web/` runtime workflows for production.
- Do not add new standalone web folders/apps.

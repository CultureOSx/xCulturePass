# Web Deployment Configuration Guide

## Current Status

### ✅ Correct Configuration
- **Firebase.json** correctly points to `dist/` as the public folder
- **Expo export command** generates the web build to `dist/`
- **dist/ folder** is in .gitignore (correct - build output)
- **Hosting rewrites** properly route API calls to Cloud Functions

```json
// firebase.json
{
  "hosting": {
    "public": "dist",  // ✅ CORRECT - Expo web export location
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"  // ✅ Routes to Cloud Functions
      },
      {
        "source": "**",
        "destination": "/index.html"  // ✅ SPA routing
      }
    ]
  }
}
```

### ⚠️ Issues Identified

1. **Legacy Next.js Folder**: `/web/` directory
   - This is a separate Next.js project
   - NOT the actual web app being deployed
   - Should be removed or added to .gitignore
   - **Status**: UNUSED - DO NOT DEPLOY

2. **Hardcoded Seed Data**: `functions/src/app.ts`
   - Event and community data hardcoded in code
   - Should be in external JSON files for better maintenance
   - Makes code bloated (1000+ lines just for seed data)

### 🔧 How it Works (Correct Flow)

```
┌─────────────────────────────────────┐
│  $ npm run export-web               │
│  (npx expo export --platform web)   │
└──────────────┬──────────────────────┘
               ↓
          ┌────────────┐
          │   dist/    │  ← Built web app
          │ index.html │
          │  _expo/    │
          │ assets/    │
          └────────────┘
               ↓
        ┌─────────────────────┐
        │  Firebase Hosting   │
        │ "public": "dist"    │
        └─────────────────────┘
               ↓
    ┌──────────────────────────┐
    │ https://culturepass.web  │
    │          .app            │
    └──────────────────────────┘
```

## Deployment Commands

### Export Web & Deploy
```bash
# 1. Build web export
npx expo export --platform web

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting

# OR both together
npm run deploy-web
```

### Full Stack Deployment (Functions + Web)
```bash
# From AGENTS.md Phase 7
npm run deploy-all
# Equivalent to:
# 1. cd functions && npm run build && cd ..
# 2. firebase deploy --only functions
# 3. npx expo export --platform web
# 4. firebase deploy --only hosting
```

## Cleanup Recommendations

1. **Remove `/web/` folder**
   ```bash
   rm -rf web/
   ```

2. **Add to .gitignore if keeping**
   ```ignore
   # Legacy Next.js project (not deployed)
   web/
   ```

3. **Extract seed data to JSON files** (see next section)

## Seed Data Migration

### Current Issue
Seed data is hardcoded in `functions/src/app.ts` (lines 945-975):
- 5 hardcoded events
- 8 hardcoded communities
- Located inline in POST `/api/admin/seed` route

### Recommended Solution
Create `functions/src/data/` folder with JSON files:

**functions/src/data/seed-events.json**
```json
[
  {
    "title": "...event title...",
    "venue": "...",
    "date": "...ISO date...",
    ...
  }
]
```

**functions/src/data/seed-communities.json**
```json
[
  {
    "name": "...",
    "description": "...",
    ...
  }
]
```

### Benefits
- ✅ Separates data from code
- ✅ Easier to add/edit seed data
- ✅ Cleaner Cloud Functions code
- ✅ Can load from external sources later (CSV, database)
- ✅ Reduce file size by ~80 lines

---

## Verification

### Confirm Correct Web Folder is Served
```bash
# 1. Check what's in dist/
ls -la dist/

# 2. Should show:
# - _expo/
# - assets/
# - favicon.ico
# - index.html
# - metadata.json

# 3. Verify firebase.json points to dist/
cat firebase.json | grep '"public"'
# Output: "public": "dist"
```

### Check Deployment
```bash
# Visit the live site
# https://culturepass.web.app

# Check the Network tab in DevTools
# - index.html comes from dist/
# - API calls route to /api/* → Cloud Functions
```

---

Generated: 3 March 2026

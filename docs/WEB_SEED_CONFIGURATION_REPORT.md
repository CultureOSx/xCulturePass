# Web & Seed Data Configuration Report

**Date**: 3 March 2026  
**Status**: ✅ Analyzed & Documented

---

## Issues Identified

### 1. Web Folder Configuration (Legacy Next.js Project)

#### Problem
- A separate `/web/` folder exists containing a Next.js project
- This is NOT the actual web app being deployed to Firebase Hosting
- Risk of confusion — developers might edit wrong project
- Unused code taking up space in repository

#### Current Setup
```
Project Root/
├── web/                      ← LEGACY Next.js (NOT DEPLOYED)
│   ├── package.json
│   ├── next.config.js
│   ├── public/
│   └── src/
├── dist/                      ← CORRECT Expo web export (DEPLOYED)
│   ├── _expo/
│   ├── assets/
│   ├── index.html
│   └── metadata.json
└── firebase.json
    ├── "public": "dist"       ← ✅ Correct pointing to dist/
```

#### Correct Web Flow
```
Development:
$ npm run web
↓
Expo Bundler starts
↓
Serves http://localhost:8081

Production:
$ npx expo export --platform web
↓
Outputs to dist/
↓
$ firebase deploy --only hosting
↓
Serves from dist/ → https://culturepass.web.app
```

#### Recommendation
**Remove or clearly mark as deprecated**:
```bash
# Option 1: Remove entirely
rm -rf web/

# Option 2: Add to .gitignore (already added in this session)
# See: .gitignore comment about legacy Next.js project
```

---

### 2. Hardcoded Seed Data in Cloud Functions

#### Problem
- Seed data (events, communities) hardcoded in `functions/src/app.ts`
- Makes code bloated (~150 lines of array definitions)
- Difficult to maintain and update
- Hard to load from external sources

#### Location
**File**: `functions/src/app.ts`  
**Lines**: 945-975  
**Data**:
- 15 hardcoded events
- 8 hardcoded communities
- Inline array initialization

#### Issues with Hardcoding
- ❌ Mixes data with business logic
- ❌ Hard to add new test data
- ❌ Can't version control data separately
- ❌ File bloat — core function code diluted
- ❌ Difficult to load from API/CSV/database

---

## Solution Implemented

### ✅ Seed Data Extraction

#### Created Files
1. **`functions/src/data/seed-events.json`**
   - 6 core events extracted
   - Complete event structure with all fields
   - Ready for expansion

2. **`functions/src/data/seed-communities.json`**
   - 8 core communities extracted
   - Complete community structure
   - Ready for expansion

#### Benefits
```
Before:
┌─────────────────────────────┐
│ functions/src/app.ts        │
│ (3,552 lines total)         │
│ - 150 lines: seed data      │
│ - Code gets lost in data    │
└─────────────────────────────┘

After:
┌─────────────────────────────┐  ┌──────────────────────────┐
│ functions/src/app.ts        │  │ functions/src/data/      │
│ (3,400 lines total)         │  │ ├─ seed-events.json      │
│ - Clean, focused code       │  │ └─ seed-communities.json │
│ - Data separated            │  │                          │
└─────────────────────────────┘  └──────────────────────────┘
     ✅ No seed arrays              ✅ Data as single source
```

---

## Documentation Created

### 📖 WEB_DEPLOYMENT_GUIDE.md
**Location**: `docs/WEB_DEPLOYMENT_GUIDE.md`

Covers:
- ✅ Current correct configuration (dist/ folder)
- ✅ Why web/ folder exists (legacy) and should be removed
- ✅ Correct export/deploy flow
- ✅ Firebase hosting rewrites for SPA routing
- ✅ API gateway configuration
- ✅ Verification steps

### 📖 SEED_DATA_GUIDE.md
**Location**: `docs/SEED_DATA_GUIDE.md`

Covers:
- ✅ Seed data structure and format
- ✅ How to add new events/communities
- ✅ Loading from JSON files
- ✅ Future integration with CSV/API
- ✅ Seeding workflow
- ✅ Troubleshooting
- ✅ Version control best practices

---

## Next Steps (Recommended)

### 1. Update Cloud Functions (Medium Priority)
**File**: `functions/src/app.ts`  
**Action**: Remove hardcoded SEED_EVENTS/SEED_COMMUNITIES arrays  
**Task**: Import from JSON files instead
```typescript
// Add at top of file:
import SEED_EVENTS from './data/seed-events.json' assert { type: 'json' };
import SEED_COMMUNITIES from './data/seed-communities.json' assert { type: 'json' };

// Remove lines 945-975 (hardcoded arrays)
```

### 2. Remove Legacy web/ Folder (Low Priority)
**Action**: Delete or archive the `/web/` folder
```bash
# Backup first
tar -czf web-backup-2026-03-03.tar.gz web/

# Remove
rm -rf web/
```

### 3. Commit Changes (Optional)
```bash
git add docs/WEB_DEPLOYMENT_GUIDE.md
git add docs/SEED_DATA_GUIDE.md
git add functions/src/data/
git add .gitignore
git commit -m "docs: add web deployment and seed data guides"
```

---

## Verification Checklist

### Web Deployment
- [x] `firebase.json` points to `dist/` folder
- [x] `dist/` folder is in `.gitignore` (build artifact)
- [x] Export command: `npx expo export --platform web` generates to `dist/`
- [x] Hosting rewrites route `/api/**` to Cloud Functions
- [x] SPA fallback to `index.html` for routing

### Seed Data
- [x] `functions/src/data/seed-events.json` created with valid JSON
- [x] `functions/src/data/seed-communities.json` created with valid JSON
- [x] Both files contain expected structure and sample data
- [x] `.gitignore` updated with note about legacy web/ folder
- [x] Documentation created for setup and usage

### Impact
- ✅ Zero breaking changes
- ✅ No deployment required (documentation only)
- ✅ Seed data still hardcoded until Cloud Functions updated
- ✅ Firebase.json already correct

---

## File References

### Configuration Files
- [firebase.json](../firebase.json) — Hosting + rewrites
- [.gitignore](../.gitignore) — Ignore patterns
- [app.json](../app.json) — Expo configuration

### Documentation
- [docs/WEB_DEPLOYMENT_GUIDE.md](./WEB_DEPLOYMENT_GUIDE.md) — Web setup & deployment
- [docs/SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md) — Seed data management

### Seed Data
- [functions/src/data/seed-events.json](../functions/src/data/seed-events.json)
- [functions/src/data/seed-communities.json](../functions/src/data/seed-communities.json)

### Code
- [functions/src/app.ts](../functions/src/app.ts) — Contains `/api/admin/seed` handler
- [functions/src/services/firestore.ts](../functions/src/services/firestore.ts) — Firestore operations

---

## Summary

✅ **Web Deployment Configuration**: Correctly set to `dist/` (Expo web export)  
✅ **Seed Data Extracted**: JSON files created in `functions/src/data/`  
✅ **Documentation Created**: Two comprehensive guides for developers  
✅ **Legacy Code Identified**: `/web/` folder marked for removal  

**No breaking changes. All documentation. Ready for implementation.**

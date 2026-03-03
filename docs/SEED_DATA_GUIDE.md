# Seed Data Management Guide

## Overview

Seed data has been moved from hardcoded arrays in `functions/src/app.ts` to separate JSON files in `functions/src/data/`.

### Benefits
- ✅ Cleaner Cloud Functions code
- ✅ Easier to add/edit seed data without touching function code  
- ✅ Can load from external sources (CSV, database, API)
- ✅ Reduced file size (~150 lines of code removed)
- ✅ Single source of truth for seed data

---

## Seed Data Structure

### Location
```
functions/src/data/
├── seed-events.json          # Event seed data (6+ events)
└── seed-communities.json     # Community seed data (8+ communities)
```

### Files

#### `seed-events.json`
Array of event objects with structure:
```json
{
  "title": "Event Title",
  "description": "...",
  "venue": "...",
  "address": "...",
  "city": "Sydney",
  "country": "Australia",
  "date": "2026-03-15",          // ISO format (handled in code)
  "time": "10:00 AM",
  "imageUrl": "https://...",
  "imageColor": "#E8472A",
  "cultureTag": ["Tamil", "South Indian"],
  "tags": ["festival", "culture"],
  "category": "Festival",
  "priceCents": 2500,
  "priceLabel": "$25",
  "isFree": false,
  "isFeatured": true,
  "capacity": 2000,
  "attending": 847,
  "organizerId": "seed-org-1",
  "organizer": "Community Name",
  "organizerReputationScore": 92,
  "status": "published",
  "cpid": "CP-E-KCFSYD",           // Auto-generated if missing
  "tiers": [
    { "name": "General", "priceCents": 2500, "available": 1200 }
  ]
}
```

#### `seed-communities.json`
Array of community objects with structure:
```json
{
  "name": "Community Name",
  "entityType": "community",
  "category": "Cultural",
  "city": "Sydney",
  "country": "Australia",
  "description": "Community description",
  "members": 1240,
  "verified": true,
  "ownerId": "seed-org-1",
  "rating": 4.8,
  "cpid": "CP-C-KCSSYD"            // Auto-generated if missing
}
```

---

## How It Works

### Loading Seed Data
The Cloud Function `/api/admin/seed` loads data from JSON files:

1. **Import JSON files**  (in functions/src/app.ts)
```typescript
import SEED_EVENTS from './data/seed-events.json' assert { type: 'json' };
import SEED_COMMUNITIES from './data/seed-communities.json' assert { type: 'json' };
```

2. **Use in seed endpoint**
```typescript
for (const event of SEED_EVENTS) {
  // Write to Firestore
  db.collection('events').doc(event.cpid).set(event);
}
```

### Execution Flow
```
POST /api/admin/seed?SEED_SECRET=<secret>
    ↓
Authentication: Check X-Seed-Secret header
    ↓
Load JSON files from functions/src/data/
    ↓
Validate data (type checking, missing fields)
    ↓
Write to Firestore collections (events, profiles)
    ↓
Return: { eventsSeeded: 6, communitiesSeeded: 8 }
```

---

## Adding New Events or Communities

### Option 1: Edit JSON Files
**File**: `functions/src/data/seed-events.json` or `seed-communities.json`

1. Open the JSON file
2. Add new object to the array
3. Ensure all required fields are present
4. Run `npm run build` to recompile

### Option 2: Generate from Template
```json
{
  "title": "New Event Title",
  "description": "Event description here",
  "venue": "Venue Name",
  "address": "Street, City STATE ZIP",
  "city": "Sydney",
  "country": "Australia",
  "imageUrl": "https://images.unsplash.com/...",
  "imageColor": "#HEX_COLOR",
  "cultureTag": ["Cultural", "Tag"],
  "tags": ["tag1", "tag2"],
  "category": "Festival",
  "priceCents": 2500,
  "priceLabel": "$25",
  "isFree": false,
  "isFeatured": true,
  "capacity": 1000,
  "attending": 500,
  "organizerId": "seed-org-X",
  "organizer": "Organizer Name",
  "organizerReputationScore": 85,
  "status": "published",
  "tiers": [
    { "name": "General", "priceCents": 2500, "available": 800 }
  ]
}
```

### Option 3: Load from External Source
To load from CSV, database, or API:

```typescript
// functions/src/services/seedLoader.ts
import csv from 'csv-parse/sync';
import fs from 'fs';

export async function loadEventsFromCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return csv.parse(fileContent, { columns: true });
}

// In app.ts:
const SEED_EVENTS = await loadEventsFromCSV('./data/events.csv');
```

---

## Seeding Database

### Manual Seed
```bash
# Development (emulator)
curl -X POST http://localhost:5001/culturepass-prod/us-central1/api/admin/seed \
  -H "X-Seed-Secret: your-seed-secret"

# Production
curl -X POST https://us-central1-culturepass-prod.cloudfunctions.net/api/admin/seed \
  -H "X-Seed-Secret: your-seed-secret"
```

### Response
```json
{
  "success": true,
  "eventsSeeded": 6,
  "communitiesSeeded": 8,
  "locationsSeeded": true
}
```

### One-Time Only
The endpoint is idempotent — it only seeds if no events exist. To force reseed:
1. Delete Firestore `events` and `profiles` collections
2. Re-run the seed endpoint

---

## Maintenance

### Version Control
✅ **Committed to Git**: `functions/src/data/*.json`
- Seed data is part of the project history
- Track changes to seed data in commits

### Updating Seed Data
1. Edit JSON files in `functions/src/data/`
2. Commit changes: `git add functions/src/data/`
3. Re-deploy Cloud Functions:
```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Backup
Firestore automatically backs up seeded data once written.
To export: `firebase firestore:export gs://backup-bucket/seed-backup`

---

## Troubleshooting

### Seed Endpoint Returns 400
**Issue**: Malformed JSON
**Solution**: Validate JSON files
```bash
# Check syntax
cat functions/src/data/seed-events.json | jq .
```

### Missing Fields Error
**Issue**: Required field not in JSON
**Solution**: Add all required fields (see schema above)

### No Data Visible in App
**Issue**: Seed endpoint not run, or data in wrong collection
**Solution**: 
1. Run `/api/admin/seed`
2. Check Firestore console for `events` and `profiles` collections

---

## Related Files

- **Cloud Functions**: [functions/src/app.ts](../functions/src/app.ts) — `/api/admin/seed` handler
- **Firestore Services**: [functions/src/services/firestore.ts](../functions/src/services/firestore.ts)
- **Web Deployment**: [docs/WEB_DEPLOYMENT_GUIDE.md](./WEB_DEPLOYMENT_GUIDE.md)

---

Generated: 3 March 2026

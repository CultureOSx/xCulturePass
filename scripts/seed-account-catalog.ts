import fs from 'node:fs';
import path from 'node:path';
import * as admin from 'firebase-admin';
import { SEED_COUNTS, SEED_EVENT_CITIES, SEED_EVENT_NAMES } from './seed-account-catalog.seed';

type SeedDoc = Record<string, unknown> & { id: string };

const DEFAULT_UID = 'tuO8D15sZzU3VHgFIWCW4WLbMiF2';
const FALLBACK_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'culturepassau';

const uidArgIndex = process.argv.findIndex((arg) => arg === '--uid');
const targetUid = uidArgIndex >= 0 ? (process.argv[uidArgIndex + 1] || DEFAULT_UID) : DEFAULT_UID;
const dryRun = process.argv.includes('--dry-run');

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function readServiceAccountFromEnvOrFile(): ServiceAccountLike | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as ServiceAccountLike;
      if (parsed.private_key && parsed.client_email) return parsed;
    } catch {
      // ignore invalid JSON and continue to file-based lookup
    }
  }

  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath && fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw) as ServiceAccountLike;
      if (parsed.private_key && parsed.client_email) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccount = readServiceAccountFromEnvOrFile();
  const resolvedProjectId = serviceAccount?.project_id ?? FALLBACK_PROJECT_ID;
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      })
      : admin.credential.applicationDefault(),
    projectId: resolvedProjectId,
  });
}

const db = admin.firestore();
const now = new Date().toISOString();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function chunk<T>(list: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }
  return chunks;
}

async function upsertCollection(collection: string, docs: SeedDoc[]): Promise<void> {
  for (const docsChunk of chunk(docs, 400)) {
    const batch = db.batch();
    for (const doc of docsChunk) {
      const ref = db.collection(collection).doc(doc.id);
      batch.set(ref, doc, { merge: true });
    }
    if (!dryRun) await batch.commit();
  }
}

function buildEvents(uid: string): SeedDoc[] {
  return SEED_EVENT_NAMES.map((title, index) => {
    const city = SEED_EVENT_CITIES[index % SEED_EVENT_CITIES.length]!;
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `seed-${uid}-event-${number}`,
      cpid: `CP-E-${uid.slice(0, 6).toUpperCase()}-${number}`,
      title,
      description: `${title} hosted by account ${uid}.`,
      venue: `${city.city} Cultural Centre`,
      address: `${10 + index} Main Street, ${city.city} ${city.state}`,
      date: inDays(5 + index * 2),
      time: index % 2 === 0 ? '18:00' : '11:00',
      city: city.city,
      country: 'Australia',
      imageUrl: `https://images.unsplash.com/photo-15${5800000000 + index}?w=1200`,
      cultureTag: ['Multicultural', city.city],
      tags: ['community', 'festival', 'culture'],
      category: index % 3 === 0 ? 'movie' : 'festival',
      priceCents: index % 4 === 0 ? 0 : 2500 + index * 150,
      priceLabel: index % 4 === 0 ? 'Free' : `$${Math.round((2500 + index * 150) / 100)}`,
      isFree: index % 4 === 0,
      isFeatured: index < 3,
      organizerId: uid,
      organizer: 'CulturePass Creator Account',
      capacity: 250 + index * 40,
      attending: 40 + index * 8,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };
  });
}

function buildProfiles(uid: string): SeedDoc[] {
  const businesses: SeedDoc[] = Array.from({ length: SEED_COUNTS.businesses }, (_, index) => ({
    id: `seed-${uid}-business-${String(index + 1).padStart(2, '0')}`,
    entityType: 'business',
    name: `Seed Business ${index + 1}`,
    description: `Business profile ${index + 1} managed by account ${uid}.`,
    city: 'Sydney',
    country: 'Australia',
    ownerId: uid,
    verified: true,
    rating: 4.3 + (index * 0.1),
    category: index % 2 === 0 ? 'restaurant' : 'retail',
    isSponsored: false,
    tags: ['business', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  const artists: SeedDoc[] = Array.from({ length: SEED_COUNTS.artists }, (_, index) => ({
    id: `seed-${uid}-artist-${String(index + 1).padStart(2, '0')}`,
    entityType: 'artist',
    name: `Seed Artist ${index + 1}`,
    description: `Artist profile ${index + 1} managed by account ${uid}.`,
    city: index % 2 === 0 ? 'Sydney' : 'Melbourne',
    country: 'Australia',
    ownerId: uid,
    verified: true,
    rating: 4.4 + (index * 0.04),
    followersCount: 1000 + index * 250,
    tags: ['artist', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  const communities: SeedDoc[] = Array.from({ length: SEED_COUNTS.communities }, (_, index) => ({
    id: `seed-${uid}-community-${String(index + 1).padStart(2, '0')}`,
    entityType: 'community',
    name: `Seed Community ${index + 1}`,
    description: `Community profile ${index + 1} managed by account ${uid}.`,
    city: 'Sydney',
    country: 'Australia',
    ownerId: uid,
    verified: true,
    rating: 4.2 + (index * 0.1),
    membersCount: 500 + index * 140,
    category: 'community',
    tags: ['community', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  const venues: SeedDoc[] = Array.from({ length: SEED_COUNTS.venues }, (_, index) => ({
    id: `seed-${uid}-venue-${String(index + 1).padStart(2, '0')}`,
    entityType: 'venue',
    name: `Seed Venue ${index + 1}`,
    description: `Venue profile ${index + 1} managed by account ${uid}.`,
    city: index % 2 === 0 ? 'Brisbane' : 'Perth',
    country: 'Australia',
    ownerId: uid,
    verified: true,
    rating: 4.1 + (index * 0.12),
    category: 'venue',
    capacity: 250 + index * 120,
    tags: ['venue', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  return [...businesses, ...artists, ...communities, ...venues];
}

function buildActivities(uid: string): SeedDoc[] {
  const services: SeedDoc[] = Array.from({ length: SEED_COUNTS.services }, (_, index) => ({
    id: `seed-${uid}-service-${String(index + 1).padStart(2, '0')}`,
    name: `Seed Service ${index + 1}`,
    description: `Service listing ${index + 1} managed by account ${uid}.`,
    category: 'service',
    city: index % 2 === 0 ? 'Sydney' : 'Melbourne',
    country: 'Australia',
    ownerId: uid,
    status: 'active',
    isPromoted: index < 2,
    imageUrl: `https://images.unsplash.com/photo-16${5000000000 + index}?w=1000`,
    priceLabel: index % 2 === 0 ? 'From $49' : 'From $79',
    tags: ['service', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  const movies: SeedDoc[] = Array.from({ length: SEED_COUNTS.movies }, (_, index) => ({
    id: `seed-${uid}-movie-${String(index + 1).padStart(2, '0')}`,
    name: `Seed Movie Showcase ${index + 1}`,
    description: `Movie listing ${index + 1} managed by account ${uid}.`,
    category: 'movie',
    city: index % 2 === 0 ? 'Adelaide' : 'Brisbane',
    country: 'Australia',
    ownerId: uid,
    status: 'active',
    isPromoted: index < 3,
    imageUrl: `https://images.unsplash.com/photo-17${5000000000 + index}?w=1000`,
    priceLabel: index % 2 === 0 ? '$18' : '$22',
    tags: ['movie', 'cinema', 'seed'],
    createdAt: now,
    updatedAt: now,
  }));

  return [...services, ...movies];
}

function buildCouncilProfiles(uid: string): SeedDoc[] {
  const csvCandidates = [
    path.resolve(process.cwd(), 'functions/src/data/LGDGPALL.csv'),
    path.resolve(process.cwd(), 'data/import/councils/LGDGPALL.csv'),
  ];
  const csvPath = csvCandidates.find((candidate) => fs.existsSync(candidate));
  if (!csvPath) return [];

  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) return [];

  const header = parseCsvLine(lines[1] ?? '');
  const indexByName = new Map<string, number>();
  header.forEach((name, index) => indexByName.set(name, index));
  const get = (row: string[], key: string): string => row[indexByName.get(key) ?? -1] ?? '';

  const councils: SeedDoc[] = [];
  for (const line of lines.slice(2)) {
    const row = parseCsvLine(line);
    const abs = get(row, 'ABS');
    const name = get(row, 'ORGNAME');
    if (!abs || !name) continue;

    const state = get(row, 'POSTAL_STATE') || 'NSW';
    const suburb = get(row, 'POSTAL_SUBURB') || get(row, 'STREET_SUBURB') || 'Unknown';
    const websiteRaw = (get(row, 'WEB') || '').replace(/\s+/g, '');
    const websiteUrl = websiteRaw
      ? (websiteRaw.startsWith('http://') || websiteRaw.startsWith('https://') ? websiteRaw : `https://${websiteRaw}`)
      : '';

    councils.push({
      id: `seed-council-${abs}`,
      entityType: 'organisation',
      name,
      description: `${name} council profile mirrored for cross-app search visibility.`,
      city: suburb,
      country: 'Australia',
      ownerId: uid,
      verified: true,
      rating: 4.2,
      category: 'council',
      website: websiteUrl || undefined,
      tags: ['council', state.toLowerCase(), suburb.toLowerCase(), abs, toSlug(name)],
      meta: {
        lgaCode: abs,
        state,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  return councils;
}

async function seed(): Promise<void> {
  const events = buildEvents(targetUid);
  const profiles = buildProfiles(targetUid);
  const activities = buildActivities(targetUid);
  const councilProfiles = buildCouncilProfiles(targetUid);

  const allProfiles = [...profiles, ...councilProfiles];

  console.log(`\nSeeding account catalog for UID: ${targetUid}`);
  const activeProjectId = admin.app().options.projectId ?? FALLBACK_PROJECT_ID;
  console.log(`Project: ${activeProjectId}`);
  if (dryRun) console.log('Mode: DRY RUN (no Firestore writes)');

  const userDoc: SeedDoc = {
    id: targetUid,
    uid: targetUid,
    displayName: 'CulturePass Seed Owner',
    username: `seed-${targetUid.slice(0, 8).toLowerCase()}`,
    city: 'Sydney',
    country: 'Australia',
    role: 'organizer',
    searchable: true,
    updatedAt: now,
    createdAt: now,
  };

  if (!dryRun) {
    await db.collection('users').doc(targetUid).set(userDoc, { merge: true });
  }

  await upsertCollection('events', events);
  await upsertCollection('profiles', allProfiles);
  await upsertCollection('activities', activities);

  console.log('\n✅ Seed complete');
  console.log(`  events: ${events.length} (min requested: 10)`);
  console.log(`  businesses: ${profiles.filter((p) => p.entityType === 'business').length} (min requested: 5)`);
  console.log(`  artists: ${profiles.filter((p) => p.entityType === 'artist').length} (min requested: 10)`);
  console.log(`  communities: ${profiles.filter((p) => p.entityType === 'community').length}`);
  console.log(`  venues: ${profiles.filter((p) => p.entityType === 'venue').length}`);
  console.log(`  services: ${activities.filter((a) => a.category === 'service').length}`);
  console.log(`  movies: ${activities.filter((a) => a.category === 'movie').length}`);
  console.log(`  councils mirrored to searchable profiles: ${councilProfiles.length}`);
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('\n❌ Seeding failed:', message);
  process.exit(1);
});

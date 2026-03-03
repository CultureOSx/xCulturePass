/**
 * Locations Service — CulturePassAU Cloud Functions
 *
 * Manages Australian location hierarchy (states + cities) in Firestore.
 * Seeded from constants/locations.ts on first run or via admin seed endpoint.
 *
 * Firestore structure:
 *   locations/{countryCode}    ← one document per country (currently AU only)
 *     name: string
 *     countryCode: string
 *     acknowledgement: string
 *     states: LocationState[]
 *     updatedAt: string (ISO)
 *
 * Cache: 30-minute TTL per country code — invalidated on any write.
 */

import { db } from '../admin';
import { InMemoryTtlCache } from './cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationState {
  name: string;   // e.g. 'New South Wales'
  code: string;   // e.g. 'NSW'
  emoji: string;  // e.g. '🏙️'
  cities: string[];
}

export interface LocationDocument {
  name: string;
  countryCode: string;
  acknowledgement: string;
  states: LocationState[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Firestore collection
// ---------------------------------------------------------------------------

const locationsCol = () => db.collection('locations');

// ---------------------------------------------------------------------------
// Cache — 30 minutes (location data changes very rarely)
// ---------------------------------------------------------------------------

const cache = new InMemoryTtlCache(30 * 60_000);

function cacheKey(countryCode: string) {
  return `locations:${countryCode}`;
}

// ---------------------------------------------------------------------------
// Default acknowledgement of country
// ---------------------------------------------------------------------------

export const DEFAULT_ACKNOWLEDGEMENT =
  'CulturePass acknowledges the Traditional Custodians of Country throughout Australia ' +
  'and recognises the continuing connection of Aboriginal and Torres Strait Islander peoples ' +
  'to land, sea and community. We pay our respects to Elders past, present, and emerging, ' +
  'and to all First Nations people of Australia.';

// ---------------------------------------------------------------------------
// Default seed data — mirrors constants/locations.ts
// ---------------------------------------------------------------------------

export const DEFAULT_AU_STATES: LocationState[] = [
  {
    name: 'New South Wales', code: 'NSW', emoji: '🏙️',
    cities: [
      'Sydney', 'Parramatta', 'Penrith', 'Liverpool', 'Blacktown', 'Campbelltown', 'Sutherland',
      'Newcastle', 'Wollongong', 'Maitland', 'Cessnock', 'Lake Macquarie',
      'Gosford', 'Wyong',
      'Queanbeyan', 'Goulburn', 'Bathurst', 'Orange',
      'Wagga Wagga', 'Albury', 'Dubbo', 'Tamworth', 'Griffith', 'Broken Hill',
      'Port Macquarie', 'Coffs Harbour', 'Lismore', 'Ballina', 'Byron Bay',
      'Grafton', 'Tweed Heads', 'Armidale', 'Nowra', 'Batemans Bay', 'Bega',
    ],
  },
  {
    name: 'Victoria', code: 'VIC', emoji: '🎭',
    cities: [
      'Melbourne', 'Frankston', 'Dandenong', 'Ringwood', 'Footscray', 'Preston',
      'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Wodonga', 'Mildura', 'Warrnambool',
      'Traralgon', 'Sale', 'Bairnsdale',
      'Wangaratta', 'Echuca', 'Swan Hill',
      'Horsham', 'Ararat', 'Sunbury', 'Cranbourne', 'Pakenham', 'Torquay',
    ],
  },
  {
    name: 'Queensland', code: 'QLD', emoji: '🌞',
    cities: [
      'Brisbane', 'Ipswich', 'Logan', 'Redcliffe', 'Springfield',
      'Gold Coast', 'Sunshine Coast', 'Noosa', 'Caloundra', 'Maroochydore', 'Toowoomba',
      'Cairns', 'Townsville', 'Mount Isa', 'Innisfail', 'Ayr',
      'Rockhampton', 'Gladstone', 'Bundaberg', 'Mackay', 'Emerald',
      'Hervey Bay', 'Maryborough', 'Gympie',
      'Port Douglas', 'Mossman', 'Cooktown',
    ],
  },
  {
    name: 'Western Australia', code: 'WA', emoji: '🌊',
    cities: [
      'Perth', 'Fremantle', 'Mandurah', 'Joondalup', 'Rockingham', 'Armadale',
      'Bunbury', 'Busselton', 'Margaret River', 'Albany', 'Collie',
      'Narrogin', 'Merredin', 'Northam',
      'Geraldton', 'Carnarvon', 'Exmouth',
      'Port Hedland', 'Karratha', 'Newman',
      'Broome', 'Kununurra', 'Derby',
      'Kalgoorlie', 'Esperance', 'Coolgardie',
    ],
  },
  {
    name: 'South Australia', code: 'SA', emoji: '🍷',
    cities: [
      'Adelaide', 'Gawler', 'Mount Barker', 'Salisbury', 'Modbury',
      'Whyalla', 'Port Augusta', 'Port Pirie',
      'Port Lincoln', 'Ceduna',
      'Tanunda', 'Nuriootpa',
      'Murray Bridge', 'Renmark', 'Berri', 'Loxton',
      'Mount Gambier', 'Naracoorte', 'Millicent',
      'Victor Harbor', 'Goolwa',
    ],
  },
  {
    name: 'Tasmania', code: 'TAS', emoji: '🏔️',
    cities: [
      'Hobart', 'Glenorchy', 'Kingborough', 'Sorell', 'Richmond',
      'Launceston', 'George Town', 'Scottsdale', 'St Helens',
      'Devonport', 'Burnie', 'Ulverstone', 'Smithton',
      'Queenstown', 'Strahan',
    ],
  },
  {
    name: 'Australian Capital Territory', code: 'ACT', emoji: '🏛️',
    cities: [
      'Canberra', 'Belconnen', 'Gungahlin', 'Tuggeranong',
      'Woden Valley', 'Weston Creek', 'Molonglo Valley',
      'City', 'Inner North', 'Inner South',
    ],
  },
  {
    name: 'Northern Territory', code: 'NT', emoji: '🦘',
    cities: [
      'Darwin', 'Palmerston', 'Litchfield', 'Humpty Doo', 'Batchelor',
      'Nhulunbuy', 'Jabiru', 'Kakadu',
      'Katherine', 'Tennant Creek',
      'Alice Springs', 'Yulara', 'Hermannsburg',
    ],
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const locationsService = {
  /** Retrieve location document for a country (cache-first). */
  async get(countryCode: string): Promise<LocationDocument | null> {
    const cached = cache.get<LocationDocument>(cacheKey(countryCode));
    if (cached) return cached;

    const snap = await locationsCol().doc(countryCode).get();
    if (!snap.exists) return null;

    const doc = snap.data() as LocationDocument;
    cache.set(cacheKey(countryCode), doc);
    return doc;
  },

  /** Create or fully replace a location document. Clears cache. */
  async upsert(doc: Omit<LocationDocument, 'updatedAt'>): Promise<LocationDocument> {
    const full: LocationDocument = { ...doc, updatedAt: new Date().toISOString() };
    await locationsCol().doc(doc.countryCode).set(full);
    cache.del(cacheKey(doc.countryCode));
    return full;
  },

  /** Add a state to a country. No-op if state code already exists. */
  async addState(countryCode: string, state: LocationState): Promise<void> {
    const ref = locationsCol().doc(countryCode);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Country ${countryCode} not found`);
      const doc = snap.data() as LocationDocument;
      if (doc.states.some((s) => s.code === state.code)) return; // already exists
      doc.states.push(state);
      doc.updatedAt = new Date().toISOString();
      tx.set(ref, doc);
    });
    cache.del(cacheKey(countryCode));
  },

  /** Remove a state from a country. */
  async removeState(countryCode: string, stateCode: string): Promise<void> {
    const ref = locationsCol().doc(countryCode);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Country ${countryCode} not found`);
      const doc = snap.data() as LocationDocument;
      doc.states = doc.states.filter((s) => s.code !== stateCode);
      doc.updatedAt = new Date().toISOString();
      tx.set(ref, doc);
    });
    cache.del(cacheKey(countryCode));
  },

  /** Add a city to a state. No-op if city already exists. */
  async addCity(countryCode: string, stateCode: string, city: string): Promise<void> {
    const ref = locationsCol().doc(countryCode);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Country ${countryCode} not found`);
      const doc = snap.data() as LocationDocument;
      const state = doc.states.find((s) => s.code === stateCode);
      if (!state) throw new Error(`State ${stateCode} not found in ${countryCode}`);
      if (state.cities.includes(city)) return; // already exists
      state.cities.push(city);
      state.cities.sort();
      doc.updatedAt = new Date().toISOString();
      tx.set(ref, doc);
    });
    cache.del(cacheKey(countryCode));
  },

  /** Remove a city from a state. */
  async removeCity(countryCode: string, stateCode: string, city: string): Promise<void> {
    const ref = locationsCol().doc(countryCode);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Country ${countryCode} not found`);
      const doc = snap.data() as LocationDocument;
      const state = doc.states.find((s) => s.code === stateCode);
      if (!state) throw new Error(`State ${stateCode} not found in ${countryCode}`);
      state.cities = state.cities.filter((c) => c !== city);
      doc.updatedAt = new Date().toISOString();
      tx.set(ref, doc);
    });
    cache.del(cacheKey(countryCode));
  },

  /** Update a state's metadata (name, emoji) without touching its cities. */
  async updateState(
    countryCode: string,
    stateCode: string,
    patch: Partial<Pick<LocationState, 'name' | 'emoji'>>,
  ): Promise<void> {
    const ref = locationsCol().doc(countryCode);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Country ${countryCode} not found`);
      const doc = snap.data() as LocationDocument;
      const state = doc.states.find((s) => s.code === stateCode);
      if (!state) throw new Error(`State ${stateCode} not found in ${countryCode}`);
      Object.assign(state, patch);
      doc.updatedAt = new Date().toISOString();
      tx.set(ref, doc);
    });
    cache.del(cacheKey(countryCode));
  },

  /** Seed Firestore with the default AU location data if it doesn't already exist. */
  async seedIfEmpty(): Promise<{ seeded: boolean }> {
    const snap = await locationsCol().doc('AU').get();
    if (snap.exists) return { seeded: false };
    await locationsService.upsert({
      name: 'Australia',
      countryCode: 'AU',
      acknowledgement: DEFAULT_ACKNOWLEDGEMENT,
      states: DEFAULT_AU_STATES,
    });
    return { seeded: true };
  },

  /** Force re-seed (replaces existing data). */
  async forceSeed(): Promise<void> {
    await locationsService.upsert({
      name: 'Australia',
      countryCode: 'AU',
      acknowledgement: DEFAULT_ACKNOWLEDGEMENT,
      states: DEFAULT_AU_STATES,
    });
  },
};

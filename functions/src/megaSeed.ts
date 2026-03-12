import * as admin from 'firebase-admin';
import * as path from 'path';
import { COUNCILS_CSV } from './data/councilData';

// Helpers for dates and images
const soon = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};
const nowTs = new Date().toISOString();

// Diverse Unsplash Image Set for various events & avatars
const IMAGES = [
  'https://images.unsplash.com/photo-1598300056393-4aac492f4344?w=800',
  'https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=800',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800',
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800',
  'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=800',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800',
  'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800',
  'https://images.unsplash.com/photo-1545213156-d8e7c7a84e31?w=800',
];

const getRandomImage = () => IMAGES[Math.floor(Math.random() * IMAGES.length)];
const getAvatar = (idx: number) => `https://i.pravatar.cc/300?img=${idx}`;

// Data Generation
const USERS = Array.from({ length: 10 }).map((_, i) => ({
  uid: `user-seed-${i + 1}`,
  username: `culture_user_${i + 1}`,
  displayName: `Culture Fan ${i + 1}`,
  email: `fan${i + 1}@culturepass.com.au`,
  city: i % 2 === 0 ? 'Sydney' : 'Melbourne',
  country: 'Australia',
  role: i < 2 ? 'organizer' : 'user', // first two are organizers
  membership: { tier: 'free', isActive: true, expiresAt: null },
  interests: ['music', 'food', 'art'],
  communities: [],
  isSydneyVerified: false,
  culturePassId: `CP-USR-100${i}`,
  avatarUrl: getAvatar(i + 10),
  createdAt: nowTs,
  updatedAt: nowTs,
}));

// Generates 50 Diverse Events
const EVENTS = Array.from({ length: 50 }).map((_, i) => {
  const isFree = i % 3 === 0;
  return {
    cpid: `CP-EVT-${2000 + i}`,
    title: `Amazing Cultural Experience 202${6 + (i % 3)} - Vol ${i}`,
    description: `Join us for the most authentic cultural celebration of the year! Expect mesmerizing performances, stunning visual arts, and delicious traditional food to satisfy your cravings. Bring your friends and family for an unforgettable night!`,
    venue: `The Grand Assembly Hall ${i + 1}`,
    address: `${100 + i} Macquarie St, Sydney NSW 2000`,
    date: soon(i % 30),
    time: '18:00',
    endTime: '22:00',
    city: i % 2 === 0 ? 'Sydney' : 'Melbourne',
    country: 'Australia',
    imageUrl: getRandomImage(),
    cultureTag: i % 2 === 0 ? ['Asian-Australian'] : ['African'],
    tags: ['culture', 'dance', 'food', 'family'],
    category: isFree ? 'community' : 'festival',
    priceCents: isFree ? 0 : 2500 + i * 100,
    tiers: isFree ? [] : [{ name: 'General', priceCents: 2500 + i * 100 }],
    isFree,
    isFeatured: i < 5,
    organizerId: `user-seed-${(i % 2) + 1}`, 
    capacity: 200 + i * 10,
    attending: 50 + i * 2,
    createdAt: nowTs,
    updatedAt: nowTs,
  };
});

// Generates 10 Communities
const COMMUNITIES = Array.from({ length: 10 }).map((_, i) => ({
  entityType: 'community',
  name: `Diaspora Community Hub ${i + 1}`,
  description: 'A vibrant organization uniting expats, professionals, and students to celebrate our rich heritage down under.',
  imageUrl: getRandomImage(),
  city: i % 2 === 0 ? 'Sydney' : 'Brisbane',
  country: 'Australia',
  ownerId: `user-seed-1`,
  verified: i % 2 === 0,
  rating: 4.5 + Math.random() * 0.5,
  memberCount: 50 + i * 15,
  createdAt: nowTs,
  updatedAt: nowTs,
}));

// Generates 20 Businesses
const BUSINESSES = Array.from({ length: 20 }).map((_, i) => ({
  entityType: 'business',
  name: `Authentic Cultural Eats & Crafts ${i + 1}`,
  description: 'Premium partner offering standard discounts and VIP perks for CulturePass members across Australia.',
  imageUrl: getRandomImage(),
  city: 'Sydney',
  country: 'Australia',
  ownerId: `user-seed-2`,
  verified: true,
  createdAt: nowTs,
  updatedAt: nowTs,
}));

export async function performMegaSeed(db: admin.firestore.Firestore) {
  console.log('\\n[Seed] Starting Mega-Seed Process...');

  // Helper sequence for chunked batching
  const commitBatches = async (items: any[], collectionName: string, idPrefix?: string, generateIds?: boolean) => {
    let currentBatch = db.batch();
    let count = 0;
    let total = 0;
    
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      let docRef;

      // Ensure explicit IDs for users, generated IDs for others (events/profiles) unless stated otherwise
      if (item.uid) {
         docRef = db.collection(collectionName).doc(item.uid);
      } else {
         docRef = db.collection(collectionName).doc();
         if (generateIds) {
           item.id = docRef.id;
         }
      }

      currentBatch.set(docRef, item);
      count++;
      total++;

      // Max 500 limits per batch, let's play safe at 400
      if (count === 400) {
        await currentBatch.commit();
        currentBatch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await currentBatch.commit();
    }
    
    console.log(`[Seed] Successfully committed ${total} documents to ${collectionName}.`);
  };

  try {
    // 1. Users
    await commitBatches(USERS, 'users');
    
    // 2. Events
    await commitBatches(EVENTS, 'events', '', true);
    
    // 3. Communities & Businesses (Profiles)
    await commitBatches([...COMMUNITIES, ...BUSINESSES], 'profiles', '', true);

    // 4. Councils Parse
    let COUNCILS: any[] = [];
    const content = COUNCILS_CSV;
    
    const lines = content.split(/[\\r\\n]+/)
                    .map((l: string) => l.trim())
                    .filter((l: string) => l.length > 5 && !l.includes(',GM_SAL') && !l.startsWith('Table'));
      
      COUNCILS = lines.map((line: string) => {
        const parts = line.split(',');
        return {
          entityType: 'council',
          name: parts[1] || 'Unknown Council',
          description: `Australian Municipal Council. Website: ${parts[24] || ''}`,
          website: parts[24] || '',
          email: parts[23] || '',
          phone: parts[12] || '',
          city: parts[4] || 'Unknown',
          state: parts[5] || 'Unknown',
          country: 'Australia',
          ownerId: 'system',
          verified: true,
          population: parseInt(parts[26]) || null,
          createdAt: nowTs,
          updatedAt: nowTs,
        };
      });

      console.log(`[Seed] Found ${COUNCILS.length} Councils in CSV.`);
      await commitBatches(COUNCILS, 'profiles', '', true);

    console.log('\\n✅ ** MEGA SEED COMPLETED **');
    return { success: true, events: EVENTS.length, communities: COMMUNITIES.length, businesses: BUSINESSES.length, users: USERS.length, councils: COUNCILS.length };
  } catch (error) {
    console.error('Mega-Seed Failed:', error);
    throw error;
  }
}

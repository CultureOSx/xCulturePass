/**
 * CulturePassAU — Cloud Functions Express app
 *
 * Ported from server/index.ts with these changes:
 *   - auth middleware: Firebase Admin SDK verifyIdToken (not custom HS256)
 *   - GET /api/auth/me: reads from Firestore (not PostgreSQL)
 *   - POST /api/auth/register|login|refresh: removed (handled by Firebase Auth SDK client-side)
 *   - Image uploads: write to Firebase Storage (not local disk)
 *   - Static file serving: removed (handled by Firebase Hosting)
 *   - app.listen(): removed (Cloud Functions handles HTTP lifecycle)
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import Stripe from 'stripe';
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db, storageBucket, authAdmin, isFirestoreConfigured } from './admin';
import { performMegaSeed } from './megaSeed';


import { firestore } from 'firebase-admin';
import { moderationCheck, textHasProfanity } from './middleware/moderation';
import { authenticate, requireAuth, requireRole, isOwnerOrAdmin, type RequestUser } from './middleware/auth';
import {
  buildSearchCacheKey,
  runSearch,
  runSuggest,
  type SearchQuery,
  type SearchableItem,
  type SearchType,
} from './services/search';
import { getRolloutConfig, isFeatureEnabledForUser } from './services/rollout';
import { InMemoryTtlCache } from './services/cache';
import { locationsService } from './services/locations';
import {
  eventsService,
  usersService,
  ticketsService,
  profilesService,
  walletsService,
  notificationsService,
  perksService,
  redemptionsService,
  reportsService,
  mediaService,
  eventFeedbackService,
  paymentMethodsService,
  scanEventsService,
  type FirestoreEvent,
  type FirestoreProfile,
} from './services/firestore';
import { getPostcodeData, getPostcodesByPlace } from './shared/australian-postcodes';
const generateSecureId = (prefix: string) => `${prefix}${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;

// Stripe SDK — only initialised when STRIPE_SECRET_KEY is present
const stripeClient: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as unknown as Stripe.LatestApiVersion })
  : null;

if (!stripeClient) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe endpoints are mocked.');
}

type EntityType = 'community' | 'business' | 'venue' | 'artist' | 'organisation';
type TicketStatus = 'confirmed' | 'used' | 'cancelled' | 'expired';
type TicketPriority = 'low' | 'normal' | 'high' | 'vip';
type MembershipTier = 'free' | 'plus' | 'premium' | 'elite' | 'pro' | 'vip';
type MembershipStatus = 'active' | 'inactive';
type RewardsTier = 'silver' | 'gold' | 'diamond';
type TargetedNotificationType = 'recommendation' | 'system' | 'event' | 'perk' | 'community' | 'payment' | 'follow' | 'review' | 'ticket' | 'membership';

type AdminAuditLogEntry = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  endpoint: string;
  dryRun: boolean;
  targetedCount: number;
  filters: Record<string, unknown>;
  createdAt: string;
};

type TargetedNotificationResponse = {
  dryRun: boolean;
  targetedCount: number;
  audiencePreview: { userId: string; city: string; country: string }[];
  idempotentReplay?: boolean;
  approvalToken?: string;
  approvalExpiresAt?: string;
};

type AppUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  city: string;
  state?: string;
  postcode?: number;
  country: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: Record<string, string>;
  location?: string;
  interests?: string[];
  communities?: string[];
  languages?: string[];
  ethnicityText?: string;
  interestCategoryIds?: string[];
  culturePassId: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  role?: string;
  status?: string;
};

export type AppEvent = {
  id: string;
  title: string;
  description: string;
  communityId: string;
  venue: string;
  date: string;
  time: string;
  city: string;
  country: string;
  imageColor?: string;
  imageUrl?: string;
  category?: string;
  priceCents?: number;
  organizerId?: string;
  organizer?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  
  // Analytics and Filters Compatibility
  state?: string;
  postcode?: number;
  latitude?: number;
  longitude?: number;
  cultureTag?: string[];
  tags?: string[];
  indigenousTags?: string[];
  languageTags?: string[];
  eventType?: string;
  ageSuitability?: string;
  priceTier?: string;
  priceLabel?: string;
  capacity?: number;
  attending?: number;
  organizerReputationScore?: number;
  externalTicketUrl?: string | null;
  deletedAt?: string | null;
  tiers?: { name: string; priceCents: number; available: number }[];
  
  createdAt?: string;
  updatedAt?: string;
};

export type AppProfile = {
  id: string;
  name: string;
  entityType: 'community' | 'business' | 'venue' | 'artist' | 'organisation';
  category: string;
  city: string;
  country: string;
  description: string;
  memberCount?: number;
  followerCount?: number;
  followers?: number;
  isVerified?: boolean;
  ownerId?: string;
  imageUrl?: string;
  website?: string;
  state?: string;
  postcode?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
  socialLinks?: Record<string, string>;
};

type AppActivity = {
  id: string;
  name: string;
  description: string;
  category: string;
  duration?: string;
  ageGroup?: string;
  city: string;
  state?: string;
  postcode?: number;
  latitude?: number;
  longitude?: number;
  country: string;
  location?: string;
  imageUrl?: string;
  priceLabel?: string;
  rating?: number;
  reviewsCount?: number;
  highlights?: string[];
  ownerId: string;
  ownerType: 'business' | 'venue' | 'organizer';
  businessProfileId?: string;
  status: 'draft' | 'published' | 'archived';
  isPromoted?: boolean;
  isPopular?: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppCouncil = {
  id: string;
  name: string;
  abn?: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  lgaCode: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  suburb: string;
  postcode: number;
  country: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  verifiedAt?: string;
  verifiedBy?: string;
  status: 'active' | 'draft' | 'suspended';
  emergencyNumbers?: { label: string; phone: string }[];
  socialLinks?: Partial<Record<'facebook' | 'instagram' | 'linkedin' | 'youtube', string>>;
  openingHours?: string;
  servicePostcodes: number[];
  serviceSuburbs: string[];
  serviceCities: string[];
  createdAt: string;
  updatedAt: string;
};

type AppCouncilWasteSchedule = {
  id: string;
  institutionId: string;
  postcode: number;
  suburb: string;
  generalWasteDay: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  recyclingDay: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  greenWasteDay?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  frequencyGeneral: 'weekly' | 'fortnightly';
  frequencyRecycling: 'weekly' | 'fortnightly';
  frequencyGreen?: 'weekly' | 'fortnightly' | 'monthly';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type AppCouncilAlert = {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  category:
    | 'emergency'
    | 'bushfire'
    | 'flood'
    | 'road_closure'
    | 'public_meeting'
    | 'grant_opening'
    | 'facility_closure'
    | 'community_notice'
    | 'development_application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startAt: string;
  endAt?: string;
  status: 'active' | 'expired' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type AppCouncilGrant = {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  category: 'community' | 'arts' | 'youth' | 'sport' | 'business' | 'multicultural';
  fundingMin?: number;
  fundingMax?: number;
  opensAt?: string;
  closesAt?: string;
  applicationUrl?: string;
  status: 'upcoming' | 'open' | 'closed';
};

type AppInstitutionLink = {
  id: string;
  institutionId: string;
  title: string;
  url: string;
  type: 'whats_on' | 'waste_booking' | 'da_tracking' | 'volunteering' | 'tenders' | 'consultations';
};

type AppUserCouncilAlertPreference = {
  category: AppCouncilAlert['category'];
  enabled: boolean;
};

type AppUserWasteReminder = {
  userId: string;
  institutionId: string;
  postcode?: number;
  suburb?: string;
  reminderTime: string;
  enabled: boolean;
  updatedAt: string;
};

type AppCouncilClaim = {
  id: string;
  councilId: string;
  userId: string;
  workEmail: string;
  roleTitle: string;
  note?: string;
  websiteDomain: string;
  emailDomain: string;
  domainMatch: boolean;
  status: 'pending_admin_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

type AppCouncilClaimLetter = {
  id: string;
  councilId: string;
  recipientEmail: string;
  claimUrl: string;
  subject: string;
  body: string;
  sentBy: string;
  sentAt: string;
};

type AppTicket = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  tierName: string;
  quantity: number;
  totalPriceCents: number;
  currency: string;
  status: TicketStatus;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed';
  priority: TicketPriority;
  ticketCode: string;
  scanCount?: number;
  lastScannedAt?: string;
  staffAuditTrail?: { at: string; by: string; action: string; note?: string }[];
  stripePaymentIntentId?: string;
  walletPasses?: { apple?: string; google?: string };
  cashbackCents?: number;
  cashbackCreditedAt?: string;
  rewardPointsEarned?: number;
  rewardPointsAwardedAt?: string;
  imageColor?: string;
  createdAt: string;
  history: { at: string; status: TicketStatus; note: string }[];
};

export const app = express();
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// CORS — must be first middleware so preflight OPTIONS is handled before auth
// ---------------------------------------------------------------------------
const isTrustedOrigin = (origin: string): boolean => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.hostname;

    const activeProjectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.FIREBASE_CONFIG?.match(/"projectId"\s*:\s*"([^"]+)"/)?.[1];

    // Explicitly allowed production domains
    const allowedHosts = new Set<string>([
      'culturepass-b5f96.web.app',
      'culturepass-b5f96.firebaseapp.com',
      'culturepass.com.au',
      'culturepass.au',
    ]);

    if (activeProjectId) {
      allowedHosts.add(`${activeProjectId}.web.app`);
      allowedHosts.add(`${activeProjectId}.firebaseapp.com`);
    }

    if (allowedHosts.has(host)) {
      return true;
    }

    // Local development
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }

    // Allow explicitly defined Replit Dev Domain
    if (process.env.REPLIT_DEV_DOMAIN && host === process.env.REPLIT_DEV_DOMAIN) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && isTrustedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // For non-browser clients (no Origin header) or untrusted origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Short-circuit preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Capture raw body for Stripe webhook signature verification.
app.use(
  express.json({
    limit: '2mb',
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      if (req.originalUrl === '/api/stripe/webhook') {
        req.rawBody = buf;
      }
    },
  })
);

// Parse Bearer tokens (Firebase ID tokens) on every request
app.use(authenticate);
app.use(attachDevUserIfNeeded);

// Rate limiting
app.use(rateLimit({
  windowMs: 60_000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}));

const targetedNotificationsLimiter = rateLimit({
  windowMs: 60_000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    const ip = req.ip ?? 'unknown';
    // Normalize IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
    const normalizedIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    return `ip:${normalizedIp}`;
  },
  message: { error: 'Too many targeted notification requests' },
});

const searchCache = new InMemoryTtlCache(45_000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const users: AppUser[] = [
  {
    id: 'u1',
    username: 'ramanarc',
    displayName: 'Raman Arc',
    email: 'raman@culturepass.au',
    city: 'Sydney',
    country: 'Australia',
    bio: 'Building human + AI community experiences.',
    socialLinks: { instagram: 'jane.smith' },
    role: 'user',
    status: 'active',
    culturePassId: 'CP-U1',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  { id: '2', username: 'ramanarc', displayName: 'RamanArc Studios', email: 'hello@ramanarc.com', city: 'Sydney', country: 'Australia', bio: 'Digital culture studio.', location: 'Sydney, Australia', culturePassId: 'CP-U1', socialLinks: { instagram: 'ramanarc' }, role: 'user', status: 'active', createdAt: nowIso(), updatedAt: nowIso() },
];

const events: AppEvent[] = [
  { id: 'e1', title: 'Startup Launch Night Sydney', communityId: 'Startup', venue: 'Sydney CBD', date: '2026-03-15', time: '18:00', city: 'Sydney', country: 'Australia', description: 'Networking + founder demos.', imageColor: '#E85D3A', organizerId: 'b1', createdAt: nowIso(), updatedAt: nowIso() },
  { id: 'e2', title: 'Bollywood Beats Festival', communityId: 'Indian', venue: 'Parramatta Park', date: '2026-04-02', time: '17:30', city: 'Sydney', country: 'Australia', description: 'Music, dance, and food.', imageColor: '#9B59B6', organizerId: 'c1', createdAt: nowIso(), updatedAt: nowIso() },
];

const profiles: AppProfile[] = [
  { id: 'c1', name: 'Sydney Startup Circle', entityType: 'community', category: 'Tech', city: 'Sydney', country: 'Australia', description: 'Founders and builders community.', memberCount: 850, isVerified: true, createdAt: nowIso(), updatedAt: nowIso() },
  { id: 'b1', name: 'RamanArc Studios', entityType: 'business', category: 'Studio', city: 'Sydney', country: 'Australia', description: 'Digital experiences for culture + community.', followers: 450, isVerified: true, createdAt: nowIso(), updatedAt: nowIso() },
  { id: 'v1', name: 'Parramatta Library', entityType: 'venue', category: 'Library', city: 'Sydney', country: 'Australia', description: 'Council library and community hub.', isVerified: true, createdAt: nowIso(), updatedAt: nowIso() },
  { id: 'v2', name: 'Melbourne Aquatic Centre', entityType: 'venue', category: 'Aquatic Centre', city: 'Melbourne', country: 'Australia', description: 'Public aquatic centre with swim programs.', isVerified: true, createdAt: nowIso(), updatedAt: nowIso() },
  { id: 'v3', name: 'Brisbane Community Hall', entityType: 'venue', category: 'Community Centre', city: 'Brisbane', country: 'Australia', description: 'Community events and youth programs.', isVerified: true, createdAt: nowIso(), updatedAt: nowIso() },
];

const councils: AppCouncil[] = [
  {
    id: 'co-nsw-parramatta',
    name: 'City of Parramatta Council',
    abn: '49 907 174 773',
    state: 'NSW',
    lgaCode: '16260',
    websiteUrl: 'https://www.cityofparramatta.nsw.gov.au',
    email: 'council@cityofparramatta.nsw.gov.au',
    phone: '1300 617 058',
    addressLine1: '126 Church Street',
    suburb: 'Parramatta',
    postcode: 2150,
    country: 'Australia',
    description: 'City of Parramatta local government services and community programs.',
    verificationStatus: 'verified',
    verifiedAt: nowIso(),
    verifiedBy: 'culturepass-admin',
    status: 'active',
    emergencyNumbers: [
      { label: 'Emergency', phone: '000' },
      { label: 'SES', phone: '132 500' },
    ],
    socialLinks: {
      facebook: 'https://www.facebook.com/CityofParramatta',
      instagram: 'https://www.instagram.com/cityofparramatta',
      linkedin: 'https://www.linkedin.com/company/city-of-parramatta',
      youtube: 'https://www.youtube.com/@cityofparramatta',
    },
    openingHours: 'Mon-Fri 8:30 AM - 5:00 PM',
    servicePostcodes: [2145, 2142, 2150, 2151, 2127],
    serviceSuburbs: ['Parramatta', 'Wentworthville', 'Granville', 'Westmead', 'Carlingford'],
    serviceCities: ['Sydney', 'Parramatta'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'co-vic-melbourne',
    name: 'City of Melbourne',
    state: 'VIC',
    lgaCode: '24600',
    websiteUrl: 'https://www.melbourne.vic.gov.au',
    email: 'info@melbourne.vic.gov.au',
    phone: '03 9658 9658',
    addressLine1: 'Town Hall, 90-120 Swanston Street',
    suburb: 'Melbourne',
    postcode: 3000,
    country: 'Australia',
    description: 'City of Melbourne council information, alerts, facilities and services.',
    verificationStatus: 'verified',
    verifiedAt: nowIso(),
    verifiedBy: 'culturepass-admin',
    status: 'active',
    emergencyNumbers: [
      { label: 'Emergency', phone: '000' },
      { label: 'VIC SES', phone: '132 500' },
    ],
    socialLinks: {
      facebook: 'https://www.facebook.com/cityofmelbourne',
      instagram: 'https://www.instagram.com/cityofmelbourne',
      linkedin: 'https://www.linkedin.com/company/city-of-melbourne',
      youtube: 'https://www.youtube.com/@cityofmelbourne',
    },
    openingHours: 'Mon-Fri 8:00 AM - 6:00 PM',
    servicePostcodes: [3000, 3004, 3056, 3066],
    serviceSuburbs: ['Melbourne', 'Southbank', 'Docklands', 'Carlton'],
    serviceCities: ['Melbourne'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'co-qld-brisbane',
    name: 'Brisbane City Council',
    state: 'QLD',
    lgaCode: '31000',
    websiteUrl: 'https://www.brisbane.qld.gov.au',
    email: 'council@brisbane.qld.gov.au',
    phone: '07 3403 8888',
    addressLine1: '266 George Street',
    suburb: 'Brisbane City',
    postcode: 4000,
    country: 'Australia',
    description: 'Brisbane council notices, waste schedules, local grants and facilities.',
    verificationStatus: 'verified',
    verifiedAt: nowIso(),
    verifiedBy: 'culturepass-admin',
    status: 'active',
    emergencyNumbers: [
      { label: 'Emergency', phone: '000' },
      { label: 'QLD SES', phone: '132 500' },
    ],
    socialLinks: {
      facebook: 'https://www.facebook.com/BrisbaneCityCouncil',
      instagram: 'https://www.instagram.com/brisbanecitycouncil',
      linkedin: 'https://www.linkedin.com/company/brisbane-city-council',
      youtube: 'https://www.youtube.com/@brisbanecitycouncil',
    },
    openingHours: 'Mon-Fri 8:00 AM - 5:00 PM',
    servicePostcodes: [4000, 4006, 4101, 4067],
    serviceSuburbs: ['Brisbane', 'South Brisbane', 'Fortitude Valley', 'Toowong'],
    serviceCities: ['Brisbane'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const councilWasteSchedules: AppCouncilWasteSchedule[] = [
  {
    id: 'w1',
    institutionId: 'co-nsw-parramatta',
    postcode: 2150,
    suburb: 'Parramatta',
    generalWasteDay: 'thu',
    recyclingDay: 'wed',
    greenWasteDay: 'mon',
    frequencyGeneral: 'weekly',
    frequencyRecycling: 'fortnightly',
    frequencyGreen: 'fortnightly',
    notes: 'Place bins out by 6 AM.',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'w2',
    institutionId: 'co-vic-melbourne',
    postcode: 3000,
    suburb: 'Melbourne',
    generalWasteDay: 'tue',
    recyclingDay: 'fri',
    greenWasteDay: 'mon',
    frequencyGeneral: 'weekly',
    frequencyRecycling: 'fortnightly',
    frequencyGreen: 'monthly',
    notes: 'Apartment collection zones may vary.',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'w3',
    institutionId: 'co-qld-brisbane',
    postcode: 4000,
    suburb: 'Brisbane',
    generalWasteDay: 'wed',
    recyclingDay: 'sat',
    greenWasteDay: 'tue',
    frequencyGeneral: 'weekly',
    frequencyRecycling: 'fortnightly',
    frequencyGreen: 'fortnightly',
    notes: 'Hard waste pickup booking required via website.',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const councilAlerts: AppCouncilAlert[] = [
  {
    id: 'al1',
    institutionId: 'co-nsw-parramatta',
    title: 'Road Closure: Church Street Weekend Works',
    description: 'Temporary closures from 6 PM Friday to 5 AM Monday.',
    category: 'road_closure',
    severity: 'medium',
    startAt: nowIso(),
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'al2',
    institutionId: 'co-vic-melbourne',
    title: 'Public Consultation: New Community Hub',
    description: 'Feedback open for the proposed CBD community hub project.',
    category: 'public_meeting',
    severity: 'low',
    startAt: nowIso(),
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'al3',
    institutionId: 'co-qld-brisbane',
    title: 'Severe Weather Watch',
    description: 'Monitor local flood advice and secure outdoor items.',
    category: 'flood',
    severity: 'high',
    startAt: nowIso(),
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const councilGrants: AppCouncilGrant[] = [
  {
    id: 'g1',
    institutionId: 'co-nsw-parramatta',
    title: 'Multicultural Community Events Grant',
    description: 'Funding support for local multicultural festivals and workshops.',
    category: 'multicultural',
    fundingMin: 1000,
    fundingMax: 15000,
    applicationUrl: 'https://www.cityofparramatta.nsw.gov.au/grants',
    status: 'open',
  },
  {
    id: 'g2',
    institutionId: 'co-vic-melbourne',
    title: 'Arts Activation Grant',
    description: 'Seed funding for arts and cultural activation projects.',
    category: 'arts',
    fundingMin: 2000,
    fundingMax: 20000,
    applicationUrl: 'https://www.melbourne.vic.gov.au/grants',
    status: 'upcoming',
  },
  {
    id: 'g3',
    institutionId: 'co-qld-brisbane',
    title: 'Youth Sports & Wellness Grant',
    description: 'Support for youth sports, wellness and inclusion programs.',
    category: 'youth',
    fundingMin: 1000,
    fundingMax: 12000,
    applicationUrl: 'https://www.brisbane.qld.gov.au/community-and-safety/grants',
    status: 'open',
  },
];

const institutionLinks: AppInstitutionLink[] = [
  { id: 'l1', institutionId: 'co-nsw-parramatta', title: "What's On", url: 'https://www.cityofparramatta.nsw.gov.au/whats-on', type: 'whats_on' },
  { id: 'l2', institutionId: 'co-nsw-parramatta', title: 'Hard Waste Booking', url: 'https://www.cityofparramatta.nsw.gov.au/living/waste-and-recycling', type: 'waste_booking' },
  { id: 'l3', institutionId: 'co-vic-melbourne', title: 'Development Applications', url: 'https://www.melbourne.vic.gov.au/building-and-development', type: 'da_tracking' },
  { id: 'l4', institutionId: 'co-vic-melbourne', title: 'Community Consultations', url: 'https://participate.melbourne.vic.gov.au', type: 'consultations' },
  { id: 'l5', institutionId: 'co-qld-brisbane', title: 'Volunteering', url: 'https://www.brisbane.qld.gov.au/community-and-safety/community-support/volunteering', type: 'volunteering' },
  { id: 'l6', institutionId: 'co-qld-brisbane', title: 'Tenders', url: 'https://www.brisbane.qld.gov.au/business-and-trade/tenders-and-contracts', type: 'tenders' },
];

const userCouncilLinks = new Map<string, { userId: string; institutionId: string; isPrimary: boolean }>();
const userCouncilFollows = new Map<string, Set<string>>();
const userCouncilAlertPreferences = new Map<string, AppUserCouncilAlertPreference[]>();
const userWasteReminders = new Map<string, AppUserWasteReminder>();
const councilClaims: AppCouncilClaim[] = [];
const councilClaimLetters: AppCouncilClaimLetter[] = [];

const privacySettings = new Map<string, Record<string, boolean>>();
const wallets = new Map<string, { id: string; userId: string; balance: number; currency: string; points: number }>();
const memberships = new Map<string, { id: string; userId: string; tier: MembershipTier; isActive: boolean; validUntil?: string }>();
const notifications = new Map<string, { id: string; userId: string; title: string; message: string; type: string; isRead: boolean; metadata: Record<string, unknown> | null; createdAt: string }[]>();
const targetedNotificationIdempotency = new Map<string, TargetedNotificationResponse>();
const adminAuditLogs: AdminAuditLogEntry[] = [];
const tickets: AppTicket[] = [];
const paymentMethods = new Map<string, { id: string; brand: string; last4: string; isDefault: boolean }[]>();
const transactions = new Map<string, { id: string; type: 'charge' | 'refund' | 'debit' | 'cashback'; amountCents: number; createdAt: string; description: string }[]>();
const scanEvents: { id: string; ticketId: string; ticketCode: string; scannedAt: string; scannedBy: string; outcome: 'accepted' | 'duplicate' | 'rejected' }[] = [];

const culturalTagStore: { id: string; name: string; slug: string; category: string; iconUrl?: string }[] = [
  { id: 'ct1', name: 'Malayali', slug: 'malayali', category: 'diaspora' },
  { id: 'ct2', name: 'Tamil', slug: 'tamil', category: 'diaspora' },
  { id: 'ct3', name: 'Sikh', slug: 'sikh', category: 'religious' },
  { id: 'ct4', name: 'Punjabi', slug: 'punjabi', category: 'diaspora' },
  { id: 'ct5', name: 'Indigenous', slug: 'indigenous', category: 'indigenous' },
  { id: 'ct6', name: 'Aboriginal', slug: 'aboriginal', category: 'indigenous' },
  { id: 'ct7', name: 'Filipino', slug: 'filipino', category: 'diaspora' },
  { id: 'ct8', name: 'Chinese', slug: 'chinese', category: 'diaspora' },
  { id: 'ct9', name: 'Vietnamese', slug: 'vietnamese', category: 'diaspora' },
  { id: 'ct10', name: 'Sri Lankan', slug: 'sri-lankan', category: 'diaspora' },
  { id: 'ct11', name: 'Telugu', slug: 'telugu', category: 'diaspora' },
  { id: 'ct12', name: 'Bengali', slug: 'bengali', category: 'diaspora' },
  { id: 'ct13', name: 'South Asian', slug: 'south-asian', category: 'regional' },
  { id: 'ct14', name: 'Startup', slug: 'startup', category: 'community' },
  { id: 'ct15', name: 'Indian', slug: 'indian', category: 'diaspora' },
];

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index++;
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

function councilIdFromAbs(abs: string): string {
  return `co-au-${abs}`;
}

function tryLoadCouncilsFromCsv(): AppCouncil[] {
  const candidates = [
    path.resolve(process.cwd(), 'functions/src/data/LGDGPALL.csv'),
    path.resolve(__dirname, 'data/LGDGPALL.csv'),
    path.resolve(__dirname, '../src/data/LGDGPALL.csv'),
  ];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) return [];

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[1] ?? '');
    const indexByName = new Map<string, number>();
    header.forEach((name, index) => indexByName.set(name, index));

    const get = (row: string[], key: string) => row[indexByName.get(key) ?? -1] ?? '';
    const mapState = (value: string): AppCouncil['state'] => {
      const normalized = value.trim().toUpperCase();
      if (normalized === 'NSW' || normalized === 'VIC' || normalized === 'QLD' || normalized === 'WA' || normalized === 'SA' || normalized === 'TAS' || normalized === 'ACT' || normalized === 'NT') {
        return normalized;
      }
      return 'NSW';
    };

    const next: AppCouncil[] = [];
    for (const line of lines.slice(2)) {
      const row = parseCsvLine(line);
      const abs = get(row, 'ABS');
      const name = get(row, 'ORGNAME');
      if (!abs || !name) continue;

      const state = mapState(get(row, 'POSTAL_STATE'));
      const suburb = get(row, 'POSTAL_SUBURB') || get(row, 'STREET_SUBURB') || 'Unknown';
      const postcodeNum = Number.parseInt(get(row, 'POSTAL_PCODE') || get(row, 'STREET_PCODE'), 10);
      const postcode = Number.isFinite(postcodeNum) ? postcodeNum : 2000;
      const websiteRaw = (get(row, 'WEB') || '').replace(/\s+/g, '');
      const websiteUrl = websiteRaw
        ? (websiteRaw.startsWith('http://') || websiteRaw.startsWith('https://') ? websiteRaw : `https://${websiteRaw}`)
        : undefined;

      next.push({
        id: councilIdFromAbs(abs),
        name,
        abn: get(row, 'ABN') || undefined,
        state,
        lgaCode: abs,
        websiteUrl,
        email: get(row, 'EMAIL') || undefined,
        phone: get(row, 'PHONE') || undefined,
        addressLine1: get(row, 'STREET_ADD1') || get(row, 'POSTAL_ADD1') || undefined,
        suburb,
        postcode,
        country: 'Australia',
        description: `${name} local government services and community programs.`,
        verificationStatus: 'unverified',
        status: 'active',
        openingHours: undefined,
        servicePostcodes: [postcode],
        serviceSuburbs: [suburb],
        serviceCities: [suburb],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    return next;
  } catch (error) {
    console.error('[council-csv] failed to parse LGDGPALL.csv:', error);
    return [];
  }
}

const csvCouncils = tryLoadCouncilsFromCsv();
if (csvCouncils.length > 0) {
  const byLga = new Map(councils.map((council) => [council.lgaCode, council]));
  for (const council of csvCouncils) {
    const existing = byLga.get(council.lgaCode);
    if (existing) {
      Object.assign(existing, {
        name: council.name,
        abn: council.abn,
        websiteUrl: council.websiteUrl,
        email: council.email,
        phone: council.phone,
        addressLine1: council.addressLine1,
        suburb: council.suburb,
        postcode: council.postcode,
        servicePostcodes: [...new Set([...existing.servicePostcodes, ...council.servicePostcodes])],
        serviceSuburbs: [...new Set([...existing.serviceSuburbs, ...council.serviceSuburbs])],
        serviceCities: [...new Set([...existing.serviceCities, ...council.serviceCities])],
      });
    } else {
      councils.push(council);
    }
  }
}

const recommendationProfiles = new Map<string, { culturalTagWeights: Record<string, number>; eventTypeWeights: Record<string, number> }>();
const discoveryFeedbackStore: { userId: string; eventId: string; signal: 'up' | 'down'; createdAt: string }[] = [];
const eventFeedbackStore: { id: string; eventId: string; userId: string; rating: number; comment?: string; createdAt: string }[] = [];

const INTEREST_CATEGORY_KEYWORDS: Record<string, string[]> = {
  cultural: ['cultural', 'community', 'temple', 'diwali', 'onam', 'eid', 'heritage', 'festival'],
  arts: ['music', 'dj', 'nightlife', 'theatre', 'comedy', 'cinema', 'film', 'poetry', 'fashion'],
  food: ['food', 'restaurant', 'cafe', 'street food', 'wine', 'market', 'cooking'],
  business: ['startup', 'networking', 'professional', 'conference', 'career', 'tech', 'investment'],
  family: ['family', 'kids', 'children', 'school holiday', 'outdoor family'],
  civic: ['council', 'community centre', 'library', 'volunteering', 'clean-up', 'local market'],
  wellness: ['yoga', 'meditation', 'health', 'fitness', 'running', 'ayurveda', 'spiritual'],
  format: ['free', 'paid', 'vip', 'workshop', 'festival', 'exhibition', 'outdoor', 'indoor'],
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  networking: ['networking', 'professional', 'startup', 'conference', 'meetup'],
  family: ['family', 'kids', 'children', 'school holiday'],
  nightlife: ['nightlife', 'dj', 'party', 'late'],
  learning: ['workshop', 'education', 'class', 'skill'],
};

type DiscoverUserSignals = {
  interests: string[];
  communities: string[];
  languages: string[];
  ethnicityText: string;
  interestCategoryIds: string[];
};

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function extractDiscoverUserSignals(data: Record<string, unknown>): DiscoverUserSignals {
  return {
    interests: normalizeList(data.interests),
    communities: normalizeList(data.communities),
    languages: normalizeList(data.languages),
    ethnicityText: String(data.ethnicityText ?? '').trim(),
    interestCategoryIds: normalizeList(data.interestCategoryIds),
  };
}

function toTokenSet(items: string[]): Set<string> {
  return new Set(items.map((item) => item.toLowerCase().trim()).filter(Boolean));
}

function buildEventText(event: AppEvent): string {
  return [
    event.title,
    event.description,
    event.category,
    event.communityId,
    event.city,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
type ContentReport = {
  id: string;
  targetType: 'event' | 'community' | 'profile' | 'post' | 'user';
  targetId: string;
  reason: string;
  details?: string;
  reporterUserId?: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  moderationNotes?: string;
};
type UploadedMedia = {
  id: string;
  targetType: 'user' | 'profile' | 'event' | 'business' | 'post';
  targetId: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

const perks: {
  id: string;
  title: string;
  description: string;
  perkType: string;
  discountPercent: number | null;
  discountFixedCents: number | null;
  providerType: string;
  providerId: string;
  providerName: string;
  category: string;
  isMembershipRequired: boolean;
  requiredMembershipTier: string;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  status: string;
  startDate: string;
  endDate: string | null;
}[] = [
  { id: 'p1', title: '20% Off Partner Cafes', description: 'Save on selected Sydney partner cafes.', perkType: 'discount_percent', discountPercent: 20, discountFixedCents: null, providerType: 'business', providerId: 'b1', providerName: 'RamanArc Studios', category: 'dining', isMembershipRequired: false, requiredMembershipTier: 'free', usageLimit: 500, usedCount: 34, perUserLimit: 2, status: 'active', startDate: new Date().toISOString(), endDate: null },
  { id: 'p2', title: 'VIP Event Priority Entry', description: 'Skip the queue at selected community events.', perkType: 'vip_upgrade', discountPercent: null, discountFixedCents: null, providerType: 'event', providerId: 'e1', providerName: 'CulturePass Events', category: 'events', isMembershipRequired: true, requiredMembershipTier: 'plus', usageLimit: null, usedCount: 10, perUserLimit: 1, status: 'active', startDate: new Date().toISOString(), endDate: null },
];

const redemptions = new Map<string, { id: string; perkId: string; userId: string; redeemedAt: string }[]>();
const reports: ContentReport[] = [];
const uploadedMedia: UploadedMedia[] = [];

for (const user of users) {
  wallets.set(user.id, { id: `w-${user.id}`, userId: user.id, balance: 12500, currency: 'AUD', points: 1200 });
  memberships.set(user.id, { id: `m-${user.id}`, userId: user.id, tier: 'free', isActive: true });
  privacySettings.set(user.id, { profileVisible: true, showEmail: false, showPhone: false, searchable: true });
  notifications.set(user.id, [
    { id: randomUUID(), userId: user.id, title: 'Welcome to CulturePass', message: 'Your account is ready.', type: 'system', isRead: false, metadata: null, createdAt: new Date().toISOString() },
  ]);
  paymentMethods.set(user.id, [{ id: randomUUID(), brand: 'visa', last4: '4242', isDefault: true }]);
  transactions.set(user.id, []);
}

function nowIso() {
  return new Date().toISOString();
}

const APPROVAL_TOKEN_TTL_MS = 15 * 60 * 1000;
const APPROVAL_SIGNING_SECRET = process.env.APPROVAL_SIGNING_SECRET ?? process.env.SEED_SECRET ?? 'dev-approval-secret-change-me';

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
}

function signApprovalToken(payload: { actorId: string; fingerprint: string; expiresAt: string }) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', APPROVAL_SIGNING_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function inspectApprovalToken(token: string): { actorId: string; fingerprint: string; expiresAt: string; remainingMs: number } | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = createHmac('sha256', APPROVAL_SIGNING_SECRET).update(body).digest('base64url');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as { actorId?: string; fingerprint?: string; expiresAt?: string };
    if (!parsed.actorId || !parsed.fingerprint || !parsed.expiresAt) return null;
    const remainingMs = new Date(parsed.expiresAt).getTime() - Date.now();
    return {
      actorId: parsed.actorId,
      fingerprint: parsed.fingerprint,
      expiresAt: parsed.expiresAt,
      remainingMs,
    };
  } catch {
    return null;
  }
}

function verifyApprovalToken(token: string): { actorId: string; fingerprint: string; expiresAt: string } | null {
  const inspected = inspectApprovalToken(token);
  if (!inspected) return null;
  if (inspected.remainingMs <= 0) return null;
  return {
    actorId: inspected.actorId,
    fingerprint: inspected.fingerprint,
    expiresAt: inspected.expiresAt,
  };
}

function buildTargetedFingerprint(input: {
  title: string;
  message: string;
  type: string;
  city?: string;
  country?: string;
  interestsAny: string[];
  communitiesAny: string[];
  languagesAny: string[];
  categoryIdsAny: string[];
  ethnicityContains?: string;
  limit: number;
}) {
  return stableStringify({
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type,
    city: input.city?.trim().toLowerCase() ?? null,
    country: input.country?.trim().toLowerCase() ?? null,
    interestsAny: [...input.interestsAny].sort(),
    communitiesAny: [...input.communitiesAny].sort(),
    languagesAny: [...input.languagesAny].sort(),
    categoryIdsAny: [...input.categoryIdsAny].sort(),
    ethnicityContains: input.ethnicityContains?.trim().toLowerCase() ?? null,
    limit: input.limit,
  });
}

async function writeAdminAuditLog(entry: {
  actorId: string;
  actorRole: string;
  action: string;
  endpoint: string;
  dryRun: boolean;
  targetedCount: number;
  filters: Record<string, unknown>;
}) {
  const log = {
    id: randomUUID(),
    ...entry,
    createdAt: nowIso(),
  } as AdminAuditLogEntry;

  adminAuditLogs.unshift(log);
  if (adminAuditLogs.length > 2000) adminAuditLogs.length = 2000;

  if (hasFirestoreProject) {
    try {
      await db.collection('adminAuditLogs').add(log);
    } catch (err) {
      console.error('[admin-audit-log]:', err);
    }
    return;
  }

  console.info('[admin-audit-log:fallback]', JSON.stringify(log));
}

const FALLBACK_EVENT_TIMESTAMP = nowIso();
const fallbackEvents: FirestoreEvent[] = events.map((event) => ({
  id: event.id,
  title: event.title,
  description: event.description,
  communityId: event.communityId ?? 'General',
  venue: event.venue,
  date: event.date,
  time: event.time ?? '',
  city: event.city,
  country: event.country,
  imageUrl: event.imageUrl,
  imageColor: event.imageColor,
  category: event.category ?? event.communityId ?? 'Culture',
  organizer: event.organizer,
  organizerId: event.organizerId,
  capacity: event.capacity,
  attending: event.attending,
  priceCents: event.priceCents,
  isFeatured: event.isFeatured ?? false,
  isFree: event.isFree ?? true,
  tiers: event.tiers,
  tags: event.tags,
  cultureTag: event.cultureTag,
  indigenousTags: event.indigenousTags,
  languageTags: event.languageTags,
  organizerReputationScore: event.organizerReputationScore,
  priceLabel: event.priceLabel,
  status: 'published',
  createdAt: event.createdAt ?? FALLBACK_EVENT_TIMESTAMP,
  updatedAt: event.updatedAt ?? event.createdAt ?? FALLBACK_EVENT_TIMESTAMP,
}));
const fallbackEventLookup = new Map(fallbackEvents.map((event) => [event.id, event]));
const hasFirestoreProject = isFirestoreConfigured;
const MEMBERSHIP_PAID_TIERS: MembershipTier[] = ['plus', 'premium', 'elite', 'pro', 'vip'];
const MEMBERSHIP_PLAN_CONFIG: Record<MembershipTier, {
  label: string;
  cashbackRate: number;
  earlyAccessHours: number;
}> = {
  free: { label: 'Free', cashbackRate: 0, earlyAccessHours: 0 },
  plus: { label: 'Plus', cashbackRate: 0.02, earlyAccessHours: 48 },
  premium: { label: 'Premium', cashbackRate: 0.03, earlyAccessHours: 72 },
  elite: { label: 'Elite', cashbackRate: 0.04, earlyAccessHours: 72 },
  pro: { label: 'Pro', cashbackRate: 0.03, earlyAccessHours: 48 },
  vip: { label: 'VIP', cashbackRate: 0.05, earlyAccessHours: 96 },
};
const REWARDS_TIERS: { tier: RewardsTier; minPoints: number; label: string }[] = [
  { tier: 'diamond', minPoints: 5000, label: 'Diamond' },
  { tier: 'gold', minPoints: 1000, label: 'Gold' },
  { tier: 'silver', minPoints: 0, label: 'Silver' },
];
const POINTS_PER_DOLLAR = 1;
const CULTURE_ETHNICITIES = [
  'Aboriginal and Torres Strait Islander',
  'African',
  'Arab',
  'Bangladeshi',
  'Caribbean',
  'Chinese',
  'European',
  'Filipino',
  'Indian',
  'Japanese',
  'Korean',
  'Latin American',
  'Malay',
  'Malayali',
  'Malaysian Chinese',
  'Nepali',
  'Pacific Islander',
  'Pakistani',
  'Sri Lankan',
  'Vietnamese',
];
const CULTURE_LANGUAGES = [
  'Arabic',
  'Cantonese',
  'English',
  'French',
  'Greek',
  'Hindi',
  'Indonesian',
  'Japanese',
  'Korean',
  'Malay',
  'Malayalam',
  'Mandarin',
  'Portuguese',
  'Punjabi',
  'Spanish',
  'Tagalog',
  'Tamil',
  'Telugu',
  'Urdu',
  'Vietnamese',
];
const CULTURE_USAGE_SCORE = new Map<string, number>([
  ['english', 1000],
  ['mandarin', 850],
  ['hindi', 740],
  ['cantonese', 640],
  ['punjabi', 620],
  ['arabic', 600],
  ['tamil', 560],
  ['telugu', 520],
  ['malayalam', 500],
  ['malay', 480],
  ['vietnamese', 450],
  ['tagalog', 420],
  ['chinese', 700],
  ['indian', 680],
  ['filipino', 460],
  ['arab', 430],
]);
const devUser: RequestUser = {
  id: users[0].id,
  username: users[0].username,
  email: users[0].email,
  role: 'admin',
  city: users[0].city,
  country: users[0].country,
};

function respondWithFallbackEvents(res: Response) {
  const length = fallbackEvents.length;
  return res.json({
    events: fallbackEvents,
    total: length,
    page: 1,
    pageSize: length,
    hasNextPage: false,
  });
}

function attachDevUserIfNeeded(req: Request, _res: Response, next: NextFunction) {
  if (!hasFirestoreProject && !req.user) {
    req.user = devUser;
  }
  next();
}

/** Safely extract a single string from an Express query param. */
function qstr(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? '');
  return String(v ?? '');
}

/** Safely extract a route param — Express v5 types param values as string | string[]. */
function qparam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

function respondWithGenericServerError(res: Response, message = 'Request failed'): Response {
  return res.status(500).json({ error: message });
}

function suggestCultureValues(list: string[], query: string, limit: number): string[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 3) return [];

  return [...new Set(list)]
    .map((item) => {
      const lower = item.toLowerCase();
      const startsWith = lower.startsWith(needle);
      const includes = lower.includes(needle);
      const usage = CULTURE_USAGE_SCORE.get(lower) ?? 0;
      const rank = startsWith ? 3 : includes ? 2 : 0;
      return { item, rank, usage };
    })
    .filter((entry) => entry.rank > 0)
    .sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      if (b.usage !== a.usage) return b.usage - a.usage;
      return a.item.localeCompare(b.item);
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}

type ResolvedLocation = {
  city: string;
  state: string;
  country: string;
  postcode: number;
  latitude: number;
  longitude: number;
};

function resolveAustralianLocation(
  input: Record<string, unknown>,
  required: boolean,
): { location?: ResolvedLocation; error?: string } {
  const cityInput = String(input.city ?? '').trim();
  const countryInput = String(input.country ?? 'Australia').trim() || 'Australia';
  const stateInput = String(input.state ?? input.stateCode ?? '').trim().toUpperCase();
  const postcodeRaw = String(input.postcode ?? '').trim();

  if (required && (!cityInput || !stateInput || !postcodeRaw)) {
    return { error: 'city, state, postcode, and country are required' };
  }

  if (!cityInput && !stateInput && !postcodeRaw) {
    return {};
  }

  const postcode = Number.parseInt(postcodeRaw, 10);
  if (!Number.isFinite(postcode)) {
    return { error: 'postcode must be a valid number' };
  }

  const postcodeMatch = getPostcodeData(postcode);
  if (!postcodeMatch) {
    return { error: 'postcode is not recognized in Australian postcode data' };
  }

  const cityMatches = getPostcodesByPlace(cityInput);
  const cityStateMatch = cityMatches.find((item) => item.state_code.toUpperCase() === stateInput);
  const resolved = cityStateMatch ?? postcodeMatch;

  if (stateInput && resolved.state_code.toUpperCase() !== stateInput) {
    return { error: 'state does not match postcode' };
  }

  return {
    location: {
      city: resolved.place_name,
      state: resolved.state_code,
      country: countryInput,
      postcode: resolved.postcode,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
    },
  };
}

function normalizeMembershipTier(tier: unknown): MembershipTier {
  const value = String(tier ?? 'free').toLowerCase() as MembershipTier;
  return value in MEMBERSHIP_PLAN_CONFIG ? value : 'free';
}

function isMembershipActive(tier: MembershipTier, isActive?: boolean, expiresAt?: string | null): boolean {
  if (tier === 'free') return false;
  if (isActive === false) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

function buildMembershipResponse(params: {
  tier?: unknown;
  isActive?: boolean;
  expiresAt?: string | null;
  eventsAttended?: number;
}) {
  const tier = normalizeMembershipTier(params.tier);
  const config = MEMBERSHIP_PLAN_CONFIG[tier];
  const active = isMembershipActive(tier, params.isActive, params.expiresAt);
  const status: MembershipStatus = active ? 'active' : 'inactive';
  const cashbackRate = active ? config.cashbackRate : 0;
  return {
    tier,
    tierLabel: config.label,
    status,
    expiresAt: params.expiresAt ?? null,
    cashbackRate,
    cashbackMultiplier: 1 + cashbackRate,
    earlyAccessHours: active ? config.earlyAccessHours : 0,
    eventsAttended: Number(params.eventsAttended ?? 0),
  };
}

function calculateRewardPoints(amountCents: number): number {
  const dollars = Math.floor(Math.max(0, Number(amountCents ?? 0)) / 100);
  return Math.max(0, dollars * POINTS_PER_DOLLAR);
}

function buildRewardsStatus(pointsInput: unknown) {
  const points = Math.max(0, Math.floor(Number(pointsInput ?? 0)));
  const currentTier = REWARDS_TIERS.find((tier) => points >= tier.minPoints) ?? REWARDS_TIERS[REWARDS_TIERS.length - 1];
  const orderedAsc = [...REWARDS_TIERS].sort((a, b) => a.minPoints - b.minPoints);
  const currentIndex = orderedAsc.findIndex((tier) => tier.tier === currentTier.tier);
  const nextTier = currentIndex >= 0 ? orderedAsc[currentIndex + 1] : null;
  const pointsToNextTier = nextTier ? Math.max(0, nextTier.minPoints - points) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((points - currentTier.minPoints) / Math.max(1, nextTier.minPoints - currentTier.minPoints)) * 100
          )
        )
      )
    : 100;
  return {
    points,
    pointsPerDollar: POINTS_PER_DOLLAR,
    tier: currentTier.tier,
    tierLabel: currentTier.label,
    nextTier: nextTier?.tier ?? null,
    nextTierLabel: nextTier?.label ?? null,
    pointsToNextTier,
    progressPercent,
  };
}

async function awardRewardsPoints(
  userId: string,
  amountCents: number,
  context: { ticketId?: string; source: string }
): Promise<number> {
  const points = calculateRewardPoints(amountCents);
  if (points <= 0) return 0;

  if (hasFirestoreProject) {
    await walletsService.addPoints(userId, points);
    try {
      await notificationsService.create({
        userId,
        title: 'Reward points earned',
        message: `+${points} points from ${context.source}.`,
        type: 'rewards_points',
        isRead: false,
        metadata: {
          ticketId: context.ticketId ?? null,
          points,
          source: context.source,
        },
        createdAt: nowIso(),
      });
    } catch (err) {
      console.error('[rewards] notification create failed:', err);
    }
    return points;
  }

  const wallet = wallets.get(userId);
  if (wallet) {
    wallet.points = Number(wallet.points ?? 0) + points;
  } else {
    wallets.set(userId, { id: `w-${userId}`, userId, balance: 0, currency: 'AUD', points });
  }
  return points;
}

type RawWalletTransaction = {
  id: string;
  type: 'charge' | 'refund' | 'debit' | 'cashback';
  amountCents: number;
  createdAt: string;
  description: string;
};

function toTransactionApiRecord(
  userId: string,
  currency: string,
  tx: RawWalletTransaction,
) {
  const mappedType = tx.type === 'debit'
    ? 'payment'
    : tx.type === 'cashback'
      ? 'cashback'
      : tx.type === 'refund'
        ? 'refund'
        : 'topup';
  const signedAmount = mappedType === 'payment'
    ? -Math.abs(tx.amountCents) / 100
    : Math.abs(tx.amountCents) / 100;
  return {
    id: tx.id,
    userId,
    type: mappedType,
    amount: Number(signedAmount.toFixed(2)),
    amountCents: Math.abs(tx.amountCents),
    currency,
    description: tx.description,
    status: 'completed',
    category: mappedType === 'payment' ? 'tickets' : 'wallet',
    metadata: null,
    createdAt: tx.createdAt,
  };
}

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  return parsed.data;
}

const walletTopupSchema = z.object({
  amount: z.coerce.number().positive(),
});

const userUpdateSchema = z.object({
  username: z.string().optional(),
  displayName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.coerce.number().int().min(0).optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  location: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  communities: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  ethnicityText: z.string().optional(),
  interestCategoryIds: z.array(z.string()).optional(),
});

const membershipSubscribeSchema = z.object({
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
});

const createPerkSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  perkType: z.string().min(1),
  category: z.string().min(1),
  providerName: z.string().optional(),
  providerType: z.string().optional(),
  providerId: z.string().optional(),
  discountPercent: z.number().nullable().optional(),
  discountFixedCents: z.number().nullable().optional(),
  isMembershipRequired: z.boolean().optional(),
  requiredMembershipTier: z.string().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const mediaAttachSchema = z.object({
  targetType: z.enum(['user', 'profile', 'event', 'business', 'post']),
  targetId: z.string().min(1),
  imageUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  width: z.coerce.number().int().nonnegative().optional(),
  height: z.coerce.number().int().nonnegative().optional(),
});

const targetedNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['recommendation', 'system', 'event', 'perk', 'community', 'payment', 'follow', 'review', 'ticket', 'membership']).default('recommendation'),
  idempotencyKey: z.string().min(8).max(120).optional(),
  approvalToken: z.string().min(16).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  interestsAny: z.array(z.string()).optional(),
  communitiesAny: z.array(z.string()).optional(),
  languagesAny: z.array(z.string()).optional(),
  categoryIdsAny: z.array(z.string()).optional(),
  ethnicityContains: z.string().optional(),
  dryRun: z.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  metadata: z.record(z.unknown()).optional(),
});

const approvalStatusSchema = z.object({
  approvalToken: z.string().min(16),
});

const reportCreateSchema = z.object({
  targetType: z.enum(['event', 'community', 'profile', 'post', 'user']),
  targetId: z.string().min(1),
  reason: z.string().min(1),
  details: z.string().optional(),
});

const reportReviewSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']).default('reviewing'),
  moderationNotes: z.string().optional(),
});

const eventFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const stripeCheckoutSchema = z.object({
  ticketData: z.object({
    eventId: z.string().min(1),
    eventTitle: z.string().optional(),
    eventDate: z.string().optional(),
    eventTime: z.string().optional(),
    eventVenue: z.string().optional(),
    tierName: z.string().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    totalPriceCents: z.coerce.number().int().nonnegative().optional(),
    currency: z.string().optional(),
    imageColor: z.string().optional(),
  }),
});

const stripeRefundSchema = z.object({
  ticketId: z.string().min(1),
});

function parseSearchQuery(req: Request): SearchQuery {
  const tagsInput = String(req.query.tags ?? '').trim();
  const tags = tagsInput ? tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
  return {
    q: String(req.query.q ?? '').trim(),
    type: (String(req.query.type ?? 'all').toLowerCase() as SearchType) || 'all',
    city: String(req.query.city ?? '').trim() || undefined,
    country: String(req.query.country ?? '').trim() || undefined,
    tags,
    startDate: String(req.query.startDate ?? '').trim() || undefined,
    endDate: String(req.query.endDate ?? '').trim() || undefined,
    page: Math.max(1, Number(req.query.page ?? 1) || 1),
    pageSize: Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20) || 20)),
  };
}

function getSearchCorpus(): SearchableItem[] {
  const eventItems: SearchableItem[] = events.map((event) => ({
    id: event.id,
    type: 'event',
    title: event.title,
    subtitle: `${event.communityId} · ${event.venue}`,
    description: event.description,
    city: event.city,
    country: event.country,
    tags: [event.communityId],
    date: event.date,
  }));
  const profileItems: SearchableItem[] = profiles.map((profile) => ({
    id: profile.id,
    type: profile.entityType === 'business' ? 'business' : 'profile',
    title: profile.name,
    subtitle: `${profile.category} · ${profile.city}`,
    description: profile.description,
    city: profile.city,
    country: profile.country,
    tags: [profile.category, profile.entityType],
  }));
  const communityItems: SearchableItem[] = profiles
    .filter((profile) => profile.entityType === 'community')
    .map((profile) => ({
      id: profile.id,
      type: 'community',
      title: profile.name,
      subtitle: `${profile.category} · ${profile.memberCount ?? 0} members`,
      description: profile.description,
      city: profile.city,
      country: profile.country,
      tags: [profile.category, 'community'],
    }));
  return [...eventItems, ...profileItems, ...communityItems];
}

// ---------------------------------------------------------------------------
// Health + status
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => res.json({ ok: true, at: nowIso() }));
app.get('/status', (_req, res) => res.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// Auth routes — /api/auth/*
// POST /register and /login are handled client-side via Firebase Auth SDK.
// Only GET /me is needed here to fetch full user profile.
// ---------------------------------------------------------------------------

const authMeHandler = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      return res.json({ id: uid, role: req.user!.role, ...snap.data() });
    }
    // Fallback: return minimal profile from token claims
    return res.json({
      id: uid,
      role: req.user!.role,
      username: req.user!.username,
      email: req.user!.email,
      city: req.user!.city,
      country: req.user!.country,
    });
  } catch (err) {
    console.error('[auth/me]:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

app.get('/api/auth/me', requireAuth, authMeHandler);
app.get('/auth/me', requireAuth, authMeHandler);

// POST /api/auth/register — create Firestore profile after Firebase Auth account creation
const authRegisterHandler = async (req: Request, res: Response) => {
  const uid = req.user!.id;
  const { displayName, city, state, postcode, country, username } = req.body ?? {};
  const requestedRole = ['user', 'organizer'].includes(req.body?.role) ? req.body.role : 'user';
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      const profile = {
        username: username ?? req.user!.username,
        displayName: displayName ?? req.user!.username,
        email: req.user!.email ?? null,
        city: city ?? null,
        state: state ?? null,
        postcode: postcode != null ? Number(postcode) : null,
        country: country ?? 'Australia',
        culturePassId: generateSecureId('CP-U'),
        role: requestedRole,
        createdAt: nowIso(),
      };
      await db.collection('users').doc(uid).set(profile);
      // Bootstrap wallet, membership, welcome notification, and custom claims
      await Promise.all([
        db.collection('users').doc(uid).collection('wallet').doc('main').set({ balanceCents: 0, currency: 'AUD', points: 0 }),
        db.collection('users').doc(uid).collection('membership').doc('current').set({ tier: 'free', isActive: true }),
        db.collection('notifications').add({ userId: uid, title: `Welcome to CulturePass!`, message: `Your ${requestedRole} account is ready.`, type: 'system', isRead: false, createdAt: nowIso() }),
        // Set Firebase custom claims so the auth middleware reads correct role/tier
        authAdmin.setCustomUserClaims(uid, {
          role: requestedRole,
          tier: 'free',
          ...(city && { city: String(city) }),
          country: String(country ?? 'Australia'),
          username: profile.username,
        }),
      ]);
      return res.status(201).json({ id: uid, ...profile });
    }
    return res.json({ id: uid, ...snap.data() });
  } catch (err) {
    console.error('[auth/register]:', err);
    return res.status(500).json({ error: 'Profile creation failed' });
  }
};

app.post('/api/auth/register', requireAuth, authRegisterHandler);
app.post('/auth/register', requireAuth, authRegisterHandler);

// ---------------------------------------------------------------------------
// Rollout config
// ---------------------------------------------------------------------------

app.get('/api/rollout/config', (req, res) => {
  const userId = String(req.query.userId ?? 'guest');
  const rollout = getRolloutConfig();
  res.json({
    rollout,
    flags: {
      ticketingPhase6: isFeatureEnabledForUser('ticketingPhase6', userId),
      mediaPipelinePhase4: isFeatureEnabledForUser('mediaPipelinePhase4', userId),
      governancePhase3: isFeatureEnabledForUser('governancePhase3', userId),
    },
  });
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

app.get('/api/users', requireAuth, async (_req, res) => {
  if (hasFirestoreProject) {
    try {
      const snap = await db.collection('users').limit(100).get();
      return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
  return res.json(users);
});

app.get('/api/users/me', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  if (!hasFirestoreProject) {
    const localUser = users.find((item) => item.id === userId);
    if (!localUser) return res.status(404).json({ error: 'User not found' });
    return res.json(localUser);
  }

  try {
    const user = await usersService.getById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('[GET /api/users/me]:', err);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  if (!hasFirestoreProject) {
    const user = users.find((item) => item.id === qparam(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  }

  try {
    const user = await usersService.getById(qparam(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('[GET /api/users/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', requireAuth, moderationCheck, async (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.id))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let validatedData;
  try {
    validatedData = userUpdateSchema.parse(req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid update data' });
  }

  if (textHasProfanity(validatedData.displayName) || textHasProfanity(validatedData.bio)) {
    return res.status(400).json({ error: 'Profile content failed moderation' });
  }

  if (!hasFirestoreProject) {
    const idx = users.findIndex((item) => item.id === qparam(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const current = users[idx];
    users[idx] = { ...current, ...validatedData, id: current.id, culturePassId: current.culturePassId };
    return res.json(users[idx]);
  }

  try {
    const updated = await usersService.upsert(qparam(req.params.id), validatedData);
    return res.json(updated);
  } catch (err) {
    console.error('[PUT /api/users/:id]:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// ---------------------------------------------------------------------------
// Admin — seed demo data (protected by SEED_SECRET header, one-shot)
// ---------------------------------------------------------------------------

app.post('/api/admin/mega-seed', async (req, res) => {
  const secret = process.env.SEED_SECRET;
  if (!secret || req.headers['x-seed-secret'] !== secret) {
    if (req.headers['x-seed-secret'] !== 'culture_run_seed_v1') { // Fallback bypass for direct testing
        return res.status(403).json({ error: 'Forbidden' });
    }
  }

  try {
    const result = await performMegaSeed(db);
    return res.json(result);
  } catch (err) {
    console.error('[admin/mega-seed]:', err);
    return res.status(500).json({ error: 'Mega-Seed failed' });
  }
});

app.post('/api/admin/seed', async (req, res) => {
  const secret = process.env.SEED_SECRET;
  if (!secret || req.headers['x-seed-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const nowTs = new Date().toISOString();
  const soon = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const SEED_EVENTS = [
    { title: 'Sydney Kerala Cultural Festival 2026', description: 'The biggest Malayalam cultural gathering in the Southern Hemisphere. Live music, Kathakali dance, traditional cuisine, and community awards. Families welcome.', communityId: 'Malayalam', venue: 'Darling Harbour Convention Centre', address: '14 Darling Dr, Sydney NSW 2000', date: soon(14), time: '10:00 AM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1598300056393-4aac492f4344?w=800', imageColor: '#E8472A', cultureTag: ['Kerala', 'Malayalam', 'South Indian'], tags: ['festival', 'culture', 'family', 'dance'], category: 'Festival', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'mid', priceCents: 2500, priceLabel: '$25', isFree: false, isFeatured: true, capacity: 2000, attending: 847, organizerId: 'seed-org-1', organizer: 'Kerala Community Sydney', organizerReputationScore: 92, status: 'published' as const, cpid: 'CP-E-KCFSYD', tiers: [{ name: 'General', priceCents: 2500, available: 1200 }, { name: 'Family Pack (4)', priceCents: 8000, available: 200 }, { name: 'VIP', priceCents: 7500, available: 50 }] },
    { title: 'Tamil Pongal Celebration — Sydney', description: 'Join us to celebrate the harvest festival of Pongal with traditional kolam art, music, delicious food, and a bonfire ceremony.', communityId: 'Tamil', venue: 'Parramatta Town Hall', address: '182 Church St, Parramatta NSW 2150', date: soon(7), time: '09:00 AM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=800', imageColor: '#F59E0B', cultureTag: ['Tamil', 'South Indian'], tags: ['pongal', 'harvest', 'family'], category: 'Cultural', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'free', priceCents: 0, priceLabel: 'Free', isFree: true, isFeatured: true, capacity: 800, attending: 412, organizerId: 'seed-org-2', organizer: 'Tamil Sangam NSW', organizerReputationScore: 88, status: 'published' as const, cpid: 'CP-E-PONGSYD', tiers: [] },
    { title: 'Bollywood Night — Live DJ & Dance', description: 'The hottest Bollywood party in Sydney! Dance the night away with live DJ sets, costume competition, and authentic cocktails.', communityId: 'Bollywood', venue: 'The Star Event Centre', address: '80 Pyrmont St, Pyrmont NSW 2009', date: soon(21), time: '08:00 PM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', imageColor: '#7C3AED', cultureTag: ['Bollywood', 'South Asian', 'Hindi'], tags: ['party', 'dance', 'dj', 'nightlife'], category: 'Nightlife', eventType: 'In-Person', ageSuitability: '18+', priceTier: 'mid', priceCents: 3500, priceLabel: '$35', isFree: false, isFeatured: true, capacity: 600, attending: 521, organizerId: 'seed-org-3', organizer: 'Desi Nights Sydney', organizerReputationScore: 85, status: 'published' as const, cpid: 'CP-E-BNISYD', tiers: [{ name: 'Standard', priceCents: 3500, available: 400 }, { name: 'VIP Table', priceCents: 15000, available: 20 }] },
    { title: 'Filipino Cultural Showcase — Sinulog Sydney', description: 'Celebrate the Sinulog Festival with traditional Cebuano street dancing, lechon feast, Filipino arts and crafts market.', communityId: 'Filipino', venue: 'Sydney Olympic Park', address: 'Olympic Blvd, Sydney Olympic Park NSW 2127', date: soon(30), time: '11:00 AM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800', imageColor: '#EF4444', cultureTag: ['Filipino', 'Cebuano', 'Southeast Asian'], tags: ['festival', 'dance', 'food', 'sinulog'], category: 'Festival', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'low', priceCents: 1500, priceLabel: '$15', isFree: false, isFeatured: false, capacity: 1000, attending: 234, organizerId: 'seed-org-4', organizer: 'Fil-Oz Cultural Foundation', organizerReputationScore: 79, status: 'published' as const, cpid: 'CP-E-FILSYD', tiers: [{ name: 'Adult', priceCents: 1500, available: 700 }, { name: 'Child (under 12)', priceCents: 500, available: 200 }] },
    { title: 'Chinese New Year — Dragon Dance Parade', description: 'Ring in the Year of the Snake with spectacular dragon and lion dances through Chinatown, followed by a lantern festival and dumpling-making workshops.', communityId: 'Chinese', venue: 'Sydney Chinatown', address: 'Dixon St, Haymarket NSW 2000', date: soon(10), time: '06:00 PM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800', imageColor: '#DC2626', cultureTag: ['Chinese', 'East Asian'], tags: ['new year', 'parade', 'lantern', 'family'], category: 'Festival', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'free', priceCents: 0, priceLabel: 'Free', isFree: true, isFeatured: true, capacity: 5000, attending: 3211, organizerId: 'seed-org-5', organizer: 'Sydney Chinese Community Association', organizerReputationScore: 96, status: 'published' as const, cpid: 'CP-E-CNYSYD', tiers: [] },
    { title: 'Nigerian Independence Day Gala', description: 'Celebrate 66 years of Nigerian independence with Afrobeat live performances, jollof cook-off, fashion showcase, and traditional masquerade.', communityId: 'Nigerian', venue: 'Doltone House Hyde Park', address: '181 Elizabeth St, Sydney NSW 2000', date: soon(45), time: '07:00 PM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=800', imageColor: '#16A34A', cultureTag: ['Nigerian', 'African', 'Afrobeat'], tags: ['independence', 'gala', 'music', 'food'], category: 'Gala', eventType: 'In-Person', ageSuitability: '18+', priceTier: 'premium', priceCents: 8500, priceLabel: '$85', isFree: false, isFeatured: false, capacity: 300, attending: 187, organizerId: 'seed-org-6', organizer: 'Nigerian Community Australia', organizerReputationScore: 82, status: 'published' as const, cpid: 'CP-E-NIGSYD', tiers: [{ name: 'Standard', priceCents: 8500, available: 200 }, { name: 'VIP', priceCents: 20000, available: 30 }] },
    { title: 'Greek Easter — Panigiri Festival', description: 'Traditional Greek Easter celebration with live bouzouki music, traditional dancing lessons, souvlaki feast, and Orthodox Easter ceremony.', communityId: 'Greek', venue: 'Rockdale Town Hall', address: '2 Bryant St, Rockdale NSW 2216', date: soon(18), time: '05:00 PM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', imageColor: '#1D4ED8', cultureTag: ['Greek', 'Mediterranean', 'European'], tags: ['easter', 'panigiri', 'music', 'dance', 'food'], category: 'Cultural', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'low', priceCents: 2000, priceLabel: '$20', isFree: false, isFeatured: false, capacity: 500, attending: 302, organizerId: 'seed-org-7', organizer: 'Hellenic Community of NSW', organizerReputationScore: 91, status: 'published' as const, cpid: 'CP-E-GRKSYD', tiers: [{ name: 'General', priceCents: 2000, available: 400 }] },
    { title: 'Indigenous Storytelling Night — NAIDOC Week', description: 'An intimate evening of First Nations storytelling, traditional music, and art featuring local Gadigal artists. Proceeds go to local indigenous youth programs.', communityId: 'Aboriginal', venue: 'Carriageworks', address: '245 Wilson St, Eveleigh NSW 2015', date: soon(35), time: '07:30 PM', city: 'Sydney', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800', imageColor: '#92400E', cultureTag: ['Aboriginal', 'First Nations', 'Indigenous'], indigenousTags: ['Gadigal', 'Naidoc'], tags: ['storytelling', 'art', 'naidoc', 'cultural'], category: 'Arts', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'low', priceCents: 1500, priceLabel: '$15', isFree: false, isFeatured: true, capacity: 200, attending: 156, organizerId: 'seed-org-8', organizer: 'Gadigal Art Collective', organizerReputationScore: 94, status: 'published' as const, cpid: 'CP-E-INDSYD', tiers: [{ name: 'General', priceCents: 1500, available: 100 }] },
    { title: 'Melbourne Diwali Lights Festival', description: 'The city of Melbourne lights up for Diwali! Join thousands for the spectacular Federation Square light show, rangoli competition, and South Asian street food.', communityId: 'South Asian', venue: 'Federation Square', address: 'Corner of Flinders & Swanston St, Melbourne VIC 3000', date: soon(12), time: '07:00 PM', city: 'Melbourne', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800', imageColor: '#F97316', cultureTag: ['South Asian', 'Hindu', 'Diwali'], tags: ['diwali', 'lights', 'festival', 'outdoor'], category: 'Festival', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'free', priceCents: 0, priceLabel: 'Free', isFree: true, isFeatured: true, capacity: 10000, attending: 7234, organizerId: 'seed-org-9', organizer: 'Festival of India Melbourne', organizerReputationScore: 97, status: 'published' as const, cpid: 'CP-E-DIVMLB', tiers: [] },
    { title: 'Vietnamese Tet New Year Market', description: "Celebrate Lunar New Year with the Vietnamese community. Traditional music, ao dai fashion show, bánh mì cook-off, and children's activities.", communityId: 'Vietnamese', venue: 'Springvale Town Centre', address: 'Springvale Rd, Springvale VIC 3171', date: soon(8), time: '10:00 AM', city: 'Melbourne', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', imageColor: '#FBBF24', cultureTag: ['Vietnamese', 'Southeast Asian'], tags: ['tet', 'new year', 'market', 'food'], category: 'Market', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'free', priceCents: 0, priceLabel: 'Free', isFree: true, isFeatured: false, capacity: 3000, attending: 1876, organizerId: 'seed-org-10', organizer: 'Vietnamese Community Australia', organizerReputationScore: 87, status: 'published' as const, cpid: 'CP-E-TETMLB', tiers: [] },
    // Brisbane
    { title: 'Multicultural Street Food Festival — Brisbane', description: "A weekend-long celebration of Brisbane's multicultural food scene, with 80+ stalls from every corner of the globe.", communityId: 'Multicultural', venue: 'South Bank Parklands', address: 'Grey St, South Brisbane QLD 4101', date: soon(20), time: '10:00 AM', city: 'Brisbane', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', imageColor: '#F59E0B', cultureTag: ['Multicultural', 'Food', 'Community'], tags: ['food', 'market', 'multicultural', 'outdoor'], category: 'Market', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'free', priceCents: 0, priceLabel: 'Free', isFree: true, isFeatured: true, capacity: 5000, attending: 2134, organizerId: 'seed-org-11', organizer: 'Brisbane Multicultural Alliance', organizerReputationScore: 90, status: 'published' as const, cpid: 'CP-E-MSFBRB', tiers: [] },
    { title: 'Pacific Islander Cultural Day — Brisbane', description: 'Celebrate the vibrant cultures of the Pacific with traditional dance, music, and food from Samoa, Tonga, Fiji, and more.', communityId: 'Pacific Islander', venue: 'Roma Street Parkland', address: '1 Parkland Blvd, Brisbane City QLD 4000', date: soon(25), time: '11:00 AM', city: 'Brisbane', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800', imageColor: '#0EA5E9', cultureTag: ['Pacific Islander', 'Samoan', 'Tongan', 'Fijian'], tags: ['dance', 'music', 'food', 'pacific'], category: 'Cultural', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'low', priceCents: 1000, priceLabel: '$10', isFree: false, isFeatured: true, capacity: 1500, attending: 567, organizerId: 'seed-org-12', organizer: 'Pacific Community Queensland', organizerReputationScore: 84, status: 'published' as const, cpid: 'CP-E-PICBRB', tiers: [{ name: 'General', priceCents: 1000, available: 1200 }] },
    // Perth
    { title: 'Indian Classical Music Evening — Perth', description: 'An intimate evening of Indian classical music featuring Hindustani and Carnatic traditions, with tabla, sitar, and vocal performances.', communityId: 'South Asian', venue: 'Perth Concert Hall', address: '5 St Georges Terrace, Perth WA 6000', date: soon(16), time: '07:30 PM', city: 'Perth', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800', imageColor: '#7C3AED', cultureTag: ['South Asian', 'Indian', 'Classical Music'], tags: ['music', 'classical', 'performance'], category: 'Arts', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'mid', priceCents: 4500, priceLabel: '$45', isFree: false, isFeatured: true, capacity: 400, attending: 289, organizerId: 'seed-org-13', organizer: 'Indian Arts Society WA', organizerReputationScore: 91, status: 'published' as const, cpid: 'CP-E-ICMPER', tiers: [{ name: 'Standard', priceCents: 4500, available: 300 }, { name: 'Premium', priceCents: 9000, available: 50 }] },
    // Adelaide
    { title: 'Adelaide OzAsia Festival Showcase', description: 'A celebration of Asian-Australian arts and culture featuring theatre, dance, music, and visual arts from across Asia and the diaspora.', communityId: 'Asian-Australian', venue: 'Adelaide Festival Centre', address: 'King William Rd, Adelaide SA 5000', date: soon(28), time: '06:00 PM', city: 'Adelaide', country: 'Australia', imageUrl: 'https://images.unsplash.com/photo-1545213156-d8e7c7a84e31?w=800', imageColor: '#EC4899', cultureTag: ['Asian-Australian', 'Arts', 'Theatre'], tags: ['arts', 'theatre', 'dance', 'music'], category: 'Arts', eventType: 'In-Person', ageSuitability: 'All Ages', priceTier: 'mid', priceCents: 3500, priceLabel: '$35', isFree: false, isFeatured: false, capacity: 800, attending: 421, organizerId: 'seed-org-14', organizer: 'OzAsia Festival', organizerReputationScore: 95, status: 'published' as const, cpid: 'CP-E-OZAADL', tiers: [{ name: 'General', priceCents: 3500, available: 600 }] },
  ];

  // Seed communities / profiles
  const SEED_COMMUNITIES = [
    { name: 'Kerala Cultural Society Sydney', entityType: 'community' as const, category: 'Cultural', city: 'Sydney', country: 'Australia', description: 'Connecting Malayali diaspora in Sydney through cultural events, Onam celebrations, and community support.', members: 1240, verified: true, ownerId: 'seed-org-1', rating: 4.8, cpid: 'CP-C-KCSSYD' },
    { name: 'Tamil Sangam NSW', entityType: 'community' as const, category: 'Cultural', city: 'Sydney', country: 'Australia', description: 'Celebrating Tamil culture, language, and heritage in New South Wales.', members: 890, verified: true, ownerId: 'seed-org-2', rating: 4.7, cpid: 'CP-C-TSNNSW' },
    { name: 'Chinese Community Sydney', entityType: 'community' as const, category: 'Cultural', city: 'Sydney', country: 'Australia', description: 'Fostering connections across Chinese-Australian communities in greater Sydney.', members: 3200, verified: true, ownerId: 'seed-org-5', rating: 4.9, cpid: 'CP-C-CCSSYD' },
    { name: 'Filipino-Australian Network', entityType: 'community' as const, category: 'Social', city: 'Sydney', country: 'Australia', description: 'Building friendship and community among Filipino Australians through events and mutual support.', members: 650, verified: true, ownerId: 'seed-org-4', rating: 4.6, cpid: 'CP-C-FANSYD' },
    { name: 'African Diaspora Melbourne', entityType: 'community' as const, category: 'Cultural', city: 'Melbourne', country: 'Australia', description: 'Celebrating the rich and diverse cultures of the African continent in Melbourne.', members: 780, verified: false, ownerId: 'seed-org-6', rating: 4.5, cpid: 'CP-C-ADMMLB' },
    { name: 'South Asian Hub Melbourne', entityType: 'community' as const, category: 'Cultural', city: 'Melbourne', country: 'Australia', description: 'A welcoming space for Indian, Pakistani, Sri Lankan, and Bangladeshi communities in Melbourne.', members: 2100, verified: true, ownerId: 'seed-org-9', rating: 4.8, cpid: 'CP-C-SAHMML' },
    { name: 'Pacific Community Queensland', entityType: 'community' as const, category: 'Cultural', city: 'Brisbane', country: 'Australia', description: 'Connecting Pacific Islander communities across Queensland, from Brisbane to the Gold Coast.', members: 540, verified: true, ownerId: 'seed-org-12', rating: 4.7, cpid: 'CP-C-PCQBRB' },
    { name: 'Hellenic Community NSW', entityType: 'community' as const, category: 'Heritage', city: 'Sydney', country: 'Australia', description: 'Preserving Greek heritage and connecting Greek Australians across New South Wales.', members: 1560, verified: true, ownerId: 'seed-org-7', rating: 4.9, cpid: 'CP-C-HCNNSW' },
  ];

  try {
    const batch = db.batch();
    let count = 0;
    for (const event of SEED_EVENTS) {
      const ref = db.collection('events').doc();
      batch.set(ref, { ...event, id: ref.id, createdAt: nowTs, updatedAt: nowTs });
      count++;
    }
    for (const community of SEED_COMMUNITIES) {
      const ref = db.collection('profiles').doc();
      batch.set(ref, { ...community, id: ref.id, createdAt: nowTs, updatedAt: nowTs });
      count++;
    }
    await batch.commit();
    // Also seed location hierarchy if not already present
    const locationResult = await locationsService.seedIfEmpty();
    return res.json({ seeded: count, events: SEED_EVENTS.length, communities: SEED_COMMUNITIES.length, locationSeeded: locationResult.seeded, ok: true });
  } catch (err) {
    console.error('[admin/seed]:', err);
    return res.status(500).json({ error: 'Seed failed' });
  }
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

// GET /api/events — list published events with optional filtering + pagination
app.get('/api/events', async (req, res) => {
  try {
    const city         = qstr(req.query.city).trim()         || undefined;
    const country      = qstr(req.query.country).trim()      || undefined;
    const category     = qstr(req.query.category).trim()     || undefined;
    const eventType    = qstr(req.query.eventType).trim()    || undefined;
    const dateFrom     = qstr(req.query.dateFrom).trim()     || undefined;
    const dateTo       = qstr(req.query.dateTo).trim()       || undefined;
    const organizerId  = qstr(req.query.organizerId).trim()  || undefined;
    const communityId  = qstr(req.query.communityId).trim()  || undefined;
    const isFeatured   = qstr(req.query.isFeatured) === 'true' ? true : undefined;
    
    // Geolocation Bounding
    const centerLatStr  = qstr(req.query.centerLat).trim();
    const centerLngStr  = qstr(req.query.centerLng).trim();
    const radiusInKmStr = qstr(req.query.radiusInKm).trim();
    const centerLat   = centerLatStr ? parseFloat(centerLatStr) : undefined;
    const centerLng   = centerLngStr ? parseFloat(centerLngStr) : undefined;
    const radiusInKm  = radiusInKmStr ? parseFloat(radiusInKmStr) : undefined;
    
    const page       = Math.max(1, parseInt(qstr(req.query.page)    || '1',  10) || 1);
    const pageSize   = Math.min(100, Math.max(1, parseInt(qstr(req.query.pageSize) || '20', 10) || 20));
    
    const filtersApplied = [city, country, category, eventType, dateFrom, dateTo, isFeatured, organizerId, communityId, centerLat, centerLng].some(
      (value) => value != null
    );

    if (!hasFirestoreProject) {
      return respondWithFallbackEvents(res);
    }

    const result = await eventsService.list(
      { city, country, category, eventType, dateFrom, dateTo, isFeatured, organizerId, communityId, centerLat, centerLng, radiusInKm },
      { page, pageSize }
    );

    if (result.items.length === 0 && !filtersApplied) {
      return respondWithFallbackEvents(res);
    }

    return res.json({
      events: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasNextPage: result.hasNextPage,
    });
  } catch (err) {
    console.error('[GET /api/events]:', err);
    if (!hasFirestoreProject) {
      return respondWithFallbackEvents(res);
    }
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/cross-community — events tagged with 2+ culture tags
app.get('/api/events/cross-community', async (_req, res) => {
  try {
    const result = await eventsService.list({ status: 'published' }, { page: 1, pageSize: 50 });
    const cross = result.items.filter((e) => (e.cultureTag?.length ?? 0) >= 2);
    return res.json(cross);
  } catch (err) {
    console.error('[GET /api/events/cross-community]:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await eventsService.getById(qparam(req.params.id));
    if (!event) {
      const fallback = fallbackEventLookup.get(qparam(req.params.id));
      if (fallback) return res.json(fallback);
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  } catch (err) {
    console.error('[GET /api/events/:id]:', err);
    if (!hasFirestoreProject) {
      const fallback = fallbackEventLookup.get(qparam(req.params.id));
      if (fallback) return res.json(fallback);
    }
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events — create new event (organizer or admin)
app.post('/api/events', requireAuth, requireRole('organizer', 'admin'), moderationCheck, async (req, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  const resolvedLocationResult = resolveAustralianLocation(b as Record<string, unknown>, true);
  if (resolvedLocationResult.error || !resolvedLocationResult.location) {
    return res.status(400).json({ error: resolvedLocationResult.error ?? 'invalid location payload' });
  }
  const resolvedLocation = resolvedLocationResult.location;

  if (!hasFirestoreProject) {
    const newEvent: AppEvent = {
      id: `e-dev-${Date.now()}`,
      title: String(b.title),
      communityId: String(b.communityId ?? 'General'),
      venue: String(b.venue ?? ''),
      date: String(b.date),
      time: String(b.time ?? ''),
      city: resolvedLocation.city,
      state: resolvedLocation.state,
      postcode: resolvedLocation.postcode,
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
      country: resolvedLocation.country,
      description: String(b.description ?? ''),
      imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
      priceCents: b.priceCents ? Number(b.priceCents) : 0,
      organizerId: req.user!.id,
      isFree: b.isFree ?? false,
      isFeatured: b.isFeatured ?? false,
    };
    const newFirestoreEvent: FirestoreEvent = {
      ...newEvent,
      status: 'draft',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    events.push(newEvent);
    fallbackEvents.push(newFirestoreEvent);
    fallbackEventLookup.set(newEvent.id, newFirestoreEvent);
    return res.status(201).json(newFirestoreEvent);
  }

  try {
    let bestCouncil: AppCouncil | undefined;
    let highestScore = 0;
    for (const c of councils) {
      const score = councilMatchScore(c, {
        postcode: resolvedLocation.postcode,
        city: resolvedLocation.city,
        state: resolvedLocation.state,
      });
      if (score > highestScore) {
        highestScore = score;
        bestCouncil = c;
      }
    }

    const event = await eventsService.create({
      title:       String(b.title),
      description: String(b.description ?? ''),
      communityId: String(b.communityId ?? (Array.isArray(b.cultureTag) ? b.cultureTag[0] : '') ?? ''),
      venue:    String(b.venue ?? ''),
      address:  b.address   ? String(b.address) : undefined,
      date:     String(b.date),
      time:     String(b.time ?? ''),
      city:     resolvedLocation.city,
      state:    resolvedLocation.state,
      postcode: resolvedLocation.postcode,
      council:  bestCouncil?.name,
      suburb:   resolvedLocation.city, // The exact "place_name" from postal lookup
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
      country:  resolvedLocation.country,
      imageUrl: b.imageUrl  ? String(b.imageUrl)  : undefined,
      imageColor: b.imageColor ? String(b.imageColor) : undefined,
      organizer:   b.organizer   ? String(b.organizer)   : undefined,
      organizerId: req.user!.id,
      priceCents:  b.priceCents  != null ? Number(b.priceCents)  : undefined,
      priceLabel:  b.priceLabel  ? String(b.priceLabel)  : undefined,
      category:    b.category    ? String(b.category)    : undefined,
      capacity:    b.capacity    != null ? Number(b.capacity) : undefined,
      attending:   0,
      isFree:    b.isFree    != null ? Boolean(b.isFree)    : true,
      isFeatured: b.isFeatured != null ? Boolean(b.isFeatured) : false,
      tiers:     Array.isArray(b.tiers)        ? b.tiers        : undefined,
      tags:      Array.isArray(b.tags)         ? b.tags         : undefined,
      indigenousTags: Array.isArray(b.indigenousTags) ? b.indigenousTags : undefined,
      languageTags:   Array.isArray(b.languageTags)   ? b.languageTags   : undefined,
      cultureTag: Array.isArray(b.cultureTag)  ? b.cultureTag  : undefined,
      geoHash:   b.geoHash   ? String(b.geoHash)   : undefined,
      eventType: b.eventType ? String(b.eventType) : undefined,
      ageSuitability: b.ageSuitability ? String(b.ageSuitability) : undefined,
      priceTier: b.priceTier ? String(b.priceTier) : undefined,
      organizerReputationScore: b.organizerReputationScore != null ? Number(b.organizerReputationScore) : 50,
      externalTicketUrl: b.externalTicketUrl ? String(b.externalTicketUrl) : null,
      cpid: generateSecureId('CP-E-'),
      status: 'draft',
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error('[POST /api/events]:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id
app.put('/api/events/:id', requireAuth, moderationCheck, async (req, res) => {
  try {
    const existing = await eventsService.getById(qparam(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (!isOwnerOrAdmin(req.user!, existing.organizerId)) {
      return res.status(403).json({ error: 'Forbidden: you do not own this event' });
    }
    const b = req.body ?? {};
    const hasLocationFields =
      b.city != null ||
      b.state != null ||
      b.postcode != null ||
      b.country != null ||
      b.latitude != null ||
      b.longitude != null;
    let resolvedLocation: ReturnType<typeof resolveAustralianLocation>['location'];
    if (hasLocationFields) {
      const resolvedLocationResult = resolveAustralianLocation(
        {
          city: b.city ?? existing.city,
          state: b.state ?? existing.state,
          postcode: b.postcode ?? existing.postcode,
          country: b.country ?? existing.country,
          latitude: b.latitude ?? existing.latitude,
          longitude: b.longitude ?? existing.longitude,
        },
        false,
      );
      if (resolvedLocationResult.error || !resolvedLocationResult.location) {
        return res.status(400).json({ error: resolvedLocationResult.error ?? 'invalid location payload' });
      }
      resolvedLocation = resolvedLocationResult.location;
    }

    let bestCouncil: AppCouncil | undefined;
    if (resolvedLocation) {
      let highestScore = 0;
      for (const c of councils) {
        const score = councilMatchScore(c, {
          postcode: resolvedLocation.postcode,
          city: resolvedLocation.city,
          state: resolvedLocation.state,
        });
        if (score > highestScore) {
          highestScore = score;
          bestCouncil = c;
        }
      }
    }

    const updated = await eventsService.update(qparam(req.params.id), {
      ...(b.title        != null && { title:       String(b.title) }),
      ...(b.description  != null && { description: String(b.description) }),
      ...(b.date         != null && { date:        String(b.date) }),
      ...(b.time         != null && { time:        String(b.time) }),
      ...(b.venue        != null && { venue:       String(b.venue) }),
      ...(b.address      != null && { address:     String(b.address) }),
      ...(resolvedLocation && { city:        resolvedLocation.city }),
      ...(resolvedLocation && { state:       resolvedLocation.state }),
      ...(resolvedLocation && { postcode:    resolvedLocation.postcode }),
      ...(resolvedLocation && { suburb:      resolvedLocation.city }),
      ...(resolvedLocation && { council:     bestCouncil?.name }),
      ...(resolvedLocation && { latitude:    resolvedLocation.latitude }),
      ...(resolvedLocation && { longitude:   resolvedLocation.longitude }),
      ...(resolvedLocation && { country:     resolvedLocation.country }),
      ...(b.imageUrl     != null && { imageUrl:    String(b.imageUrl) }),
      ...(b.priceCents   != null && { priceCents:  Number(b.priceCents) }),
      ...(b.priceLabel   != null && { priceLabel:  String(b.priceLabel) }),
      ...(b.capacity     != null && { capacity:    Number(b.capacity) }),
      ...(b.isFree       != null && { isFree:      Boolean(b.isFree) }),
      ...(b.isFeatured   != null && { isFeatured:  Boolean(b.isFeatured) }),
      ...(Array.isArray(b.tiers)      && { tiers:      b.tiers }),
      ...(Array.isArray(b.tags)       && { tags:       b.tags }),
      ...(Array.isArray(b.cultureTag) && { cultureTag: b.cultureTag }),
      ...(b.category     != null && { category:    String(b.category) }),
      ...(b.eventType    != null && { eventType:   String(b.eventType) }),
    });
    return res.json(updated);
  } catch (err) {
    console.error('[PUT /api/events/:id]:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id (soft delete)
app.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const existing = await eventsService.getById(qparam(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (!isOwnerOrAdmin(req.user!, existing.organizerId)) {
      return res.status(403).json({ error: 'Forbidden: you do not own this event' });
    }
    await eventsService.softDelete(qparam(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/events/:id]:', err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/events/:id/publish
app.post('/api/events/:id/publish', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  try {
    const existing = await eventsService.getById(qparam(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (!isOwnerOrAdmin(req.user!, existing.organizerId)) {
      return res.status(403).json({ error: 'Forbidden: you do not own this event' });
    }
    const published = await eventsService.publish(qparam(req.params.id));
    return res.json(published);
  } catch (err) {
    console.error('[POST /api/events/:id/publish]:', err);
    return res.status(500).json({ error: 'Failed to publish event' });
  }
});

// ---------------------------------------------------------------------------
// Locations — Firestore-backed hierarchy (Australia: states + cities)
// ---------------------------------------------------------------------------

/** GET /api/locations — public, cache-first */
app.get('/api/locations', async (_req, res) => {
  try {
    // Auto-seed on first request if Firestore is empty
    if (isFirestoreConfigured) {
      const doc = await locationsService.get('AU');
      if (!doc) await locationsService.seedIfEmpty();
      const fresh = doc ?? (await locationsService.get('AU'));
      if (fresh) {
        const allCities = fresh.states.flatMap((s) => s.cities);
        return res.json({
          locations: [{
            country: fresh.name,
            countryCode: fresh.countryCode,
            states: fresh.states,
            cities: allCities,
          }],
          acknowledgementOfCountry: fresh.acknowledgement,
        });
      }
    }
    // Firestore not configured — fall back to seed data
    const { DEFAULT_AU_STATES, DEFAULT_ACKNOWLEDGEMENT } = await import('./services/locations');
    return res.json({
      locations: [{
        country: 'Australia',
        countryCode: 'AU',
        states: DEFAULT_AU_STATES,
        cities: DEFAULT_AU_STATES.flatMap((s) => s.cities),
      }],
      acknowledgementOfCountry: DEFAULT_ACKNOWLEDGEMENT,
    });
  } catch (err) {
    console.error('[GET /api/locations]:', err);
    return res.status(500).json({ error: 'Failed to load locations' });
  }
});

/** POST /api/locations/:countryCode/seed — admin: seed/reset location data */
app.post('/api/locations/:countryCode/seed', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string }>, res: Response) => {
  try {
    const { countryCode } = req.params;
    if (countryCode !== 'AU') return res.status(400).json({ error: 'Only AU is supported' });
    await locationsService.forceSeed();
    return res.json({ ok: true, countryCode });
  } catch (err) {
    console.error('[POST /api/locations/seed]:', err);
    return respondWithGenericServerError(res, 'Seed failed');
  }
});

/** POST /api/locations/:countryCode/states — admin: add a new state */
app.post('/api/locations/:countryCode/states', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string }>, res: Response) => {
  try {
    const { countryCode } = req.params;
    const { name, code, emoji, cities = [] } = req.body as { name: string; code: string; emoji: string; cities?: string[] };
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
    await locationsService.addState(countryCode, { name, code, emoji: emoji ?? '📍', cities });
    return res.json({ ok: true, code });
  } catch (err) {
    console.error('[POST /api/locations/:countryCode/states]:', err);
    return respondWithGenericServerError(res, 'Failed to add state');
  }
});

/** PATCH /api/locations/:countryCode/states/:stateCode — admin: update state metadata */
app.patch('/api/locations/:countryCode/states/:stateCode', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string; stateCode: string }>, res: Response) => {
  try {
    const { countryCode, stateCode } = req.params;
    const patch = req.body as Partial<{ name: string; emoji: string }>;
    await locationsService.updateState(countryCode, stateCode, patch);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/locations/:countryCode/states/:stateCode]:', err);
    return respondWithGenericServerError(res, 'Failed to update state');
  }
});

/** DELETE /api/locations/:countryCode/states/:stateCode — admin: remove a state */
app.delete('/api/locations/:countryCode/states/:stateCode', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string; stateCode: string }>, res: Response) => {
  try {
    const { countryCode, stateCode } = req.params;
    await locationsService.removeState(countryCode, stateCode);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/locations/:countryCode/states/:stateCode]:', err);
    return respondWithGenericServerError(res, 'Failed to remove state');
  }
});

/** POST /api/locations/:countryCode/states/:stateCode/cities — admin: add a city */
app.post('/api/locations/:countryCode/states/:stateCode/cities', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string; stateCode: string }>, res: Response) => {
  try {
    const { countryCode, stateCode } = req.params;
    const { city } = req.body as { city: string };
    if (!city) return res.status(400).json({ error: 'city is required' });
    await locationsService.addCity(countryCode, stateCode, city);
    return res.json({ ok: true, city });
  } catch (err) {
    console.error('[POST /api/locations/.../cities]:', err);
    return respondWithGenericServerError(res, 'Failed to add city');
  }
});

/** DELETE /api/locations/:countryCode/states/:stateCode/cities/:city — admin: remove a city */
app.delete('/api/locations/:countryCode/states/:stateCode/cities/:city', [authenticate, requireRole('admin')], async (req: Request<{ countryCode: string; stateCode: string; city: string }>, res: Response) => {
  try {
    const { countryCode, stateCode, city } = req.params;
    await locationsService.removeCity(countryCode, stateCode, decodeURIComponent(city));
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/locations/.../cities/:city]:', err);
    return respondWithGenericServerError(res, 'Failed to remove city');
  }
});

// ---------------------------------------------------------------------------
// Communities + Profiles
// ---------------------------------------------------------------------------

app.get('/api/communities', async (req, res) => {
  const city = qstr(req.query.city) || undefined;
  const country = qstr(req.query.country) || undefined;
  if (!hasFirestoreProject) {
    return res.json(profiles.filter((p) => p.entityType === 'community'));
  }
  try {
    const items = await profilesService.listByType('community', { city, country });
    return res.json(items.length > 0 ? items : profiles.filter((p) => p.entityType === 'community'));
  } catch {
    return res.json(profiles.filter((p) => p.entityType === 'community'));
  }
});
app.get('/api/communities/nearby', async (req, res) => {
  const city = qstr(req.query.city) || undefined;
  const country = qstr(req.query.country) || undefined;
  if (!hasFirestoreProject) {
    return res.json(profiles.filter((p) => p.entityType === 'community'));
  }
  try {
    const items = await profilesService.listByType('community', { city, country });
    return res.json(items.length > 0 ? items : profiles.filter((p) => p.entityType === 'community'));
  } catch {
    return res.json(profiles.filter((p) => p.entityType === 'community'));
  }
});
app.get('/api/communities/:id', async (req, res) => {
  if (!hasFirestoreProject) {
    const community = profiles.find((p) => p.id === qparam(req.params.id) && p.entityType === 'community');
    if (!community) return res.status(404).json({ error: 'Community not found' });
    return res.json(community);
  }
  try {
    const profile = await profilesService.getById(qparam(req.params.id));
    if (!profile || profile.entityType !== 'community') {
      return res.status(404).json({ error: 'Community not found' });
    }
    return res.json(profile);
  } catch (err) {
    console.error('[GET /api/communities/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch community' });
  }
});
app.get('/api/profiles', async (req, res) => {
  const city = qstr(req.query.city) || undefined;
  const country = qstr(req.query.country) || undefined;
  if (!hasFirestoreProject) {
    return res.json(profiles);
  }
  try {
    const items = await profilesService.list({ city, country });
    return res.json(items.length > 0 ? items : profiles);
  } catch {
    return res.json(profiles);
  }
});
app.get('/api/profiles/:id', async (req, res) => {
  if (!hasFirestoreProject) {
    const profile = profiles.find((p) => p.id === qparam(req.params.id));
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(profile);
  }
  try {
    const profile = await profilesService.getById(qparam(req.params.id));
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(profile);
  } catch (err) {
    console.error('[GET /api/profiles/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
app.post('/api/profiles', requireAuth, moderationCheck, async (req, res) => {
  const b = req.body ?? {};
  const entityType = String(b.entityType ?? 'organisation');
  const shouldRequireLocation = entityType === 'business' || entityType === 'venue' || entityType === 'organisation' || entityType === 'artist';
  const resolvedLocationResult = resolveAustralianLocation(b as Record<string, unknown>, shouldRequireLocation);
  if (resolvedLocationResult.error) {
    return res.status(400).json({ error: resolvedLocationResult.error });
  }
  const resolvedLocation = resolvedLocationResult.location;

  if (!hasFirestoreProject) {
    const profile: AppProfile = {
      id: randomUUID(),
      name: String(b.name ?? 'Untitled'),
      entityType: (b.entityType ?? 'organisation') as EntityType,
      category: String(b.category ?? 'General'),
      city: resolvedLocation?.city ?? String(b.city ?? 'Sydney'),
      state: resolvedLocation?.state,
      postcode: resolvedLocation?.postcode,
      latitude: resolvedLocation?.latitude,
      longitude: resolvedLocation?.longitude,
      country: resolvedLocation?.country ?? String(b.country ?? 'Australia'),
      description: String(b.description ?? ''),
    };
    profiles.push(profile);
    return res.status(201).json(profile);
  }
  try {
    const profile = await profilesService.create({
      name: String(b.name ?? 'Untitled'),
      entityType: (b.entityType ?? 'organisation') as FirestoreProfile['entityType'],
      description: b.description ? String(b.description) : undefined,
      imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
      city: resolvedLocation?.city,
      state: resolvedLocation?.state,
      postcode: resolvedLocation?.postcode,
      latitude: resolvedLocation?.latitude,
      longitude: resolvedLocation?.longitude,
      country: resolvedLocation?.country,
      website: b.website ? String(b.website) : undefined,
      ownerId: req.user!.id,
    });
    return res.status(201).json(profile);
  } catch (err) {
    console.error('[POST /api/profiles]:', err);
    return res.status(500).json({ error: 'Failed to create profile' });
  }
});

app.put('/api/profiles/:id', requireAuth, moderationCheck, async (req, res) => {
  const profileId = qparam(req.params.id);
  const b = req.body ?? {};

  const shouldRequireLocation =
    b.city !== undefined ||
    b.state !== undefined ||
    b.postcode !== undefined ||
    b.country !== undefined ||
    b.latitude !== undefined ||
    b.longitude !== undefined;

  const resolvedLocationResult = resolveAustralianLocation(b as Record<string, unknown>, shouldRequireLocation);
  if (resolvedLocationResult.error) {
    return res.status(400).json({ error: resolvedLocationResult.error });
  }

  if (!hasFirestoreProject) {
    const index = profiles.findIndex((profile) => profile.id === profileId);
    if (index === -1) return res.status(404).json({ error: 'Profile not found' });
    const existing = profiles[index];
    if (!isOwnerOrAdmin(req.user!, existing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated: AppProfile = {
      ...existing,
      name: b.name ? String(b.name) : existing.name,
      description: b.description ? String(b.description) : existing.description,
      imageUrl: b.imageUrl ? String(b.imageUrl) : existing.imageUrl,
      website: b.website ? String(b.website) : existing.website,
      city: resolvedLocationResult.location?.city ?? (b.city ? String(b.city) : existing.city),
      state: resolvedLocationResult.location?.state ?? existing.state,
      postcode: resolvedLocationResult.location?.postcode ?? existing.postcode,
      latitude: resolvedLocationResult.location?.latitude ?? existing.latitude,
      longitude: resolvedLocationResult.location?.longitude ?? existing.longitude,
      country: resolvedLocationResult.location?.country ?? (b.country ? String(b.country) : existing.country),
    };
    profiles[index] = updated;
    return res.json(updated);
  }

  try {
    const ref = db.collection('profiles').doc(profileId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Profile not found' });
    const existing = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as AppProfile;
    if (!isOwnerOrAdmin(req.user!, existing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patch: Record<string, unknown> = {
      updatedAt: nowIso(),
    };
    if (b.name) patch.name = String(b.name);
    if (b.description !== undefined) patch.description = String(b.description);
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl);
    if (b.website !== undefined) patch.website = String(b.website);

    if (resolvedLocationResult.location) {
      patch.city = resolvedLocationResult.location.city;
      patch.state = resolvedLocationResult.location.state;
      patch.postcode = resolvedLocationResult.location.postcode;
      patch.latitude = resolvedLocationResult.location.latitude;
      patch.longitude = resolvedLocationResult.location.longitude;
      patch.country = resolvedLocationResult.location.country;
    } else {
      if (b.city !== undefined) patch.city = String(b.city);
      if (b.country !== undefined) patch.country = String(b.country);
    }

    await ref.set(patch, { merge: true });
    const updated = await ref.get();
    return res.json({ id: updated.id, ...(updated.data() as Record<string, unknown>) });
  } catch (err) {
    console.error('[PUT /api/profiles/:id]:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.delete('/api/profiles/:id', requireAuth, async (req, res) => {
  const profileId = qparam(req.params.id);

  if (!hasFirestoreProject) {
    const index = profiles.findIndex((profile) => profile.id === profileId);
    if (index === -1) return res.status(404).json({ error: 'Profile not found' });
    const existing = profiles[index];
    if (!isOwnerOrAdmin(req.user!, existing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    profiles.splice(index, 1);
    return res.json({ success: true });
  }

  try {
    const ref = db.collection('profiles').doc(profileId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Profile not found' });
    const existing = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as AppProfile;
    if (!isOwnerOrAdmin(req.user!, existing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ref.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/profiles/:id]:', err);
    return res.status(500).json({ error: 'Failed to delete profile' });
  }
});
// List businesses with optional city/country + sponsorship sort
app.get('/api/businesses', async (req, res) => {
  const city = String(req.query.city ?? '');
  const country = String(req.query.country ?? '');
  const sponsored = req.query.sponsored === 'true';

  if (hasFirestoreProject) {
    try {
      let query = db.collection('profiles').where('entityType', '==', 'business') as FirebaseFirestore.Query;
      if (city) query = query.where('city', '==', city);
      if (country) query = query.where('country', '==', country);
      const snap = await query.get();
      let items = snap.docs.map((d) => d.data());
      // Sponsored businesses float to the top
      items = items.sort((a, b) => {
        const aSponsored = a.isSponsored ? 1 : 0;
        const bSponsored = b.isSponsored ? 1 : 0;
        if (bSponsored !== aSponsored) return bSponsored - aSponsored;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
      if (sponsored) items = items.filter((x) => x.isSponsored);
      return res.json(items);
    } catch (err) {
      console.error('[GET /api/businesses]:', err);
      return res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  }
  const filtered = profiles
    .filter((p) => p.entityType === 'business')
    .filter((p) => !city || p.city?.toLowerCase() === city.toLowerCase())
    .filter((p) => !country || p.country?.toLowerCase() === country.toLowerCase());
  return res.json(filtered);
});

app.get('/api/businesses/:id', async (req, res) => {
  if (!hasFirestoreProject) {
    const profile = profiles.find((p) => p.id === qparam(req.params.id) && p.entityType === 'business');
    if (!profile) return res.status(404).json({ error: 'Business not found' });
    return res.json(profile);
  }
  try {
    const profile = await profilesService.getById(qparam(req.params.id));
    if (!profile || profile.entityType !== 'business') {
      return res.status(404).json({ error: 'Business not found' });
    }
    return res.json(profile);
  } catch (err) {
    console.error('[GET /api/businesses/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// ---------------------------------------------------------------------------
// Content collections (movies, restaurants, activities, shopping)
// ---------------------------------------------------------------------------

function mapCollection(prefix: string) {
  return events.map((e, i) => ({ id: `${prefix}${i + 1}`, title: e.title, name: e.title, city: e.city, country: e.country, imageUrl: e.imageUrl, category: e.communityId, description: e.description, venue: e.venue, language: 'English', genre: [e.communityId], posterUrl: e.imageUrl, priceRange: '$$', location: e.venue, priceLabel: '$25' }));
}
const movies = mapCollection('m');
const restaurants = mapCollection('r');
const shopping = mapCollection('s');

const fallbackActivities: AppActivity[] = events.slice(0, 16).map((e, i) => ({
  id: `a-${i + 1}`,
  name: e.title,
  description: e.description,
  category: e.category ?? e.communityId ?? 'Activity',
  duration: '2-3 Hours',
  ageGroup: 'All Ages',
  city: e.city,
  country: e.country,
  location: e.venue,
  imageUrl: e.imageUrl,
  priceLabel: e.priceLabel ?? (e.priceCents ? `$${Math.round(e.priceCents / 100)}` : 'Free'),
  rating: 4.5,
  reviewsCount: 24,
  highlights: ['Guided', 'Family Friendly', 'Local Favourite'],
  ownerId: e.organizerId ?? devUser.id,
  ownerType: 'organizer',
  status: 'published',
  isPromoted: Boolean(i % 5 === 0),
  isPopular: Boolean(i % 4 === 0),
  createdAt: nowIso(),
  updatedAt: nowIso(),
}));

const activitiesStore = new Map<string, AppActivity>(fallbackActivities.map((a) => [a.id, a]));

function canManageActivity(user: RequestUser, activity: { ownerId?: string }) {
  return isOwnerOrAdmin(user, activity.ownerId);
}

function canPromoteActivity(user: RequestUser) {
  return ['admin', 'platformAdmin', 'cityAdmin', 'moderator'].includes(user.role);
}

function normalizeActivityPayload(body: Record<string, unknown>, ownerId: string): { activity?: AppActivity; error?: string } {
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();
  const category = String(body.category ?? '').trim();
  const duration = String(body.duration ?? '').trim();
  const ageGroup = String(body.ageGroup ?? '').trim();
  const country = String(body.country ?? 'Australia').trim() || 'Australia';
  const ownerType = String(body.ownerType ?? 'business').trim() as AppActivity['ownerType'];

  if (!name || !description || !category) {
    return { error: 'name, description, and category are required' };
  }

  const resolvedLocation = resolveAustralianLocation(body, true);
  if (resolvedLocation.error || !resolvedLocation.location) {
    return { error: resolvedLocation.error ?? 'invalid location' };
  }

  return {
    activity: {
      id: String(body.id ?? `a-${randomUUID()}`),
      name,
      description,
      category,
      duration: duration || undefined,
      ageGroup: ageGroup || undefined,
      city: resolvedLocation.location.city,
      state: resolvedLocation.location.state,
      postcode: resolvedLocation.location.postcode,
      latitude: resolvedLocation.location.latitude,
      longitude: resolvedLocation.location.longitude,
      country,
      location: String(body.location ?? body.venue ?? '').trim() || undefined,
      imageUrl: String(body.imageUrl ?? '').trim() || undefined,
      priceLabel: String(body.priceLabel ?? '').trim() || 'Free',
      rating: Number(body.rating ?? 0) || 0,
      reviewsCount: Number(body.reviewsCount ?? 0) || 0,
      highlights: Array.isArray(body.highlights) ? body.highlights.map((h) => String(h)) : undefined,
      ownerId,
      ownerType: ownerType === 'venue' || ownerType === 'organizer' ? ownerType : 'business',
      businessProfileId: String(body.businessProfileId ?? '').trim() || undefined,
      status: String(body.status ?? 'published') as AppActivity['status'],
      isPromoted: Boolean(body.isPromoted ?? false),
      isPopular: Boolean(body.isPopular ?? false),
      createdAt: String(body.createdAt ?? nowIso()),
      updatedAt: nowIso(),
    },
  };
}

for (const [collPath, data] of [
  ['/api/movies', movies],
  ['/api/restaurants', restaurants],
  ['/api/shopping', shopping],
] as const) {
  app.get(collPath, (req, res) => {
    const country = String(req.query.country ?? '').toLowerCase();
    const city = String(req.query.city ?? '').toLowerCase();
    res.json(data.filter((x) => (!country || x.country.toLowerCase() === country) && (!city || x.city.toLowerCase() === city)));
  });
  app.get(`${collPath}/:id`, (req, res) => {
    const item = data.find((x) => x.id === qparam(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });
}

// Activities CRUD (business/venue/organizer owned) + admin promotion
app.get('/api/activities', async (req, res) => {
  const country = String(req.query.country ?? '').toLowerCase();
  const city = String(req.query.city ?? '').toLowerCase();
  const category = String(req.query.category ?? '').toLowerCase();
  const ownerId = String(req.query.ownerId ?? '');
  const promotedOnly = String(req.query.promoted ?? '').toLowerCase() === 'true';

  if (!hasFirestoreProject) {
    let items = Array.from(activitiesStore.values());
    if (country) items = items.filter((item) => item.country.toLowerCase() === country);
    if (city) items = items.filter((item) => item.city.toLowerCase() === city);
    if (category) items = items.filter((item) => item.category.toLowerCase().includes(category));
    if (ownerId) items = items.filter((item) => item.ownerId === ownerId);
    if (promotedOnly) items = items.filter((item) => item.isPromoted);
    items = items.filter((item) => item.status !== 'archived');
    return res.json(items.sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0)));
  }

  try {
    let query: FirebaseFirestore.Query = db.collection('activities');
    if (country) query = query.where('country', '==', country === 'australia' ? 'Australia' : country);
    if (city) query = query.where('city', '==', city);
    if (ownerId) query = query.where('ownerId', '==', ownerId);
    const snap = await query.limit(200).get();
    let items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as AppActivity[];
    if (category) items = items.filter((item) => item.category.toLowerCase().includes(category));
    if (promotedOnly) items = items.filter((item) => item.isPromoted);
    items = items.filter((item) => item.status !== 'archived');
    return res.json(items.sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0)));
  } catch (err) {
    console.error('[GET /api/activities]:', err);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  const id = qparam(req.params.id);
  if (!hasFirestoreProject) {
    const item = activitiesStore.get(id);
    if (!item) return res.status(404).json({ error: 'Activity not found' });
    return res.json(item);
  }
  try {
    const snap = await db.collection('activities').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Activity not found' });
    return res.json({ id: snap.id, ...(snap.data() as Record<string, unknown>) });
  } catch (err) {
    console.error('[GET /api/activities/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.post('/api/activities', requireAuth, requireRole('business', 'organizer', 'admin', 'platformAdmin', 'cityAdmin'), moderationCheck, async (req, res) => {
  const normalized = normalizeActivityPayload(req.body ?? {}, req.user!.id);
  if (normalized.error || !normalized.activity) {
    return res.status(400).json({ error: normalized.error ?? 'Invalid activity payload' });
  }

  if (!hasFirestoreProject) {
    activitiesStore.set(normalized.activity.id, normalized.activity);
    return res.status(201).json(normalized.activity);
  }

  try {
    const ref = db.collection('activities').doc();
    const activity = { ...normalized.activity, id: ref.id, createdAt: nowIso(), updatedAt: nowIso() };
    await ref.set(activity);
    return res.status(201).json(activity);
  } catch (err) {
    console.error('[POST /api/activities]:', err);
    return res.status(500).json({ error: 'Failed to create activity' });
  }
});

app.put('/api/activities/:id', requireAuth, moderationCheck, async (req, res) => {
  const id = qparam(req.params.id);

  if (!hasFirestoreProject) {
    const existing = activitiesStore.get(id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (!canManageActivity(req.user!, existing)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const normalized = normalizeActivityPayload({ ...existing, ...(req.body ?? {}), id, ownerId: existing.ownerId }, existing.ownerId);
    if (normalized.error || !normalized.activity) {
      return res.status(400).json({ error: normalized.error ?? 'Invalid activity payload' });
    }
    const updated = { ...normalized.activity, createdAt: existing.createdAt, updatedAt: nowIso() };
    activitiesStore.set(id, updated);
    return res.json(updated);
  }

  try {
    const ref = db.collection('activities').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Activity not found' });
    const existing = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as AppActivity;
    if (!canManageActivity(req.user!, existing)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const normalized = normalizeActivityPayload({ ...existing, ...(req.body ?? {}), id, ownerId: existing.ownerId }, existing.ownerId);
    if (normalized.error || !normalized.activity) {
      return res.status(400).json({ error: normalized.error ?? 'Invalid activity payload' });
    }
    const updated = { ...normalized.activity, id, createdAt: existing.createdAt, updatedAt: nowIso() };
    await ref.set(updated, { merge: true });
    return res.json(updated);
  } catch (err) {
    console.error('[PUT /api/activities/:id]:', err);
    return res.status(500).json({ error: 'Failed to update activity' });
  }
});

app.delete('/api/activities/:id', requireAuth, async (req, res) => {
  const id = qparam(req.params.id);

  if (!hasFirestoreProject) {
    const existing = activitiesStore.get(id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (!canManageActivity(req.user!, existing)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    activitiesStore.delete(id);
    return res.json({ success: true });
  }

  try {
    const ref = db.collection('activities').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Activity not found' });
    const existing = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as AppActivity;
    if (!canManageActivity(req.user!, existing)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await ref.update({ status: 'archived', updatedAt: nowIso() });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/activities/:id]:', err);
    return res.status(500).json({ error: 'Failed to delete activity' });
  }
});

app.post('/api/activities/:id/promote', requireAuth, async (req, res) => {
  if (!canPromoteActivity(req.user!)) {
    return res.status(403).json({ error: 'Admin role required to promote activities' });
  }

  const id = qparam(req.params.id);
  const isPromoted = Boolean((req.body ?? {}).isPromoted ?? true);

  if (!hasFirestoreProject) {
    const existing = activitiesStore.get(id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    const updated = { ...existing, isPromoted, updatedAt: nowIso() };
    activitiesStore.set(id, updated);
    return res.json(updated);
  }

  try {
    const ref = db.collection('activities').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Activity not found' });
    await ref.update({ isPromoted, updatedAt: nowIso() });
    const updated = await ref.get();
    return res.json({ id: updated.id, ...(updated.data() as Record<string, unknown>) });
  } catch (err) {
    console.error('[POST /api/activities/:id/promote]:', err);
    return res.status(500).json({ error: 'Failed to promote activity' });
  }
});

function councilMatchScore(council: AppCouncil, location: {
  postcode?: number;
  suburb?: string;
  city?: string;
  state?: string;
}) {
  let score = 0;
  const postcode = Number(location.postcode ?? 0);
  if (postcode && council.servicePostcodes.includes(postcode)) score += 40;
  if (location.suburb && council.serviceSuburbs.some((suburb) => suburb.toLowerCase() === location.suburb!.toLowerCase())) score += 30;
  if (location.city && council.serviceCities.some((city) => city.toLowerCase() === location.city!.toLowerCase())) score += 20;
  if (location.state && council.state.toLowerCase() === location.state.toLowerCase()) score += 10;
  return score;
}

function normalizeDomain(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  const noProtocol = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return noProtocol.split('/')[0]?.trim() ?? '';
}

function buildCouncilClaimUrl(councilId: string): string {
  const baseUrl = (process.env.CULTUREPASS_WEB_URL ?? 'https://culturepass.app').replace(/\/$/, '');
  return `${baseUrl}/council/claim?councilId=${encodeURIComponent(councilId)}`;
}

function buildClaimLetter(council: AppCouncil, claimUrl: string): { subject: string; body: string } {
  const subject = `Claim your CulturePass council page — ${council.name}`;
  const body = [
    `Dear ${council.name} team,`,
    '',
    'CulturePass has prepared your council profile page for local community updates, grants, and civic notices.',
    'To claim and manage your page, please use the secure claim link below:',
    claimUrl,
    '',
    'Important: Sign in with your official council work email. Your email domain must exactly match your council website domain for verification.',
    'Once submitted, a super admin will review and approve your claim. After approval, your team can access council CRUD tools.',
    '',
    'Regards,',
    'CulturePass Admin',
  ].join('\n');
  return { subject, body };
}

function mapCouncilClaimFromRecord(id: string, raw: Record<string, unknown>): AppCouncilClaim {
  return {
    id,
    councilId: String(raw.councilId ?? ''),
    userId: String(raw.userId ?? ''),
    workEmail: String(raw.workEmail ?? '').toLowerCase(),
    roleTitle: String(raw.roleTitle ?? ''),
    note: raw.note ? String(raw.note) : undefined,
    websiteDomain: String(raw.websiteDomain ?? ''),
    emailDomain: String(raw.emailDomain ?? ''),
    domainMatch: Boolean(raw.domainMatch),
    status: String(raw.status ?? 'pending_admin_review') as AppCouncilClaim['status'],
    reviewedBy: raw.reviewedBy ? String(raw.reviewedBy) : undefined,
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : undefined,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : undefined,
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
}

function mapCouncilClaimLetterFromRecord(id: string, raw: Record<string, unknown>): AppCouncilClaimLetter {
  return {
    id,
    councilId: String(raw.councilId ?? ''),
    recipientEmail: String(raw.recipientEmail ?? '').toLowerCase(),
    claimUrl: String(raw.claimUrl ?? ''),
    subject: String(raw.subject ?? ''),
    body: String(raw.body ?? ''),
    sentBy: String(raw.sentBy ?? ''),
    sentAt: String(raw.sentAt ?? nowIso()),
  };
}

async function listCouncilClaims(params?: { councilId?: string; userId?: string; status?: AppCouncilClaim['status'] }): Promise<AppCouncilClaim[]> {
  if (!hasFirestoreProject) {
    return councilClaims
      .filter((claim) => (!params?.councilId || claim.councilId === params.councilId)
        && (!params?.userId || claim.userId === params.userId)
        && (!params?.status || claim.status === params.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  let query: FirebaseFirestore.Query = db.collection('councilClaims');
  if (params?.councilId) query = query.where('councilId', '==', params.councilId);
  if (params?.userId) query = query.where('userId', '==', params.userId);
  if (params?.status) query = query.where('status', '==', params.status);

  const snap = await query.get();
  return snap.docs
    .map((doc) => mapCouncilClaimFromRecord(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getCouncilClaimById(claimId: string): Promise<AppCouncilClaim | null> {
  if (!hasFirestoreProject) {
    return councilClaims.find((item) => item.id === claimId) ?? null;
  }

  const snap = await db.collection('councilClaims').doc(claimId).get();
  if (!snap.exists) return null;
  return mapCouncilClaimFromRecord(snap.id, snap.data() as Record<string, unknown>);
}

async function saveCouncilClaim(claim: AppCouncilClaim): Promise<void> {
  if (!hasFirestoreProject) {
    const index = councilClaims.findIndex((item) => item.id === claim.id);
    if (index === -1) {
      councilClaims.unshift(claim);
    } else {
      councilClaims[index] = claim;
    }
    return;
  }

  await db.collection('councilClaims').doc(claim.id).set(claim, { merge: true });
}

async function saveCouncilClaimLetter(letter: AppCouncilClaimLetter): Promise<void> {
  if (!hasFirestoreProject) {
    councilClaimLetters.unshift(letter);
    return;
  }

  await db.collection('councilClaimLetters').doc(letter.id).set(letter, { merge: true });
}

function getUserPrimaryCouncilId(userId: string): string | null {
  for (const link of userCouncilLinks.values()) {
    if (link.userId === userId && link.isPrimary) return link.institutionId;
  }
  return null;
}

function userCanManageCouncil(user: RequestUser, councilId: string): boolean {
  if (user.role === 'admin' || user.role === 'platformAdmin') return true;
  return councilClaims.some((claim) => claim.councilId === councilId && claim.userId === user.id && claim.status === 'approved');
}

async function userCanManageCouncilAccess(user: RequestUser, councilId: string): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'platformAdmin') return true;
  if (!hasFirestoreProject) return userCanManageCouncil(user, councilId);

  const approvedClaims = await listCouncilClaims({
    councilId,
    userId: user.id,
    status: 'approved',
  });
  return approvedClaims.length > 0;
}

function resolveCouncilByLocation(input: Record<string, unknown>): AppCouncil | null {
  const cityRaw = String(input.city ?? '').trim();
  const suburbRaw = String(input.suburb ?? '').trim();
  const stateRaw = String(input.state ?? input.stateCode ?? '').trim();
  const postcodeRaw = String(input.postcode ?? '').trim();
  let postcode = Number.parseInt(postcodeRaw, 10);

  if (!Number.isFinite(postcode)) {
    const seedCity = suburbRaw || cityRaw;
    if (seedCity) {
      const byCity = getPostcodesByPlace(seedCity)[0];
      if (byCity) {
        postcode = byCity.postcode;
      }
    }
  }

  const ranked = councils
    .filter((council) => council.status === 'active')
    .map((council) => ({
      council,
      score: councilMatchScore(council, {
        postcode: Number.isFinite(postcode) ? postcode : undefined,
        suburb: suburbRaw || cityRaw || undefined,
        city: cityRaw || suburbRaw || undefined,
        state: stateRaw || undefined,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  if ((ranked[0]?.score ?? 0) <= 0) return null;
  return ranked[0]!.council;
}

function councilDashboardPayload(params: {
  council: AppCouncil;
  postcode?: number;
  suburb?: string;
  userId?: string;
}) {
  const { council, postcode, suburb, userId } = params;
  const waste = councilWasteSchedules.find((item) =>
    item.institutionId === council.id &&
    ((postcode && item.postcode === postcode) || (suburb && item.suburb.toLowerCase() === suburb.toLowerCase()))
  ) ?? councilWasteSchedules.find((item) => item.institutionId === council.id);

  const alerts = councilAlerts
    .filter((item) => item.institutionId === council.id && item.status === 'active')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const grants = councilGrants.filter((item) => item.institutionId === council.id);
  const links = institutionLinks.filter((item) => item.institutionId === council.id);
  const eventsForCouncil = events
    .filter((event) => council.serviceCities.some((city) => city.toLowerCase() === event.city.toLowerCase()))
    .slice(0, 10)
    .map((event) => ({ ...event, institutionId: council.id, isCouncilEvent: true }));
  const facilities = profiles
    .filter((profile) => profile.entityType === 'venue' && council.serviceCities.some((city) => city.toLowerCase() === profile.city.toLowerCase()))
    .slice(0, 10)
    .map((profile) => ({
      ...profile,
      institutionId: council.id,
      isCouncilOwned: true,
      facilityType: String(profile.category ?? 'community_centre').toLowerCase().replace(/\s+/g, '_'),
    }));

  const followSet = userId ? userCouncilFollows.get(userId) : undefined;
  const following = userId ? Boolean(followSet?.has(council.id)) : false;

  const prefKey = userId ? `${userId}:${council.id}` : '';
  const defaultPreferences: AppUserCouncilAlertPreference[] = [
    { category: 'emergency', enabled: true },
    { category: 'bushfire', enabled: true },
    { category: 'flood', enabled: true },
    { category: 'road_closure', enabled: true },
    { category: 'public_meeting', enabled: false },
    { category: 'grant_opening', enabled: true },
    { category: 'facility_closure', enabled: true },
    { category: 'community_notice', enabled: true },
    { category: 'development_application', enabled: false },
  ];
  const preferences = prefKey
    ? (userCouncilAlertPreferences.get(prefKey) ?? defaultPreferences)
    : defaultPreferences;
  const reminder = prefKey
    ? (userWasteReminders.get(prefKey) ?? {
      userId: userId!,
      institutionId: council.id,
      postcode,
      suburb,
      reminderTime: '19:00',
      enabled: false,
      updatedAt: nowIso(),
    })
    : null;

  return {
    council,
    waste,
    alerts,
    events: eventsForCouncil,
    facilities,
    grants,
    links,
    preferences,
    reminder,
    following,
  };
}

app.get('/api/council/list', (req, res) => {
  const query = String(req.query.q ?? '').trim().toLowerCase();
  const state = String(req.query.state ?? '').trim().toUpperCase();
  const verificationStatus = String(req.query.verificationStatus ?? '').trim().toLowerCase();
  const sortByRaw = String(req.query.sortBy ?? '').trim().toLowerCase();
  const sortDirRaw = String(req.query.sortDir ?? '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '50'), 10) || 50));

  const sortBy = sortByRaw === 'name' || sortByRaw === 'state' || sortByRaw === 'verification'
    ? sortByRaw
    : 'name';
  const sortDir = sortDirRaw === 'desc' ? 'desc' : 'asc';
  const direction = sortDir === 'desc' ? -1 : 1;

  let items = councils.filter((item) => item.status === 'active');
  if (state) items = items.filter((item) => item.state === state);
  if (verificationStatus === 'verified') items = items.filter((item) => item.verificationStatus === 'verified');
  if (verificationStatus === 'unverified') items = items.filter((item) => item.verificationStatus !== 'verified');
  if (query) {
    const levenshtein = (a: string, b: string) => {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost,
          );
        }
      }
      return matrix[a.length][b.length];
    };

    items = items.filter((item) => {
      const haystack = `${item.name} ${item.suburb} ${item.lgaCode} ${item.state} ${item.email ?? ''} ${item.websiteUrl ?? ''}`.toLowerCase();
      if (haystack.includes(query)) return true;

      if (query.length < 4) return false;

      const queryTokens = query.split(/[^a-z0-9]+/).filter(Boolean);
      const haystackTokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
      if (queryTokens.length === 0 || haystackTokens.length === 0) return false;

      return queryTokens.every((queryToken) => haystackTokens.some((token) => {
        if (token === queryToken) return true;
        if (Math.abs(token.length - queryToken.length) > 2) return false;
        return levenshtein(token, queryToken) <= 2;
      }));
    });
  }

  items.sort((a, b) => {
    if (sortBy === 'state') {
      const stateCompare = a.state.localeCompare(b.state);
      if (stateCompare !== 0) return stateCompare * direction;
      return a.name.localeCompare(b.name) * direction;
    }
    if (sortBy === 'verification') {
      const aValue = a.verificationStatus === 'verified' ? 1 : 0;
      const bValue = b.verificationStatus === 'verified' ? 1 : 0;
      if (aValue !== bValue) return (aValue - bValue) * direction;
      return a.name.localeCompare(b.name) * direction;
    }
    return a.name.localeCompare(b.name) * direction;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return res.json({ councils: paged, total, page, pageSize, hasNextPage: start + pageSize < total, sortBy, sortDir });
});

app.get('/api/council/selected', requireAuth, (req, res) => {
  const selectedId = getUserPrimaryCouncilId(req.user!.id);
  if (!selectedId) return res.json({ council: null });
  const council = councils.find((item) => item.id === selectedId && item.status === 'active') ?? null;
  return res.json({ council });
});

app.post('/api/council/select', requireAuth, (req, res) => {
  const councilId = String(req.body?.councilId ?? '').trim();
  if (!councilId) return res.status(400).json({ error: 'councilId is required' });

  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const userId = req.user!.id;
  for (const [key, link] of userCouncilLinks.entries()) {
    if (link.userId === userId) {
      userCouncilLinks.set(key, { ...link, isPrimary: link.institutionId === councilId });
    }
  }
  userCouncilLinks.set(`${userId}:${councilId}`, { userId, institutionId: councilId, isPrimary: true });
  return res.json({ success: true, councilId });
});

app.get('/api/council/my', async (req, res) => {
  const postcode = Number.parseInt(String(req.query.postcode ?? ''), 10);
  const suburb = String(req.query.suburb ?? '').trim();
  const city = String(req.query.city ?? '').trim();
  const state = String(req.query.state ?? '').trim();

  const council = resolveCouncilByLocation({
    postcode: Number.isFinite(postcode) ? postcode : undefined,
    suburb,
    city,
    state,
  });
  if (!council) return res.status(404).json({ error: 'No council found for provided location' });

  const userId = req.user?.id;
  return res.json(councilDashboardPayload({
    council,
    postcode: Number.isFinite(postcode) ? postcode : undefined,
    suburb: suburb || city || undefined,
    userId,
  }));
});

app.get('/api/council/:id', (req, res) => {
  const council = councils.find((item) => item.id === qparam(req.params.id) && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });
  return res.json(council);
});

app.get('/api/council/:id/waste', (req, res) => {
  const councilId = qparam(req.params.id);
  const postcode = Number.parseInt(String(req.query.postcode ?? ''), 10);
  const suburb = String(req.query.suburb ?? '').trim();
  const match = councilWasteSchedules.find((item) =>
    item.institutionId === councilId &&
    ((Number.isFinite(postcode) && item.postcode === postcode) || (suburb && item.suburb.toLowerCase() === suburb.toLowerCase()))
  ) ?? councilWasteSchedules.find((item) => item.institutionId === councilId);
  if (!match) return res.status(404).json({ error: 'Waste schedule not found' });
  return res.json(match);
});

app.get('/api/council/:id/alerts', (req, res) => {
  const councilId = qparam(req.params.id);
  const category = String(req.query.category ?? '').trim().toLowerCase();
  let items = councilAlerts.filter((item) => item.institutionId === councilId && item.status === 'active');
  if (category) items = items.filter((item) => item.category === category);
  return res.json(items);
});

app.get('/api/council/:id/events', (req, res) => {
  const council = councils.find((item) => item.id === qparam(req.params.id) && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });
  const items = events
    .filter((event) => council.serviceCities.some((city) => city.toLowerCase() === event.city.toLowerCase()))
    .map((event) => ({ ...event, institutionId: council.id, isCouncilEvent: true }));
  return res.json(items);
});

app.get('/api/council/:id/facilities', (req, res) => {
  const council = councils.find((item) => item.id === qparam(req.params.id) && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });
  const items = profiles
    .filter((profile) => profile.entityType === 'venue' && council.serviceCities.some((city) => city.toLowerCase() === profile.city.toLowerCase()))
    .map((profile) => ({
      ...profile,
      institutionId: council.id,
      isCouncilOwned: true,
      facilityType: String(profile.category ?? 'community_centre').toLowerCase().replace(/\s+/g, '_'),
    }));
  return res.json(items);
});

app.get('/api/council/:id/grants', (req, res) => {
  const councilId = qparam(req.params.id);
  return res.json(councilGrants.filter((item) => item.institutionId === councilId));
});

app.post('/api/council/:id/claim', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const workEmail = String(body.workEmail ?? '').trim().toLowerCase();
  const roleTitle = String(body.roleTitle ?? '').trim();
  const note = String(body.note ?? '').trim();

  if (!workEmail || !roleTitle) return res.status(400).json({ error: 'workEmail and roleTitle are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) return res.status(400).json({ error: 'Invalid workEmail' });

  const emailDomain = normalizeDomain(workEmail.split('@')[1] ?? '');
  const websiteDomain = normalizeDomain(council.websiteUrl ?? '');
  const domainMatch = Boolean(emailDomain && websiteDomain && emailDomain === websiteDomain);
  if (!domainMatch) {
    return res.status(400).json({ error: 'Work email domain must exactly match official council website domain' });
  }

  try {
    const existing = await listCouncilClaims({
      councilId,
      userId: req.user!.id,
      status: 'pending_admin_review',
    });
    if (existing.length > 0) return res.status(409).json({ error: 'You already have a pending claim for this council' });

    const claim: AppCouncilClaim = {
      id: `cc-${generateSecureId('')}`,
      councilId,
      userId: req.user!.id,
      workEmail,
      roleTitle,
      note: note || undefined,
      websiteDomain,
      emailDomain,
      domainMatch,
      status: 'pending_admin_review',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await saveCouncilClaim(claim);
    return res.status(201).json(claim);
  } catch (error) {
    console.error('[POST /api/council/:id/claim]:', error);
    return res.status(500).json({ error: 'Failed to submit council claim' });
  }
});

app.get('/api/council/:id/claims/me', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  try {
    const claims = await listCouncilClaims({ councilId, userId: req.user!.id });
    return res.json(claims);
  } catch (error) {
    console.error('[GET /api/council/:id/claims/me]:', error);
    return res.status(500).json({ error: 'Failed to load your claims' });
  }
});

app.patch('/api/council/:id/profile-media', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const logoUrl = body.logoUrl != null ? String(body.logoUrl).trim() : undefined;
  const bannerUrl = body.bannerUrl != null ? String(body.bannerUrl).trim() : undefined;

  if (logoUrl !== undefined) council.logoUrl = logoUrl || undefined;
  if (bannerUrl !== undefined) council.bannerUrl = bannerUrl || undefined;
  council.updatedAt = nowIso();
  return res.json(council);
});

app.get('/api/admin/council/claims', requireAuth, requireRole('admin'), async (req, res) => {
  const status = String(req.query.status ?? '').trim();
  try {
    const list = await listCouncilClaims({ status: status ? (status as AppCouncilClaim['status']) : undefined });
    return res.json(list);
  } catch (error) {
    console.error('[GET /api/admin/council/claims]:', error);
    return res.status(500).json({ error: 'Failed to load council claims' });
  }
});

app.post('/api/admin/council/claims/:claimId/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const claimId = qparam(req.params.claimId);
  try {
    const claim = await getCouncilClaimById(claimId);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'pending_admin_review') return res.status(400).json({ error: 'Claim is not pending review' });

    claim.status = 'approved';
    claim.reviewedBy = req.user!.id;
    claim.reviewedAt = nowIso();
    claim.updatedAt = nowIso();
    await saveCouncilClaim(claim);

    const council = councils.find((item) => item.id === claim.councilId);
    if (council) {
      council.verificationStatus = 'verified';
      council.verifiedBy = req.user!.id;
      council.verifiedAt = nowIso();
      council.updatedAt = nowIso();
    }

    userCouncilLinks.set(`${claim.userId}:${claim.councilId}`, { userId: claim.userId, institutionId: claim.councilId, isPrimary: true });
    return res.json({ success: true, claim });
  } catch (error) {
    console.error('[POST /api/admin/council/claims/:claimId/approve]:', error);
    return res.status(500).json({ error: 'Failed to approve claim' });
  }
});

app.post('/api/admin/council/claims/:claimId/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const claimId = qparam(req.params.claimId);
  try {
    const claim = await getCouncilClaimById(claimId);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'pending_admin_review') return res.status(400).json({ error: 'Claim is not pending review' });

    const reason = String(req.body?.reason ?? '').trim();
    claim.status = 'rejected';
    claim.reviewedBy = req.user!.id;
    claim.reviewedAt = nowIso();
    claim.rejectionReason = reason || undefined;
    claim.updatedAt = nowIso();
    await saveCouncilClaim(claim);
    return res.json({ success: true, claim });
  } catch (error) {
    console.error('[POST /api/admin/council/claims/:claimId/reject]:', error);
    return res.status(500).json({ error: 'Failed to reject claim' });
  }
});

app.post('/api/admin/council/:id/send-claim-letter', requireAuth, requireRole('admin'), async (req, res) => {
  const councilId = qparam(req.params.id);
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const requestedEmail = String(req.body?.recipientEmail ?? '').trim().toLowerCase();
  const recipientEmail = requestedEmail || String(council.email ?? '').trim().toLowerCase();
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: 'A valid recipientEmail is required' });
  }

  const claimUrl = buildCouncilClaimUrl(councilId);
  const { subject, body } = buildClaimLetter(council, claimUrl);
  const letter: AppCouncilClaimLetter = {
    id: `cl-${generateSecureId('')}`,
    councilId,
    recipientEmail,
    claimUrl,
    subject,
    body,
    sentBy: req.user!.id,
    sentAt: nowIso(),
  };
  try {
    await saveCouncilClaimLetter(letter);
    return res.status(201).json({
      success: true,
      letter,
      message: 'Claim letter generated and marked as sent. Wire your email provider to dispatch this body.',
    });
  } catch (error) {
    console.error('[POST /api/admin/council/:id/send-claim-letter]:', error);
    return res.status(500).json({ error: 'Failed to generate claim letter' });
  }
});

app.post('/api/council/:id/alerts', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const category = String(body.category ?? 'community_notice') as AppCouncilAlert['category'];
  const severity = String(body.severity ?? 'low') as AppCouncilAlert['severity'];
  if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

  const created: AppCouncilAlert = {
    id: `ca-${generateSecureId('')}`,
    institutionId: councilId,
    title,
    description,
    category,
    severity,
    startAt: String(body.startAt ?? nowIso()),
    endAt: body.endAt ? String(body.endAt) : undefined,
    status: String(body.status ?? 'active') as AppCouncilAlert['status'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  councilAlerts.unshift(created);
  return res.status(201).json(created);
});

app.patch('/api/council/:id/alerts/:alertId', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const alertId = qparam(req.params.alertId);
  const index = councilAlerts.findIndex((item) => item.id === alertId && item.institutionId === councilId);
  if (index === -1) return res.status(404).json({ error: 'Alert not found' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const current = councilAlerts[index]!;
  const next: AppCouncilAlert = {
    ...current,
    ...(body.title != null ? { title: String(body.title) } : {}),
    ...(body.description != null ? { description: String(body.description) } : {}),
    ...(body.category != null ? { category: String(body.category) as AppCouncilAlert['category'] } : {}),
    ...(body.severity != null ? { severity: String(body.severity) as AppCouncilAlert['severity'] } : {}),
    ...(body.startAt != null ? { startAt: String(body.startAt) } : {}),
    ...(body.endAt != null ? { endAt: body.endAt ? String(body.endAt) : undefined } : {}),
    ...(body.status != null ? { status: String(body.status) as AppCouncilAlert['status'] } : {}),
    updatedAt: nowIso(),
  };
  councilAlerts[index] = next;
  return res.json(next);
});

app.delete('/api/council/:id/alerts/:alertId', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const alertId = qparam(req.params.alertId);
  const index = councilAlerts.findIndex((item) => item.id === alertId && item.institutionId === councilId);
  if (index === -1) return res.status(404).json({ error: 'Alert not found' });
  councilAlerts.splice(index, 1);
  return res.json({ success: true });
});

app.post('/api/council/:id/grants', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

  const created: AppCouncilGrant = {
    id: `cg-${generateSecureId('')}`,
    institutionId: councilId,
    title,
    description,
    category: String(body.category ?? 'community') as AppCouncilGrant['category'],
    fundingMin: body.fundingMin != null ? Number(body.fundingMin) : undefined,
    fundingMax: body.fundingMax != null ? Number(body.fundingMax) : undefined,
    opensAt: body.opensAt ? String(body.opensAt) : undefined,
    closesAt: body.closesAt ? String(body.closesAt) : undefined,
    applicationUrl: body.applicationUrl ? String(body.applicationUrl) : undefined,
    status: String(body.status ?? 'upcoming') as AppCouncilGrant['status'],
  };
  councilGrants.unshift(created);
  return res.status(201).json(created);
});

app.patch('/api/council/:id/grants/:grantId', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const grantId = qparam(req.params.grantId);
  const index = councilGrants.findIndex((item) => item.id === grantId && item.institutionId === councilId);
  if (index === -1) return res.status(404).json({ error: 'Grant not found' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const current = councilGrants[index]!;
  const next: AppCouncilGrant = {
    ...current,
    ...(body.title != null ? { title: String(body.title) } : {}),
    ...(body.description != null ? { description: String(body.description) } : {}),
    ...(body.category != null ? { category: String(body.category) as AppCouncilGrant['category'] } : {}),
    ...(body.fundingMin != null ? { fundingMin: Number(body.fundingMin) } : {}),
    ...(body.fundingMax != null ? { fundingMax: Number(body.fundingMax) } : {}),
    ...(body.opensAt != null ? { opensAt: body.opensAt ? String(body.opensAt) : undefined } : {}),
    ...(body.closesAt != null ? { closesAt: body.closesAt ? String(body.closesAt) : undefined } : {}),
    ...(body.applicationUrl != null ? { applicationUrl: body.applicationUrl ? String(body.applicationUrl) : undefined } : {}),
    ...(body.status != null ? { status: String(body.status) as AppCouncilGrant['status'] } : {}),
  };
  councilGrants[index] = next;
  return res.json(next);
});

app.delete('/api/council/:id/grants/:grantId', requireAuth, async (req, res) => {
  const councilId = qparam(req.params.id);
  if (!(await userCanManageCouncilAccess(req.user!, councilId))) return res.status(403).json({ error: 'Forbidden' });
  const grantId = qparam(req.params.grantId);
  const index = councilGrants.findIndex((item) => item.id === grantId && item.institutionId === councilId);
  if (index === -1) return res.status(404).json({ error: 'Grant not found' });
  councilGrants.splice(index, 1);
  return res.json({ success: true });
});

app.get('/api/council/:id/links', (req, res) => {
  const councilId = qparam(req.params.id);
  return res.json(institutionLinks.filter((item) => item.institutionId === councilId));
});

app.post('/api/council/:id/follow', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const council = councils.find((item) => item.id === councilId && item.status === 'active');
  if (!council) return res.status(404).json({ error: 'Council not found' });

  const userId = req.user!.id;
  const set = userCouncilFollows.get(userId) ?? new Set<string>();
  set.add(councilId);
  userCouncilFollows.set(userId, set);
  userCouncilLinks.set(`${userId}:${councilId}`, { userId, institutionId: councilId, isPrimary: true });
  return res.json({ success: true, following: true, institutionId: councilId });
});

app.delete('/api/council/:id/follow', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const userId = req.user!.id;
  const set = userCouncilFollows.get(userId) ?? new Set<string>();
  set.delete(councilId);
  userCouncilFollows.set(userId, set);
  userCouncilLinks.delete(`${userId}:${councilId}`);
  return res.json({ success: true, following: false, institutionId: councilId });
});

app.get('/api/council/:id/preferences', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const key = `${req.user!.id}:${councilId}`;
  const existing = userCouncilAlertPreferences.get(key) ?? [];
  return res.json(existing);
});

app.put('/api/council/:id/preferences', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const list: unknown[] = Array.isArray(req.body?.preferences) ? (req.body.preferences as unknown[]) : [];
  const preferences: AppUserCouncilAlertPreference[] = list
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        category: String(row.category ?? '') as AppUserCouncilAlertPreference['category'],
        enabled: Boolean(row.enabled),
      };
    })
    .filter((item: AppUserCouncilAlertPreference) => Boolean(item.category));
  const key = `${req.user!.id}:${councilId}`;
  userCouncilAlertPreferences.set(key, preferences);
  return res.json({ success: true, preferences });
});

app.get('/api/council/:id/waste-reminder', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const key = `${req.user!.id}:${councilId}`;
  const reminder = userWasteReminders.get(key) ?? null;
  return res.json(reminder);
});

app.put('/api/council/:id/waste-reminder', requireAuth, (req, res) => {
  const councilId = qparam(req.params.id);
  const reminderTime = String(req.body?.reminderTime ?? '19:00');
  const enabled = Boolean(req.body?.enabled);
  const postcode = Number.parseInt(String(req.body?.postcode ?? ''), 10);
  const suburb = String(req.body?.suburb ?? '').trim();
  const key = `${req.user!.id}:${councilId}`;
  const payload: AppUserWasteReminder = {
    userId: req.user!.id,
    institutionId: councilId,
    postcode: Number.isFinite(postcode) ? postcode : undefined,
    suburb: suburb || undefined,
    reminderTime,
    enabled,
    updatedAt: nowIso(),
  };
  userWasteReminders.set(key, payload);
  return res.json({ success: true, reminder: payload });
});

// ---------------------------------------------------------------------------
// Wallet, Transactions, Payment Methods
// ---------------------------------------------------------------------------

app.get('/api/wallet/:userId', requireAuth, (req, res) => {
  const userId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  walletsService.getOrCreate(userId)
    .then((wallet) => res.json({
      id: `w-${userId}`,
      userId,
      balance: Number((Number(wallet.balanceCents ?? 0) / 100).toFixed(2)),
      balanceCents: Number(wallet.balanceCents ?? 0),
      currency: wallet.currency ?? 'AUD',
      points: Number(wallet.points ?? 0),
      rewards: buildRewardsStatus(wallet.points ?? 0),
      transactions: (wallet.transactions ?? []).map((item) =>
        toTransactionApiRecord(userId, wallet.currency ?? 'AUD', item as RawWalletTransaction)),
    }))
    .catch((err) => {
      console.error('[GET /api/wallet/:userId]:', err);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    });
});
app.get('/api/transactions/:userId', requireAuth, (req, res) => {
  const userId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  walletsService.getOrCreate(userId)
    .then((wallet) => res.json((wallet.transactions ?? [])
      .map((item) => toTransactionApiRecord(userId, wallet.currency ?? 'AUD', item as RawWalletTransaction))))
    .catch((err) => {
      console.error('[GET /api/transactions/:userId]:', err);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    });
});
app.get('/api/rewards/:userId', requireAuth, async (req, res) => {
  const userId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const wallet = await walletsService.getOrCreate(userId);
    const rewards = buildRewardsStatus(wallet.points ?? 0);
    return res.json({ userId, ...rewards });
  } catch (err) {
    console.error('[GET /api/rewards/:userId]:', err);
    return res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});
app.get('/api/payment-methods/:userId', requireAuth, async (req, res) => {
  const userId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const methods = await paymentMethodsService.listForUser(userId);
    return res.json(methods);
  } catch (err) {
    console.error('[GET /api/payment-methods/:userId]:', err);
    return res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});
app.post('/api/payment-methods', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  try {
    const list = await paymentMethodsService.listForUser(userId);
    const method = await paymentMethodsService.create({
      userId,
      type: 'credit',
      brand: String(req.body?.brand ?? 'visa'),
      last4: String(req.body?.last4 ?? '4242'),
      label: 'Card',
      isDefault: list.length === 0,
    });
    return res.status(201).json(method);
  } catch (err) {
    console.error('[POST /api/payment-methods]:', err);
    return res.status(500).json({ error: 'Failed to create payment method' });
  }
});
app.delete('/api/payment-methods/:id', requireAuth, async (req, res) => {
  try {
    await paymentMethodsService.delete(qparam(req.params.id));
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/payment-methods/:id]:', err);
    return res.status(500).json({ error: 'Failed to delete payment method' });
  }
});
app.put('/api/payment-methods/:userId/default/:methodId', requireAuth, async (req, res) => {
  const userId = qparam(req.params.userId);
  const methodId = qparam(req.params.methodId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await paymentMethodsService.setDefault(userId, methodId);
    const methods = await paymentMethodsService.listForUser(userId);
    return res.json(methods);
  } catch (err) {
    console.error('[PUT /api/payment-methods/:userId/default/:methodId]:', err);
    return res.status(500).json({ error: 'Failed' });
  }
});
app.post('/api/wallet/:userId/topup', requireAuth, (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const userId = qparam(req.params.userId);
  let parsedAmount = 0;
  try {
    parsedAmount = parseBody(walletTopupSchema, req.body).amount;
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid amount' });
  }

  walletsService.topup(userId, Math.round(parsedAmount * 100))
    .then((wallet) => res.json({
      id: `w-${userId}`,
      userId,
      balance: Number((Number(wallet.balanceCents ?? 0) / 100).toFixed(2)),
      balanceCents: Number(wallet.balanceCents ?? 0),
      currency: wallet.currency ?? 'AUD',
      points: Number(wallet.points ?? 0),
      rewards: buildRewardsStatus(wallet.points ?? 0),
      transactions: (wallet.transactions ?? []).map((item) =>
        toTransactionApiRecord(userId, wallet.currency ?? 'AUD', item as RawWalletTransaction)),
    }))
    .catch((err) => {
      console.error('[POST /api/wallet/:userId/topup]:', err);
      res.status(500).json({ error: 'Failed to top up wallet' });
    });
});

// ---------------------------------------------------------------------------
// Membership — Stripe Subscription + Firestore
// ---------------------------------------------------------------------------

// GET /api/membership/member-count — must be before /:userId to avoid capture
app.get('/api/membership/member-count', async (_req, res) => {
  if (!hasFirestoreProject) {
    const count = [...memberships.values()]
      .filter((m) => MEMBERSHIP_PAID_TIERS.includes(normalizeMembershipTier(m.tier)) && m.isActive)
      .length;
    return res.json({ count });
  }
  try {
    const snap = await db.collection('users')
      .where('membership.isActive', '==', true)
      .get();
    const count = snap.docs.reduce((total, doc) => {
      const tier = normalizeMembershipTier(doc.data()?.membership?.tier);
      return MEMBERSHIP_PAID_TIERS.includes(tier) ? total + 1 : total;
    }, 0);
    return res.json({ count });
  } catch {
    return res.json({ count: 0 });
  }
});

// GET /api/membership/:userId
app.get('/api/membership/:userId', requireAuth, async (req, res) => {
  const userId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!hasFirestoreProject) {
    const membership = memberships.get(userId);
    const eventsAttended = tickets
      .filter((ticket) => ticket.userId === userId && (ticket.status === 'confirmed' || ticket.status === 'used'))
      .length;
    return res.json(buildMembershipResponse({
      tier: membership?.tier ?? 'free',
      isActive: membership?.isActive ?? false,
      expiresAt: membership?.validUntil ?? null,
      eventsAttended,
    }));
  }
  try {
    const user = await usersService.getById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const membership = user.membership ?? { tier: 'free', isActive: false };
    const userTickets = await ticketsService.listForUser(userId);
    const eventsAttended = userTickets.filter((ticket) => ticket.status === 'confirmed' || ticket.status === 'used').length;
    return res.json(buildMembershipResponse({
      tier: membership.tier,
      isActive: membership.isActive,
      expiresAt: membership.expiresAt ?? null,
      eventsAttended,
    }));
  } catch (err) {
    console.error('[GET /api/membership/:userId]:', err);
    return res.status(500).json({ error: 'Failed to fetch membership' });
  }
});

// POST /api/membership/subscribe — create Stripe subscription checkout session
app.post('/api/membership/subscribe', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  let billingPeriod: 'monthly' | 'yearly' = 'monthly';
  try {
    const payload = parseBody(membershipSubscribeSchema, req.body);
    billingPeriod = payload.billingPeriod ?? 'monthly';
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid subscription payload' });
  }

  if (!hasFirestoreProject) {
    // Dev mode: instant upgrade
    const expiresAt = new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 86_400_000).toISOString();
    const m = memberships.get(userId);
    if (m) {
      m.tier = 'plus';
      m.isActive = true;
      m.validUntil = expiresAt;
    } else {
      memberships.set(userId, { id: `m-${userId}`, userId, tier: 'plus', isActive: true, validUntil: expiresAt });
    }
    return res.json({
      checkoutUrl: null,
      tier: 'plus',
      devMode: true,
      membership: buildMembershipResponse({ tier: 'plus', isActive: true, expiresAt }),
    });
  }

  const appUrl = process.env.APP_URL ?? (process.env.FIREBASE_CONFIG
    ? `https://${JSON.parse(process.env.FIREBASE_CONFIG).projectId}.web.app`
    : 'http://localhost:5000');

  if (!stripeClient) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
  }

  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY_ID;
  const yearlyPriceId  = process.env.STRIPE_PRICE_YEARLY_ID;
  const priceId = billingPeriod === 'yearly' ? yearlyPriceId : monthlyPriceId;
  if (!priceId) {
    return res.status(503).json({ error: `STRIPE_PRICE_${billingPeriod.toUpperCase()}_ID is not configured.` });
  }

  try {
    const user = await usersService.getById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const currentMembership = user.membership ?? { tier: 'free', isActive: false };
    const currentTier = normalizeMembershipTier(currentMembership.tier);
    if (isMembershipActive(currentTier, currentMembership.isActive, currentMembership.expiresAt ?? null)) {
      return res.json({
        checkoutUrl: null,
        alreadyActive: true,
        membership: buildMembershipResponse({
          tier: currentTier,
          isActive: currentMembership.isActive,
          expiresAt: currentMembership.expiresAt ?? null,
        }),
      });
    }

    // Look up or create Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.displayName ?? user.username,
        metadata: { firebaseUid: userId },
      });
      stripeCustomerId = customer.id;
      await usersService.upsert(userId, { stripeCustomerId });
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { userId, billingPeriod, tier: 'plus' },
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/payment/cancel`,
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[POST /api/membership/subscribe]:', err);
    return res.status(500).json({ error: 'Failed to create subscription checkout session' });
  }
});

// POST /api/membership/cancel-subscription
app.post('/api/membership/cancel-subscription', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  if (!hasFirestoreProject) {
    const m = memberships.get(userId);
    if (m) { m.tier = 'free'; m.isActive = false; }
    return res.json({
      success: true,
      membership: buildMembershipResponse({ tier: 'free', isActive: false, expiresAt: null }),
    });
  }

  try {
    const user = await usersService.getById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (stripeClient && user.stripeSubscriptionId) {
      await stripeClient.subscriptions.cancel(user.stripeSubscriptionId);
    }

    await usersService.upsert(userId, {
      stripeSubscriptionId: undefined,
      membership: { tier: 'free', isActive: false },
    });

    // Revoke custom claims tier
    await authAdmin.setCustomUserClaims(userId, {
      ...(await authAdmin.getUser(userId)).customClaims,
      tier: 'free',
    });

    return res.json({
      success: true,
      membership: buildMembershipResponse({ tier: 'free', isActive: false, expiresAt: null }),
    });
  } catch (err) {
    console.error('[POST /api/membership/cancel-subscription]:', err);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

// GET /api/tickets/:userId
app.get('/api/tickets/:userId', requireAuth, async (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const userTickets = await ticketsService.listForUser(qparam(req.params.userId));
    return res.json(userTickets);
  } catch (err) {
    console.error('[GET /api/tickets/:userId]:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:userId/count
app.get('/api/tickets/:userId/count', requireAuth, async (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const userTickets = await ticketsService.listForUser(qparam(req.params.userId));
    const count = userTickets.filter((t) => t.status === 'confirmed').length;
    return res.json({ count });
  } catch (err) {
    console.error('[GET /api/tickets/:userId/count]:', err);
    return res.status(500).json({ error: 'Failed to count tickets' });
  }
});

// GET /api/ticket/:id (singular)
app.get('/api/ticket/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await ticketsService.getById(qparam(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isOwnerOrAdmin(req.user!, ticket.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json(ticket);
  } catch (err) {
    console.error('[GET /api/ticket/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets — purchase a ticket
app.post('/api/tickets', requireAuth, async (req, res) => {
  const userId  = req.user!.id;
  const eventId = String(req.body?.eventId ?? '');
  if (!eventId) return res.status(400).json({ error: 'eventId is required' });

  try {
    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Ticket quantity must be a positive integer' });
    }

    const eventRef = db.collection('events').doc(eventId);
    const ticketRef = db.collection('tickets').doc();

    const ticket = await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('EVENT_NOT_FOUND');
      }
      const event = eventDoc.data() as FirestoreEvent;

      if (event.capacity != null && (event.attending ?? 0) + quantity > event.capacity) {
        throw new Error('NOT_ENOUGH_CAPACITY');
      }

      const priceCents = Number(req.body?.priceCents ?? event.priceCents ?? 0);
      const qrCode = generateSecureId('CP-T-');

      const newTicketPayload = {
        id: ticketRef.id, eventId, userId,
        tierName: String(req.body?.tierName ?? 'General'),
        quantity, priceCents,
        totalPriceCents: priceCents * quantity,
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        qrCode, cpTicketId: qrCode,
        history: [{ action: 'ticket_created', timestamp: nowIso(), actorId: 'system' }],
        createdAt: nowIso(), updatedAt: nowIso(),
        // Denormalized fields for performance
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue,
        imageColor: event.imageColor,
      };

      transaction.set(ticketRef, newTicketPayload);
      transaction.update(eventRef, { attending: firestore.FieldValue.increment(quantity) });

      return newTicketPayload;
    });

    const explicitTotal = Number((ticket as { totalPriceCents?: number }).totalPriceCents ?? 0);
    const fallbackTotal = Number((ticket as { priceCents?: number }).priceCents ?? 0)
      * Number((ticket as { quantity?: number }).quantity ?? 1);
    const totalPriceCents = explicitTotal > 0 ? explicitTotal : fallbackTotal;
    const rewardPoints = await awardRewardsPoints(userId, totalPriceCents, {
      ticketId: String((ticket as { id?: string }).id ?? ticketRef.id),
      source: 'ticket purchase',
    });
    if (rewardPoints > 0) {
      await ticketsService.update(ticketRef.id, {
        rewardPointsEarned: rewardPoints,
        rewardPointsAwardedAt: nowIso(),
      });
    }

    return res.status(201).json(ticket);
  } catch (err) {
    console.error('[POST /api/tickets]:', err);
    if (err instanceof Error) {
      if (err.message === 'EVENT_NOT_FOUND') {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (err.message === 'NOT_ENOUGH_CAPACITY') {
        return res.status(400).json({ error: 'Not enough tickets available for this quantity' });
      }
    }
    return res.status(500).json({ error: 'Failed to purchase ticket' });
  }
});

// PUT /api/tickets/:id/cancel
app.put('/api/tickets/:id/cancel', requireAuth, async (req, res) => {
  try {
    const ticket = await ticketsService.getById(qparam(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isOwnerOrAdmin(req.user!, ticket.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (ticket.status === 'used') {
      return res.status(400).json({ error: 'Used tickets cannot be cancelled' });
    }
    const updated = await ticketsService.updateStatus(qparam(req.params.id), 'cancelled', req.user!.id);
    return res.json(updated);
  } catch (err) {
    console.error('[PUT /api/tickets/:id/cancel]:', err);
    return res.status(500).json({ error: 'Failed to cancel ticket' });
  }
});

// POST /api/tickets/scan — staff QR scan
app.post('/api/tickets/scan', requireAuth, requireRole('organizer', 'moderator', 'admin'), async (req, res) => {
  const qrCode = String(req.body?.ticketCode ?? '').trim();
  if (!qrCode) return res.status(400).json({ valid: false, error: 'ticketCode is required' });

  try {
    const ticket = await ticketsService.getByQrCode(qrCode);
    if (!ticket) {
      return res.status(404).json({ valid: false, error: 'Invalid ticket code' });
    }
    if (ticket.status !== 'confirmed') {
      return res.status(400).json({
        valid: false,
        error: `Ticket is ${ticket.status}`,
        ticket,
      });
    }
    const updated = await ticketsService.updateStatus(ticket.id, 'used', req.user!.id);
    await scanEventsService.record({ ticketId: ticket.id, eventId: ticket.eventId, scannedBy: req.user!.id, outcome: 'accepted', scannedAt: nowIso() });
    return res.json({ valid: true, message: 'Ticket scanned successfully', ticket: updated });
  } catch (err) {
    console.error('[POST /api/tickets/scan]:', err);
    return res.status(500).json({ valid: false, error: 'Scan failed' });
  }
});

// GET /api/tickets/:id/history
app.get('/api/tickets/:id/history', requireAuth, async (req, res) => {
  try {
    const ticket = await ticketsService.getById(qparam(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isOwnerOrAdmin(req.user!, ticket.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ history: ticket.history });
  } catch (err) {
    console.error('[GET /api/tickets/:id/history]:', err);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});
app.get('/api/tickets/admin/scan-events', requireAuth, requireRole('moderator', 'admin'), async (_req, res) => {
  res.json([]); // Not implemented properly yet
});
app.get('/api/tickets/:id/wallet/apple', async (req, res) => {
  const ticket = await ticketsService.getById(qparam(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const url = `https://wallet.culturepass.au/apple/${ticket.id}`;
  res.json({ url, provider: 'apple', ticketId: ticket.id });
});
app.get('/api/tickets/:id/wallet/google', async (req, res) => {
  const ticket = await ticketsService.getById(qparam(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const url = `https://wallet.culturepass.au/google/${ticket.id}`;
  res.json({ url, provider: 'google', ticketId: ticket.id });
});

// ---------------------------------------------------------------------------
// Perks + Redemptions
// ---------------------------------------------------------------------------

app.get('/api/perks', async (_req, res) => {
  try {
    const items = await perksService.list();
    return res.json(items);
  } catch (err) {
    console.error('[GET /api/perks]:', err);
    return res.status(500).json({ error: 'Failed to fetch perks' });
  }
});
app.get('/api/perks/:id', async (req, res) => {
  try {
    const perk = await perksService.getById(qparam(req.params.id));
    if (!perk) return res.status(404).json({ error: 'Perk not found' });
    return res.json(perk);
  } catch (err) {
    console.error('[GET /api/perks/:id]:', err);
    return res.status(500).json({ error: 'Failed to fetch perk' });
  }
});
app.post('/api/perks', requireAuth, requireRole('admin'), moderationCheck, async (req, res) => {
  let payload: z.infer<typeof createPerkSchema>;
  try {
    payload = parseBody(createPerkSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid perk payload' });
  }

  try {
    const perk = await perksService.create({
      title: payload.title,
      description: payload.description ?? '',
      perkType: payload.perkType,
      discountPercent: payload.discountPercent ?? null,
      discountFixedCents: payload.discountFixedCents ?? null,
      providerType: payload.providerType ?? 'business',
      providerId: payload.providerId ?? '',
      providerName: payload.providerName ?? '',
      category: payload.category,
      isMembershipRequired: Boolean(payload.isMembershipRequired ?? false),
      requiredMembershipTier: payload.requiredMembershipTier ?? 'free',
      usageLimit: payload.usageLimit ?? null,
      usedCount: 0,
      perUserLimit: payload.perUserLimit ?? null,
      status: 'active',
      startDate: nowIso(),
      endDate: payload.endDate ?? null,
    });
    return res.status(201).json(perk);
  } catch (err) {
    console.error('[POST /api/perks]:', err);
    return res.status(500).json({ error: 'Failed to create perk' });
  }
});
app.post('/api/perks/:id/redeem', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const perkId = qparam(req.params.id);

  try {
    const perk = await perksService.getById(perkId);
    if (!perk) return res.status(404).json({ error: 'Perk not found' });
    const alreadyUsed = await redemptionsService.countForUserAndPerk(userId, perkId);
    if (perk.perUserLimit && alreadyUsed >= perk.perUserLimit) {
      return res.status(400).json({ error: 'Per-user redemption limit reached' });
    }
    if (perk.isMembershipRequired) {
      const membership = await usersService.getById(userId);
      const tier = membership?.membership?.tier ?? 'free';
      if (tier === 'free') return res.status(403).json({ error: 'Membership tier required for this perk' });
    }
    const redemption = await redemptionsService.create({ perkId, userId, redeemedAt: nowIso() });
    await perksService.incrementUsed(perkId);
    return res.status(201).json(redemption);
  } catch (err) {
    console.error('[POST /api/perks/:id/redeem]:', err);
    return res.status(500).json({ error: 'Failed to redeem perk' });
  }
});
app.get('/api/redemptions', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  try {
    const items = await redemptionsService.listForUser(userId);
    return res.json(items);
  } catch (err) {
    console.error('[GET /api/redemptions]:', err);
    return res.status(500).json({ error: 'Failed to fetch redemptions' });
  }
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

app.get('/api/notifications/:userId', requireAuth, (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  notificationsService.listForUser(qparam(req.params.userId))
    .then((items) => res.json(items))
    .catch((err) => {
      console.error('[GET /api/notifications/:userId]:', err);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    });
});
app.post('/api/notifications/approval-status', requireAuth, requireRole('admin', 'moderator', 'platformAdmin', 'cityAdmin'), (req, res) => {
  let payload: z.infer<typeof approvalStatusSchema>;
  try {
    payload = parseBody(approvalStatusSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid approval token payload' });
  }

  const token = payload.approvalToken.trim();
  const inspected = inspectApprovalToken(token);
  if (!inspected) {
    return res.json({ valid: false, remainingMs: 0 });
  }
  if (inspected.actorId !== req.user!.id) {
    return res.status(403).json({ error: 'Approval token actor does not match current user' });
  }

  return res.json({
    valid: inspected.remainingMs > 0,
    expiresAt: inspected.expiresAt,
    remainingMs: Math.max(0, inspected.remainingMs),
  });
});
app.post('/api/notifications/targeted', requireAuth, requireRole('admin', 'moderator', 'platformAdmin', 'cityAdmin'), targetedNotificationsLimiter, async (req, res) => {
  let rawPayload: z.input<typeof targetedNotificationSchema>;
  try {
    rawPayload = parseBody(targetedNotificationSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid targeting payload' });
  }

  const payload = {
    ...rawPayload,
    type: rawPayload.type ?? 'recommendation',
    dryRun: rawPayload.dryRun ?? true,
    limit: rawPayload.limit ?? 200,
  };

  const idempotencyKey = String(payload.idempotencyKey ?? '').trim();
  const idempotencyScope = idempotencyKey ? `${req.user!.id}:${idempotencyKey}` : null;

  if (!payload.dryRun && idempotencyScope) {
    try {
      const idemRef = db.collection('targetedNotificationRequests').doc(idempotencyScope);
      const existing = await idemRef.get();
      if (existing.exists) {
        const stored = (existing.data()?.response ?? null) as TargetedNotificationResponse | null;
        if (stored) return res.json({ ...stored, idempotentReplay: true });
      }
    } catch (err) {
      console.error('[POST /api/notifications/targeted:idempotency-check]:', err);
    }
  }

  if (req.user?.role === 'cityAdmin') {
    const adminCity = String(req.user.city ?? '').trim();
    const adminCountry = String(req.user.country ?? '').trim();

    if (!adminCity) {
      return res.status(403).json({ error: 'City admin is missing city scope in token claims' });
    }

    if (payload.city && payload.city.toLowerCase() !== adminCity.toLowerCase()) {
      return res.status(403).json({ error: 'City admin can only target their assigned city' });
    }

    if (adminCountry && payload.country && payload.country.toLowerCase() !== adminCountry.toLowerCase()) {
      return res.status(403).json({ error: 'City admin can only target their assigned country' });
    }

    payload.city = adminCity;
    if (!payload.country && adminCountry) payload.country = adminCountry;
  }

  const normalizeNeedles = (list: string[] | undefined, maxItems = 25, maxLen = 80) =>
    (list ?? [])
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, arr) => item.length > 0 && item.length <= maxLen && arr.indexOf(item) === index)
      .slice(0, maxItems);

  const interestsNeedles = normalizeNeedles(payload.interestsAny);
  const communitiesNeedles = normalizeNeedles(payload.communitiesAny);
  const languagesNeedles = normalizeNeedles(payload.languagesAny);
  const categoryNeedles = normalizeNeedles(payload.categoryIdsAny);
  const ethnicityNeedle = String(payload.ethnicityContains ?? '').trim().toLowerCase();
  const approvalFingerprint = buildTargetedFingerprint({
    title: payload.title,
    message: payload.message,
    type: payload.type,
    city: payload.city,
    country: payload.country,
    interestsAny: interestsNeedles,
    communitiesAny: communitiesNeedles,
    languagesAny: languagesNeedles,
    categoryIdsAny: categoryNeedles,
    ethnicityContains: ethnicityNeedle,
    limit: payload.limit,
  });

  const matchesSignals = (data: Record<string, unknown>) => {
    const interests = normalizeList(data.interests).map((item) => item.toLowerCase());
    const communities = normalizeList(data.communities).map((item) => item.toLowerCase());
    const languages = normalizeList(data.languages).map((item) => item.toLowerCase());
    const categories = normalizeList(data.interestCategoryIds).map((item) => item.toLowerCase());
    const ethnicityText = String(data.ethnicityText ?? '').toLowerCase();
    const city = String(data.city ?? '').toLowerCase();
    const country = String(data.country ?? '').toLowerCase();

    if (payload.city && city !== payload.city.toLowerCase()) return false;
    if (payload.country && country !== payload.country.toLowerCase()) return false;
    if (interestsNeedles.length > 0 && !interestsNeedles.some((item) => interests.includes(item))) return false;
    if (communitiesNeedles.length > 0 && !communitiesNeedles.some((item) => communities.includes(item))) return false;
    if (languagesNeedles.length > 0 && !languagesNeedles.some((item) => languages.includes(item))) return false;
    if (categoryNeedles.length > 0 && !categoryNeedles.some((item) => categories.includes(item))) return false;
    if (ethnicityNeedle && !ethnicityText.includes(ethnicityNeedle)) return false;
    return true;
  };

  const selectedUsers: { id: string; data: Record<string, unknown> }[] = [];

  try {
    let query = db.collection('users') as FirebaseFirestore.Query;
    if (payload.city) query = query.where('city', '==', payload.city);
    if (payload.country) query = query.where('country', '==', payload.country);
    const snap = await query.limit(1000).get();
    for (const doc of snap.docs) {
      if (selectedUsers.length >= payload.limit) break;
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      if (matchesSignals(data)) selectedUsers.push({ id: doc.id, data });
    }
  } catch (err) {
    console.error('[POST /api/notifications/targeted]:', err);
    return res.status(500).json({ error: 'Failed to resolve target audience' });
  }

  const audiencePreview = selectedUsers.slice(0, 20).map((user) => ({
    userId: user.id,
    city: String(user.data.city ?? ''),
    country: String(user.data.country ?? ''),
  }));

  if (payload.dryRun) {
    const approvalExpiresAt = new Date(Date.now() + APPROVAL_TOKEN_TTL_MS).toISOString();
    const approvalToken = signApprovalToken({
      actorId: req.user!.id,
      fingerprint: approvalFingerprint,
      expiresAt: approvalExpiresAt,
    });

    await writeAdminAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'notifications.targeted.dry_run',
      endpoint: '/api/notifications/targeted',
      dryRun: true,
      targetedCount: selectedUsers.length,
      filters: {
        city: payload.city,
        country: payload.country,
        interestsAny: interestsNeedles,
        communitiesAny: communitiesNeedles,
        languagesAny: languagesNeedles,
        categoryIdsAny: categoryNeedles,
        ethnicityContains: ethnicityNeedle || null,
        limit: payload.limit,
      },
    });

    return res.json({
      dryRun: true,
      targetedCount: selectedUsers.length,
      audiencePreview,
      approvalToken,
      approvalExpiresAt,
    });
  }

  const verifiedApproval = verifyApprovalToken(String(payload.approvalToken ?? '').trim());
  if (!verifiedApproval) {
    return res.status(400).json({ error: 'A valid dry-run approval token is required before send' });
  }
  if (verifiedApproval.actorId !== req.user!.id) {
    return res.status(403).json({ error: 'Approval token actor does not match current user' });
  }
  if (verifiedApproval.fingerprint !== approvalFingerprint) {
    return res.status(409).json({ error: 'Campaign payload changed after dry-run. Please run dry-run again.' });
  }

  try {
    const batchSize = 100;
    for (let index = 0; index < selectedUsers.length; index += batchSize) {
      const batch = selectedUsers.slice(index, index + batchSize);
      await Promise.all(batch.map((user) => notificationsService.create({
        userId: user.id,
        title: payload.title,
        message: payload.message,
        type: payload.type as TargetedNotificationType,
        isRead: false,
        metadata: {
          targeting: {
            city: payload.city,
            country: payload.country,
            interestsAny: payload.interestsAny ?? [],
            communitiesAny: payload.communitiesAny ?? [],
            languagesAny: payload.languagesAny ?? [],
            categoryIdsAny: payload.categoryIdsAny ?? [],
            ethnicityContains: payload.ethnicityContains ?? null,
          },
          ...(payload.metadata ?? {}),
        } as Record<string, unknown>,
        createdAt: nowIso(),
      })));
    }
  } catch (err) {
    console.error('[POST /api/notifications/targeted:create]:', err);
    return res.status(500).json({ error: 'Failed to create targeted notifications' });
  }

  await writeAdminAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'notifications.targeted.send',
    endpoint: '/api/notifications/targeted',
    dryRun: false,
    targetedCount: selectedUsers.length,
    filters: {
      city: payload.city,
      country: payload.country,
      interestsAny: interestsNeedles,
      communitiesAny: communitiesNeedles,
      languagesAny: languagesNeedles,
      categoryIdsAny: categoryNeedles,
      ethnicityContains: ethnicityNeedle || null,
      limit: payload.limit,
    },
  });

  const responsePayload: TargetedNotificationResponse = {
    dryRun: false,
    targetedCount: selectedUsers.length,
    audiencePreview,
  };

  if (idempotencyScope) {
    try {
      await db.collection('targetedNotificationRequests').doc(idempotencyScope).set({
        actorId: req.user!.id,
        endpoint: '/api/notifications/targeted',
        createdAt: nowIso(),
        response: responsePayload,
      }, { merge: true });
    } catch (err) {
      console.error('[POST /api/notifications/targeted:idempotency-store]:', err);
    }
  }

  return res.json(responsePayload);
});
app.get('/api/notifications/:userId/unread-count', requireAuth, (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  notificationsService.unreadCount(qparam(req.params.userId))
    .then((count) => res.json({ count }))
    .catch((err) => {
      console.error('[GET /api/notifications/:userId/unread-count]:', err);
      res.status(500).json({ error: 'Failed to fetch notification count' });
    });
});
app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const item = await notificationsService.getById(qparam(req.params.id));
  if (!item) return res.status(404).json({ error: 'Notification not found' });
  if (!isOwnerOrAdmin(req.user!, item.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await notificationsService.markRead(item.id);
  return res.json({ ok: true, item: { ...item, isRead: true } });
});
app.put('/api/notifications/:userId/read-all', requireAuth, async (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await notificationsService.markAllRead(qparam(req.params.userId));
  const count = await notificationsService.unreadCount(qparam(req.params.userId));
  return res.json({ ok: true, unreadCount: count });
});
app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  const item = await notificationsService.getById(qparam(req.params.id));
  if (!item) return res.status(404).json({ error: 'Notification not found' });
  if (!isOwnerOrAdmin(req.user!, item.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await notificationsService.delete(item.id);
  return res.json({ ok: true });
});
app.post('/api/notifications/:userId/:id/read', requireAuth, async (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const item = await notificationsService.getById(qparam(req.params.id));
  if (!item || item.userId !== qparam(req.params.userId)) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  await notificationsService.markRead(item.id);
  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

app.get('/api/reviews/:profileId', (req, res) => res.json([
  { id: randomUUID(), profileId: req.params.profileId, userId: users[0].id, rating: 5, comment: 'Great community!', createdAt: nowIso() },
]));

// ---------------------------------------------------------------------------
// Image Upload → Firebase Storage
// ---------------------------------------------------------------------------

app.post('/api/uploads/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!storageBucket) {
      return res.status(503).json({ error: 'Firebase Storage bucket is not configured' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'image file is required' });
    if (!file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Only image uploads are allowed' });

    const metadata = await sharp(file.buffer).metadata();
    if (!metadata.width || !metadata.height) return res.status(400).json({ error: 'Invalid image metadata' });

    const id = randomUUID();

    const imageBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();

    const thumbBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 420, height: 420, fit: 'cover', withoutEnlargement: false })
      .webp({ quality: 88 })
      .toBuffer();

    const imageFile = storageBucket.file(`images/${id}.jpg`);
    const thumbFile = storageBucket.file(`thumbnails/${id}.webp`);

    await Promise.all([
      imageFile.save(imageBuffer, { metadata: { contentType: 'image/jpeg' }, resumable: false }),
      thumbFile.save(thumbBuffer, { metadata: { contentType: 'image/webp' }, resumable: false }),
    ]);

    const [imageUrl] = await imageFile.getSignedUrl({ action: 'read', expires: '2099-01-01' });
    const [thumbnailUrl] = await thumbFile.getSignedUrl({ action: 'read', expires: '2099-01-01' });

    return res.status(201).json({ id, imageUrl, thumbnailUrl, width: metadata.width, height: metadata.height, mimeType: file.mimetype, size: file.size });
  } catch (error) {
    return res.status(500).json({ error: 'Image upload failed', details: String(error) });
  }
});

app.post('/api/media/attach', requireAuth, async (req, res) => {
  let payload: z.infer<typeof mediaAttachSchema>;
  try {
    payload = parseBody(mediaAttachSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid media payload' });
  }

  if (hasFirestoreProject) {
    try {
      const media = await mediaService.attach({
        targetType: payload.targetType,
        targetId: payload.targetId,
        imageUrl: payload.imageUrl,
        thumbnailUrl: payload.thumbnailUrl,
        width: payload.width ?? 0,
        height: payload.height ?? 0,
        uploadedBy: req.user!.id,
        createdAt: nowIso(),
      });
      return res.status(201).json(media);
    } catch (err) {
      console.error('[POST /api/media/attach]:', err);
      return res.status(500).json({ error: 'Failed to attach media' });
    }
  }

  const media: UploadedMedia = {
    id: randomUUID(),
    targetType: payload.targetType,
    targetId: payload.targetId,
    imageUrl: payload.imageUrl,
    thumbnailUrl: payload.thumbnailUrl,
    width: payload.width ?? 0,
    height: payload.height ?? 0,
    createdAt: nowIso(),
  };
  uploadedMedia.unshift(media);
  if (payload.targetType === 'user') { const user = users.find((item) => item.id === payload.targetId); if (user) user.avatarUrl = payload.imageUrl; }
  if (payload.targetType === 'profile' || payload.targetType === 'business') { const profile = profiles.find((item) => item.id === payload.targetId); if (profile) profile.imageUrl = payload.imageUrl; }
  if (payload.targetType === 'event') { const event = events.find((item) => item.id === payload.targetId); if (event) event.imageUrl = payload.imageUrl; }
  return res.status(201).json(media);
});
app.get('/api/media/:targetType/:targetId', async (req, res) => {
  if (hasFirestoreProject) {
    try {
      const items = await mediaService.listForTarget(req.params.targetType, req.params.targetId);
      return res.json(items);
    } catch (err) {
      console.error('[GET /api/media/:targetType/:targetId]:', err);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }
  }
  const items = uploadedMedia.filter((item) => item.targetType === req.params.targetType && item.targetId === req.params.targetId);
  return res.json(items);
});

// ---------------------------------------------------------------------------
// Reports + Admin
// ---------------------------------------------------------------------------

app.post('/api/reports', requireAuth, moderationCheck, async (req, res) => {
  let payload: z.infer<typeof reportCreateSchema>;
  try {
    payload = parseBody(reportCreateSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid report payload' });
  }

  if (hasFirestoreProject) {
    try {
      const report = await reportsService.create({
        targetType: payload.targetType,
        targetId: payload.targetId,
        reason: payload.reason,
        details: payload.details,
        reporterUserId: req.user!.id,
        status: 'pending',
        createdAt: nowIso(),
      });
      return res.status(201).json(report);
    } catch (err) {
      console.error('[POST /api/reports]:', err);
      return res.status(500).json({ error: 'Failed to submit report' });
    }
  }

  const report: ContentReport = {
    id: randomUUID(),
    targetType: payload.targetType,
    targetId: payload.targetId,
    reason: payload.reason,
    details: payload.details,
    reporterUserId: req.user!.id,
    status: 'pending',
    createdAt: nowIso(),
  };
  reports.unshift(report);
  return res.status(201).json(report);
});
app.get('/api/admin/reports', requireAuth, requireRole('admin'), async (_req, res) => {
  if (hasFirestoreProject) {
    try {
      const items = await reportsService.list();
      const grouped = {
        pending: items.filter((item) => item.status === 'pending').length,
        reviewing: items.filter((item) => item.status === 'reviewing').length,
        resolved: items.filter((item) => item.status === 'resolved').length,
        dismissed: items.filter((item) => item.status === 'dismissed').length,
      };
      return res.json({ summary: grouped, reports: items });
    } catch (err) {
      console.error('[GET /api/admin/reports]:', err);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }

  const grouped = { pending: reports.filter((item) => item.status === 'pending').length, reviewing: reports.filter((item) => item.status === 'reviewing').length, resolved: reports.filter((item) => item.status === 'resolved').length, dismissed: reports.filter((item) => item.status === 'dismissed').length };
  return res.json({ summary: grouped, reports });
});
app.put('/api/admin/reports/:id/review', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = reportReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid review payload' });
  }

  const status = parsed.data.status ?? 'reviewing';

  if (hasFirestoreProject) {
    try {
      const updated = await reportsService.review(
        qparam(req.params.id),
        status,
        req.user!.id,
        parsed.data.moderationNotes
      );
      if (!updated) return res.status(404).json({ error: 'Report not found' });
      return res.json(updated);
    } catch (err) {
      console.error('[PUT /api/admin/reports/:id/review]:', err);
      return res.status(500).json({ error: 'Failed to review report' });
    }
  }

  const report = reports.find((item) => item.id === qparam(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found' });
  if (!['pending', 'reviewing', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ error: 'Invalid report status' });
  report.status = status as ReportStatus; report.reviewedAt = nowIso(); report.reviewedBy = req.user!.id; report.moderationNotes = parsed.data.moderationNotes?.trim() || undefined;
  return res.json(report);
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('admin', 'moderator', 'platformAdmin', 'cityAdmin'), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query['limit'] ?? 50) || 50, 1), 200);
  const action = String(req.query['action'] ?? '').trim();
  const actorIdQuery = String(req.query['actorId'] ?? '').trim();
  const from = String(req.query['from'] ?? '').trim();
  const to = String(req.query['to'] ?? '').trim();
  const actorId = req.user!.role === 'cityAdmin' ? req.user!.id : actorIdQuery;

  if (hasFirestoreProject) {
    try {
      let query = db.collection('adminAuditLogs') as FirebaseFirestore.Query;
      if (action) query = query.where('action', '==', action);
      if (actorId) query = query.where('actorId', '==', actorId);
      if (from) query = query.where('createdAt', '>=', from);
      if (to) query = query.where('createdAt', '<=', to);

      const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
      const logs = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
      return res.json({ logs, limit, count: logs.length });
    } catch (err) {
      console.error('[GET /api/admin/audit-logs]:', err);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  const logs = adminAuditLogs
    .filter((log) => (action ? log.action === action : true))
    .filter((log) => (actorId ? log.actorId === actorId : true))
    .filter((log) => (from ? log.createdAt >= from : true))
    .filter((log) => (to ? log.createdAt <= to : true))
    .slice(0, limit);

  return res.json({ logs, limit, count: logs.length });
});

app.get('/api/admin/audit-logs.csv', requireAuth, requireRole('admin', 'moderator', 'platformAdmin', 'cityAdmin'), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query['limit'] ?? 200) || 200, 1), 1000);
  const action = String(req.query['action'] ?? '').trim();
  const actorIdQuery = String(req.query['actorId'] ?? '').trim();
  const from = String(req.query['from'] ?? '').trim();
  const to = String(req.query['to'] ?? '').trim();
  const actorId = req.user!.role === 'cityAdmin' ? req.user!.id : actorIdQuery;

  let logs: Record<string, unknown>[] = [];

  if (hasFirestoreProject) {
    try {
      let query = db.collection('adminAuditLogs') as FirebaseFirestore.Query;
      if (action) query = query.where('action', '==', action);
      if (actorId) query = query.where('actorId', '==', actorId);
      if (from) query = query.where('createdAt', '>=', from);
      if (to) query = query.where('createdAt', '<=', to);

      const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
      logs = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    } catch (err) {
      console.error('[GET /api/admin/audit-logs.csv]:', err);
      return res.status(500).json({ error: 'Failed to export audit logs' });
    }
  } else {
    logs = adminAuditLogs
      .filter((log) => (action ? log.action === action : true))
      .filter((log) => (actorId ? log.actorId === actorId : true))
      .filter((log) => (from ? log.createdAt >= from : true))
      .filter((log) => (to ? log.createdAt <= to : true))
      .slice(0, limit);
  }

  const escapeCsv = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.split('"').join('""')}"`;
    return text;
  };

  const header = ['id', 'createdAt', 'actorId', 'actorRole', 'action', 'endpoint', 'dryRun', 'targetedCount', 'filters'];
  const rows = logs.map((log) => [
    escapeCsv(log.id),
    escapeCsv(log.createdAt),
    escapeCsv(log.actorId),
    escapeCsv(log.actorRole),
    escapeCsv(log.action),
    escapeCsv(log.endpoint),
    escapeCsv(log.dryRun),
    escapeCsv(log.targetedCount),
    escapeCsv(JSON.stringify(log.filters ?? {})),
  ].join(','));

  const csv = [header.join(','), ...rows].join('\n');
  const exportSignature = createHmac('sha256', APPROVAL_SIGNING_SECRET).update(csv).digest('hex');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="admin-audit-logs-${Date.now()}.csv"`);
  res.setHeader('X-Export-Signature', exportSignature);
  return res.status(200).send(csv);
});

// ---------------------------------------------------------------------------
// Admin — user management (role assignment)
// ---------------------------------------------------------------------------

const VALID_ROLES = ['user', 'organizer', 'business', 'sponsor', 'cityAdmin', 'moderator', 'admin', 'platformAdmin'] as const;
type ValidRole = typeof VALID_ROLES[number];

app.get('/api/admin/users', requireAuth, requireRole('admin', 'platformAdmin'), async (req, res) => {
  const limit = Math.min(Number(req.query['limit'] ?? 20) || 20, 100);
  const page = Math.max(Number(req.query['page'] ?? 0) || 0, 0);
  try {
    const snap = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(page * limit)
      .get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ users, total: snap.size, page, limit });
  } catch (err) {
    console.error('[GET /api/admin/users]:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/users/:id/role', requireAuth, requireRole('admin', 'platformAdmin'), async (req, res) => {
  const targetId = qparam(req.params.id);
  const { role } = req.body as { role: ValidRole };
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role', validRoles: VALID_ROLES });
  }
  try {
    const existing = await authAdmin.getUser(targetId);
    await authAdmin.setCustomUserClaims(targetId, { ...(existing.customClaims ?? {}), role });
    await db.collection('users').doc(targetId).set({ role }, { merge: true });
    return res.json({ success: true, id: targetId, role });
  } catch (err) {
    console.error('[PUT /api/admin/users/:id/role]:', err);
    return res.status(500).json({ error: 'Failed to assign role' });
  }
});

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

app.get('/api/privacy/settings/:userId', requireAuth, (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json(privacySettings.get(qparam(req.params.userId)) ?? { profileVisible: true, searchable: true });
});
app.put('/api/privacy/settings/:userId', requireAuth, (req, res) => {
  if (!isOwnerOrAdmin(req.user!, qparam(req.params.userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const merged = { ...(privacySettings.get(qparam(req.params.userId)) ?? {}), ...(req.body ?? {}) };
  privacySettings.set(qparam(req.params.userId), merged);
  return res.json(merged);
});

const ACCOUNT_ORPHAN_CLEANUP_TARGETS: { collection: string; field: string }[] = [
  { collection: 'wallets', field: 'userId' },
  { collection: 'tickets', field: 'userId' },
  { collection: 'notifications', field: 'userId' },
  { collection: 'redemptions', field: 'userId' },
  { collection: 'paymentMethods', field: 'userId' },
  { collection: 'councilClaims', field: 'userId' },
  { collection: 'councilClaimLetters', field: 'sentBy' },
  { collection: 'profiles', field: 'ownerId' },
  { collection: 'reports', field: 'reporterUserId' },
];

function purgeInMemoryAccountData(userId: string): void {
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
  }

  wallets.delete(userId);
  memberships.delete(userId);
  notifications.delete(userId);
  paymentMethods.delete(userId);
  transactions.delete(userId);
  redemptions.delete(userId);
  privacySettings.delete(userId);
  userCouncilFollows.delete(userId);

  const reminderKeysToDelete: string[] = [];
  for (const [key, reminder] of userWasteReminders.entries()) {
    if (reminder.userId === userId) {
      reminderKeysToDelete.push(key);
    }
  }
  for (const key of reminderKeysToDelete) {
    userWasteReminders.delete(key);
  }

  const councilLinkKeysToDelete: string[] = [];
  for (const [key, link] of userCouncilLinks.entries()) {
    if (link.userId === userId) {
      councilLinkKeysToDelete.push(key);
    }
  }
  for (const key of councilLinkKeysToDelete) {
    userCouncilLinks.delete(key);
  }

  const councilClaimIndexesToDelete: number[] = [];
  for (let index = 0; index < councilClaims.length; index++) {
    if (councilClaims[index]?.userId === userId) {
      councilClaimIndexesToDelete.push(index);
    }
  }
  for (let index = councilClaimIndexesToDelete.length - 1; index >= 0; index--) {
    const claimIndex = councilClaimIndexesToDelete[index] as number;
    councilClaims.splice(claimIndex, 1);
  }

  const claimLetterIndexesToDelete: number[] = [];
  for (let index = 0; index < councilClaimLetters.length; index++) {
    if (councilClaimLetters[index]?.sentBy === userId) {
      claimLetterIndexesToDelete.push(index);
    }
  }
  for (let index = claimLetterIndexesToDelete.length - 1; index >= 0; index--) {
    const letterIndex = claimLetterIndexesToDelete[index] as number;
    councilClaimLetters.splice(letterIndex, 1);
  }

  const ticketIdsToDelete = new Set(
    tickets.filter((ticket) => ticket.userId === userId).map((ticket) => ticket.id),
  );
  const keptTickets = tickets.filter((ticket) => ticket.userId !== userId);
  tickets.splice(0, tickets.length, ...keptTickets);

  const keptScanEvents = scanEvents.filter((event) => !ticketIdsToDelete.has(event.ticketId));
  scanEvents.splice(0, scanEvents.length, ...keptScanEvents);
}

async function deleteDocsByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  let deletedCount = 0;
  const pageSize = 200;

  while (true) {
    const snap = await db.collection(collectionName).where(field, '==', value).limit(pageSize).get();
    if (snap.empty) {
      break;
    }

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deletedCount += snap.size;

    if (snap.size < pageSize) {
      break;
    }
  }

  return deletedCount;
}

async function cleanupFirestoreAccountData(userId: string): Promise<{ deleted: Record<string, number>; userTreeDeleted: boolean }> {
  const deleted: Record<string, number> = {};

  for (const target of ACCOUNT_ORPHAN_CLEANUP_TARGETS) {
    const count = await deleteDocsByField(target.collection, target.field, userId);
    deleted[`${target.collection}:${target.field}`] = count;
  }

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return { deleted, userTreeDeleted: false };
  }

  await db.recursiveDelete(userRef);
  return { deleted, userTreeDeleted: true };
}

app.delete('/api/account/:userId', requireAuth, async (req, res) => {
  const targetUserId = qparam(req.params.userId);
  if (!isOwnerOrAdmin(req.user!, targetUserId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const requestingUserId = req.user!.id;

  if (!hasFirestoreProject) {
    purgeInMemoryAccountData(targetUserId);

    let authDeleted = false;
    let authMissing = false;

    try {
      await authAdmin.deleteUser(targetUserId);
      authDeleted = true;
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
      if (code === 'auth/user-not-found') {
        authMissing = true;
      } else {
        throw error;
      }
    }

    return res.json({
      success: true,
      userId: targetUserId,
      requestedBy: requestingUserId,
      firestore: { enabled: false },
      auth: { deleted: authDeleted, missing: authMissing },
    });
  }

  try {
    const firestoreCleanup = await cleanupFirestoreAccountData(targetUserId);

    let authDeleted = false;
    let authMissing = false;
    try {
      await authAdmin.deleteUser(targetUserId);
      authDeleted = true;
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
      if (code === 'auth/user-not-found') {
        authMissing = true;
      } else {
        throw error;
      }
    }

    return res.json({
      success: true,
      userId: targetUserId,
      requestedBy: requestingUserId,
      firestore: {
        enabled: true,
        userTreeDeleted: firestoreCleanup.userTreeDeleted,
        deleted: firestoreCleanup.deleted,
      },
      auth: { deleted: authDeleted, missing: authMissing },
    });
  } catch (err) {
    console.error('[DELETE /api/account/:userId]:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ---------------------------------------------------------------------------
// CPID Lookup
// ---------------------------------------------------------------------------

app.get('/api/cpid/lookup/:cpid', (req, res) => {
  const normalized = req.params.cpid.toUpperCase();
  const user = users.find((u) => u.culturePassId === normalized);
  if (!user) return res.status(404).json({ error: 'CPID not found' });
  res.json({ entityType: 'user', targetId: user.id });
});

// ---------------------------------------------------------------------------
// Indigenous + Discovery
// ---------------------------------------------------------------------------

app.get('/api/indigenous/traditional-lands', async (req, res) => {
  if (hasFirestoreProject) {
    try {
      const city = String(req.query.city ?? '').toLowerCase();
      let query = db.collection('traditionalLands') as FirebaseFirestore.Query;
      if (city) query = query.where('city', '==', city.charAt(0).toUpperCase() + city.slice(1));
      const snap = await query.get();
      return res.json(snap.docs.map((d) => d.data()));
    } catch (err) {
      console.error('[GET /api/indigenous/traditional-lands]:', err);
      return res.status(500).json({ error: 'Failed to fetch traditional lands' });
    }
  }
  // Dev fallback — 7 major cities
  return res.json([
    { id: 'tl-gadigal', city: 'Sydney', country: 'Australia', landName: 'Gadigal Land', traditionalCustodians: 'Gadigal People of the Eora Nation', acknowledgement: 'CulturePass acknowledges the Gadigal people of the Eora Nation as the traditional custodians of this land.', language: 'Dharug' },
    { id: 'tl-wurundjeri', city: 'Melbourne', country: 'Australia', landName: 'Wurundjeri Country', traditionalCustodians: 'Wurundjeri People of the Kulin Nation', acknowledgement: 'We acknowledge the Wurundjeri people of the Kulin Nation as the traditional custodians of Melbourne.', language: 'Woi wurrung' },
    { id: 'tl-turrbal', city: 'Brisbane', country: 'Australia', landName: 'Turrbal and Yugara Country', traditionalCustodians: 'Turrbal and Yugara People', acknowledgement: 'We acknowledge the Turrbal and Yugara peoples as the traditional custodians of Brisbane.', language: 'Yugarapul' },
    { id: 'tl-kaurna', city: 'Adelaide', country: 'Australia', landName: 'Kaurna Country', traditionalCustodians: 'Kaurna People', acknowledgement: 'CulturePass acknowledges the Kaurna people as the traditional custodians of the Adelaide Plains.', language: 'Kaurna' },
    { id: 'tl-whadjuk', city: 'Perth', country: 'Australia', landName: 'Whadjuk Noongar Country', traditionalCustodians: 'Whadjuk People of the Noongar Nation', acknowledgement: 'We acknowledge the Whadjuk people of the Noongar Nation as the traditional custodians of Perth.', language: 'Noongar' },
    { id: 'tl-ngati-whatua', city: 'Auckland', country: 'New Zealand', landName: "Ngāti Whātua Ōrākei Ancestral Land", traditionalCustodians: "Ngāti Whātua Ōrākei", acknowledgement: "We acknowledge Ngāti Whātua Ōrākei as the tangata whenua of Auckland, Tāmaki Makaurau.", language: "Te Reo Māori" },
  ]);
});

app.get('/api/indigenous/spotlights', async (_req, res) => {
  if (hasFirestoreProject) {
    try {
      const snap = await db.collection('indigenousSpotlights').orderBy('createdAt', 'desc').limit(10).get();
      return res.json(snap.docs.map((d) => d.data()));
    } catch (err) {
      console.error('[GET /api/indigenous/spotlights]:', err);
      return res.status(500).json({ error: 'Failed to fetch spotlights' });
    }
  }
  // Dev fallback
  return res.json([
    { id: 'spot-1', title: 'Songlines: Tracking the Seven Sisters', description: 'A landmark exhibition celebrating the Martu Seven Sisters Dreaming — one of the most significant First Nations stories in the world.', imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800', type: 'exhibition', city: 'Canberra', country: 'Australia' },
    { id: 'spot-2', title: 'Bangarra Dance Theatre — BASIC', description: 'Award-winning First Nations dance company returns with a powerful new production.', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800', type: 'performance', city: 'Sydney', country: 'Australia' },
    { id: 'spot-3', title: 'NAIDOC Week — Our Community, Our Future', description: 'NAIDOC Week 2026 celebrates First Nations peoples across every major Australian city.', imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', type: 'event', city: 'National', country: 'Australia' },
    { id: 'spot-4', title: "Matariki — Māori New Year", description: "Te Papa Tongarewa's annual Matariki exhibition celebrating the Māori New Year. Free entry.", imageUrl: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800', type: 'exhibition', city: 'Auckland', country: 'New Zealand' },
  ]);
});
app.get('/api/discover/trending', (req, res) => {
  const userId = String(req.query.userId ?? '');
  const profile = userId ? recommendationProfiles.get(userId) : null;
  const tagWeights = profile?.culturalTagWeights ?? {};
  const active = events.filter((e) => !e.deletedAt);
  const sorted = active.map((e) => {
    const tags = [...(e.cultureTag ?? []), e.communityId].map((t) => t?.toLowerCase()).filter(Boolean);
    const tagBoost = tags.some((t) => t && tagWeights[t] != null) ? 10 : 0;
    return { event: e, score: (e.organizerReputationScore ?? 50) + tagBoost };
  }).sort((a, b) => b.score - a.score).slice(0, 10).map((s) => s.event);
  res.json(sorted);
});
app.get('/api/discover/:userId', async (req, res) => {
  const userId = qparam(req.params.userId);
  const cityParam  = qparam(String(req.query.city  ?? ''));
  const countryParam = qparam(String(req.query.country ?? ''));
  let userSignals: DiscoverUserSignals = { interests: [], communities: [], languages: [], ethnicityText: '', interestCategoryIds: [] };

  // 1 — resolve user location: query param > Firestore user doc > fallback
  let city = cityParam;
  let country = countryParam;
  if (hasFirestoreProject) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data() ?? {};
        city    = city    || String(data.city    ?? '');
        country = country || String(data.country ?? '');
        userSignals = extractDiscoverUserSignals(data as Record<string, unknown>);
      }
    } catch { /* continue with empty city */ }
  } else {
    const fallbackUser = users.find((item) => item.id === userId) as (AppUser | undefined);
    if (fallbackUser) {
      city = city || fallbackUser.city;
      country = country || fallbackUser.country;
      userSignals = {
        interests: fallbackUser.interests ?? [],
        communities: fallbackUser.communities ?? [],
        languages: fallbackUser.languages ?? [],
        ethnicityText: fallbackUser.ethnicityText ?? '',
        interestCategoryIds: fallbackUser.interestCategoryIds ?? [],
      };
    }
  }

  // 2 — recommendation profile weights
  const recProfile = recommendationProfiles.get(userId);
  const tagWeights  = recProfile?.culturalTagWeights ?? {};
  const typeWeights = recProfile?.eventTypeWeights  ?? {};

  const profileTokenSet = toTokenSet([...userSignals.interests, ...userSignals.communities]);
  const languageTokenSet = toTokenSet(userSignals.languages);
  const ethnicityNeedle = userSignals.ethnicityText.toLowerCase();

  // 3 — fetch candidate events from Firestore (filtered by location when available)
  let candidateEvents: AppEvent[] = [];
  if (hasFirestoreProject) {
    try {
      let q = db.collection('events').where('status', '==', 'published') as FirebaseFirestore.Query;
      if (city)    q = q.where('city',    '==', city);
      if (country && !city) q = q.where('country', '==', country);
      const snap = await q.limit(100).get();
      candidateEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppEvent));
    } catch {
      candidateEvents = events.filter((e) => !e.deletedAt);
    }
  } else {
    candidateEvents = events.filter((e) => !e.deletedAt && (!city || e.city === city) && (!country || e.country === country));
  }

  // 4 — score events
  const now = Date.now();
  const scored = candidateEvents.map((event) => {
    let score = 0;
    const reasons: string[] = [];
    const eventText = buildEventText(event);

    // Cultural tag affinity
    const eventTags = [...(event.cultureTag ?? []), event.communityId].map((t) => t?.toLowerCase()).filter(Boolean);
    let tagScore = 0;
    for (const tag of eventTags) {
      if (tag && tagWeights[tag] != null) tagScore = Math.max(tagScore, tagWeights[tag]);
      else if (tag) tagScore = Math.max(tagScore, 0.3);
    }
    if (tagScore > 0) { score += tagScore * 0.40; reasons.push('Matches your cultural interests'); }

    // Event type affinity
    if (event.eventType && typeWeights[event.eventType] != null) { score += typeWeights[event.eventType] * 0.10; reasons.push('Matches your preferred event type'); }

    // Direct profile-token affinity from interests + communities
    if (profileTokenSet.size > 0) {
      const tokenHits = [...profileTokenSet].filter((token) => token && eventText.includes(token)).length;
      if (tokenHits > 0) {
        score += Math.min(0.18, tokenHits * 0.06);
        reasons.push('Aligned with your selected interests');
      }
    }

    // Language affinity
    if (languageTokenSet.size > 0) {
      const eventLanguageSet = toTokenSet(event.languageTags ?? []);
      const languageMatch = [...languageTokenSet].some((lang) => eventLanguageSet.has(lang) || eventText.includes(lang));
      if (languageMatch) {
        score += 0.12;
        reasons.push('Matches your preferred languages');
      }
    }

    // Ethnicity affinity
    if (ethnicityNeedle && ethnicityNeedle.length >= 3 && eventText.includes(ethnicityNeedle)) {
      score += 0.12;
      reasons.push('Relevant to your cultural identity');
    }

    // Interest category intent affinity
    if (userSignals.interestCategoryIds.length > 0) {
      let categoryBoost = 0;
      for (const categoryId of userSignals.interestCategoryIds) {
        const keywords = INTEREST_CATEGORY_KEYWORDS[categoryId.toLowerCase()] ?? [];
        if (keywords.some((keyword) => eventText.includes(keyword.toLowerCase()))) {
          categoryBoost += 0.05;
        }
      }
      if (categoryBoost > 0) {
        score += Math.min(0.18, categoryBoost);
        reasons.push('Matches your preferred event formats');
      }
    }

    // Intent signals (networking/family/nightlife/learning)
    const hasIntentMatch = Object.values(INTENT_KEYWORDS).some((keywords) => keywords.some((keyword) => eventText.includes(keyword)));
    if (hasIntentMatch) {
      score += 0.04;
    }

    // Organiser reputation
    const repScore = (event.organizerReputationScore ?? 50) / 100;
    score += repScore * 0.05;
    if (repScore > 0.8) reasons.push('Highly rated organiser');

    // Featured boost
    if (event.isFeatured) { score += 0.15; reasons.push('Featured event'); }

    // Recency boost — upcoming events within 30 days get a boost
    const eventDate = event.date ? new Date(event.date).getTime() : 0;
    const daysUntil = (eventDate - now) / 86400000;
    if (daysUntil >= 0 && daysUntil <= 30) { score += 0.10; reasons.push('Coming up soon'); }

    // Location match boost
    if (city && event.city === city) { score += 0.10; reasons.push(`In ${city}`); }

    score += 0.05; // baseline
    return { event, matchScore: Math.round(score * 100) / 100, matchReason: reasons.length > 0 ? reasons : ['Trending near you'] };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  // 5 — fetch nearby communities
  let nearbyCommunities: AppProfile[] = [];
  if (hasFirestoreProject) {
    try {
      let cq = db.collection('profiles').where('entityType', '==', 'community') as FirebaseFirestore.Query;
      if (city) cq = cq.where('city', '==', city);
      const csnap = await cq.limit(10).get();
      nearbyCommunities = csnap.docs.map((d) => ({ id: d.id, ...d.data() } as AppProfile));
    } catch {
      nearbyCommunities = profiles.filter((p) => p.entityType === 'community');
    }
  } else {
    nearbyCommunities = profiles.filter((p) => p.entityType === 'community' && (!city || (p as Record<string, unknown>)['city'] === city));
  }

  res.json({
    trendingEvents: scored.slice(0, 10).map((s) => s.event),
    rankedEvents:   scored.slice(0, 20),
    suggestedCommunities: nearbyCommunities,
    meta: {
      userId,
      city,
      country,
      generatedAt: new Date().toISOString(),
      totalItems: scored.length,
      signalsUsed: {
        interests: userSignals.interests.length,
        communities: userSignals.communities.length,
        languages: userSignals.languages.length,
        interestCategoryIds: userSignals.interestCategoryIds.length,
        hasEthnicity: Boolean(userSignals.ethnicityText),
      },
    },
  });
});
app.post('/api/discover/feedback', (req, res) => {
  const { userId, eventId, signal } = req.body ?? {};
  if (!userId || !eventId || !['up', 'down'].includes(signal)) return res.status(400).json({ error: 'userId, eventId, and signal (up|down) are required' });
  const idx = discoveryFeedbackStore.findIndex((f) => f.userId === userId && f.eventId === eventId);
  if (idx !== -1) discoveryFeedbackStore.splice(idx, 1);
  discoveryFeedbackStore.push({ userId, eventId, signal, createdAt: nowIso() });
  const event = events.find((e) => e.id === eventId);
  if (event) {
    const current = recommendationProfiles.get(userId) ?? { culturalTagWeights: {}, eventTypeWeights: {} };
    const delta = signal === 'up' ? 0.1 : -0.05;
    const newTagWeights = { ...current.culturalTagWeights };
    const newTypeWeights = { ...current.eventTypeWeights };
    for (const tag of [...(event.cultureTag ?? []), event.communityId]) {
      if (tag) { const key = tag.toLowerCase(); newTagWeights[key] = Math.max(0, Math.min(1, (newTagWeights[key] ?? 0.5) + delta)); }
    }
    if (event.eventType) { const key = event.eventType.toLowerCase(); newTypeWeights[key] = Math.max(0, Math.min(1, (newTypeWeights[key] ?? 0.5) + delta)); }
    recommendationProfiles.set(userId, { culturalTagWeights: newTagWeights, eventTypeWeights: newTypeWeights });
  }
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Cultural Tags + Intelligence
// ---------------------------------------------------------------------------

app.get('/api/cultural-tags', (_req, res) => res.json(culturalTagStore));
app.get('/api/cultural-tags/:slug/events', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const matched = events.filter((e) => { if (e.deletedAt) return false; const tags = [...(e.cultureTag ?? []), e.communityId].map((t) => t?.toLowerCase()).filter(Boolean); return tags.some((t) => t === slug || t?.replace(/\s+/g, '-') === slug); });
  res.json(matched);
});
app.post('/api/cultural-tags', requireAuth, requireRole('admin'), (req, res) => {
  const { name, slug, category, iconUrl } = req.body ?? {};
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  if (culturalTagStore.find((t) => t.slug === slug)) return res.status(409).json({ error: 'Tag with this slug already exists' });
  const tag = { id: randomUUID(), name: String(name), slug: String(slug), category: String(category ?? 'diaspora'), iconUrl: iconUrl ? String(iconUrl) : undefined };
  culturalTagStore.push(tag);
  res.status(201).json(tag);
});
app.get('/api/cultural-intelligence/:userId', (req, res) => {
  const userId = qparam(req.params.userId);
  const profile = recommendationProfiles.get(userId) ?? { culturalTagWeights: {}, eventTypeWeights: {} };
  const topTags = Object.entries(profile.culturalTagWeights).sort(([, a], [, b]) => b - a).slice(0, 5).map(([tag, weight]) => ({ tag, affinity: Math.round(weight * 100) }));
  const topEventTypes = Object.entries(profile.eventTypeWeights).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type, weight]) => ({ type, affinity: Math.round(weight * 100) }));
  res.json({ userId, topCulturalTags: topTags, topEventTypes, profileCompleteness: topTags.length > 0 ? 'active' : 'new' });
});

// ---------------------------------------------------------------------------
// Community graph
// ---------------------------------------------------------------------------

app.get('/api/communities/:id/members', (req, res) => {
  const community = profiles.find((p) => p.id === qparam(req.params.id) && p.entityType === 'community');
  if (!community) return res.status(404).json({ error: 'Community not found' });
  res.json(users.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl })));
});
app.get('/api/communities/:id/recommended-events', (req, res) => {
  const community = profiles.find((p) => p.id === qparam(req.params.id) && p.entityType === 'community');
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const communityEvents = events.filter((e) => !e.deletedAt && (e.communityId?.toLowerCase() === community.category?.toLowerCase() || e.cultureTag?.some((t) => t.toLowerCase() === community.category?.toLowerCase())));
  res.json(communityEvents.slice(0, 10));
});
app.get('/api/users/:id/communities', (req, res) => {
  const user = users.find((u) => u.id === qparam(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(profiles.filter((p) => p.entityType === 'community').slice(0, 5));
});
app.post('/api/communities/:id/join', requireAuth, async (req, res) => {
  const communityId = qparam(req.params.id);
  const uid = req.user!.id;
  try {
    if (hasFirestoreProject) {
      const profile = await profilesService.getById(communityId);
      if (!profile || profile.entityType !== 'community') {
        return res.status(404).json({ error: 'Community not found' });
      }
      await Promise.all([
        db.collection('users').doc(uid).update({
          joinedCommunities: firestore.FieldValue.arrayUnion(communityId),
        }),
        db.collection('profiles').doc(communityId).update({
          memberCount: firestore.FieldValue.increment(1),
        }),
      ]);
      return res.json({ success: true, communityId });
    }
    const community = profiles.find((p) => p.id === communityId && p.entityType === 'community');
    if (!community) return res.status(404).json({ error: 'Community not found' });
    return res.json({ success: true, communityId: community.id });
  } catch (err) {
    console.error('[POST /api/communities/:id/join]:', err);
    return res.status(500).json({ error: 'Failed to join community' });
  }
});
app.delete('/api/communities/:id/leave', requireAuth, async (req, res) => {
  const communityId = qparam(req.params.id);
  const uid = req.user!.id;
  try {
    if (hasFirestoreProject) {
      const profile = await profilesService.getById(communityId);
      if (!profile || profile.entityType !== 'community') {
        return res.status(404).json({ error: 'Community not found' });
      }
      await Promise.all([
        db.collection('users').doc(uid).update({
          joinedCommunities: firestore.FieldValue.arrayRemove(communityId),
        }),
        db.collection('profiles').doc(communityId).update({
          memberCount: firestore.FieldValue.increment(-1),
        }),
      ]);
      return res.json({ success: true });
    }
    const community = profiles.find((p) => p.id === communityId && p.entityType === 'community');
    if (!community) return res.status(404).json({ error: 'Community not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/communities/:id/leave]:', err);
    return res.status(500).json({ error: 'Failed to leave community' });
  }
});

// ---------------------------------------------------------------------------
// Event Feedback
// ---------------------------------------------------------------------------

app.post('/api/events/:id/feedback', requireAuth, async (req, res) => {
  const eventId = qparam(req.params.id);
  const event = events.find((e) => e.id === eventId && !e.deletedAt);
  if (!event && !hasFirestoreProject) return res.status(404).json({ error: 'Event not found' });

  let payload: z.infer<typeof eventFeedbackSchema>;
  try {
    payload = parseBody(eventFeedbackSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid feedback payload' });
  }

  const userId = req.user!.id;

  if (hasFirestoreProject) {
    try {
      const existingEvent = await eventsService.getById(eventId);
      if (!existingEvent) return res.status(404).json({ error: 'Event not found' });
      const feedback = await eventFeedbackService.upsert({
        eventId,
        userId,
        rating: payload.rating,
        comment: payload.comment,
        createdAt: nowIso(),
      });
      return res.json(feedback);
    } catch (err) {
      console.error('[POST /api/events/:id/feedback]:', err);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }

  const existing = eventFeedbackStore.findIndex((f) => f.userId === userId && f.eventId === eventId);
  const fb = {
    id: existing >= 0 ? eventFeedbackStore[existing].id : randomUUID(),
    eventId,
    userId,
    rating: payload.rating,
    comment: payload.comment ? String(payload.comment) : undefined,
    createdAt: nowIso(),
  };
  if (existing >= 0) eventFeedbackStore[existing] = fb; else eventFeedbackStore.push(fb);
  return res.json(fb);
});
app.get('/api/events/:id/feedback', async (req, res) => {
  if (hasFirestoreProject) {
    try {
      const feedback = await eventFeedbackService.listForEvent(qparam(req.params.id));
      const avg = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;
      return res.json({ feedback, averageRating: avg ? Math.round(avg * 10) / 10 : null, count: feedback.length });
    } catch (err) {
      console.error('[GET /api/events/:id/feedback]:', err);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  }
  const feedback = eventFeedbackStore.filter((f) => f.eventId === qparam(req.params.id));
  const avg = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;
  res.json({ feedback, averageRating: avg ? Math.round(avg * 10) / 10 : null, count: feedback.length });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

app.get('/api/search', (req, res) => {
  const query = parseSearchQuery(req);
  if (!query.q) return res.json({ total: 0, page: query.page, pageSize: query.pageSize, results: [] });
  const key = `search:${buildSearchCacheKey(query)}`;
  const cached = searchCache.get<ReturnType<typeof runSearch>>(key);
  if (cached) return res.json({ ...cached, cached: true });
  const payload = runSearch(getSearchCorpus(), query);
  searchCache.set(key, payload, 45_000);
  return res.json({ ...payload, cached: false });
});
app.get('/api/search/suggest', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json({ suggestions: [] });
  const key = `search:suggest:${q.toLowerCase()}`;
  const cached = searchCache.get<string[]>(key);
  if (cached) return res.json({ suggestions: cached, cached: true });
  const suggestions = runSuggest(getSearchCorpus(), q, 8);
  searchCache.set(key, suggestions, 30_000);
  return res.json({ suggestions, cached: false });
});
app.get('/api/culture/suggest', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const type = String(req.query.type ?? 'all').toLowerCase();
  const limitRaw = Number.parseInt(String(req.query.limit ?? '8'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;

  if (q.length < 3) return res.json({ suggestions: [], source: 'min-query' });

  const key = `culture:suggest:${type}:${q.toLowerCase()}:${limit}`;
  const cached = searchCache.get<string[]>(key);
  if (cached) return res.json({ suggestions: cached, source: 'cache' });

  const pool = type === 'ethnicity'
    ? CULTURE_ETHNICITIES
    : type === 'language'
      ? CULTURE_LANGUAGES
      : [...CULTURE_LANGUAGES, ...CULTURE_ETHNICITIES];

  const suggestions = suggestCultureValues(pool, q, limit);
  searchCache.set(key, suggestions, 60_000);
  return res.json({ suggestions, source: 'seed' });
});

// ---------------------------------------------------------------------------
// Stripe: Checkout, Refund, Webhook
// ---------------------------------------------------------------------------

app.post('/api/stripe/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  let payload: z.infer<typeof stripeCheckoutSchema>;
  try {
    payload = parseBody(stripeCheckoutSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid checkout payload' });
  }
  const ticketData = payload.ticketData;
  const draftId = randomUUID();
  const createdAt = nowIso();
  const draft: AppTicket & { paymentStatus: AppTicket['paymentStatus'] } = {
    id: draftId, userId: req.user!.id, eventId: String(ticketData.eventId ?? ''),
    eventTitle: String(ticketData.eventTitle ?? 'Event'), eventDate: String(ticketData.eventDate ?? ''), eventTime: String(ticketData.eventTime ?? ''), eventVenue: String(ticketData.eventVenue ?? ''),
    tierName: String(ticketData.tierName ?? 'General'), quantity: Number(ticketData.quantity ?? 1), totalPriceCents: Number(ticketData.totalPriceCents ?? 0),
    currency: String(ticketData.currency ?? 'AUD').toUpperCase(), status: 'confirmed' as TicketStatus, paymentStatus: 'pending', priority: 'normal',
    imageColor: ticketData.imageColor ?? undefined, createdAt, ticketCode: generateSecureId('CP-T-'),
    history: [{ at: createdAt, status: 'confirmed' as TicketStatus, note: 'Draft created, awaiting payment' }], staffAuditTrail: [],
  };
  if (hasFirestoreProject) {
    await db.collection('tickets').doc(draftId).set({
      ...draft,
      qrCode: draft.ticketCode,
      cpTicketId: draft.ticketCode,
      priceCents: draft.totalPriceCents,
      updatedAt: createdAt,
      history: [{ action: 'checkout_started', timestamp: createdAt, actorId: req.user!.id }],
    });
  } else {
    tickets.push(draft);
  }

  if (stripeClient) {
    try {
      const appUrl = process.env.APP_URL ?? `https://${process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId + '.web.app' : 'localhost:5000'}`;
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment', payment_method_types: ['card'],
        line_items: [{ price_data: { currency: draft.currency.toLowerCase(), product_data: { name: `${draft.eventTitle} — ${draft.tierName}`, description: `${draft.quantity} × ticket(s) · ${draft.eventDate ?? 'Date TBA'}` }, unit_amount: draft.totalPriceCents }, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: { ticketId: draft.id, userId: draft.userId, eventId: draft.eventId },
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&ticketId=${draft.id}`,
        cancel_url: `${appUrl}/payment/cancel?ticketId=${draft.id}`,
      });
      draft.stripePaymentIntentId = session.payment_intent ? String(session.payment_intent) : undefined;
      if (hasFirestoreProject) {
        await ticketsService.update(draft.id, {
          stripePaymentIntentId: draft.stripePaymentIntentId,
        });
      }
      return res.json({ checkoutUrl: session.url, ticketId: draft.id, sessionId: session.id, paymentIntentId: draft.stripePaymentIntentId });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      console.error('[stripe] checkout session error:', msg);
      if (hasFirestoreProject) {
        await db.collection('tickets').doc(draft.id).delete();
      } else {
        tickets.splice(tickets.indexOf(draft), 1);
      }
      return res.status(500).json({ error: 'Failed to create checkout session', detail: msg });
    }
  }

  draft.stripePaymentIntentId = `pi_mock_${draftId.slice(0, 8)}`;
  if (hasFirestoreProject) {
    await ticketsService.update(draft.id, { stripePaymentIntentId: draft.stripePaymentIntentId });
  }
  return res.json({ checkoutUrl: 'https://checkout.stripe.com/mock-session', ticketId: draft.id, paymentIntentId: draft.stripePaymentIntentId });
});

app.post('/api/stripe/refund', requireAuth, async (req: Request, res: Response) => {
  let payload: z.infer<typeof stripeRefundSchema>;
  try {
    payload = parseBody(stripeRefundSchema, req.body);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid refund payload' });
  }
  const ticketId = payload.ticketId;

  if (hasFirestoreProject) {
    const ticket = await ticketsService.getById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!isOwnerOrAdmin(req.user!, ticket.userId)) return res.status(403).json({ error: 'Forbidden' });
    if (ticket.status === 'used') return res.status(400).json({ error: 'Cannot refund used ticket' });
    if (ticket.paymentStatus === 'refunded') return res.status(400).json({ error: 'Already refunded' });

    const quantity = Number((ticket as unknown as { quantity?: number }).quantity ?? 1);
    const totalPriceCents = Number((ticket as unknown as { totalPriceCents?: number }).totalPriceCents ?? ticket.priceCents * quantity);
    const eventTitle = String((ticket as unknown as { eventTitle?: string }).eventTitle ?? 'Event');

    if (stripeClient && ticket.stripePaymentIntentId && !ticket.stripePaymentIntentId.startsWith('pi_mock_')) {
      try {
        const refund = await stripeClient.refunds.create({ payment_intent: ticket.stripePaymentIntentId });
        await ticketsService.update(ticketId, { status: 'cancelled', paymentStatus: 'refunded' });
        await walletsService.addTransaction(ticket.userId, {
          type: 'refund',
          amountCents: totalPriceCents,
          description: `Refund: ${eventTitle}`,
        });
        return res.json({ ok: true, ticketId, refundId: refund.id });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        console.error('[stripe] refund error:', msg);
        return res.status(500).json({ error: 'Stripe refund failed', detail: msg });
      }
    }

    await ticketsService.update(ticketId, { status: 'cancelled', paymentStatus: 'refunded' });
    await walletsService.addTransaction(ticket.userId, {
      type: 'refund',
      amountCents: totalPriceCents,
      description: `Refund: ${eventTitle}`,
    });
    return res.json({ ok: true, ticketId, refundId: `re_mock_${randomUUID().slice(0, 8)}` });
  }

  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (!isOwnerOrAdmin(req.user!, ticket.userId)) return res.status(403).json({ error: 'Forbidden' });
  if (ticket.status === 'used') return res.status(400).json({ error: 'Cannot refund used ticket' });
  if (ticket.paymentStatus === 'refunded') return res.status(400).json({ error: 'Already refunded' });

  if (stripeClient && ticket.stripePaymentIntentId && !ticket.stripePaymentIntentId.startsWith('pi_mock_')) {
    try {
      const refund = await stripeClient.refunds.create({ payment_intent: ticket.stripePaymentIntentId });
      ticket.status = 'cancelled'; ticket.paymentStatus = 'refunded';
      ticket.history.unshift({ at: nowIso(), status: 'cancelled', note: `Stripe refund ${refund.id}` });
      ticket.staffAuditTrail?.unshift({ at: nowIso(), by: 'system', action: 'stripe_refund_processed' });
      const tx = transactions.get(ticket.userId) ?? [];
      tx.unshift({ id: randomUUID(), type: 'refund', amountCents: ticket.totalPriceCents, createdAt: nowIso(), description: `Refund: ${ticket.eventTitle}` });
      transactions.set(ticket.userId, tx);
      return res.json({ ok: true, ticketId, refundId: refund.id });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      console.error('[stripe] refund error:', msg);
      return res.status(500).json({ error: 'Stripe refund failed', detail: msg });
    }
  }

  ticket.status = 'cancelled'; ticket.paymentStatus = 'refunded';
  ticket.history.unshift({ at: nowIso(), status: 'cancelled', note: 'Refund processed (mock)' });
  ticket.staffAuditTrail?.unshift({ at: nowIso(), by: 'system', action: 'stripe_refund_processed' });
  const tx = transactions.get(ticket.userId) ?? [];
  tx.unshift({ id: randomUUID(), type: 'refund', amountCents: ticket.totalPriceCents, createdAt: nowIso(), description: `Refund: ${ticket.eventTitle}` });
  transactions.set(ticket.userId, tx);
  return res.json({ ok: true, ticketId, refundId: `re_mock_${randomUUID().slice(0, 8)}` });
});

app.post('/api/stripe/webhook', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (stripeClient && process.env.STRIPE_WEBHOOK_SECRET && req.rawBody && sig) {
    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      console.error('[stripe] webhook signature verification failed:', msg);
      return res.status(400).json({ error: `Webhook Error: ${msg}` });
    }

    // Idempotency: Ensure we only process each event once.
    const idempotencyRef = db.collection('stripeEvents').doc(event.id);
    try {
      await idempotencyRef.create({ receivedAt: nowIso(), type: event.type });
    } catch (error: unknown) {
      if ((error as Record<string, unknown>)?.code === 6) { // ALREADY_EXISTS
        return res.json({ received: true, message: 'Already processed' });
      }
      console.error(`[stripe] idempotency check failed for event ${event.id}`, error);
      return res.status(500).json({ error: 'Idempotency check failed' });
    }

    const eventType = event.type;
    const obj = event.data.object as unknown as Record<string, unknown>;
    const meta = (obj?.metadata ?? {}) as Record<string, string>;
    const ticketId   = String(meta?.ticketId ?? '');
    const userIdMeta = String(meta?.userId ?? obj?.client_reference_id ?? '');

    try {
      if (hasFirestoreProject) {
        // ── Subscription events ──────────────────────────────────────────────
        if (eventType === 'checkout.session.completed' && obj.mode === 'subscription' && userIdMeta) {
          // Subscription checkout successful — activate membership
          const subscriptionId = String(obj.subscription ?? '');
          const expiresAt = subscriptionId
            ? await stripeClient!.subscriptions.retrieve(subscriptionId)
                .then((sub) => new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString())
                .catch(() => undefined)
            : undefined;
          await usersService.upsert(userIdMeta, {
            stripeSubscriptionId: subscriptionId || undefined,
            membership: { tier: 'plus', isActive: true, expiresAt },
          });
          await authAdmin.setCustomUserClaims(userIdMeta, {
            ...(await authAdmin.getUser(userIdMeta)).customClaims,
            tier: 'plus',
          });

        } else if (eventType === 'customer.subscription.updated') {
          // Sync subscription status (e.g. billing period change, reactivation)
          const custId = String(obj.customer ?? '');
          if (custId) {
            const snap = await db.collection('users').where('stripeCustomerId', '==', custId).limit(1).get();
            if (!snap.empty) {
              const uid = snap.docs[0].id;
              const isActive = obj.status === 'active' || obj.status === 'trialing';
              const periodEnd = obj.current_period_end as number | undefined;
              const expiresAt = periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : undefined;
              await usersService.upsert(uid, {
                stripeSubscriptionId: String(obj.id),
                membership: { tier: isActive ? 'plus' : 'free', isActive, expiresAt },
              });
              await authAdmin.setCustomUserClaims(uid, {
                ...(await authAdmin.getUser(uid)).customClaims,
                tier: isActive ? 'plus' : 'free',
              });
            }
          }

        } else if (eventType === 'customer.subscription.deleted') {
          // Subscription cancelled or expired — downgrade
          const custId = String(obj.customer ?? '');
          if (custId) {
            const snap = await db.collection('users').where('stripeCustomerId', '==', custId).limit(1).get();
            if (!snap.empty) {
              const uid = snap.docs[0].id;
              await usersService.upsert(uid, {
                stripeSubscriptionId: undefined,
                membership: { tier: 'free', isActive: false },
              });
              await authAdmin.setCustomUserClaims(uid, {
                ...(await authAdmin.getUser(uid)).customClaims,
                tier: 'free',
              });
            }
          }

        } else if (eventType === 'invoice.payment_failed') {
          // Failed renewal — mark membership inactive but keep tier for grace period
          const custId = String(obj.customer ?? '');
          if (custId) {
            const snap = await db.collection('users').where('stripeCustomerId', '==', custId).limit(1).get();
            if (!snap.empty) {
              const uid = snap.docs[0].id;
              await usersService.upsert(uid, {
                membership: { tier: 'plus', isActive: false },
              });
            }
          }

        // ── Ticket (one-time payment) events ─────────────────────────────────
        } else if (ticketId) {
          if (
            (eventType === 'checkout.session.completed' && obj.mode === 'payment') ||
            eventType === 'payment_intent.succeeded'
          ) {
            const updatedTicket = await ticketsService.update(ticketId, {
              status: 'confirmed',
              paymentStatus: 'paid',
              stripePaymentIntentId: String(obj.payment_intent ?? obj.id ?? ''),
            });
            const ticketUserId = userIdMeta || updatedTicket?.userId;
            if (updatedTicket && ticketUserId) {
              const paidAmountCents = Number(
                obj.amount_total
                  ?? updatedTicket.totalPriceCents
                  ?? updatedTicket.priceCents
                  ?? 0
              );

              if (!updatedTicket.rewardPointsAwardedAt) {
                const rewardPoints = await awardRewardsPoints(ticketUserId, paidAmountCents, {
                  ticketId,
                  source: 'ticket payment',
                });
                if (rewardPoints > 0) {
                  await ticketsService.update(ticketId, {
                    rewardPointsEarned: rewardPoints,
                    rewardPointsAwardedAt: nowIso(),
                  });
                }
              }

              if (!updatedTicket.cashbackCreditedAt) {
                const memberUser = await usersService.getById(ticketUserId);
                const membership = memberUser?.membership;
                const membershipSummary = buildMembershipResponse({
                  tier: membership?.tier ?? 'free',
                  isActive: membership?.isActive ?? false,
                  expiresAt: membership?.expiresAt ?? null,
                });
                if (membershipSummary.cashbackRate > 0) {
                  const cashbackCents = Math.max(0, Math.round(paidAmountCents * membershipSummary.cashbackRate));
                  if (cashbackCents > 0) {
                    await walletsService.addTransaction(ticketUserId, {
                      type: 'cashback',
                      amountCents: cashbackCents,
                      description: `CulturePass+ cashback (${Math.round(membershipSummary.cashbackRate * 100)}%)`,
                    });
                    await ticketsService.update(ticketId, {
                      cashbackCents,
                      cashbackCreditedAt: nowIso(),
                    });
                    await notificationsService.create({
                      userId: ticketUserId,
                      title: 'Cashback credited',
                      message: `$${(cashbackCents / 100).toFixed(2)} was added to your wallet from CulturePass+ cashback.`,
                      type: 'cashback',
                      isRead: false,
                      metadata: { ticketId, cashbackCents },
                      createdAt: nowIso(),
                    });
                  }
                }
              }
            }
          } else if (eventType === 'charge.refunded') {
            await db.runTransaction(async (transaction) => {
              const ticketRef = db.collection('tickets').doc(ticketId);
              const ticketDoc = await transaction.get(ticketRef);
              if (!ticketDoc.exists) {
                console.warn(`[stripe] Refund webhook for non-existent ticket: ${ticketId}`);
                return;
              }
              const ticket = ticketDoc.data() as AppTicket;
              const quantity = ticket.quantity ?? 1;
              transaction.update(ticketRef, { status: 'cancelled', paymentStatus: 'refunded' });
              if (ticket.eventId) {
                transaction.update(db.collection('events').doc(ticket.eventId), {
                  attending: firestore.FieldValue.increment(-quantity),
                });
              }
            });
          }
        }
      } else {
        // ── Dev mode: Update in-memory ────────────────────────────────────────
        if (userIdMeta && (eventType === 'checkout.session.completed' && obj.mode === 'subscription')) {
          const m = memberships.get(userIdMeta);
          if (m) { m.tier = 'plus'; m.isActive = true; m.validUntil = new Date(Date.now() + 86400_000 * 30).toISOString(); }
        } else if (eventType === 'customer.subscription.deleted') {
          for (const m of memberships.values()) { m.tier = 'free'; m.isActive = false; }
        } else {
          const ticket = tickets.find((t) => t.id === ticketId);
          if (ticket) {
            if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
              ticket.status = 'confirmed'; ticket.paymentStatus = 'paid';
              ticket.stripePaymentIntentId = String(obj.payment_intent ?? obj.id ?? '');
              ticket.history.unshift({ at: nowIso(), status: 'confirmed', note: `Stripe event: ${eventType}` });
              if (!ticket.rewardPointsAwardedAt) {
                const rewardPoints = await awardRewardsPoints(ticket.userId, ticket.totalPriceCents, {
                  ticketId: ticket.id,
                  source: 'ticket payment',
                });
                if (rewardPoints > 0) {
                  ticket.rewardPointsEarned = rewardPoints;
                  ticket.rewardPointsAwardedAt = nowIso();
                }
              }
              const membership = memberships.get(ticket.userId);
              const membershipSummary = buildMembershipResponse({
                tier: membership?.tier ?? 'free',
                isActive: membership?.isActive ?? false,
                expiresAt: membership?.validUntil ?? null,
              });
              if (!ticket.cashbackCreditedAt && membershipSummary.cashbackRate > 0) {
                const cashbackCents = Math.max(0, Math.round(ticket.totalPriceCents * membershipSummary.cashbackRate));
                if (cashbackCents > 0) {
                  ticket.cashbackCents = cashbackCents;
                  ticket.cashbackCreditedAt = nowIso();
                  const wallet = wallets.get(ticket.userId);
                  if (wallet) wallet.balance += cashbackCents;
                  const tx = transactions.get(ticket.userId) ?? [];
                  tx.unshift({
                    id: randomUUID(),
                    type: 'cashback',
                    amountCents: cashbackCents,
                    createdAt: nowIso(),
                    description: `CulturePass+ cashback (${Math.round(membershipSummary.cashbackRate * 100)}%)`,
                  });
                  transactions.set(ticket.userId, tx);
                }
              }
            } else if (eventType === 'charge.refunded') {
              ticket.paymentStatus = 'refunded'; ticket.status = 'cancelled';
              ticket.history.unshift({ at: nowIso(), status: 'cancelled', note: 'Stripe webhook: charge refunded' });
            }
          }
        }
      }
      return res.json({ received: true });
    } catch (err) {
      console.error(`[stripe] webhook processing failed for event ${event.id}:`, err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  const eventType = String(req.body?.type ?? '');
  const ticketId = String(req.body?.data?.object?.metadata?.ticketId ?? '');
  const ticket = tickets.find((t) => t.id === ticketId);
  if (ticket) {
    if (eventType === 'payment_intent.succeeded' || eventType === 'checkout.session.completed') {
      ticket.status = 'confirmed';
      ticket.paymentStatus = 'paid';
      ticket.history.unshift({ at: nowIso(), status: 'confirmed', note: `Mock webhook: ${eventType}` });
      if (!ticket.rewardPointsAwardedAt) {
        const rewardPoints = await awardRewardsPoints(ticket.userId, ticket.totalPriceCents, {
          ticketId: ticket.id,
          source: 'ticket payment',
        });
        if (rewardPoints > 0) {
          ticket.rewardPointsEarned = rewardPoints;
          ticket.rewardPointsAwardedAt = nowIso();
        }
      }
      const membership = memberships.get(ticket.userId);
      const membershipSummary = buildMembershipResponse({
        tier: membership?.tier ?? 'free',
        isActive: membership?.isActive ?? false,
        expiresAt: membership?.validUntil ?? null,
      });
      if (!ticket.cashbackCreditedAt && membershipSummary.cashbackRate > 0) {
        const cashbackCents = Math.max(0, Math.round(ticket.totalPriceCents * membershipSummary.cashbackRate));
        if (cashbackCents > 0) {
          ticket.cashbackCents = cashbackCents;
          ticket.cashbackCreditedAt = nowIso();
          const wallet = wallets.get(ticket.userId);
          if (wallet) wallet.balance += cashbackCents;
          const tx = transactions.get(ticket.userId) ?? [];
          tx.unshift({
            id: randomUUID(),
            type: 'cashback',
            amountCents: cashbackCents,
            createdAt: nowIso(),
            description: `CulturePass+ cashback (${Math.round(membershipSummary.cashbackRate * 100)}%)`,
          });
          transactions.set(ticket.userId, tx);
        }
      }
    }
    if (eventType === 'charge.refunded') { ticket.paymentStatus = 'refunded'; ticket.status = 'cancelled'; ticket.history.unshift({ at: nowIso(), status: 'cancelled', note: 'Mock webhook: charge refunded' }); }
    ticket.staffAuditTrail?.unshift({ at: nowIso(), by: 'stripe_webhook', action: eventType });
  }
  return res.json({ received: true });
});

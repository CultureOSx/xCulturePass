/**
 * Firestore Data Service — CulturePassAU Cloud Functions
 *
 * A typed abstraction over Firestore collections.
 * Replaces the in-memory Maps/Arrays in app.ts progressively —
 * start by migrating one collection at a time without breaking other routes.
 *
 * Collections:
 *   users/       — user profiles + membership tier
 *   events/      — published events (soft-delete via deletedAt)
 *   tickets/     — purchased tickets + audit trail
 *   profiles/    — community/business/venue/artist profiles
 *   perks/       — member perks + redemptions
 *
 * Usage (in app.ts route handler):
 *   import { usersService, eventsService } from './services/firestore';
 *
 *   const user = await usersService.getById(req.user.id);
 *   const page = await eventsService.listByCity('Sydney', 'Australia', { page: 1, pageSize: 20 });
 */

import type { Timestamp , FieldValue } from 'firebase-admin/firestore';
import * as geofire from 'geofire-common';
import { db } from '../admin';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface FirestoreUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  city?: string;
  state?: string;
  postcode?: number;
  country?: string;
  avatarUrl?: string;
  bio?: string;
  role: 'user' | 'organizer' | 'business' | 'sponsor' | 'cityAdmin' | 'platformAdmin' | 'moderator' | 'admin';
  culturePassId: string;
  isSydneyVerified?: boolean;
  interests?: string[];
  communities?: string[];
  languages?: string[];
  ethnicityText?: string;
  interestCategoryIds?: string[];
  membership?: {
    tier: 'free' | 'plus' | 'elite' | 'pro' | 'premium' | 'vip';
    expiresAt?: string;
    isActive?: boolean;
  };
  socialLinks?: Record<string, string>;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // Modern Data Architecture / Analytics Fields
  lastActiveAt?: string;
  authProvider?: string;
  deviceTokens?: string[];
  marketingOptIn?: boolean;
  dataProcessingConsent?: boolean;
  metadata?: Record<string, any>; // Flexible payload for BigQuery/CDP streaming
  
  createdAt: string;
  updatedAt: string;
}

const usersCol = () => db.collection('users');

export const usersService = {
  async getById(id: string): Promise<FirestoreUser | null> {
    const snap = await usersCol().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as FirestoreUser;
  },

  async getByEmail(email: string): Promise<FirestoreUser | null> {
    const snap = await usersCol().where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as FirestoreUser;
  },

  async upsert(id: string, data: Partial<FirestoreUser>): Promise<FirestoreUser> {
    const ref = usersCol().doc(id);
    const existing = await ref.get();
    const now = new Date().toISOString();

    if (existing.exists) {
      await ref.update({ ...data, updatedAt: now });
    } else {
      await ref.set({ ...data, id, createdAt: now, updatedAt: now });
    }

    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreUser;
  },
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  communityId: string;
  venue: string;
  address?: string;
  date: string;
  time: string;
  city: string;
  state?: string;
  council?: string;
  suburb?: string;
  postcode?: number;
  latitude?: number;
  longitude?: number;
  country: string;
  imageUrl?: string;
  imageColor?: string;
  cultureTag?: string[];
  tags?: string[];
  indigenousTags?: string[];
  languageTags?: string[];
  geoHash?: string;
  eventType?: string;
  ageSuitability?: string;
  priceTier?: string;
  priceCents?: number;
  priceLabel?: string;
  category?: string;
  organizerId?: string;
  organizer?: string;
  organizerReputationScore?: number;
  capacity?: number;
  attending?: number;
  isFeatured?: boolean;
  isFree?: boolean;
  externalTicketUrl?: string | null;
  tiers?: { name: string; priceCents: number; available: number }[];
  cpid?: string;
  /**
   * status replaces deletedAt/publishedAt for efficient Firestore composite indexes.
   * 'draft' → created but not visible | 'published' → live | 'deleted' → soft-deleted
   */
  status: 'draft' | 'published' | 'deleted';
  
  // Modern Data Architecture / Analytics Fields
  viewCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  ticketSalesCount?: number;
  sourceSystem?: string; // e.g. 'user_submission', 'api_ingest'
  searchTokens?: string[]; // Tokenized strings for Algolia/Vertex AI vector search
  metadata?: Record<string, any>; // Extensible JSON metadata
  
  createdAt: string;
  updatedAt: string;
}

export interface EventFilters {
  city?: string;
  country?: string;
  category?: string;
  eventType?: string;
  isFeatured?: boolean;
  dateFrom?: string;
  dateTo?: string;
  organizerId?: string;
  communityId?: string;
  status?: FirestoreEvent['status'];
  
  // Geolocation Bounding
  centerLat?: number;
  centerLng?: number;
  radiusInKm?: number;
}

const eventsCol = () => db.collection('events');

export const eventsService = {
  async getById(id: string): Promise<FirestoreEvent | null> {
    const snap = await eventsCol().doc(id).get();
    if (!snap.exists) return null;
    const { id: _id, ...data } = snap.data() as FirestoreEvent;
    if (data.status === 'deleted') return null;
    return { id: snap.id, ...data };
  },

  async list(
    filters: EventFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResult<FirestoreEvent>> {
    let baseQuery = eventsCol() as FirebaseFirestore.Query;

    if (filters.status) {
      baseQuery = baseQuery.where('status', '==', filters.status);
    } else if (!filters.organizerId) {
      baseQuery = baseQuery.where('status', '==', 'published');
    }

    if (filters.organizerId) baseQuery = baseQuery.where('organizerId', '==', filters.organizerId);
    if (filters.communityId) baseQuery = baseQuery.where('communityId', '==', filters.communityId);
    if (filters.city) baseQuery = baseQuery.where('city', '==', filters.city);
    if (filters.country) baseQuery = baseQuery.where('country', '==', filters.country);
    if (filters.category) baseQuery = baseQuery.where('category', '==', filters.category);
    if (filters.isFeatured) baseQuery = baseQuery.where('isFeatured', '==', true);
    if (filters.dateFrom) baseQuery = baseQuery.where('date', '>=', filters.dateFrom);
    if (filters.dateTo) baseQuery = baseQuery.where('date', '<=', filters.dateTo);

    const isGeoQuery = filters.centerLat != null && filters.centerLng != null && filters.radiusInKm != null;
    let items: FirestoreEvent[] = [];
    let total = 0;

    if (isGeoQuery) {
      const center: [number, number] = [filters.centerLat!, filters.centerLng!];
      const radiusInM = filters.radiusInKm! * 1000;
      const bounds = geofire.geohashQueryBounds(center, radiusInM);
      const promises = [];

      for (const b of bounds) {
        const q = baseQuery.orderBy('geoHash').startAt(b[0]).endAt(b[1]);
        promises.push(q.get());
      }
      const snapshots = await Promise.all(promises);
      const matchingDocs: FirestoreEvent[] = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const data = { id: doc.id, ...doc.data() } as FirestoreEvent;
          if (data.latitude != null && data.longitude != null) {
            const distanceInKm = geofire.distanceBetween([data.latitude, data.longitude], center);
            if (distanceInKm <= filters.radiusInKm!) {
              matchingDocs.push(data);
            }
          }
        }
      }

      // Memory sort by date since we used the DB sort on geoHash
      matchingDocs.sort((a, b) => a.date.localeCompare(b.date));
      total = matchingDocs.length;
      
      const { page, pageSize } = pagination;
      items = matchingDocs.slice((page - 1) * pageSize, page * pageSize);

      return {
        items,
        total,
        page,
        pageSize,
        hasNextPage: page * pageSize < total,
      };
    }

    // Standard non-geo query
    // If no explicit ordering is required and an index is missing, we bypass sortBy date to preserve function availability
    let sortedQuery = baseQuery;
    
    // Fallback sort locally if needed, but for now we try to avoid composite strict sorts
    const countSnap = await sortedQuery.count().get();
    total = countSnap.data().count;
    
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const snap = await sortedQuery.limit(pageSize).offset(offset).get();
    items = snap.docs.map(doc => {
      const { id: _, ...data } = doc.data() as FirestoreEvent;
      return { id: doc.id, ...data } as FirestoreEvent;
    });

    // Optional: Sort memory side for date
    items.sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      items,
      total,
      page,
      pageSize,
      hasNextPage: offset + items.length < total,
    };
  },

  async create(data: Omit<FirestoreEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreEvent> {
    const now = new Date().toISOString();
    const ref = eventsCol().doc();
    
    let geoHash = data.geoHash;
    if (!geoHash && data.latitude != null && data.longitude != null) {
      geoHash = geofire.geohashForLocation([data.latitude, data.longitude]);
    }
    
    const event: FirestoreEvent = {
      ...data,
      id: ref.id,
      geoHash,
      status: data.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(event);
    return event;
  },

  async update(id: string, data: Partial<FirestoreEvent>): Promise<FirestoreEvent | null> {
    const ref = eventsCol().doc(id);
    const existingSnap = await ref.get();
    if (!existingSnap.exists) return null;
    
    const updates: Partial<FirestoreEvent> = { ...data, updatedAt: new Date().toISOString() };
    
    // Auto-update geohash if coords change or missing
    if (updates.latitude != null && updates.longitude != null) {
      updates.geoHash = geofire.geohashForLocation([updates.latitude, updates.longitude]);
    }

    await ref.update(updates);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreEvent;
  },

  async softDelete(id: string): Promise<void> {
    await eventsCol().doc(id).update({
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    });
  },

  async publish(id: string): Promise<FirestoreEvent | null> {
    return this.update(id, { status: 'published' });
  },
};

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export interface FirestoreTicket {
  id: string;
  eventId: string;
  userId: string;
  tierId?: string;
  tierName?: string;
  quantity?: number;
  priceCents: number;
  totalPriceCents?: number;
  status: 'confirmed' | 'used' | 'cancelled' | 'expired';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentIntentId?: string;
  /** Stripe PaymentIntent ID — set after checkout.session.completed */
  stripePaymentIntentId?: string;
  cashbackCents?: number;
  cashbackCreditedAt?: string;
  rewardPointsEarned?: number;
  rewardPointsAwardedAt?: string;
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  imageColor?: string;
  qrCode: string;
  cpTicketId: string;
  history: { action: string; timestamp: string; actorId?: string }[];
  
  // Analytics and Audit Fields
  paymentMethodType?: string; // 'card', 'apple_pay', 'google_pay'
  promotionalCode?: string;
  discountCents?: number;
  sourceMedium?: string; // e.g., 'app_ios', 'app_android', 'web'
  metadata?: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

const ticketsCol = () => db.collection('tickets');

export const ticketsService = {
  async getById(id: string): Promise<FirestoreTicket | null> {
    const snap = await ticketsCol().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as FirestoreTicket;
  },

  async listForUser(userId: string): Promise<FirestoreTicket[]> {
    const snap = await ticketsCol()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreTicket[];
  },

  async create(data: Omit<FirestoreTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreTicket> {
    const now = new Date().toISOString();
    const ref = ticketsCol().doc();
    const ticket: FirestoreTicket = { ...data, id: ref.id, createdAt: now, updatedAt: now };
    await ref.set(ticket);
    return ticket;
  },

  async updateStatus(
    id: string,
    status: FirestoreTicket['status'],
    actorId?: string
  ): Promise<FirestoreTicket | null> {
    const ref = ticketsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;

    const existing = snap.data() as FirestoreTicket;
    const historyEntry = { action: `status_${status}`, timestamp: new Date().toISOString(), actorId };

    await ref.update({
      status,
      history: [...(existing.history ?? []), historyEntry],
      updatedAt: new Date().toISOString(),
    });

    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreTicket;
  },

  async getByQrCode(qrCode: string): Promise<FirestoreTicket | null> {
    const snap = await ticketsCol().where('qrCode', '==', qrCode).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as FirestoreTicket;
  },

  async update(id: string, data: Partial<FirestoreTicket>): Promise<FirestoreTicket | null> {
    const ref = ticketsCol().doc(id);
    if (!(await ref.get()).exists) return null;
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreTicket;
  },
};

// ---------------------------------------------------------------------------
// Profiles (community / business / venue / artist)
// ---------------------------------------------------------------------------

export interface FirestoreProfile {
  id: string;
  name: string;
  entityType: 'community' | 'business' | 'venue' | 'artist' | 'organisation';
  description?: string;
  imageUrl?: string;
  avatarUrl?: string;
  city?: string;
  state?: string;
  postcode?: number;
  latitude?: number;
  longitude?: number;
  country?: string;
  isVerified?: boolean;
  memberCount?: number;
  followerCount?: number;
  ownerId?: string; // App logic relies on this for permissions
  socialLinks?: Record<string, string>;
  contactEmail?: string;
  website?: string;
  
  // Analytics
  viewCount?: number;
  metadata?: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------

export interface FirestoreWallet {
  userId: string;
  balanceCents: number;
  currency: string;
  points: number;
  transactions: FirestoreWalletTransaction[];
  updatedAt: string;
}

export interface FirestoreWalletTransaction {
  id: string;
  type: 'charge' | 'refund' | 'debit' | 'cashback';
  amountCents: number;
  description: string;
  createdAt: string;
}

const walletsCol = () => db.collection('wallets');

export const walletsService = {
  async get(userId: string): Promise<FirestoreWallet | null> {
    const snap = await walletsCol().doc(userId).get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<FirestoreWallet>;
    return {
      userId,
      balanceCents: Number(data.balanceCents ?? 0),
      currency: String(data.currency ?? 'AUD'),
      points: Number(data.points ?? 0),
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    };
  },

  async getOrCreate(userId: string): Promise<FirestoreWallet> {
    const ref = walletsCol().doc(userId);
    const snap = await ref.get();
    if (snap.exists) {
      return this.get(userId) as Promise<FirestoreWallet>;
    }
    const wallet: FirestoreWallet = {
      userId,
      balanceCents: 0,
      currency: 'AUD',
      points: 0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    await ref.set(wallet);
    return wallet;
  },

  async topup(userId: string, amountCents: number, description = 'Wallet top up'): Promise<FirestoreWallet> {
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const ref = walletsCol().doc(userId);
      const snap = await transaction.get(ref);
      const current = snap.exists
        ? (snap.data() as FirestoreWallet)
        : ({
            userId,
            balanceCents: 0,
            currency: 'AUD',
            points: 0,
            transactions: [],
            updatedAt: now,
          } as FirestoreWallet);

      const tx: FirestoreWalletTransaction = {
        id: db.collection('_tmp').doc().id,
        type: 'charge',
        amountCents,
        description,
        createdAt: now,
      };

      transaction.set(ref, {
        ...current,
        balanceCents: Number(current.balanceCents ?? 0) + amountCents,
        transactions: [tx, ...(current.transactions ?? [])].slice(0, 200),
        updatedAt: now,
      });
    });
    return (await this.get(userId)) as FirestoreWallet;
  },

  async deductBalance(userId: string, amountCents: number, description = 'Wallet payment'): Promise<FirestoreWallet> {
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const ref = walletsCol().doc(userId);
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('WALLET_NOT_FOUND');

      const current = snap.data() as FirestoreWallet;
      const currentBalance = Number(current.balanceCents ?? 0);
      if (currentBalance < amountCents) throw new Error('INSUFFICIENT_BALANCE');

      const tx: FirestoreWalletTransaction = {
        id: db.collection('_tmp').doc().id,
        type: 'debit',
        amountCents,
        description,
        createdAt: now,
      };

      transaction.update(ref, {
        balanceCents: currentBalance - amountCents,
        transactions: [tx, ...(current.transactions ?? [])].slice(0, 200),
        updatedAt: now,
      });
    });
    return (await this.get(userId)) as FirestoreWallet;
  },

  async addTransaction(
    userId: string,
    transactionData: Omit<FirestoreWalletTransaction, 'id' | 'createdAt'> & { createdAt?: string }
  ): Promise<FirestoreWallet> {
    const now = transactionData.createdAt ?? new Date().toISOString();
    const tx: FirestoreWalletTransaction = {
      id: db.collection('_tmp').doc().id,
      createdAt: now,
      ...transactionData,
    };
    await db.runTransaction(async (transaction) => {
      const ref = walletsCol().doc(userId);
      const snap = await transaction.get(ref);
      const current = snap.exists
        ? (snap.data() as FirestoreWallet)
        : ({
            userId,
            balanceCents: 0,
            currency: 'AUD',
            points: 0,
            transactions: [],
            updatedAt: now,
          } as FirestoreWallet);

      const balanceDelta = tx.type === 'refund' || tx.type === 'cashback' ? tx.amountCents : 0;
      transaction.set(ref, {
        ...current,
        balanceCents: Number(current.balanceCents ?? 0) + balanceDelta,
        transactions: [tx, ...(current.transactions ?? [])].slice(0, 200),
        updatedAt: now,
      });
    });
    return (await this.get(userId)) as FirestoreWallet;
  },

  async addPoints(userId: string, points: number): Promise<FirestoreWallet> {
    if (!Number.isFinite(points) || points <= 0) {
      return this.getOrCreate(userId);
    }
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const ref = walletsCol().doc(userId);
      const snap = await transaction.get(ref);
      const current = snap.exists
        ? (snap.data() as FirestoreWallet)
        : ({
            userId,
            balanceCents: 0,
            currency: 'AUD',
            points: 0,
            transactions: [],
            updatedAt: now,
          } as FirestoreWallet);
      transaction.set(ref, {
        ...current,
        points: Number(current.points ?? 0) + Math.floor(points),
        updatedAt: now,
      });
    });
    return (await this.get(userId)) as FirestoreWallet;
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface FirestoreNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const notificationsCol = () => db.collection('notifications');

export const notificationsService = {
  async getById(id: string): Promise<FirestoreNotification | null> {
    const snap = await notificationsCol().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as FirestoreNotification;
  },

  async listForUser(userId: string): Promise<FirestoreNotification[]> {
    const snap = await notificationsCol()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreNotification[];
  },

  async unreadCount(userId: string): Promise<number> {
    const snap = await notificationsCol()
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .count()
      .get();
    return snap.data().count;
  },

  async markRead(id: string): Promise<void> {
    await notificationsCol().doc(id).update({ isRead: true });
  },

  async markAllRead(userId: string): Promise<void> {
    const snap = await notificationsCol().where('userId', '==', userId).where('isRead', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
  },

  async delete(id: string): Promise<void> {
    await notificationsCol().doc(id).delete();
  },

  async create(data: Omit<FirestoreNotification, 'id'>): Promise<FirestoreNotification> {
    const ref = notificationsCol().doc();
    await ref.set({ ...data, id: ref.id });
    return { id: ref.id, ...data };
  },
};

// ---------------------------------------------------------------------------
// Perks + Redemptions
// ---------------------------------------------------------------------------

export interface FirestorePerk {
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
  status: 'active' | 'inactive' | 'expired';
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface FirestoreRedemption {
  id: string;
  perkId: string;
  userId: string;
  redeemedAt: string;
}

const perksCol = () => db.collection('perks');
const redemptionsCol = () => db.collection('redemptions');

export const perksService = {
  async list(): Promise<FirestorePerk[]> {
    const snap = await perksCol().where('status', '==', 'active').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestorePerk[];
  },

  async getById(id: string): Promise<FirestorePerk | null> {
    const snap = await perksCol().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as FirestorePerk;
  },

  async create(data: Omit<FirestorePerk, 'id' | 'createdAt'>): Promise<FirestorePerk> {
    const now = new Date().toISOString();
    const ref = perksCol().doc();
    const perk: FirestorePerk = { ...data, id: ref.id, createdAt: now };
    await ref.set(perk);
    return perk;
  },

  async incrementUsed(id: string): Promise<void> {
    const { FieldValue } = await import('firebase-admin/firestore');
    await perksCol().doc(id).update({ usedCount: FieldValue.increment(1) });
  },
};

export const redemptionsService = {
  async listForUser(userId: string): Promise<FirestoreRedemption[]> {
    const snap = await redemptionsCol()
      .where('userId', '==', userId)
      .orderBy('redeemedAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreRedemption[];
  },

  async countForUserAndPerk(userId: string, perkId: string): Promise<number> {
    const snap = await redemptionsCol()
      .where('userId', '==', userId)
      .where('perkId', '==', perkId)
      .count()
      .get();
    return snap.data().count;
  },

  async create(data: Omit<FirestoreRedemption, 'id'>): Promise<FirestoreRedemption> {
    const ref = redemptionsCol().doc();
    const redemption: FirestoreRedemption = { ...data, id: ref.id };
    await ref.set(redemption);
    return redemption;
  },
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface FirestoreReport {
  id: string;
  targetType: 'event' | 'community' | 'profile' | 'post' | 'user';
  targetId: string;
  reason: string;
  details?: string;
  reporterUserId: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewedAt?: string;
  reviewedBy?: string;
  moderationNotes?: string;
  createdAt: string;
}

const reportsCol = () => db.collection('reports');

export const reportsService = {
  async create(data: Omit<FirestoreReport, 'id'>): Promise<FirestoreReport> {
    const ref = reportsCol().doc();
    const report: FirestoreReport = { ...data, id: ref.id };
    await ref.set(report);
    return report;
  },

  async list(): Promise<FirestoreReport[]> {
    const snap = await reportsCol().orderBy('createdAt', 'desc').limit(200).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreReport[];
  },

  async review(
    id: string,
    status: FirestoreReport['status'],
    reviewedBy: string,
    moderationNotes?: string
  ): Promise<FirestoreReport | null> {
    const ref = reportsCol().doc(id);
    if (!(await ref.get()).exists) return null;
    const update = { status, reviewedAt: new Date().toISOString(), reviewedBy, ...(moderationNotes && { moderationNotes }) };
    await ref.update(update);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreReport;
  },
};

// ---------------------------------------------------------------------------
// Event Feedback
// ---------------------------------------------------------------------------

export interface FirestoreEventFeedback {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

const eventFeedbackCol = () => db.collection('eventFeedback');

export const eventFeedbackService = {
  async upsert(data: Omit<FirestoreEventFeedback, 'id'>): Promise<FirestoreEventFeedback> {
    const existing = await eventFeedbackCol()
      .where('userId', '==', data.userId)
      .where('eventId', '==', data.eventId)
      .limit(1)
      .get();
    if (!existing.empty) {
      const ref = existing.docs[0].ref;
      await ref.update({ rating: data.rating, comment: data.comment, createdAt: data.createdAt });
      return { id: ref.id, ...data };
    }
    const ref = eventFeedbackCol().doc();
    const feedback: FirestoreEventFeedback = { ...data, id: ref.id };
    await ref.set(feedback);
    return feedback;
  },

  async listForEvent(eventId: string): Promise<FirestoreEventFeedback[]> {
    const snap = await eventFeedbackCol()
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreEventFeedback[];
  },
};

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface FirestoreMedia {
  id: string;
  targetType: string;
  targetId: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  uploadedBy?: string;
  createdAt: string;
}

const mediaCol = () => db.collection('media');

export const mediaService = {
  async attach(data: Omit<FirestoreMedia, 'id'>): Promise<FirestoreMedia> {
    const ref = mediaCol().doc();
    const media: FirestoreMedia = { ...data, id: ref.id };
    await ref.set(media);
    return media;
  },

  async listForTarget(targetType: string, targetId: string): Promise<FirestoreMedia[]> {
    const snap = await mediaCol()
      .where('targetType', '==', targetType)
      .where('targetId', '==', targetId)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreMedia[];
  },
};

const profilesCol = () => db.collection('profiles');

export const profilesService = {
  async getById(id: string): Promise<FirestoreProfile | null> {
    const snap = await profilesCol().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as FirestoreProfile;
  },

  async list(filters: { city?: string; country?: string } = {}): Promise<FirestoreProfile[]> {
    let query: FirebaseFirestore.Query = profilesCol();
    if (filters.city) query = query.where('city', '==', filters.city);
    if (filters.country) query = query.where('country', '==', filters.country);
    const snap = await query.limit(100).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreProfile[];
  },

  async listByType(
    entityType: FirestoreProfile['entityType'],
    filters: { city?: string; country?: string } = {}
  ): Promise<FirestoreProfile[]> {
    let query = profilesCol().where('entityType', '==', entityType);
    if (filters.city) query = query.where('city', '==', filters.city) as typeof query;
    if (filters.country) query = query.where('country', '==', filters.country) as typeof query;
    const snap = await query.get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreProfile[];
  },

  async create(data: Omit<FirestoreProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreProfile> {
    const now = new Date().toISOString();
    const ref = profilesCol().doc();
    const profile: FirestoreProfile = { ...data, id: ref.id, createdAt: now, updatedAt: now };
    await ref.set(profile);
    return profile;
  },
};

// ---------------------------------------------------------------------------
// Payment Methods (Stripe-sourced card summaries, no raw card data)
// ---------------------------------------------------------------------------

export interface FirestorePaymentMethod {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'paypal' | 'apple_pay' | 'google_pay';
  label: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  /** Stripe PaymentMethod ID */
  stripePaymentMethodId?: string;
  isDefault: boolean;
  createdAt: string;
}

const paymentMethodsCol = () => db.collection('paymentMethods');

export const paymentMethodsService = {
  async listForUser(userId: string): Promise<FirestorePaymentMethod[]> {
    const snap = await paymentMethodsCol()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestorePaymentMethod[];
  },

  async create(data: Omit<FirestorePaymentMethod, 'id' | 'createdAt'>): Promise<FirestorePaymentMethod> {
    const now = new Date().toISOString();
    const ref = paymentMethodsCol().doc();
    const method: FirestorePaymentMethod = { ...data, id: ref.id, createdAt: now };
    await ref.set(method);
    return method;
  },

  async setDefault(userId: string, methodId: string): Promise<void> {
    const snap = await paymentMethodsCol().where('userId', '==', userId).get();
    const batch = db.batch();
    snap.docs.forEach((doc) =>
      batch.update(doc.ref, { isDefault: doc.id === methodId })
    );
    await batch.commit();
  },

  async delete(id: string): Promise<void> {
    await paymentMethodsCol().doc(id).delete();
  },
};

// ---------------------------------------------------------------------------
// Scan Events (ticket scan audit trail)
// ---------------------------------------------------------------------------

export interface FirestoreScanEvent {
  id: string;
  ticketId: string;
  eventId?: string;
  userId?: string;
  scannedBy: string;
  outcome: 'accepted' | 'duplicate' | 'rejected';
  reason?: string;
  scannedAt: string;
}

const scanEventsCol = () => db.collection('scanEvents');

export const scanEventsService = {
  async record(data: Omit<FirestoreScanEvent, 'id'>): Promise<FirestoreScanEvent> {
    const ref = scanEventsCol().doc();
    const event: FirestoreScanEvent = { ...data, id: ref.id };
    await ref.set(event);
    return event;
  },

  async listForEvent(eventId: string): Promise<FirestoreScanEvent[]> {
    const snap = await scanEventsCol()
      .where('eventId', '==', eventId)
      .orderBy('scannedAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreScanEvent[];
  },

  async listForTicket(ticketId: string): Promise<FirestoreScanEvent[]> {
    const snap = await scanEventsCol()
      .where('ticketId', '==', ticketId)
      .orderBy('scannedAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreScanEvent[];
  },
};

/**
 * CulturePassAU — Typed API Client
 *
 * Wraps apiRequest() with structured error handling, typed responses,
 * and consistent route helpers. Use this instead of calling apiRequest()
 * directly in screens — it eliminates duplicated fetch logic and gives
 * you full TypeScript inference throughout the app.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const events = await api.events.list({ city: 'Sydney', page: 1 });
 */

import { apiRequest, getApiUrl } from './query-client';
import type {
  EventData,
  User,
  Ticket,
  PaginatedEventsResponse,
  Profile,
  Community,
  NotificationType,
} from '@/shared/schema';

// ---------------------------------------------------------------------------
// Local types for endpoints not yet in shared/schema.ts
// ---------------------------------------------------------------------------
export interface PerkData {
  id: string;
  title: string;
  description?: string;
  perkType?: string;
  discountPercent?: number;
  partnerId?: string;
  partnerName?: string;
  imageUrl?: string;
  status?: string;
  pointsCost?: number;
  usageLimit?: number;
  expiresAt?: string;
}

export interface PrivacySettings {
  /** Whether the user's profile is visible to others */
  profileVisible?: boolean;
  /** Alias used by some screens */
  profileVisibility?: boolean;
  activityVisible?: boolean;
  /** Alias used by some screens */
  activityStatus?: boolean;
  locationVisible?: boolean;
  /** Alias used by some screens */
  showLocation?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  showInDirectory?: boolean;
  /** Whether data is shared with partners */
  dataSharing?: boolean;
  [key: string]: boolean | undefined;
}

export interface MembershipSummary {
  tier: string;
  tierLabel: string;
  status: 'active' | 'inactive';
  expiresAt: string | null;
  cashbackRate: number;
  cashbackMultiplier: number;
  earlyAccessHours: number;
  eventsAttended: number;
}
export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'topup' | 'payment' | 'refund' | 'cashback';
  amount: number;
  amountCents: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  category: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RewardsSummary {
  userId: string;
  points: number;
  pointsPerDollar: number;
  tier: 'silver' | 'gold' | 'diamond';
  tierLabel: string;
  nextTier: 'gold' | 'diamond' | null;
  nextTierLabel: string | null;
  pointsToNextTier: number;
  progressPercent: number;
}

export interface WalletSummary {
  id: string;
  userId: string;
  balance: number;
  balanceCents: number;
  currency: string;
  points: number;
  rewards?: RewardsSummary;
  transactions: WalletTransaction[];
}

export interface ActivityData {
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
  ownerType?: 'business' | 'venue' | 'organizer';
  businessProfileId?: string;
  status?: 'draft' | 'published' | 'archived';
  isPromoted?: boolean;
  isPopular?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ActivityInput = Omit<ActivityData, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

export interface CouncilData {
  id: string;
  name: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  lgaCode: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  suburb: string;
  postcode: number;
  country: string;
  description?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  openingHours?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: Partial<Record<'facebook' | 'instagram' | 'linkedin' | 'youtube', string>>;
  emergencyNumbers?: Array<{ label: string; phone: string }>;
}

export interface CouncilWasteSchedule {
  id: string;
  institutionId: string;
  postcode: number;
  suburb: string;
  generalWasteDay: string;
  recyclingDay: string;
  greenWasteDay?: string;
  frequencyGeneral: string;
  frequencyRecycling: string;
  frequencyGreen?: string;
  notes?: string;
}

export interface CouncilAlert {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startAt: string;
  endAt?: string;
  status: 'active' | 'expired' | 'archived';
}

export interface CouncilFacility {
  id: string;
  institutionId?: string;
  name?: string;
  category?: string;
  city?: string;
  country?: string;
  isCouncilOwned?: boolean;
  facilityType?: string;
}

export interface CouncilGrant {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  category: string;
  fundingMin?: number;
  fundingMax?: number;
  opensAt?: string;
  closesAt?: string;
  applicationUrl?: string;
  status: 'upcoming' | 'open' | 'closed';
}

export interface CouncilLink {
  id: string;
  institutionId: string;
  title: string;
  url: string;
  type: string;
}

export interface CouncilPreference {
  category: string;
  enabled: boolean;
}

export interface CouncilWasteReminder {
  userId: string;
  institutionId: string;
  postcode?: number;
  suburb?: string;
  reminderTime: string;
  enabled: boolean;
  updatedAt: string;
}

export interface CouncilDashboard {
  council: CouncilData;
  waste: CouncilWasteSchedule | null;
  alerts: CouncilAlert[];
  events: EventData[];
  facilities: CouncilFacility[];
  grants: CouncilGrant[];
  links: CouncilLink[];
  preferences: CouncilPreference[];
  reminder: CouncilWasteReminder | null;
  following: boolean;
}

export interface CouncilListResponse {
  councils: CouncilData[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface CouncilClaim {
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
}

export interface CouncilClaimLetter {
  id: string;
  councilId: string;
  recipientEmail: string;
  claimUrl: string;
  subject: string;
  body: string;
  sentBy: string;
  sentAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  endpoint: string;
  dryRun: boolean;
  targetedCount: number;
  filters: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Structured error — always carry HTTP status for conditional handling
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isServerError() { return this.status >= 500; }
  get isNetworkError() { return this.status === 0; }
}

// ---------------------------------------------------------------------------
// Internal helper — parse response and surface ApiError on failure
// ---------------------------------------------------------------------------
async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, `Non-JSON response: ${text.slice(0, 200)}`);
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  route: string,
  data?: unknown
): Promise<T> {
  try {
    const res = await apiRequest(method, route, data);
    return parseJson<T>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error) {
      const match = err.message.match(/^(\d{3}):\s*(.*)/s);
      if (match) throw new ApiError(parseInt(match[1]), match[2]);
    }
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error');
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const auth = {
  me: () =>
    request<User>('GET', 'api/auth/me'),
  register: (payload: { displayName?: string; username?: string; city?: string; state?: string; postcode?: number; country?: string }) =>
    request<User>('POST', 'api/auth/register', payload),
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export interface EventListParams {
  city?: string;
  country?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

const events = {
  list: (params: EventListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.country) qs.set('country', params.country);
    if (params.category) qs.set('category', params.category);
    if (params.page != null) qs.set('page', String(params.page));
    if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
    if (params.search) qs.set('search', params.search);
    const query = qs.toString();
    return request<PaginatedEventsResponse>('GET', `api/events${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<EventData>('GET', `api/events/${id}`),

  create: (data: Partial<EventData>) =>
    request<EventData>('POST', 'api/events', data),

  update: (id: string, data: Partial<EventData>) =>
    request<EventData>('PUT', `api/events/${id}`, data),

  publish: (id: string) =>
    request<{ success: boolean }>('POST', `api/events/${id}/publish`),
};

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
const tickets = {
  forUser: (userId: string) =>
    request<Ticket[]>('GET', `api/tickets/${userId}`),

  get: (id: string) =>
    request<Ticket>('GET', `api/ticket/${id}`),

  purchase: (data: { eventId: string; tierId?: string; quantity?: number }) =>
    request<Ticket>('POST', 'api/tickets', data),

  cancel: (id: string) =>
    request<{ success: boolean }>('PUT', `api/tickets/${id}/cancel`),

  scan: (data: { ticketCode: string; scannedBy?: string }) =>
    request<{ valid: boolean; message: string; outcome?: string; ticket?: Ticket }>('POST', 'api/tickets/scan', data),
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export interface SearchParams {
  q: string;
  type?: string;
  city?: string;
  country?: string;
  page?: number;
  pageSize?: number;
}

const search = {
  query: (params: SearchParams) => {
    const qs = new URLSearchParams({ q: params.q });
    if (params.type) qs.set('type', params.type);
    if (params.city) qs.set('city', params.city);
    if (params.country) qs.set('country', params.country);
    if (params.page != null) qs.set('page', String(params.page));
    if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
    return request<{ results: EventData[]; total: number }>('GET', `api/search?${qs}`);
  },

  suggest: (q: string) =>
    request<{ suggestions: string[] }>('GET', `api/search/suggest?q=${encodeURIComponent(q)}`),
};

// ---------------------------------------------------------------------------
// Culture suggestions (onboarding ethnicity/language)
// ---------------------------------------------------------------------------
export interface CultureSuggestParams {
  q: string;
  type?: 'language' | 'ethnicity' | 'all';
  limit?: number;
}

const culture = {
  suggest: (params: CultureSuggestParams) => {
    const qs = new URLSearchParams({ q: params.q });
    if (params.type) qs.set('type', params.type);
    if (params.limit != null) qs.set('limit', String(params.limit));
    return request<{ suggestions: string[]; source?: string }>('GET', `api/culture/suggest?${qs}`);
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const users = {
  me: () =>
    request<User>('GET', 'api/users/me'),

  get: (id: string) =>
    request<User>('GET', `api/users/${id}`),

  update: (id: string, data: Partial<User>) =>
    request<User>('PUT', `api/users/${id}`, data),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const notifications = {
  list: (userId: string) =>
    request<{ id: string; message: string; read: boolean; createdAt: string }[]>(
      'GET', `api/notifications/${userId}`
    ),

  unreadCount: (userId: string) =>
    request<{ count: number }>('GET', `api/notifications/${userId}/unread-count`),

  markRead: (notificationId: string) =>
    request<{ success: boolean }>('PUT', `api/notifications/${notificationId}/read`),

  markAllRead: (userId: string) =>
    request<{ success: boolean }>('PUT', `api/notifications/${userId}/read-all`),

  approvalStatus: (payload: { approvalToken: string }) =>
    request<{ valid: boolean; expiresAt?: string; remainingMs: number }>(
      'POST', 'api/notifications/approval-status', payload,
    ),

  targeted: (payload: {
    title: string;
    message: string;
    type?: NotificationType;
    idempotencyKey?: string;
    approvalToken?: string;
    city?: string;
    country?: string;
    interestsAny?: string[];
    communitiesAny?: string[];
    languagesAny?: string[];
    categoryIdsAny?: string[];
    ethnicityContains?: string;
    dryRun?: boolean;
    limit?: number;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ dryRun: boolean; targetedCount: number; audiencePreview: Array<{ userId: string; city: string; country: string }>; idempotentReplay?: boolean; approvalToken?: string; approvalExpiresAt?: string }>(
      'POST', 'api/notifications/targeted', payload,
    ),
};

const admin = {
  auditLogs: (params?: { limit?: number; action?: string; actorId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.action) qs.set('action', params.action);
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<{ logs: AdminAuditLog[]; limit: number; count: number }>('GET', `api/admin/audit-logs${q ? `?${q}` : ''}`);
  },
  auditLogsCsv: async (params?: { limit?: number; action?: string; actorId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.action) qs.set('action', params.action);
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    const res = await apiRequest('GET', `api/admin/audit-logs.csv${q ? `?${q}` : ''}`);
    return res.text();
  },
};

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
const membership = {
  get: (userId: string) =>
    request<MembershipSummary>(
      'GET', `api/membership/${userId}`
    ),

  memberCount: () =>
    request<{ count: number }>('GET', 'api/membership/member-count'),

  subscribe: (data: { billingPeriod: 'monthly' | 'yearly' }) =>
    request<{ checkoutUrl: string | null; sessionId?: string; devMode?: boolean; alreadyActive?: boolean; membership?: MembershipSummary }>(
      'POST', 'api/membership/subscribe', data
    ),

  cancel: () =>
    request<{ success: boolean; membership?: MembershipSummary }>('POST', 'api/membership/cancel-subscription'),
};

const wallet = {
  get: (userId: string) =>
    request<WalletSummary>('GET', `api/wallet/${userId}`),
  transactions: (userId: string) =>
    request<WalletTransaction[]>('GET', `api/transactions/${userId}`),
  topup: (userId: string, amount: number) =>
    request<WalletSummary>('POST', `api/wallet/${userId}/topup`, { amount }),
};

const rewards = {
  get: (userId: string) =>
    request<RewardsSummary>('GET', `api/rewards/${userId}`),
};

// ---------------------------------------------------------------------------
// Perks
// ---------------------------------------------------------------------------
const perks = {
  list: () => request<PerkData[]>('GET', 'api/perks'),

  get: (id: string) => request<PerkData>('GET', `api/perks/${id}`),

  redeem: (id: string) =>
    request<{ success: boolean; redemption?: Record<string, unknown> }>(
      'POST', `api/perks/${id}/redeem`
    ),
};

// ---------------------------------------------------------------------------
// Profiles (artist / business / venue / community directory)
// ---------------------------------------------------------------------------
const profiles = {
  list: (params?: { entityType?: string; city?: string; country?: string }) => {
    const qs = new URLSearchParams();
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.city) qs.set('city', params.city);
    if (params?.country) qs.set('country', params.country);
    const q = qs.toString();
    return request<Profile[]>('GET', `api/profiles${q ? `?${q}` : ''}`);
  },

  get: (id: string) => request<Profile>('GET', `api/profiles/${id}`),

  create: (payload: Partial<Profile>) =>
    request<Profile>('POST', 'api/profiles', payload),

  update: (id: string, payload: Record<string, unknown>) =>
    request<Profile>('PUT', `api/profiles/${id}`, payload),

  remove: (id: string) =>
    request<{ success: boolean }>('DELETE', `api/profiles/${id}`),
};

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------
const communities = {
  list: (params?: { city?: string; country?: string }) => {
    const qs = new URLSearchParams();
    if (params?.city) qs.set('city', params.city);
    if (params?.country) qs.set('country', params.country);
    const q = qs.toString();
    return request<Community[]>('GET', `api/communities${q ? `?${q}` : ''}`);
  },

  get: (id: string) => request<Community>('GET', `api/communities/${id}`),

  join: (id: string) =>
    request<{ success: boolean; communityId: string }>('POST', `api/communities/${id}/join`),

  leave: (id: string) =>
    request<{ success: boolean }>('DELETE', `api/communities/${id}/leave`),
};

// ---------------------------------------------------------------------------
// Privacy settings
// ---------------------------------------------------------------------------
const privacy = {
  get: (userId: string) =>
    request<PrivacySettings>('GET', `api/privacy/settings/${userId}`),

  update: (userId: string, data: Partial<PrivacySettings>) =>
    request<PrivacySettings>('PUT', `api/privacy/settings/${userId}`, data),
};

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------
const account = {
  delete: (userId: string) =>
    request<{ success: boolean }>('DELETE', `api/account/${userId}`),
};

// ---------------------------------------------------------------------------
// Directory — restaurants, shopping, movies, activities, businesses
// All follow the same list + get pattern
// ---------------------------------------------------------------------------
function directoryNamespace<T = Profile>(basePath: string) {
  return {
    list: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return request<T[]>('GET', `${basePath}${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<T>('GET', `${basePath}/${id}`),
  };
}

const restaurants = directoryNamespace('api/restaurants');
const shopping    = directoryNamespace('api/shopping');
const movies      = directoryNamespace('api/movies');
const activities = {
  list: (params?: { city?: string; country?: string; category?: string; ownerId?: string; promoted?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.city) qs.set('city', params.city);
    if (params?.country) qs.set('country', params.country);
    if (params?.category) qs.set('category', params.category);
    if (params?.ownerId) qs.set('ownerId', params.ownerId);
    if (params?.promoted) qs.set('promoted', 'true');
    const q = qs.toString();
    return request<ActivityData[]>('GET', `api/activities${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<ActivityData>('GET', `api/activities/${id}`),
  create: (payload: ActivityInput) => request<ActivityData>('POST', 'api/activities', payload),
  update: (id: string, payload: Partial<ActivityInput>) => request<ActivityData>('PUT', `api/activities/${id}`, payload),
  remove: (id: string) => request<{ success: boolean }>('DELETE', `api/activities/${id}`),
  promote: (id: string, isPromoted = true) =>
    request<ActivityData>('POST', `api/activities/${id}/promote`, { isPromoted }),
};
const businesses  = {
  ...directoryNamespace<Profile>('api/businesses'),
  /** List businesses, optionally filtering by location or sponsored-only */
  list: (params?: { city?: string; country?: string; sponsored?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.city) qs.set('city', params.city);
    if (params?.country) qs.set('country', params.country);
    if (params?.sponsored) qs.set('sponsored', 'true');
    const q = qs.toString();
    return request<Profile[]>('GET', `api/businesses${q ? `?${q}` : ''}`);
  },
};

const council = {
  list: (params?: { q?: string; state?: string; verificationStatus?: 'verified' | 'unverified'; sortBy?: 'name' | 'state' | 'verification'; sortDir?: 'asc' | 'desc'; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.state) qs.set('state', params.state);
    if (params?.verificationStatus) qs.set('verificationStatus', params.verificationStatus);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.sortDir) qs.set('sortDir', params.sortDir);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<CouncilListResponse>('GET', `api/council/list${q ? `?${q}` : ''}`);
  },
  getSelected: () => request<{ council: CouncilData | null }>('GET', 'api/council/selected'),
  select: (councilId: string) => request<{ success: boolean; councilId: string }>('POST', 'api/council/select', { councilId }),
  my: (params?: { postcode?: number; suburb?: string; city?: string; state?: string; country?: string }) => {
    const qs = new URLSearchParams();
    if (params?.postcode) qs.set('postcode', String(params.postcode));
    if (params?.suburb) qs.set('suburb', params.suburb);
    if (params?.city) qs.set('city', params.city);
    if (params?.state) qs.set('state', params.state);
    if (params?.country) qs.set('country', params.country);
    const q = qs.toString();
    return request<CouncilDashboard>('GET', `api/council/my${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<CouncilData>('GET', `api/council/${id}`),
  waste: (id: string, params?: { postcode?: number; suburb?: string }) => {
    const qs = new URLSearchParams();
    if (params?.postcode) qs.set('postcode', String(params.postcode));
    if (params?.suburb) qs.set('suburb', params.suburb);
    const q = qs.toString();
    return request<CouncilWasteSchedule>('GET', `api/council/${id}/waste${q ? `?${q}` : ''}`);
  },
  alerts: (id: string, category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<CouncilAlert[]>('GET', `api/council/${id}/alerts${q}`);
  },
  events: (id: string) => request<EventData[]>('GET', `api/council/${id}/events`),
  facilities: (id: string) => request<CouncilFacility[]>('GET', `api/council/${id}/facilities`),
  grants: (id: string) => request<CouncilGrant[]>('GET', `api/council/${id}/grants`),
  links: (id: string) => request<CouncilLink[]>('GET', `api/council/${id}/links`),
  follow: (id: string) => request<{ success: boolean; following: boolean; institutionId: string }>('POST', `api/council/${id}/follow`),
  unfollow: (id: string) => request<{ success: boolean; following: boolean; institutionId: string }>('DELETE', `api/council/${id}/follow`),
  getPreferences: (id: string) => request<CouncilPreference[]>('GET', `api/council/${id}/preferences`),
  updatePreferences: (id: string, preferences: CouncilPreference[]) =>
    request<{ success: boolean; preferences: CouncilPreference[] }>('PUT', `api/council/${id}/preferences`, { preferences }),
  getWasteReminder: (id: string) => request<CouncilWasteReminder | null>('GET', `api/council/${id}/waste-reminder`),
  updateWasteReminder: (id: string, payload: { reminderTime: string; enabled: boolean; postcode?: number; suburb?: string }) =>
    request<{ success: boolean; reminder: CouncilWasteReminder }>('PUT', `api/council/${id}/waste-reminder`, payload),
  claim: (id: string, payload: { workEmail: string; roleTitle: string; note?: string }) =>
    request<CouncilClaim>('POST', `api/council/${id}/claim`, payload),
  myClaims: (id: string) => request<CouncilClaim[]>('GET', `api/council/${id}/claims/me`),
  updateProfileMedia: (id: string, payload: { logoUrl?: string; bannerUrl?: string }) =>
    request<CouncilData>('PATCH', `api/council/${id}/profile-media`, payload),
  admin: {
    createAlert: (id: string, payload: Pick<CouncilAlert, 'title' | 'description' | 'category' | 'severity' | 'startAt' | 'endAt' | 'status'>) =>
      request<CouncilAlert>('POST', `api/council/${id}/alerts`, payload),
    updateAlert: (id: string, alertId: string, payload: Partial<Pick<CouncilAlert, 'title' | 'description' | 'category' | 'severity' | 'startAt' | 'endAt' | 'status'>>) =>
      request<CouncilAlert>('PATCH', `api/council/${id}/alerts/${alertId}`, payload),
    deleteAlert: (id: string, alertId: string) =>
      request<{ success: boolean }>('DELETE', `api/council/${id}/alerts/${alertId}`),
    createGrant: (id: string, payload: Pick<CouncilGrant, 'title' | 'description' | 'category' | 'fundingMin' | 'fundingMax' | 'opensAt' | 'closesAt' | 'applicationUrl' | 'status'>) =>
      request<CouncilGrant>('POST', `api/council/${id}/grants`, payload),
    updateGrant: (id: string, grantId: string, payload: Partial<Pick<CouncilGrant, 'title' | 'description' | 'category' | 'fundingMin' | 'fundingMax' | 'opensAt' | 'closesAt' | 'applicationUrl' | 'status'>>) =>
      request<CouncilGrant>('PATCH', `api/council/${id}/grants/${grantId}`, payload),
    deleteGrant: (id: string, grantId: string) =>
      request<{ success: boolean }>('DELETE', `api/council/${id}/grants/${grantId}`),
    listClaims: (status?: 'pending_admin_review' | 'approved' | 'rejected') => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return request<CouncilClaim[]>('GET', `api/admin/council/claims${q}`);
    },
    approveClaim: (claimId: string) =>
      request<{ success: boolean; claim: CouncilClaim }>('POST', `api/admin/council/claims/${claimId}/approve`),
    rejectClaim: (claimId: string, reason?: string) =>
      request<{ success: boolean; claim: CouncilClaim }>('POST', `api/admin/council/claims/${claimId}/reject`, reason ? { reason } : {}),
    sendClaimLetter: (councilId: string, recipientEmail?: string) =>
      request<{ success: boolean; letter: CouncilClaimLetter; message: string }>(
        'POST',
        `api/admin/council/${councilId}/send-claim-letter`,
        recipientEmail ? { recipientEmail } : {},
      ),
  },
};

// ---------------------------------------------------------------------------
// Locations — Firestore-backed hierarchy
// ---------------------------------------------------------------------------
export interface AustralianState {
  name: string;   // e.g. 'New South Wales'
  code: string;   // e.g. 'NSW'
  emoji: string;  // e.g. '🏙️'
  cities: string[];
}

export interface LocationEntry {
  country: string;
  countryCode: string;
  /** State/territory breakdown with city lists */
  states: AustralianState[];
  /** Flat list of all cities across all states (backward compat) */
  cities: string[];
}

export interface LocationsResponse {
  locations: LocationEntry[];
  acknowledgementOfCountry: string;
}

const locations = {
  /** Fetch all location data (states + cities). Cache-first on backend (30 min TTL). */
  list: () => request<LocationsResponse>('GET', 'api/locations'),

  // ── Admin mutations ──────────────────────────────────────────────────────

  /** Re-seed the AU location document with the default dataset. Admin only. */
  seed: (countryCode = 'AU') =>
    request<{ ok: boolean }>('POST', `api/locations/${countryCode}/seed`),

  /** Add a new state/territory. Admin only. */
  addState: (countryCode: string, state: Omit<AustralianState, 'cities'> & { cities?: string[] }) =>
    request<{ ok: boolean; code: string }>('POST', `api/locations/${countryCode}/states`, state),

  /** Update a state's name or emoji. Admin only. */
  updateState: (countryCode: string, stateCode: string, patch: Partial<Pick<AustralianState, 'name' | 'emoji'>>) =>
    request<{ ok: boolean }>('PATCH', `api/locations/${countryCode}/states/${stateCode}`, patch),

  /** Remove a state entirely. Admin only. */
  removeState: (countryCode: string, stateCode: string) =>
    request<{ ok: boolean }>('DELETE', `api/locations/${countryCode}/states/${stateCode}`),

  /** Add a city to a state. Admin only. */
  addCity: (countryCode: string, stateCode: string, city: string) =>
    request<{ ok: boolean; city: string }>('POST', `api/locations/${countryCode}/states/${stateCode}/cities`, { city }),

  /** Remove a city from a state. Admin only. */
  removeCity: (countryCode: string, stateCode: string, city: string) =>
    request<{ ok: boolean }>('DELETE', `api/locations/${countryCode}/states/${stateCode}/cities/${encodeURIComponent(city)}`),
};

// ---------------------------------------------------------------------------
// CulturePass ID lookup
// ---------------------------------------------------------------------------
const cpid = {
  lookup: (id: string) =>
    request<{ cpid: string; name: string; username?: string; tier?: string; org?: string; avatarUrl?: string; city?: string; country?: string; bio?: string; targetId?: string; userId?: string }>('GET', `api/cpid/lookup/${encodeURIComponent(id)}`),
};

// ---------------------------------------------------------------------------
// Named export — single surface for all API calls
// ---------------------------------------------------------------------------
export const api = {
  auth,
  events,
  tickets,
  search,
  users,
  notifications,
  membership,
  wallet,
  rewards,
  perks,
  profiles,
  communities,
  privacy,
  account,
  restaurants,
  shopping,
  movies,
  activities,
  businesses,
  council,
  locations,
  cpid,
  admin,
  culture,
  /** Raw request — use when a specific endpoint isn't covered above */
  raw: request,
  /** Base URL — useful for constructing non-JSON endpoints (e.g. image URLs) */
  baseUrl: getApiUrl,
};

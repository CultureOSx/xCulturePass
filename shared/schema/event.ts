export type EventType =
  | 'festival'
  | 'concert'
  | 'workshop'
  | 'puja'
  | 'sports'
  | 'food'
  | 'cultural'
  | 'community'
  | 'exhibition'
  | 'conference'
  | 'other';

export type AgeSuitability = 'all' | 'family' | '18+' | '21+';

export type PriceTier = 'free' | 'budget' | 'mid' | 'premium';

export interface EventData {
    lgaCode?: string;
    councilId?: string;
  id: string;
  culturePassId?: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  venue?: string;
  address?: string;
  priceCents?: number;
  priceLabel?: string;
  category?: string;
  communityTag?: string;
  organizerId?: string;
  imageColor?: string;
  imageUrl?: string;
  capacity?: number;
  attending?: number;
  isFeatured?: boolean;
  isFree?: boolean;
  tiers?: Array<{ name: string; priceCents: number; available: number }>;
  country: string;
  city: string;
  tags?: string[];
  indigenousTags?: string[];
  languageTags?: string[];
  cultureTag?: string[];
  geoHash?: string;
  eventType?: EventType;
  ageSuitability?: AgeSuitability;
  priceTier?: PriceTier;
  organizerReputationScore?: number;
  externalTicketUrl?: string | null;
  deletedAt?: string | null;
  distanceKm?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscoveryResult {
  event: EventData;
  matchScore: number;
  matchReason: string[];
}

export interface PaginatedEventsResponse {
  events: EventData[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

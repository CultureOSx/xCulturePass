export type MembershipTier = 'free' | 'plus' | 'elite' | 'pro' | 'premium' | 'vip';
export type UserRole = 'user' | 'organizer' | 'business' | 'sponsor' | 'cityAdmin' | 'platformAdmin' | 'moderator' | 'admin';
export type EntityType = 'community' | 'business' | 'venue' | 'artist' | 'organisation';
export type TicketStatus = 'confirmed' | 'used' | 'cancelled' | 'expired';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ContentStatus = 'active' | 'draft' | 'archived' | 'suspended';

export type SocialLinks = Record<string, string> & {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
};

export interface Locatable {
  id: string;
  city: string;
  country: string;
}

// Hierarchical location model
export interface Country {
  code: string;
  name: string;
  emoji?: string;
  phoneCode?: string;
  currency?: string;
  timezone?: string;
  acknowledgement?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface State {
  code: string;
  name: string;
  countryCode: string;
  emoji?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  stateCode: string;
  countryCode: string;
  location: { lat: number; lng: number };
  geoHash: string;
  population?: number;
  timezone?: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Region {
  id: string;
  name: string;
  countryCode: string;
  cities: string[];
  createdAt?: string;
  updatedAt?: string;
}

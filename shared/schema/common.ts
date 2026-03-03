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

export interface Location {
  id: string;
  name: string;
  geoHash: string;
  lat?: number;
  lng?: number;
  suburb?: string;
  state?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flagEmoji?: string;
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  countryCode: string;
  state?: string;
  lat?: number;
  lng?: number;
  geoHash?: string;
  timezone?: string;
  isActive: boolean;
}

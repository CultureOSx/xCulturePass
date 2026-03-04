import type { SocialLinks, ContentStatus } from './common';

export interface CulturalTag {
  id: string;
  name: string;
  slug: string;
  category?: string;
  iconUrl?: string;
}

export interface Organizer {
  id: string;
  name: string;
  reputationScore: number;
  verifiedAt?: string | null;
  contactEmail?: string;
  userId?: string;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  genres?: string[];
  imageUrl?: string;
  coverImageUrl?: string;
  city?: string;
  country?: string;
  socialLinks?: SocialLinks;
  isVerified?: boolean;
  followersCount?: number;
  culturePassId?: string;
  ownerId?: string;
  status?: ContentStatus;
  createdAt?: string;
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  geoHash?: string;
  capacity?: number;
  imageUrl?: string;
  website?: string;
  phone?: string;
  isVerified?: boolean;
  culturePassId?: string;
  status?: ContentStatus;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  city?: string;
  country?: string;
  ownerId?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  isVerified?: boolean;
  status?: ContentStatus;
  createdAt?: string;
}

export interface Council {
  id: string;
  name: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  lgaCode: string;
  suburb: string;
  postcode: number;
  country: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  websiteUrl?: string;
  email?: string;
  phone?: string;
  openingHours?: string;
  status?: 'active' | 'draft' | 'suspended';
}

export interface Facility {
  id: string;
  institutionId: string;
  name: string;
  category?: string;
  facilityType?: string;
  city?: string;
  country?: string;
  isCouncilOwned?: boolean;
}

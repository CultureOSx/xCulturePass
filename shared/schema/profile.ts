import type { EntityType, SocialLinks } from './common';

export interface Profile {
  id: string;
  name: string;
  slug?: string;
  title?: string;
  type?: EntityType;
  entityType: 'community' | 'business' | 'venue' | 'artist' | 'organizer' | 'restaurant' | 'brand';
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  gallery?: string[];
  city?: string;
  country?: string;
  location?: { lat: number; lng: number };
  geoHash?: string;
  status?: 'draft' | 'published' | 'suspended';
  visibility?: 'public' | 'private' | 'community_only';
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  reportCount?: number;
  isClaimed?: boolean;
  isVerified?: boolean;
  followersCount?: number;
  views?: number;
  likes?: number;
  eventsCount?: number;
  membersCount?: number;
  reviewsCount?: number;
  rating?: number;
  category?: string;
  subCategory?: string;
  tags?: string[];
  cultureTags?: string[];
  languages?: string[];
  website?: string;
  contactEmail?: string;
  phone?: string;
  socialLinks?: SocialLinks;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  spotify?: string;
  tiktok?: string;
  councilId?: string;
  parentCommunityId?: string;
  upcomingEventsCount?: number;
  pastEventsCount?: number;
  perksAvailable?: number;
  membershipRequired?: boolean;
  sponsorLevel?: string;
  bio?: string;
  address?: string;
  openingHours?: string;
  hours?: string;
  priceRange?: string;
  priceLabel?: string;
  color?: string;
  icon?: string;
  isOpen?: boolean;
  cuisine?: string;
  menuHighlights?: string[];
  deals?: string[];
  deliveryAvailable?: boolean;
  reservationAvailable?: boolean;
  reviews?: { id: string; userId: string; rating: number; comment?: string; createdAt?: string }[];
  services?: string[];
  isIndigenousOwned?: boolean;
  indigenousCategory?: string;
  supplyNationRegistered?: boolean;
  genre?: string[];
  director?: string;
  cast?: string[];
  duration?: string;
  language?: string;
  imdbScore?: number;
  posterColor?: string;
    ownerId?: string;
    createdAt: string;
    updatedAt?: string;
  showtimes?: { time: string; cinema?: string; date?: string; price?: number }[];

  isPopular?: boolean;
  ageGroup?: string;
  highlights?: string[];
  features?: string[];

  isSponsored?: boolean;
  sponsorTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Community extends Omit<Profile, 'type'> {
  type: 'community';
  membersCount?: number;
  memberCount?: number;
  category?: string;
  communityType?: string;
  iconEmoji?: string;
  isIndigenous?: boolean;
  countryOfOrigin?: string;
}

export interface Review {
  id: string;
  profileId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string | null;
}

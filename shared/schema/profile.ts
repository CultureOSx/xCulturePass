import type { EntityType, SocialLinks } from './common';

export interface Profile {
  id: string;
  name: string;
  title?: string;
  type?: EntityType;
  entityType: string;
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  images?: string[];
  city?: string;
  country?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  isVerified?: boolean;
  followersCount?: number;
  likesCount?: number;
  membersCount?: number;
  reviewsCount?: number;
  rating?: number;
  category?: string;
  culturePassId?: string;
  bio?: string;
  address?: string;
  openingHours?: string;
  hours?: string;
  website?: string;
  email?: string;
  phone?: string;
  socialLinks?: SocialLinks;

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
  reviews?: Array<{ id: string; userId: string; rating: number; comment?: string; createdAt?: string }>;
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
  showtimes?: Array<{ time: string; cinema?: string; date?: string; price?: number }>;

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

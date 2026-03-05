import type { MembershipTier, UserRole, SocialLinks } from './common';

export interface Membership {
  id: string;
  userId: string;
  tier: MembershipTier;
  validUntil?: string;
  isActive?: boolean;
  benefits?: string[];
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  points: number;
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  city?: string;
  state?: string;
  postcode?: number;
  country?: string;
  bio?: string;
  interests?: string[];
  location?: string;
  socialLinks?: SocialLinks;
  isVerified?: boolean;
  isSydneyVerified?: boolean;
  culturePassId?: string;
  ethnicityText?: string;
  languages?: string[];
  communities?: string[];
  interestCategoryIds?: string[];
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
  createdAt: string;
  updatedAt?: string;
  website?: string;
  phone?: string;
  membership?: Membership;
  role?: UserRole;
}

export interface RecommendationProfile {
  userId: string;
  culturalTagWeights: Record<string, number>;
  eventTypeWeights: Record<string, number>;
  updatedAt: string;
}

export type RewardsTier = 'standard' | 'silver' | 'gold' | 'diamond';

export interface RewardsAccount {
  userId: string;
  points: number;
  tier: RewardsTier;
  lifetimePoints: number;
  updatedAt: string;
}

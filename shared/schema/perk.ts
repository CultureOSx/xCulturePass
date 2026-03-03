import type { ContentStatus, MembershipTier } from './common';

export type PerkType =
  | 'discount_percent'
  | 'discount_fixed'
  | 'free_ticket'
  | 'early_access'
  | 'vip_upgrade'
  | 'cashback';

export interface Perk {
  id: string;
  title: string;
  description?: string;
  perkType: PerkType;
  discountPercent?: number;
  discountFixedCents?: number;
  providerType?: string;
  providerId?: string;
  providerName?: string;
  category?: string;
  isMembershipRequired?: boolean;
  requiredMembershipTier?: MembershipTier;
  usageLimit?: number;
  usedCount?: number;
  perUserLimit?: number;
  status?: ContentStatus;
  startDate?: string;
  endDate?: string;
  city?: string;
  country?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface PerkRedemption {
  id: string;
  perkId: string;
  userId: string;
  redeemedAt: string;
}

import type { TicketStatus } from './common';

export interface TicketHistoryEntry {
  at: string;
  status: TicketStatus | string;
  note?: string;
}

export interface TicketAuditEntry {
  at: string;
  by: string;
  action: string;
}

export interface Ticket {
  id: string;
  cpTicketId?: string;
  ticketCode?: string;
  eventId: string;
  bookingId?: string;
  userId: string;
  tierName?: string;
  quantity?: number;
  seatNumber?: string;
  section?: string;
  row?: string;
  totalPriceCents?: number;
  currency?: string;
  status: 'reserved' | 'confirmed' | 'cancelled' | 'used' | 'expired';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  qrCode?: string;
  qrSecret?: string;
  qrExpiresAt?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  cashbackCents?: number;
  rewardPointsEarned?: number;
  rewardPointsAwardedAt?: string;
  refundStatus?: 'pending' | 'approved' | 'rejected' | 'completed';
  refundAmountCents?: number;
  refundedAt?: string;
  eventSnapshot?: {
    title: string;
    venue: string;
    startAt: string;
  };
  source?: string;
  campaign?: string;
  history: Array<{
    action: string;
    at: string;
    by?: string;
    note?: string;
  }>;
  staffAuditTrail?: TicketAuditEntry[];
  createdAt: string;
  updatedAt?: string;
}

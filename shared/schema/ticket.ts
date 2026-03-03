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
  eventId: string;
  userId: string;
  title?: string;
  eventName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  date?: string;
  venue?: string;
  qrCode?: string;
  ticketCode?: string;
  tierName?: string;
  quantity?: number;
  totalPriceCents?: number;
  imageColor?: string;
  rewardPointsEarned?: number;
  rewardPointsAwardedAt?: string;
  status: TicketStatus | null;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed';
  scannedAt?: string;
  history: TicketHistoryEntry[];
  staffAuditTrail?: TicketAuditEntry[];
}

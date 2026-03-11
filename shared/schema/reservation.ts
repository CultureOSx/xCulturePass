export interface Reservation {
  id: string;
  eventId: string;
  ticketId?: string;
  userId: string;
  status: 'reserved' | 'released' | 'expired' | 'completed';
  expiresAt: string;
  createdAt: string;
}

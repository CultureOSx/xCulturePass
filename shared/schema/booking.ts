export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  eventId: string;
  ticketIds: string[];
  quantity: number;
  totalPriceCents: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

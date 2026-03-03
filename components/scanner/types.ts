export type ScanMode = 'tickets' | 'culturepass';

export type TicketScanResult = {
  valid: boolean;
  message: string;
  outcome?: 'accepted' | 'duplicate' | 'rejected';
  ticket?: {
    id: string;
    eventTitle: string;
    eventDate: string | null;
    eventTime: string | null;
    eventVenue: string | null;
    tierName: string | null;
    quantity: number | null;
    totalPriceCents: number | null;
    status: string | null;
    ticketCode: string | null;
    scannedAt: string | null;
    userId?: string | null;
  };
};

export type CulturePassContact = {
  cpid: string;
  name: string;
  username?: string;
  tier?: string;
  org?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  bio?: string;
  userId?: string;
};

export type SessionStats = {
  accepted: number;
  duplicates: number;
  rejected: number;
  startedAt: Date;
};

import type { ReportStatus } from './common';

export interface ContentReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'event' | 'profile' | 'community' | 'user' | 'comment';
  reason: string;
  details?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

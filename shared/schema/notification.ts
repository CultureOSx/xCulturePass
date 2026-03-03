export type NotificationType =
  | 'recommendation'
  | 'system'
  | 'event'
  | 'perk'
  | 'community'
  | 'payment'
  | 'follow'
  | 'review'
  | 'ticket'
  | 'membership';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  deepLink?: string;
  createdAt: string;
}

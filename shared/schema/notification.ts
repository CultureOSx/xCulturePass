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
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

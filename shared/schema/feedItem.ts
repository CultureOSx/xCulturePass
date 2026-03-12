export type FeedItemType = 'event_created' | 'announcement' | 'perk_added' | 'event_reminder';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  communityId: string;
  city: string;
  referenceId: string;
  createdAt: string;
  updatedAt?: string;
  
  // Optional pre-fetched payload so the client doesn't have to query the actual document
  payload?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    date?: string;
    venue?: string;
    authorName?: string;
    authorAvatar?: string;
  };
}

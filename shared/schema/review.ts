export interface Review {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

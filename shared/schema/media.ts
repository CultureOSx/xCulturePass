export interface MediaAttachment {
  id: string;
  targetType: string;
  targetId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  targetId: string;
  targetType: 'user' | 'community' | 'artist' | 'profile';
  createdAt: string;
}

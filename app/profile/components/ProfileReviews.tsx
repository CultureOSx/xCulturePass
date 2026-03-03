import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Review } from '@/shared/schema';

interface ProfileReviewsProps {
  reviews: Review[] | undefined;
}

function timeAgo(dateStr: string | Date | null) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

export function ProfileReviews({ reviews }: ProfileReviewsProps) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
      {reviews.slice(0, 5).map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Ionicons name="person" size={16} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewerName}>{'Anonymous'}</Text>
              <View style={styles.miniStars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Ionicons
                    key={i}
                    name={i < review.rating ? 'star' : 'star-outline'}
                    size={12}
                    color={Colors.accent}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
          </View>
          {review.comment && <Text style={styles.reviewBody}>{review.comment}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
  },
  miniStars: { flexDirection: 'row', gap: 1 },
  reviewDate: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textTertiary,
  },
  reviewBody: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

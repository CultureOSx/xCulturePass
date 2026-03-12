import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Skeleton } from './ui/Skeleton';
import { useColors } from '@/hooks/useColors';
import { CardTokens, Colors } from '@/constants/theme';

export function CommunityCardSkeleton() {
  const colors = useColors();

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.surface, borderColor: colors.borderLight },
      Colors.shadows.small,
    ]}>
      {/* Icon Placeholder */}
      <Skeleton width={50} height={50} borderRadius={16} style={styles.iconWrap} />
      
      {/* Name Placeholder */}
      <Skeleton width="80%" height={16} borderRadius={4} style={styles.name} />
      
      {/* Members Placeholder */}
      <Skeleton width="40%" height={12} borderRadius={4} style={styles.members} />
      
      {/* Description Placeholder */}
      <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
      <Skeleton width="60%" height={12} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 196,
    borderRadius: CardTokens.radius,
    padding: CardTokens.padding,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 12, // assuming used in a standard scroll rail with gap or flex
  },
  iconWrap: {
    marginBottom: 14,
  },
  name: {
    marginBottom: 8,
  },
  members: {
    marginBottom: 14,
  },
});

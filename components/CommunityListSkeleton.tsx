import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './ui/Skeleton';
import { useColors } from '@/hooks/useColors';

export function CommunityListSkeleton() {
  const colors = useColors();

  return (
    <View style={[
      styles.lcCard,
      { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }
    ]}>
      {/* Icon Placeholder */}
      <Skeleton width={56} height={56} borderRadius={16} style={styles.iconBox} />
      
      <View style={styles.center}>
        <View style={styles.nameRow}>
          <Skeleton width="50%" height={16} borderRadius={4} />
        </View>
        <View style={styles.metaRow}>
          <Skeleton width={80} height={20} borderRadius={8} />
          <Skeleton width={100} height={12} borderRadius={4} />
        </View>
      </View>
      
      <View style={styles.right}>
        <Skeleton width={40} height={14} borderRadius={4} />
        <Skeleton width={64} height={34} borderRadius={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 16,
    borderWidth: 1,
  },
  iconBox: {
    flexShrink: 0,
  },
  center: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 10,
  },
});

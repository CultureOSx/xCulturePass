import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Skeleton } from './ui/Skeleton';
import { useColors } from '@/hooks/useColors';
import { CultureTokens, CardTokens } from '@/constants/theme';

export function FeedCardSkeleton() {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.contentWrap}>
        
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Skeleton width={36} height={36} borderRadius={12} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <View>
               <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.05)' }} />
               <Skeleton width={60} height={10} borderRadius={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            </View>
          </View>
        </View>

        {/* Media Block */}
        <View style={styles.mediaContainer}>
           <Skeleton width="100%" height={200} borderRadius={16} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </View>

        {/* Text Details Block */}
        <View style={{ gap: 6 }}>
           <Skeleton width="90%" height={16} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
           <Skeleton width="75%" height={16} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
           <Skeleton width="50%" height={16} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 20,
  },
  contentWrap: {
    padding: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
});

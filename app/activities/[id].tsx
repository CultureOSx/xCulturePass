import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: act, isLoading } = useQuery({
    queryKey: ['/api/activities', id],
    queryFn: () => api.activities.get(id),
    enabled: !!id,
  });

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/activities/${id}`;
      await Share.share({
        title: `${act?.name} on CulturePass`,
        message: `Check out ${act?.name} on CulturePass! ${act?.category} - ${act?.duration}. ${act?.location}. ${act?.priceLabel}. Rating: ${act?.rating}/5.\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  if (isLoading) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={CultureTokens.teal} />
      </View>
    </ErrorBoundary>
  );

  if (!act) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_500Medium' }}>Activity not found</Text>
      </View>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{act.name}</Text>
          <Pressable style={styles.headerBtn} hitSlop={10} onPress={handleShare} accessibilityRole="button">
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
          <View style={styles.banner}>
            <Image source={{ uri: act.imageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            {act.isPopular && (
              <View style={styles.popularBadge}>
                <Ionicons name="flame" size={14} color="#0B0B14" />
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.name}>{act.name}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="compass" size={14} color={CultureTokens.teal} />
                <Text style={styles.metaText}>{act.category}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="time" size={14} color={CultureTokens.teal} />
                <Text style={styles.metaText}>{act.duration}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="people" size={14} color={CultureTokens.teal} />
                <Text style={styles.metaText}>{act.ageGroup}</Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons 
                  key={s} 
                  name={s <= Math.floor(act.rating ?? 0) ? "star" : "star-outline"} 
                  size={18} 
                  color={CultureTokens.gold} 
                />
              ))}
              <Text style={styles.ratingNum}>{act.rating}</Text>
              <Text style={styles.reviewCount}>({act.reviewsCount ?? 0} reviews)</Text>
            </View>
            
            <Text style={styles.desc}>{act.description}</Text>

            <View style={styles.locCard}>
              <View style={styles.locIconBox}>
                <Ionicons name="location" size={20} color={CultureTokens.teal} />
              </View>
              <Text style={styles.locText}>{act.location}</Text>
            </View>

            {act.highlights && act.highlights.length > 0 && (
              <>
                <Text style={styles.subTitle}>Highlights</Text>
                <View style={styles.highlightGrid}>
                  {act.highlights.map((h: string) => (
                    <View key={h} style={styles.highlightItem}>
                      <Ionicons name="checkmark-circle" size={20} color={CultureTokens.success} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
          <Text style={styles.bottomPrice}>{act.priceLabel}</Text>
          <Pressable 
            style={styles.bookBtn} 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Booking Confirmed!', `Your booking for ${act.name} has been confirmed.\n\nPrice: ${act.priceLabel}`);
            }}
          >
            <Ionicons name="ticket" size={20} color="#0B0B14" />
            <Text style={styles.bookText}>Book Now</Text>
          </Pressable>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 12 
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontFamily: 'Poppins_700Bold', 
    color: '#FFFFFF', 
    flex: 1, 
    textAlign: 'center', 
    marginHorizontal: 12 
  },
  banner: { height: 260, position: 'relative', overflow: 'hidden' },
  popularBadge: { 
    position: 'absolute', 
    top: 16, 
    left: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: CultureTokens.teal, 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CultureTokens.teal + '50',
  },
  popularText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#0B0B14', letterSpacing: 0.5, textTransform: 'uppercase' },
  info: { padding: 20, gap: 16 },
  name: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  metaText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.8)' },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: CultureTokens.gold, marginLeft: 6 },
  reviewCount: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', marginLeft: 4 },
  
  desc: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 24 },
  
  locCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  locIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CultureTokens.teal + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: '#FFFFFF', flex: 1, lineHeight: 22 },
  
  subTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginTop: 8 },
  highlightGrid: { gap: 12 },
  highlightItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  highlightText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: '#FFFFFF', flex: 1 },
  
  bottomBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    backgroundColor: 'rgba(11,11,20,0.95)', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)' 
  },
  bottomPrice: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  bookBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: CultureTokens.teal, 
    paddingHorizontal: 28, 
    paddingVertical: 16, 
    borderRadius: 16 
  },
  bookText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
});

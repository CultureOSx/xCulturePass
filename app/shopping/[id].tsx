import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Share, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ShoppingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: store, isLoading } = useQuery({
    queryKey: ['/api/shopping', id],
    queryFn: () => api.shopping.get(id),
    enabled: !!id,
  });

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/shopping/${id}`;
      await Share.share({
        title: `${store?.name} on CulturePass`,
        message: `Check out ${store?.name} on CulturePass! ${store?.category} - ${store?.location}. Rating: ${store?.rating}/5 (${store?.reviewsCount ?? 0} reviews).${(store?.deals?.length ?? 0) > 0 ? ` ${store?.deals?.length} deals available!` : ''}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  if (isLoading) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={CultureTokens.indigo} />
      </View>
    </ErrorBoundary>
  );

  if (!store) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_500Medium' }}>Store not found</Text>
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
          <Text style={styles.headerTitle} numberOfLines={1}>{store.name}</Text>
          <Pressable style={styles.headerBtn} hitSlop={10} onPress={handleShare} accessibilityRole="button">
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 80 }}>
          <View style={styles.banner}>
            <Image source={{ uri: store.imageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            {store.isOpen && (
              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open Now</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.name}>{store.name}</Text>
            <Text style={styles.cat}>{store.category}</Text>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons 
                  key={s} 
                  name={s <= Math.floor(store.rating ?? 0) ? "star" : "star-outline"} 
                  size={18} 
                  color={CultureTokens.gold} 
                />
              ))}
              <Text style={styles.ratingNum}>{store.rating}</Text>
              <Text style={styles.reviewCount}>({store.reviewsCount ?? 0} reviews)</Text>
            </View>
            
            <Text style={styles.desc}>{store.description}</Text>

            <View style={styles.locCard}>
              <View style={[styles.locIconBox, { backgroundColor: CultureTokens.indigo + '15' }]}>
                <Ionicons name="location" size={20} color={CultureTokens.indigo} />
              </View>
              <Text style={styles.locText}>{[store.address, store.city, store.country].filter(Boolean).join(", ")}</Text>
            </View>

            <View style={styles.featureRow}>
              {store.deliveryAvailable && (
                <View style={[styles.featurePill, { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo + '30' }]}>
                  <Ionicons name="bicycle" size={16} color={CultureTokens.indigo} />
                  <Text style={[styles.featureText, { color: CultureTokens.indigo }]}>Delivery Available</Text>
                </View>
              )}
              {store.isOpen && (
                <View style={[styles.featurePill, { backgroundColor: CultureTokens.success + '15', borderColor: CultureTokens.success + '30' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={CultureTokens.success} />
                  <Text style={[styles.featureText, { color: CultureTokens.success }]}>Open Now</Text>
                </View>
              )}
            </View>

            {(store.deals?.length ?? 0) > 0 && (
              <View style={styles.dealsSection}>
                <Text style={styles.subTitle}>Current Deals & Offers</Text>
                {(store.deals ?? []).map((deal: any, i: number) => (
                  <View key={i} style={styles.dealCard}>
                    <View style={styles.dealHeader}>
                      <View style={styles.dealIconBox}>
                        <Ionicons name="pricetag" size={16} color={CultureTokens.indigo} />
                      </View>
                      <Text style={styles.dealTitle}>{deal.title}</Text>
                    </View>
                    <View style={styles.dealBody}>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{deal.discount}</Text>
                      </View>
                      <Text style={styles.dealValid}>Valid till {new Date(deal.validTill).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
          </View>
        </ScrollView>
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
  banner: { height: 240, position: 'relative', overflow: 'hidden' },
  openBadge: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: 'rgba(11,11,20,0.8)', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CultureTokens.success },
  openText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' },
  info: { padding: 20, gap: 14 },
  name: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  cat: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  locText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: '#FFFFFF', flex: 1, lineHeight: 22 },
  
  featureRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  featurePill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12,
    borderWidth: 1,
  },
  featureText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  
  dealsSection: { marginTop: 8, gap: 12 },
  subTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginBottom: 4 },
  dealCard: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: CultureTokens.indigo + '30', 
    overflow: 'hidden' 
  },
  dealHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.06)' 
  },
  dealIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: CultureTokens.indigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', flex: 1 },
  dealBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  discountBadge: { backgroundColor: CultureTokens.indigo, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  discountText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
  dealValid: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
});

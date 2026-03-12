import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Linking, Share, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: rest, isLoading } = useQuery({
    queryKey: ['/api/restaurants', id],
    queryFn: () => api.restaurants.get(id),
    enabled: !!id,
  });

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/restaurants/${id}`;
      await Share.share({
        title: `${rest?.name} on CulturePass`,
        message: `Check out ${rest?.name} on CulturePass! ${rest?.cuisine} - ${rest?.priceRange}. ${rest?.address}. Rating: ${rest?.rating}/5 (${rest?.reviewsCount} reviews).\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  const handleReserve = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Reservation Request', `Your reservation request at ${rest?.name} has been submitted. You will receive a confirmation shortly.`, [{ text: 'OK' }]);
  };

  if (isLoading) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={CultureTokens.coral} />
      </View>
    </ErrorBoundary>
  );

  if (!rest) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_500Medium' }}>Restaurant not found</Text>
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
          <Text style={styles.headerTitle} numberOfLines={1}>{rest.name}</Text>
          <Pressable style={styles.headerBtn} hitSlop={10} onPress={handleShare} accessibilityRole="button">
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
          <View style={styles.banner}>
            <Image source={{ uri: rest.imageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            {rest.isOpen && (
              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open Now</Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.name}>{rest.name}</Text>
            <Text style={styles.cuisine}>{rest.cuisine} | {rest.priceRange} | {rest.reviewsCount ?? 0} reviews</Text>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons 
                  key={s} 
                  name={s <= Math.floor(rest.rating ?? 0) ? "star" : s - 0.5 <= (rest.rating ?? 0) ? "star-half" : "star-outline"} 
                  size={18} 
                  color={CultureTokens.gold} 
                />
              ))}
              <Text style={styles.ratingNum}>{rest.rating}</Text>
            </View>
            
            <Text style={styles.desc}>{rest.description}</Text>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBox, { backgroundColor: CultureTokens.coral + '15' }]}>
                  <Ionicons name="time" size={18} color={CultureTokens.coral} />
                </View>
                <Text style={styles.detailText}>{rest.hours || 'Hours not available'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBox, { backgroundColor: CultureTokens.coral + '15' }]}>
                  <Ionicons name="location" size={18} color={CultureTokens.coral} />
                </View>
                <Text style={styles.detailText}>{rest.address}</Text>
              </View>
              <View style={styles.divider} />
              <Pressable 
                style={({ pressed }) => [styles.detailRow, pressed && { opacity: 0.7 }]} 
                onPress={() => Linking.openURL(`tel:${rest.phone}`)}
              >
                <View style={[styles.detailIconBox, { backgroundColor: CultureTokens.coral + '15' }]}>
                  <Ionicons name="call" size={18} color={CultureTokens.coral} />
                </View>
                <Text style={[styles.detailText, { color: CultureTokens.coral, fontFamily: 'Poppins_600SemiBold' }]}>{rest.phone}</Text>
              </Pressable>
            </View>

            {rest.features && rest.features.length > 0 && (
              <>
                <Text style={styles.subTitle}>Features</Text>
                <View style={styles.featureGrid}>
                  {rest.features.map((f: string) => (
                    <View key={f} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color={CultureTokens.success} />
                      <Text style={styles.featureLabel}>{f}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {rest.menuHighlights && rest.menuHighlights.length > 0 && (
              <>
                <Text style={styles.subTitle}>Menu Highlights</Text>
                <View style={styles.menuGrid}>
                  {rest.menuHighlights.map((item: string) => (
                    <View key={item} style={styles.menuItem}>
                      <Ionicons name="restaurant-outline" size={16} color={CultureTokens.coral} />
                      <Text style={styles.menuItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
          <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${rest.phone}`)}>
            <Ionicons name="call" size={20} color={CultureTokens.coral} />
          </Pressable>
          {rest.reservationAvailable ? (
            <Pressable style={styles.reserveButton} onPress={handleReserve}>
              <Ionicons name="calendar" size={18} color="#0B0B14" />
              <Text style={styles.reserveText}>Make Reservation</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.reserveButton, { backgroundColor: CultureTokens.saffron }]} onPress={() => Alert.alert('Order', 'Opening delivery options...')}>
              <Ionicons name="bicycle" size={18} color="#0B0B14" />
              <Text style={[styles.reserveText, { color: '#0B0B14' }]}>Order Delivery</Text>
            </Pressable>
          )}
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
  banner: { height: 280, position: 'relative', overflow: 'hidden' },
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
  infoSection: { padding: 20, gap: 14 },
  name: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  cuisine: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: CultureTokens.gold, marginLeft: 6 },
  desc: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 24 },
  
  detailCard: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    overflow: 'hidden',
    marginTop: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  detailIconBox: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  detailText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#FFFFFF', flex: 1, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 66 },
  
  subTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginTop: 12 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: CultureTokens.success + '15', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CultureTokens.success + '30',
  },
  featureLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  
  menuGrid: { gap: 10 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 14, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  menuItemText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#FFFFFF', flex: 1 },
  
  bottomBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    backgroundColor: 'rgba(11,11,20,0.95)', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)' 
  },
  callButton: { 
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: CultureTokens.coral + '15',
    borderWidth: 1, 
    borderColor: CultureTokens.coral + '50',
  },
  reserveButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    backgroundColor: CultureTokens.coral, 
    height: 56, 
    borderRadius: 16 
  },
  reserveText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
});

import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: business, isLoading } = useQuery({
    queryKey: ['/api/businesses', id],
    queryFn: () => api.businesses.get(id as string),
    enabled: !!id,
  });
  
  const { data: councilData } = useQuery({
    queryKey: ['/api/council/my', business?.city, business?.country],
    queryFn: () => api.council.my({ city: business?.city, country: business?.country }),
    enabled: !!business,
  });
  
  const council = councilData?.council;
  const isCouncilVerified = council?.verificationStatus === 'verified';
  const lgaCode = council?.lgaCode;

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
        </View>
      </ErrorBoundary>
    );
  }

  if (!business) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>Business not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.floor(business.rating ?? 0));
  const accentColor = business.color || CultureTokens.indigo;

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <View style={[styles.hero, { backgroundColor: accentColor, paddingTop: topInset }]}>
          <LinearGradient
            colors={['rgba(11,11,20,0.1)', 'rgba(11,11,20,0.4)', '#0B0B14']}
            locations={[0, 0.4, 1]}
            style={styles.heroOverlay}
          >
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            
            <View style={styles.heroBottom}>
              <View style={[styles.heroIconWrap, { backgroundColor: accentColor + '40', borderColor: accentColor + '80' }]}>
                <Ionicons name={business.icon as any} size={32} color="#FFFFFF" />
              </View>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroTitle}>{business.name}</Text>
                {business.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={CultureTokens.success} />
                    <Text style={[styles.verifiedText, { color: CultureTokens.success }]}>Verified</Text>
                  </View>
                )}
                {business.isIndigenousOwned && (
                  <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(139,69,19,0.2)', borderColor: 'rgba(139,69,19,0.4)' }]}>
                    <Ionicons name="earth" size={16} color={CultureTokens.saffron} />
                    <Text style={[styles.verifiedText, { color: CultureTokens.saffron }]}>Indigenous Owned</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroCategory}>{business.category} - {business.priceRange}</Text>
              {isCouncilVerified && council ? (
                <View style={[styles.verifiedBadge, { backgroundColor: CultureTokens.indigo + '20', borderColor: CultureTokens.indigo + '40', marginTop: 8 }]}>
                  <Ionicons name="shield-checkmark" size={16} color={CultureTokens.indigo} />
                  <Text style={[styles.verifiedText, { color: CultureTokens.indigo }]}>Council Verified • LGA {lgaCode}</Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
          <View style={styles.ratingSection}>
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>
                {stars.map((filled, i) => (
                  <Ionicons
                    key={i}
                    name={filled ? "star" : "star-outline"}
                    size={20}
                    color={CultureTokens.gold}
                  />
                ))}
              </View>
              <Text style={styles.ratingNum}>{business.rating}</Text>
              <Text style={styles.reviewText}>({business.reviewsCount ?? 0} reviews)</Text>
            </View>
          </View>

          {business.isIndigenousOwned && (
            <View style={styles.section}>
              <View style={styles.indigenousBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={styles.indigenousIconBox}>
                    <Ionicons name="earth" size={20} color={CultureTokens.saffron} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.indigenousTitle}>100% Indigenous Owned</Text>
                    {business.indigenousCategory && (
                      <Text style={styles.indigenousSub}>{business.indigenousCategory}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={styles.indigenousTag}>
                    <Ionicons name="checkmark-circle" size={14} color={CultureTokens.saffron} />
                    <Text style={styles.indigenousTagText}>Indigenous Owned</Text>
                  </View>
                  {business.supplyNationRegistered && (
                    <View style={styles.supplyNationTag}>
                      <Ionicons name="shield-checkmark" size={14} color={CultureTokens.teal} />
                      <Text style={styles.supplyNationTagText}>Supply Nation</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            {(business as any).cpid && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="finger-print-outline" size={16} color={CultureTokens.indigo} />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: CultureTokens.indigo }}>{(business as any).cpid}</Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{business.description}</Text>
          </View>

          <View style={styles.sectionDivider}>
            <View style={[styles.accentBar, { backgroundColor: accentColor + '40' }]} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.servicesGrid}>
              {(business.services ?? []).map((service: string, idx: number) => (
                <View key={idx} style={styles.serviceCard}>
                  <View style={[styles.serviceIconBg, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                  </View>
                  <Text style={styles.serviceCardText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionDivider}>
            <View style={[styles.accentBar, { backgroundColor: accentColor + '40' }]} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <View style={[styles.contactIconBg, { backgroundColor: CultureTokens.teal + '15' }]}>
                  <Ionicons name="location" size={20} color={CultureTokens.teal} />
                </View>
                <Text style={styles.contactText}>{[business.address, business.city, business.country].filter(Boolean).join(", ")}</Text>
              </View>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={[styles.contactIconBg, { backgroundColor: CultureTokens.indigo + '15' }]}>
                  <Ionicons name="call" size={20} color={CultureTokens.indigo} />
                </View>
                <Text style={styles.contactText}>{business.phone}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
          <Pressable
            style={({ pressed }) => [styles.callButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL(`tel:${business.phone}`);
            }}
          >
            <Ionicons name="call" size={20} color={CultureTokens.indigo} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.bookButton, { backgroundColor: accentColor }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          >
            <Ionicons name="calendar" size={20} color="#0B0B14" />
            <Text style={styles.bookText}>Book Service</Text>
          </Pressable>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  errorText: { fontSize: 16, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  backLink: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  
  hero: { height: 320 },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  heroBottom: { gap: 10 },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 34,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  verifiedText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  heroCategory: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  
  ratingSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingNum: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  sectionDivider: {
    paddingHorizontal: 20,
    marginTop: 28,
    alignItems: 'center',
  },
  accentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  
  indigenousBox: {
    backgroundColor: 'rgba(255, 140, 66, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: CultureTokens.saffron,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.2)'
  },
  indigenousIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CultureTokens.saffron + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indigenousTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  indigenousSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  
  indigenousTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CultureTokens.saffron + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CultureTokens.saffron + '30'
  },
  indigenousTagText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron },
  
  supplyNationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CultureTokens.teal + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CultureTokens.teal + '30'
  },
  supplyNationTagText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.teal },

  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  serviceIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  contactIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
    flex: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 68,
  },
  
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CultureTokens.indigo + '15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CultureTokens.indigo + '40',
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    height: 56,
  },
  bookText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#0B0B14'
  },
});

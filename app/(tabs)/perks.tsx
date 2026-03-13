import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { apiRequest, queryClient, getQueryFn } from '@/lib/query-client';
import { api } from '@/lib/api';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useCouncil } from '@/hooks/useCouncil';
import { useLayout } from '@/hooks/useLayout';
import { CultureTokens, gradients } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const isWeb = Platform.OS === 'web';

interface Perk {
  id: string;
  title: string;
  description: string | null;
  perkType: string;
  discountPercent: number | null;
  discountFixedCents: number | null;
  providerType: string | null;
  providerId: string | null;
  providerName: string | null;
  category: string | null;
  isMembershipRequired: boolean | null;
  requiredMembershipTier: string | null;
  usageLimit: number | null;
  usedCount: number | null;
  perUserLimit: number | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
}

const PERK_TYPE_INFO: Record<string, { icon: keyof typeof Ionicons.glyphMap; colorKey: 'error' | 'success' | 'secondary' | 'info' | 'warning'; label: string }> = {
  discount_percent: { icon: 'pricetag',  colorKey: 'error',     label: '% Off' },
  discount_fixed:   { icon: 'cash',      colorKey: 'success',   label: '$ Off' },
  free_ticket:      { icon: 'ticket',    colorKey: 'secondary', label: 'Free' },
  early_access:     { icon: 'time',      colorKey: 'info',      label: 'Early' },
  vip_upgrade:      { icon: 'star',      colorKey: 'warning',   label: 'VIP' },
  cashback:         { icon: 'wallet',    colorKey: 'success',   label: 'Cash' },
};

const CATEGORIES = [
  { id: 'All',        label: 'All Perks',    icon: 'gift'       },
  { id: 'tickets',    label: 'Tickets',      icon: 'ticket'     },
  { id: 'events',     label: 'Events',       icon: 'calendar'   },
  { id: 'dining',     label: 'Dining',       icon: 'restaurant' },
  { id: 'shopping',   label: 'Shopping',     icon: 'bag'        },
  { id: 'wallet',     label: 'Wallet',       icon: 'wallet'     },
  { id: 'indigenous', label: 'First Nations',icon: 'earth'      },
];

const filterItems: FilterItem[] = CATEGORIES.map(cat => ({ id: cat.id, label: cat.label, icon: cat.icon }));

export default function PerksTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, isDesktop, isTablet } = useLayout();
  const s = getStyles(colors);
  
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  
  const topInset = isWeb ? 0 : insets.top;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 800 : width;

  const { userId } = useAuth();
  const { data: councilData } = useCouncil();
  const openGrants = (councilData?.grants ?? []).filter((grant: {status: string}) => grant.status === 'open');
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingPerkId, setRedeemingPerkId] = useState<string | null>(null);

  const { data: perks = [], isLoading, refetch } = useQuery<Perk[]>({
    queryKey: ['/api/perks'],
    queryFn: () => api.perks.list() as Promise<Perk[]>,
  });

  const { data: membership } = useQuery<{ tier: string } | null>({
    queryKey: ['/api/membership', userId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const redeemMutation = useMutation({
    mutationFn: async (perkId: string) => {
      if (!userId) throw new Error('Please sign in to redeem perks.');
      const res = await apiRequest('POST', `/api/perks/${perkId}/redeem`, {});
      return res.json();
    },
    onMutate: (perkId) => setRedeemingPerkId(perkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      if (userId) queryClient.invalidateQueries({ queryKey: ['/api/membership', userId] });
      Alert.alert('Redeemed!', 'Perk has been added to your account.');
    },
    onError: (err: Error) => Alert.alert('Cannot Redeem', err.message),
    onSettled: () => setRedeemingPerkId(null),
  });

  const filteredPerks = selectedCategory === 'All'
    ? perks
    : perks.filter(p => p.category === selectedCategory);

  const formatValue = (perk: Perk) => {
    if (perk.perkType === 'discount_percent') return `${perk.discountPercent}% Off`;
    if (perk.perkType === 'discount_fixed')   return `$${((perk.discountFixedCents ?? 0) / 100).toFixed(0)} Off`;
    if (perk.perkType === 'free_ticket')      return 'Free';
    if (perk.perkType === 'early_access')     return '48h Early';
    if (perk.perkType === 'vip_upgrade')      return 'VIP';
    if (perk.perkType === 'cashback')
      return perk.discountPercent ? `${perk.discountPercent}% Cashback` : `$${((perk.discountFixedCents ?? 0) / 100).toFixed(0)} Cashback`;
    return 'Reward';
  };

  const canRedeem = (perk: Perk) => {
    const memberTier = membership?.tier ?? 'free';
    if (perk.isMembershipRequired && memberTier === 'free') return false;
    if (perk.usageLimit && (perk.usedCount ?? 0) >= perk.usageLimit) return false;
    return true;
  };

  const handleSharePerk = async (perk: Perk) => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${perk.title} - CulturePass Perk`,
        message: `Check out this perk on CulturePass: ${perk.title}! ${perk.description ?? ''} ${perk.providerName ? `From ${perk.providerName}.` : ''}`,
      });
    } catch { /* ignore */ }
  };

  const activePerkCount = perks.filter(p => canRedeem(p)).length;
  const isPlusMember = !!membership?.tier && membership.tier !== 'free';

  const resolveTypeColor = useCallback((key: string): string => {
    if (key === 'error')     return CultureTokens.coral;
    if (key === 'success')   return CultureTokens.teal;
    if (key === 'secondary') return CultureTokens.indigo;
    if (key === 'info')      return colors.info;
    return CultureTokens.gold;
  }, [colors]);

  const handleSelectCategory = useCallback((id: string) => {
    if (!isWeb) Haptics.selectionAsync();
    setSelectedCategory(id);
  }, []);

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}> 

        {/* Global Transparent Blur Header (Mobile Only) */}
        {!(isWeb && isDesktop) && (
          <View style={s.topBar}>
            {Platform.OS === 'ios' && (
              <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
                <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.View style={[s.topBarBorder, headerBorderStyle]} pointerEvents="none" />

            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.headerTitle, { color: colors.text }]}>Perks & Rewards</Text>
                <Text style={[s.headerSub, { color: colors.textSecondary }]}>{activePerkCount} available to claim</Text>
              </View>
              <Pressable
                onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/submit' as never); }}
                hitSlop={8}
                style={({ pressed }) => [s.addBtn, { backgroundColor: CultureTokens.indigo + '15', opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="add" size={24} color={CultureTokens.indigo} />
              </Pressable>
            </View>
          </View>
        )}

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={isWeb ? (e: any) => { scrollY.value = e.nativeEvent.contentOffset.y; } : scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            { paddingBottom: isWeb ? 134 : insets.bottom + 110 },
            isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingTop: 32 },
            !isDesktop && !isWeb && { paddingTop: 16 }
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CultureTokens.indigo} />}
        >

          {/* Desktop Only Header */}
          {isWeb && isDesktop && (
            <View style={[s.headerRow, { paddingHorizontal: 20, marginBottom: 24 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.headerTitle, { color: colors.text, fontSize: 36 }]}>Perks & Rewards</Text>
                <Text style={[s.headerSub, { color: colors.textSecondary, fontSize: 16 }]}>{activePerkCount} exclusive perks available to claim.</Text>
              </View>
              <Pressable
                onPress={() => router.push('/submit' as never)}
                style={({ pressed }) => [s.addBtn, { height: 48, width: 48, backgroundColor: CultureTokens.indigo + '15', opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="add" size={24} color={CultureTokens.indigo} />
              </Pressable>
            </View>
          )}

          {/* Hero Premium Banner */}
          <View style={[s.heroWrapper, isDesktop && { paddingHorizontal: 0, marginBottom: 32 }]}>
            <LinearGradient
              colors={gradients.culturepassBrandReversed}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroBanner}
            >
              <View style={[s.heroOrb, { backgroundColor: colors.backgroundSecondary }]} />
              <View style={s.heroBannerTop}>
                <View style={[s.heroIconWrap, { backgroundColor: colors.borderLight }]}>
                  <Ionicons name="gift" size={32} color={CultureTokens.gold} />
                </View>
                {!isPlusMember && (
                  <View style={s.tierPill}>
                    <Text style={s.tierPillText}>FREE TIER</Text>
                  </View>
                )}
              </View>
              <Text style={s.heroTitle}>Unlock Exclusive Offers</Text>
              <Text style={s.heroSub}>Redeem partner discounts, VIP access, and cashback rewards at events.</Text>
            </LinearGradient>
          </View>

          {/* Upgrade Nudge Box */}
          {!isPlusMember && (
            <View style={[s.listWrapper, isDesktop && { paddingHorizontal: 0 }]}>
              <Pressable
                style={({ pressed }) => [s.upgradeBanner, { 
                  backgroundColor: colors.surface, 
                  borderColor: CultureTokens.indigo + '40', 
                  transform: [{ scale: pressed ? 0.98 : 1 }] 
                }]}
                onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/membership/upgrade' as never); }}
              >
                <View style={[s.upgradeBannerIcon, { backgroundColor: CultureTokens.indigo }]} >
                  <Ionicons name="star" size={20} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.upgradeBannerTitle, { color: colors.text }]}>CulturePass+ Membership</Text>
                  <Text style={[s.upgradeBannerSub, { color: colors.textSecondary }]}>
                    Upgrade to unlock all premium tier rewards globally.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={CultureTokens.indigo} />
              </Pressable>
            </View>
          )}

          {/* Council Grants Alert */}
          {openGrants.length > 0 && (
            <View style={[s.listWrapper, isDesktop && { paddingHorizontal: 0 }]}>
              <Pressable 
                style={({ pressed }) => [s.upgradeBanner, { 
                  backgroundColor: colors.surface, 
                  borderColor: CultureTokens.teal + '40', 
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderStyle: 'dashed' 
                }]}
                onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/council'); }}
              > 
                <View style={[s.upgradeBannerIcon, { backgroundColor: CultureTokens.teal + '15' }]}> 
                  <Ionicons name="library" size={20} color={CultureTokens.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.upgradeBannerTitle, { color: colors.text }]}>Cultural Funding Available</Text>
                  <Text style={[s.upgradeBannerSub, { color: colors.textSecondary }]}> 
                    {openGrants.length} local council grant{openGrants.length === 1 ? '' : 's'} open right now.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={CultureTokens.teal} />
              </Pressable>
            </View>
          )}

          {/* Category Filter Chips */}
          <View style={[s.listWrapper, { marginBottom: 12 }, isDesktop && { paddingHorizontal: 0 }]}>
            <FilterChipRow
              items={filterItems}
              selectedId={selectedCategory}
              onSelect={handleSelectCategory}
              size="small"
            />
          </View>

          {/* Section Header */}
          <View style={[s.sectionHeader, isDesktop && { paddingHorizontal: 0 }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              {selectedCategory === 'All' ? 'All Rewards' : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Perks'}
            </Text>
            {!isLoading && (
              <Text style={[s.sectionCount, { color: colors.textTertiary }]}>
                {filteredPerks.length} {filteredPerks.length === 1 ? 'perk' : 'perks'}
              </Text>
            )}
          </View>

          {/* Perk Grid/List */}
          <View style={[s.grid, isDesktop && { paddingHorizontal: 0 }]}>
            {isLoading ? (
              <View style={s.empty}>
                <ActivityIndicator size="large" color={CultureTokens.indigo} />
                <Text style={[s.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>Loading exclusive perks...</Text>
              </View>
            ) : filteredPerks.length === 0 ? (
              <View style={[s.emptyStateCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={[s.emptyIconBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="gift-outline" size={36} color={colors.textTertiary} />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text }]}>No perks found</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>Check back later for deals in this category.</Text>
              </View>
            ) : (
              <View style={[s.gridWrapper, isDesktop && s.gridDesktop]}>
                {filteredPerks.map((perk) => (
                  <View key={perk.id} style={isDesktop ? s.gridCell : s.fullCell}>
                    <PerkCard
                      perk={perk}
                      colors={colors}
                      redeemable={canRedeem(perk)}
                      formattedValue={formatValue(perk)}
                      onShare={() => handleSharePerk(perk)}
                      onRedeem={() => {
                        if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (!canRedeem(perk) && perk.isMembershipRequired) {
                          router.push('/membership/upgrade' as never);
                        } else if (!userId) {
                          Alert.alert('Sign in required', 'Please sign in to redeem this perk.');
                          router.push('/(onboarding)/login' as never);
                        } else {
                          redeemMutation.mutate(perk.id);
                        }
                      }}
                      isPending={redeemingPerkId === perk.id}
                      resolveTypeColor={resolveTypeColor}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

        </Animated.ScrollView>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Perk Card Component
// ---------------------------------------------------------------------------
function PerkCard({
  perk,
  colors,
  redeemable,
  formattedValue,
  onShare,
  onRedeem,
  isPending,
  resolveTypeColor,
}: {
  perk: Perk;
  colors: ReturnType<typeof useColors>;
  redeemable: boolean;
  formattedValue: string;
  onShare: () => void;
  onRedeem: () => void;
  isPending: boolean;
  resolveTypeColor: (key: string) => string;
}) {
  const typeInfo  = PERK_TYPE_INFO[perk.perkType] ?? PERK_TYPE_INFO.discount_percent;
  const typeColor = resolveTypeColor(typeInfo.colorKey);
  const usagePct  = perk.usageLimit ? Math.min(Math.round(((perk.usedCount ?? 0) / perk.usageLimit) * 100), 100) : 0;
  const needsUpgrade = !redeemable && !!perk.isMembershipRequired;
  const exhausted    = !redeemable && !perk.isMembershipRequired;
  const s = getStyles(colors);

  return (
    <View style={[s.perkCard, { backgroundColor: colors.surface, borderColor: needsUpgrade ? CultureTokens.indigo + '40' : colors.borderLight }]}>
      <View style={[s.cardStrip, { backgroundColor: needsUpgrade ? CultureTokens.indigo : typeColor }]} />

      <View style={s.cardContent}>
        <View style={s.perkTopRow}>
          <View style={[s.perkIconBox, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={typeInfo.icon} size={22} color={typeColor} />
          </View>
          
          <View style={s.perkInfo}>
            <Text style={[s.perkTitle, { color: colors.text }]} numberOfLines={2}>{perk.title}</Text>
            <View style={s.providerRow}>
              <Ionicons name="business" size={14} color={colors.textTertiary} />
              <Text style={[s.perkProvider, { color: colors.textSecondary }]}>{perk.providerName ?? 'CulturePass App'}</Text>
            </View>
          </View>

          <View style={s.perkValueWrap}>
            <View style={[s.perkValuePill, { backgroundColor: CultureTokens.saffron + '20' }]}>
              <Text style={[s.perkValueText, { color: CultureTokens.saffron }]}>{formattedValue}</Text>
            </View>
            <Pressable hitSlop={12} onPress={onShare} style={[s.shareBtn, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {perk.description && (
          <Text style={[s.perkDesc, { color: colors.textSecondary }]} numberOfLines={2}>{perk.description}</Text>
        )}

        <View style={s.perkMetaRow}>
          {perk.isMembershipRequired && (
            <View style={[s.metaTag, { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo + '30' }]}>
              <Ionicons name="star" size={12} color={CultureTokens.indigo} />
              <Text style={[s.metaTagText, { color: CultureTokens.indigo }]}>CulturePass+</Text>
            </View>
          )}
          {!!perk.usageLimit && (
            <View style={[s.metaTag, { backgroundColor: CultureTokens.teal + '15', borderColor: CultureTokens.teal + '30' }]}>
              <Ionicons name="people" size={12} color={CultureTokens.teal} />
              <Text style={[s.metaTagText, { color: CultureTokens.teal }]}>{perk.usageLimit - (perk.usedCount ?? 0)} left</Text>
            </View>
          )}
          {perk.endDate && (
            <View style={[s.metaTag, { backgroundColor: CultureTokens.coral + '15', borderColor: CultureTokens.coral + '30' }]}>
              <Ionicons name="calendar-outline" size={12} color={CultureTokens.coral} />
              <Text style={[s.metaTagText, { color: CultureTokens.coral }]}>Ends {new Date(perk.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
            </View>
          )}
          {!!perk.perUserLimit && (
            <View style={[s.metaTag, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.metaTagText, { color: colors.textSecondary }]}>Max {perk.perUserLimit}/account</Text>
            </View>
          )}
        </View>

        {!!perk.usageLimit && (
          <View style={s.progressWrap}>
            <View style={[s.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={[s.progressFill, { flexGrow: usagePct / 100, backgroundColor: usagePct > 85 ? CultureTokens.coral : CultureTokens.teal }]} />
            </View>
            <Text style={[s.progressText, { color: colors.textTertiary }]}>{usagePct}% claimed</Text>
          </View>
        )}

        <Pressable
          onPress={onRedeem}
          disabled={exhausted || isPending}
          style={({ pressed }) => ([
            s.redeemBtn,
            Platform.OS === 'web' && { cursor: (exhausted || isPending ? 'not-allowed' : 'pointer') as any },
            needsUpgrade && { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo + '40', borderWidth: 1 },
            exhausted    && { backgroundColor: colors.backgroundSecondary },
            redeemable   && { backgroundColor: typeColor, opacity: pressed ? 0.85 : 1 },
            isPending    && { opacity: 0.6 },
          ] as any)}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={redeemable ? '#FFFFFF' : CultureTokens.indigo} />
          ) : (
            <Ionicons
              name={redeemable ? 'gift' : (needsUpgrade ? 'star' : 'lock-closed')}
              size={18}
              color={redeemable ? '#FFFFFF' : (needsUpgrade ? CultureTokens.indigo : colors.textTertiary)}
            />
          )}
          <Text style={[
            s.redeemBtnText,
            needsUpgrade && { color: CultureTokens.indigo },
            exhausted    && { color: colors.textTertiary },
            redeemable   && { color: colors.text },
          ]}>
            {isPending ? 'Processing...' : exhausted ? 'Fully Claimed' : needsUpgrade ? 'Upgrade to CulturePass+' : 'Claim Reward'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  
  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, zIndex: 100 },
  topBarBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5, marginBottom: 2, color: colors.text },
  headerSub: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  heroWrapper: { paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
  heroBanner: { borderRadius: 28, padding: 28, overflow: 'hidden' },
  heroOrb: { position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.backgroundSecondary },
  heroBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.borderLight },
  tierPill: { backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  tierPillText: { color: colors.text, fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
  heroTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: colors.text, marginBottom: 6, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, lineHeight: 22 },

  listWrapper: { paddingHorizontal: 20 },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, borderWidth: 1, gap: 14, marginBottom: 16 },
  upgradeBannerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  upgradeBannerTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  upgradeBannerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  sectionCount: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: colors.textTertiary },

  grid: { paddingHorizontal: 20 },
  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridDesktop: { justifyContent: 'flex-start' },
  fullCell: { width: '100%' },
  gridCell: { flexBasis: '48%', flexGrow: 1 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyStateCard: { padding: 40, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', gap: 12, marginBottom: 40, backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: colors.backgroundSecondary },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: colors.textSecondary },

  perkCard: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.borderLight },
  cardStrip: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 },
  cardContent: { padding: 20, paddingLeft: 24 },
  perkTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  perkIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  perkInfo: { flex: 1, justifyContent: 'center' },
  perkTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', lineHeight: 22, paddingRight: 8, color: colors.text },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  perkProvider: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  perkValueWrap: { alignItems: 'flex-end', gap: 10 },
  perkValuePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  perkValueText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  shareBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },

  perkDesc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: 20, color: colors.textSecondary },

  perkMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  metaTagText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.backgroundSecondary },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', minWidth: 80, textAlign: 'right', color: colors.textTertiary },

  redeemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
  redeemBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.3 },
});
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, RefreshControl, ActivityIndicator } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/query-client';
import { api } from '@/lib/api';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useCouncil } from '@/hooks/useCouncil';
import { useLayout } from '@/hooks/useLayout';
import { CultureTokens, gradients } from '@/constants/theme';

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
  const insets   = useSafeAreaInsets();
  const { width, isDesktop, isTablet } = useLayout();
  const colors   = useColors();
  const isDesktopWeb = isWeb && isDesktop;
  
  const topInset = isWeb ? (isDesktop ? 72 : 0) : insets.top;
  const shellMaxWidth = isWeb ? (isDesktop ? 1280 : isTablet ? 1040 : width) : width;
  const shellStyle: ViewStyle | undefined = isWeb ? { maxWidth: shellMaxWidth, width: '100%', alignSelf: 'center' } : undefined;
  const s = getStyles(colors);
  
  const { userId } = useAuth();
  const { data: councilData } = useCouncil();
  const openGrants = (councilData?.grants ?? []).filter((grant) => grant.status === 'open');
  
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
      return perk.discountPercent ? `${perk.discountPercent}%` : `$${((perk.discountFixedCents ?? 0) / 100).toFixed(0)}`;
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

        {/* Header */}
        <View style={[shellStyle, s.shellHorizontal]}>
          <View style={s.headerRow}>
            {!isDesktopWeb && (
              <View style={{ flex: 1 }}>
                <Text style={[s.headerTitle, { color: colors.text }]}>Perks</Text>
                <Text style={[s.headerSub, { color: colors.textSecondary }]}>{activePerkCount} available rewards</Text>
              </View>
            )}
            <Pressable
              onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/submit' as never); }}
              hitSlop={8}
              style={({ pressed }) => [s.addBtn, { backgroundColor: CultureTokens.indigo + '15', opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Submit a perk listing"
            >
              <Ionicons name="add" size={24} color={CultureTokens.indigo} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isWeb ? 134 : insets.bottom + 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CultureTokens.indigo} />}
        >
          <View style={shellStyle}>
            {/* Hero banner */}
            <View style={s.heroWrapper}>
              <LinearGradient
                colors={gradients.culturepassBrand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroBanner}
              >
                <View style={[s.heroOrb, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={[s.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="sparkles" size={32} color={CultureTokens.gold} />
                </View>
                <Text style={s.heroTitle}>CulturePass Perks</Text>
                <Text style={s.heroSub}>Unlock exclusive rewards, discounts, and cultural experiences.</Text>
                <View style={s.heroStats}> 
                  <View style={[s.heroStatChip, { backgroundColor: CultureTokens.saffron }]}>
                    <Text style={[s.heroStatNum, { color: '#0B0B14' }]}>{perks.length}</Text>
                    <Text style={[s.heroStatLabel, { color: '#0B0B14' }]}>Total</Text>
                  </View>
                  <View style={[s.heroStatChip, { backgroundColor: CultureTokens.teal }]}>
                    <Text style={[s.heroStatNum, { color: '#FFFFFF' }]}>{activePerkCount}</Text>
                    <Text style={[s.heroStatLabel, { color: '#FFFFFF' }]}>Available</Text>
                  </View>
                  <View style={[s.heroStatChip, { backgroundColor: CultureTokens.coral }]}>
                    <Text style={[s.heroStatNum, { color: '#FFFFFF', fontSize: 13, marginTop: 2 }]}>{membership?.tier?.toUpperCase() ?? 'FREE'}</Text>
                    <Text style={[s.heroStatLabel, { color: '#FFFFFF' }]}>Tier</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Upgrade nudge */}
            {!isPlusMember && (
              <View style={s.listWrapper}>
                <Pressable
                  style={({ pressed }) => [s.upgradeBanner, { backgroundColor: colors.surface, borderColor: CultureTokens.indigo + '30', transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/membership/upgrade' as never); }}
                >
                  <View style={[s.upgradeBannerIcon, { backgroundColor: CultureTokens.indigo + '15' }]}>
                    <Ionicons name="star" size={20} color={CultureTokens.indigo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.upgradeBannerTitle, { color: colors.text }]}>Unlock Exclusive Perks</Text>
                    <Text style={[s.upgradeBannerSub, { color: colors.textSecondary }]}>
                      CulturePass+ members get access to premium deals.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={CultureTokens.indigo} />
                </Pressable>
              </View>
            )}

            {/* Category chips */}
            <View style={s.listWrapper}>
              <FilterChipRow
                items={filterItems}
                selectedId={selectedCategory}
                onSelect={handleSelectCategory}
                size="small"
              />
            </View>

            {/* Grants Nudge */}
            {openGrants.length > 0 && (
              <View style={[s.listWrapper, { marginTop: 12 }]}>
                <Pressable 
                  style={({ pressed }) => [s.upgradeBanner, { backgroundColor: colors.surface, borderColor: colors.info + '30', transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/council'); }}
                > 
                  <View style={[s.upgradeBannerIcon, { backgroundColor: colors.info + '15' }]}> 
                    <Ionicons name="library" size={20} color={colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.upgradeBannerTitle, { color: colors.text }]}>Cultural Funding Available</Text>
                    <Text style={[s.upgradeBannerSub, { color: colors.textSecondary }]}> 
                      {openGrants.length} local council grant{openGrants.length === 1 ? '' : 's'} open right now.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.info} />
                </Pressable>
              </View>
            )}

            {/* Section title */}
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                {selectedCategory === 'All' ? 'All Rewards' : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Perks'}
              </Text>
              {!isLoading && (
                <Text style={[s.sectionCount, { color: colors.textTertiary }]}>
                  {filteredPerks.length} {filteredPerks.length === 1 ? 'perk' : 'perks'}
                </Text>
              )}
            </View>

            {/* Perk list */}
            <View style={s.list}>
              {isLoading ? (
                <View style={s.empty}>
                  <ActivityIndicator size="large" color={CultureTokens.indigo} />
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Loading exclusive perks...</Text>
                </View>
              ) : filteredPerks.length === 0 ? (
                <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderWidth: 1 }]}>
                  <View style={[s.emptyIconBox, { backgroundColor: colors.background }]}>
                    <Ionicons name="gift-outline" size={36} color={colors.textTertiary} />
                  </View>
                  <Text style={[s.emptyTitle, { color: colors.text }]}>No perks found</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Check back soon for new offers in this category.</Text>
                </View>
              ) : (
                filteredPerks.map((perk) => (
                  <PerkCard
                    key={perk.id}
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
                ))
              )}
            </View>

          </View>
        </ScrollView>
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
      {/* Decorative colored strip entirely governed by perk type */}
      <View style={[s.cardStrip, { backgroundColor: typeColor }]} />

      <View style={s.cardContent}>
        <View style={s.perkTopRow}>
          <View style={[s.perkIconBox, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={typeInfo.icon} size={22} color={typeColor} />
          </View>
          
          <View style={s.perkInfo}>
            <Text style={[s.perkTitle, { color: colors.text }]} numberOfLines={2}>{perk.title}</Text>
            <View style={s.providerRow}>
              <Ionicons name="business" size={14} color={colors.textTertiary} />
              <Text style={[s.perkProvider, { color: colors.textSecondary }]}>{perk.providerName ?? 'CulturePass Alliance'}</Text>
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
              <Text style={[s.metaTagText, { color: colors.textSecondary }]}>Max {perk.perUserLimit}/user</Text>
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
            redeemable   && { backgroundColor: CultureTokens.indigo, opacity: pressed ? 0.85 : 1 },
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
            redeemable   && { color: '#FFFFFF' },
          ]}>
            {isPending ? 'Processing...' : exhausted ? 'Fully Claimed' : needsUpgrade ? 'Upgrade to CulturePass+' : 'Redeem Now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  shellHorizontal: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  headerTitle: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5, marginBottom: 2 },
  headerSub: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  heroWrapper: { paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
  heroBanner: { borderRadius: 24, padding: 24, alignItems: 'center', overflow: 'hidden' },
  heroOrb: { position: 'absolute', top: -50, right: -20, width: 180, height: 180, borderRadius: 90 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' },
  heroStatChip: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, flex: 1, borderRadius: 14 },
  heroStatNum: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  heroStatLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', marginTop: 1 },

  listWrapper: { paddingHorizontal: 20 },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, gap: 14, marginBottom: 16 },
  upgradeBannerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  upgradeBannerTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  upgradeBannerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  sectionCount: { fontSize: 14, fontFamily: 'Poppins_500Medium' },

  list: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12, borderRadius: 20 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', maxWidth: 260 },

  perkCard: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardStrip: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 },
  cardContent: { padding: 18, paddingLeft: 20 },
  perkTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  perkIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  perkInfo: { flex: 1, justifyContent: 'center' },
  perkTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', lineHeight: 22, paddingRight: 8 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  perkProvider: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  perkValueWrap: { alignItems: 'flex-end', gap: 8 },
  perkValuePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  perkValueText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  shareBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  perkDesc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 21, marginBottom: 16 },

  perkMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  metaTagText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: 'Poppins_500Medium', minWidth: 80, textAlign: 'right' },

  redeemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  redeemBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native';
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

const PERK_TYPE_INFO: Record<string, { icon: string; colorKey: 'error' | 'success' | 'secondary' | 'info' | 'warning'; label: string }> = {
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
  const webTop   = Platform.OS === 'web' ? 67 : 0;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const colors   = useColors();
  const { userId } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const { data: perks = [], isLoading, refetch } = useQuery<Perk[]>({
    queryKey: ['/api/perks'],
    queryFn: () => api.perks.list() as Promise<Perk[]>,
  });

  const { data: membership } = useQuery<{ tier: string }>({
    queryKey: ['/api/membership', userId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const redeemMutation = useMutation({
    mutationFn: async (perkId: string) => {
      if (!userId) {
        throw new Error('Please sign in to redeem perks.');
      }

      const res = await apiRequest('POST', `/api/perks/${perkId}/redeem`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['/api/membership', userId] });
      }
      Alert.alert('Redeemed!', 'Perk has been added to your account.');
    },
    onError: (err: Error) => Alert.alert('Cannot Redeem', err.message),
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
    return '';
  };

  const canRedeem = (perk: Perk) => {
    if (perk.isMembershipRequired && (!membership?.tier || membership.tier === 'free')) return false;
    if (perk.usageLimit && (perk.usedCount ?? 0) >= perk.usageLimit) return false;
    return true;
  };

  const handleSharePerk = async (perk: Perk) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${perk.title} - CulturePass Perk`,
        message: `Check out this perk on CulturePass: ${perk.title}! ${perk.description ?? ''} ${perk.providerName ? `From ${perk.providerName}.` : ''}`,
      });
    } catch { /* Share can be dismissed */ }
  };

  const activePerkCount = perks.filter(p => canRedeem(p)).length;
  const isPlusMember    = membership?.tier && membership.tier !== 'free';

  const resolveTypeColor = useCallback((key: 'error' | 'success' | 'secondary' | 'info' | 'warning'): string => {
    if (key === 'error') return colors.error;
    if (key === 'success') return colors.success;
    if (key === 'secondary') return colors.secondary;
    if (key === 'info') return colors.info;
    return colors.warning;
  }, [colors]);

  const handleSelectCategory = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(id);
  }, []);

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[s.headerRow, isDesktopWeb && s.webSection]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.text }]}>Perks</Text>
            <Text style={[s.headerSub, { color: colors.text }]}>{activePerkCount} available for you</Text>
          </View>
          <Pressable
            onPress={() => router.push('/submit' as never)}
            hitSlop={8}
            style={[s.addBtn, { backgroundColor: colors.primaryGlow }]}
            accessibilityRole="button"
            accessibilityLabel="Submit a perk listing"
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 + (Platform.OS === 'web' ? 34 : insets.bottom) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Hero banner */}
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.heroBanner, isDesktopWeb && s.webSection]}
          >
            {/* Decorative orb */}
            <View style={s.heroOrb} />

            <View style={s.heroIconWrap}>
              <Ionicons name="gift" size={28} color={colors.textInverse} />
            </View>
            <Text style={[s.heroTitle, { color: colors.textInverse }]}>Exclusive Perks</Text>
            <Text style={s.heroSub}>{activePerkCount} perks available for you</Text>

            <View style={s.heroStats}>
              <HeroStat label="Total"     value={String(perks.length)} />
              <View style={s.heroStatDivider} />
              <HeroStat label="Available" value={String(activePerkCount)} />
              <View style={s.heroStatDivider} />
              <HeroStat label="Your Tier" value={membership?.tier?.toUpperCase() ?? 'FREE'} />
            </View>
          </LinearGradient>

          {/* Upgrade nudge for free users */}
          {!isPlusMember && (
            <Pressable
              style={[s.upgradeBanner, isDesktopWeb && s.webSection, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/membership/upgrade' as never); }}
            >
              <View style={[s.upgradeBannerIcon, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="star" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.upgradeBannerTitle, { color: colors.text }]}>Unlock Exclusive Perks</Text>
                <Text style={[s.upgradeBannerSub, { color: colors.text }]}>
                  CulturePass+ members get access to members-only deals
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          )}

          {/* Category chips */}
          <FilterChipRow
            items={filterItems}
            selectedId={selectedCategory}
            onSelect={handleSelectCategory}
            size="small"
          />

          {/* Section title */}
          <View style={[s.sectionHeader, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              {selectedCategory === 'All'
                ? 'All Perks'
                : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Perks'}
            </Text>
            {!isLoading && (
              <Text style={[s.sectionCount, { color: colors.textSecondary }]}> 
                {filteredPerks.length} {filteredPerks.length === 1 ? 'perk' : 'perks'}
              </Text>
            )}
          </View>

          {/* Perk list */}
          <View style={[s.list, isDesktopWeb && s.webSection]}>
            {isLoading ? (
              <View style={s.empty}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.emptyText, { color: colors.text }]}>Loading Perks tab...</Text>
              </View>
            ) : filteredPerks.length === 0 ? (
              <View style={[s.empty, { backgroundColor: colors.surface }]}>
                <Ionicons name="gift-outline" size={44} color={colors.textSecondary} />
                <Text style={[s.emptyText, { color: colors.text }]}>No perks in this tab yet.</Text>
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (!canRedeem(perk) && perk.isMembershipRequired) {
                      router.push('/membership/upgrade' as never);
                    } else if (!userId) {
                      Alert.alert('Sign in required', 'Please sign in to redeem this perk.');
                      router.push('/(onboarding)/login' as never);
                    } else {
                      redeemMutation.mutate(perk.id);
                    }
                  }}
                  isPending={redeemMutation.isPending}
                  resolveTypeColor={resolveTypeColor}
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeroStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={s.heroStat}>
      <Text style={[s.heroStatNum, { color: colors.textInverse }]}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

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
  resolveTypeColor: (key: 'error' | 'success' | 'secondary' | 'info' | 'warning') => string;
}) {
  const typeInfo    = PERK_TYPE_INFO[perk.perkType] ?? PERK_TYPE_INFO.discount_percent;
  const typeColor = resolveTypeColor(typeInfo.colorKey);
  const usagePct    = perk.usageLimit ? Math.round(((perk.usedCount ?? 0) / perk.usageLimit) * 100) : 0;
  const needsUpgrade = !redeemable && !!perk.isMembershipRequired;
  const exhausted    = !redeemable && !perk.isMembershipRequired;

  return (
    <Pressable
      onPress={() => router.push(`/perks/${perk.id}`)}
      style={({ pressed }) => [s.perkCard, { backgroundColor: colors.surface, opacity: pressed ? 0.92 : 1 }]}
    >
      {/* Top row: icon + info + value badge */}
      <View style={s.perkTop}>
        <View style={[s.perkBadge, { backgroundColor: typeColor + '18' }]}> 
          <Ionicons name={typeInfo.icon as never} size={22} color={typeColor} />
        </View>

        <View style={s.perkInfo}>
          <Text style={[s.perkTitle, { color: colors.text }]} numberOfLines={2}>{perk.title}</Text>
          <View style={s.providerRow}>
            <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.perkProvider, { color: colors.text }]}> 
              {perk.providerName ?? 'CulturePass'}
            </Text>
          </View>
        </View>

        <View style={s.perkValueWrap}>
          <View style={[s.perkValue, { backgroundColor: typeColor + '18' }]}> 
            <Text style={[s.perkValueText, { color: typeColor }]}>{formattedValue}</Text>
          </View>
          <Pressable hitSlop={8} onPress={onShare} style={[s.shareBtn, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Description */}
      {perk.description && (
        <Text style={[s.perkDesc, { color: colors.text }]} numberOfLines={2}>{perk.description}</Text>
      )}

      {/* Meta tags */}
      <View style={s.perkMeta}>
        {perk.isMembershipRequired && (
          <View style={[s.metaTag, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}>
            <Ionicons name="star" size={11} color={colors.primary} />
            <Text style={[s.metaTagText, { color: colors.primary }]}>CulturePass+ Only</Text>
          </View>
        )}
        {!!perk.usageLimit && (
          <View style={[s.metaTag, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <Ionicons name="people" size={11} color={colors.textSecondary} />
            <Text style={[s.metaTagText, { color: colors.text }]}> 
              {perk.usageLimit - (perk.usedCount ?? 0)} left
            </Text>
          </View>
        )}
        {perk.endDate && (
          <View style={[s.metaTag, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <Ionicons name="calendar" size={11} color={colors.textSecondary} />
            <Text style={[s.metaTagText, { color: colors.text }]}> 
              Ends {new Date(perk.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}
        {!!perk.perUserLimit && (
          <View style={[s.metaTag, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <Ionicons name="person" size={11} color={colors.textSecondary} />
            <Text style={[s.metaTagText, { color: colors.text }]}>Max {perk.perUserLimit}/user</Text>
          </View>
        )}
      </View>

      {/* Usage progress bar */}
      {!!perk.usageLimit && (
        <View style={s.progressWrap}>
          <View style={[s.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
            <View
              style={[
                s.progressFill,
                { width: `${Math.min(usagePct, 100)}%` as never, backgroundColor: usagePct > 80 ? colors.error : typeColor },
              ]}
            />
          </View>
          <Text style={[s.progressText, { color: colors.textSecondary }]}>{usagePct}% claimed</Text>
        </View>
      )}

      {/* CTA button */}
      <Pressable
        onPress={onRedeem}
        disabled={exhausted || isPending}
        style={[
          s.redeemBtn,
          needsUpgrade && { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary + '50' },
          exhausted   && { backgroundColor: colors.backgroundSecondary },
          redeemable  && { backgroundColor: colors.primary },
        ]}
      >
        <Ionicons
          name={redeemable ? 'gift' : (needsUpgrade ? 'star' : 'lock-closed')}
          size={16}
          color={redeemable ? colors.textInverse : (needsUpgrade ? colors.primary : colors.textSecondary)}
        />
        <Text style={[
          s.redeemBtnText,
          needsUpgrade && { color: colors.primary },
          exhausted   && { color: colors.textSecondary },
          redeemable  && { color: colors.textInverse },
        ]}>
          {exhausted ? 'Fully Redeemed' : (needsUpgrade ? 'Upgrade to CulturePass+' : 'Redeem Now')}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  container:  { flex: 1 },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  headerTitle:{ fontSize: 28, fontFamily: 'Poppins_700Bold', letterSpacing: -0.4 },
  headerSub:  { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  addBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  heroBanner: { marginHorizontal: 16, marginVertical: 16, borderRadius: 20, padding: 24, alignItems: 'center', overflow: 'hidden' },
  heroOrb:    { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroIconWrap:{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle:  { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  heroSub:    { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.82)', marginBottom: 20 },
  heroStats:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, gap: 16, width: '100%', justifyContent: 'center' },
  heroStat:   { alignItems: 'center', flex: 1 },
  heroStatNum:{ fontSize: 18, fontFamily: 'Poppins_700Bold' },
  heroStatLabel:{ fontSize: 11, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.72)' },
  heroStatDivider:{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  upgradeBanner:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  upgradeBannerIcon:{ width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  upgradeBannerTitle:{ fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  upgradeBannerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 2 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  sectionTitle: { fontSize: 19, fontFamily: 'Poppins_700Bold' },
  sectionCount: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  list:  { paddingHorizontal: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12, borderRadius: 16, marginHorizontal: 4 },
  emptyText:{ fontSize: 15, fontFamily: 'Poppins_500Medium' },

  perkCard:   { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#E2E8F0' },
  perkTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  perkBadge:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  perkInfo:   { flex: 1 },
  perkTitle:  { fontSize: 15, fontFamily: 'Poppins_600SemiBold', lineHeight: 21 },
  providerRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  perkProvider:{ fontSize: 12, fontFamily: 'Poppins_400Regular' },
  perkValueWrap:{ alignItems: 'flex-end', gap: 8 },
  perkValue:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  perkValueText:{ fontSize: 13, fontFamily: 'Poppins_700Bold' },
  shareBtn:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  perkDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 19, marginBottom: 12 },

  perkMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaTag:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  metaTagText:{ fontSize: 11, fontFamily: 'Poppins_500Medium' },

  progressWrap:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 2 },
  progressText:{ fontSize: 11, fontFamily: 'Poppins_500Medium', width: 70, textAlign: 'right' },

  redeemBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  redeemBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  webSection:   { maxWidth: 1024, width: '100%', alignSelf: 'center' },
});

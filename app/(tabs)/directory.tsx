import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens, EntityTypeColors, shadows } from '@/constants/theme';
import { useState, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import type { Profile } from '@shared/schema';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { useColors } from '@/hooks/useColors';
import { useLayout } from '@/hooks/useLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const isWeb = Platform.OS === 'web';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  business: 'storefront',
  venue: 'location',
  council: 'shield-checkmark',
  government: 'flag',
  organisation: 'business',
  charity: 'heart',
};

const ENTITY_FILTERS = [
  { label: 'All', icon: 'grid', color: CultureTokens.indigo, display: 'All' },
  { label: 'business', icon: 'storefront', color: EntityTypeColors.business, display: 'Businesses' },
  { label: 'venue', icon: 'location', color: EntityTypeColors.venue, display: 'Venues' },
  { label: 'organisation', icon: 'business', color: EntityTypeColors.organisation, display: 'Organisations' },
  { label: 'council', icon: 'shield-checkmark', color: EntityTypeColors.council, display: 'Councils' },
  { label: 'government', icon: 'flag', color: EntityTypeColors.government, display: 'Government' },
  { label: 'charity', icon: 'heart', color: EntityTypeColors.charity, display: 'Charities' },
] as const;

function getOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
}

function getTags(profile: Profile): string[] {
  return Array.isArray(profile.tags) ? (profile.tags as string[]) : [];
}

// ─── DirectoryCard ────────────────────────────────────────────────────────────

function DirectoryCard({ profile, colors, styles }: { profile: Profile; colors: ReturnType<typeof useColors>; styles: any }) {
  const color = (EntityTypeColors as Record<string, string>)[profile.entityType] ?? CultureTokens.indigo;
  const icon = TYPE_ICONS[profile.entityType] ?? 'business';
  const tags = getTags(profile);
  const profileRecord = profile as unknown as Record<string, unknown>;
  const phone = getOptionalString(profileRecord, 'phone');
  const address = getOptionalString(profileRecord, 'address');

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && !isWeb && { transform: [{ scale: 0.98 }] },
          pressed && isWeb && { opacity: 0.9 },
        ]}
        onPress={() => {
          if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
        }}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.businessIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as never} size={28} color={color} />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName} numberOfLines={1}>
                {profile.name}
              </Text>
              {profile.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color={CultureTokens.indigo} />
              )}
            </View>
            <Text style={styles.cardCategory}>
              {profile.category ?? profile.entityType}
            </Text>
            {(profile as any).culturePassId ? (
              <Text style={styles.cpidLabel}>{(profile as any).culturePassId}</Text>
            ) : null}
          </View>

          {profile.rating != null ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={CultureTokens.saffron} />
              <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {profile.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {profile.description}
          </Text>
        ) : null}

        {tags.length > 0 && (
          <View style={styles.serviceRow}>
            {tags.slice(0, 3).map(tag => (
              <View key={tag} style={styles.servicePill}>
                <Text style={styles.serviceText}>{tag}</Text>
              </View>
            ))}
            {tags.length > 3 && (
              <Text style={styles.moreServices}>+{tags.length - 3}</Text>
            )}
          </View>
        )}

        {(phone || address) && (
          <View style={styles.quickActions}>
            {phone ? (
              <View style={styles.quickActionCirclePhone}>
                <Ionicons name="call" size={18} color={CultureTokens.success} />
              </View>
            ) : null}
            {address ? (
              <View style={styles.quickActionCircleAddr}> 
                <Ionicons name="location" size={18} color={CultureTokens.saffron} />
              </View>
            ) : null}
          </View>
        )}
        <View style={styles.cardFooter}>
          {profile.city ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText}>
                {profile.city}
                {profile.country ? `, ${profile.country}` : ''}
              </Text>
            </View>
          ) : (
            // Keeps the stats row right-aligned when there's no city
            <View />
          )}
          <View style={styles.statsRow}>
            <Text style={styles.followersText}>
              {formatNumber(profile.followersCount ?? 0)} followers
            </Text>
            {(profile.reviewsCount ?? 0) > 0 && (
              <Text style={styles.reviewCount}>{profile.reviewsCount} reviews</Text>
            )}
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.cardAction}
          onPress={() => {
            if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
          }}
        >
          <Text style={styles.cardActionText}>View Details</Text>
          <Ionicons name="arrow-forward-circle" size={20} color={CultureTokens.indigo} />
        </Pressable>
      </Pressable>
    </View>
  );
}

// ─── DirectoryScreen ──────────────────────────────────────────────────────────

export default function DirectoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = getStyles(colors);
  const { width, isDesktop, isTablet } = useLayout();
  
  const isDesktopWeb = isWeb && isDesktop;
  const topInset = isWeb ? (isDesktopWeb ? 32 : 16) : insets.top;
  const shellMaxWidth = isDesktopWeb ? 1120 : isTablet ? 840 : width;
  
  const shellStyle = isWeb || isTablet
    ? { maxWidth: shellMaxWidth, width: '100%' as const, alignSelf: 'center' as const }
    : undefined;

  const [selectedType, setSelectedType] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allProfiles, isLoading } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
  });

  // Exclude community profiles — this screen is for directory listings only
  const nonCommunityProfiles = useMemo(
    () => (allProfiles ?? []).filter(p => p.entityType !== 'community'),
    [allProfiles],
  );

  const filtered = useMemo(() => {
    let results = nonCommunityProfiles;

    if (selectedType !== 'All') {
      results = results.filter(p => p.entityType === selectedType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(p => {
        const tags = getTags(p);
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          tags.some(t => t.toLowerCase().includes(q))
        );
      });
    }

    return results;
  }, [selectedType, search, nonCommunityProfiles]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: nonCommunityProfiles.length };
    for (const p of nonCommunityProfiles) {
      counts[p.entityType] = (counts[p.entityType] ?? 0) + 1;
    }
    return counts;
  }, [nonCommunityProfiles]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
    setTimeout(() => {
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleFilterSelect = useCallback((id: string) => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(id);
  }, []);

  const filterItems = useMemo<FilterItem[]>(() => {
    return ENTITY_FILTERS.map(filter => ({
      id: filter.label,
      label: filter.display,
      icon: filter.icon,
      color: filter.color,
      count: typeCounts[filter.label],
    }));
  }, [typeCounts]);

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={shellStyle}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Directory</Text>
            <Text style={styles.subtitle}>Businesses, venues, organisations & more</Text>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={22} color={searchFocused ? CultureTokens.indigo : colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search directory..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={14}>
                <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* Category filter chips */}
          <View style={styles.categorySection}>
            <FilterChipRow items={filterItems} selectedId={selectedType} onSelect={handleFilterSelect} />
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={CultureTokens.indigo} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 40 : 100 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CultureTokens.indigo} colors={[CultureTokens.indigo]} />}
          >
            <View style={shellStyle}>
              <Text style={styles.resultCount}>
                {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'} found
              </Text>

              {filtered.map((profile) => (
                <DirectoryCard key={profile.id} profile={profile} colors={colors} styles={styles} />
              ))}

              {filtered.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="storefront-outline" size={48} color={colors.textTertiary} />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different filter or search term
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: colors.text, letterSpacing: -0.6 },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  searchContainerFocused: {
    borderColor: CultureTokens.indigo,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    padding: 0,
    minWidth: 0,
  },
  categorySection: { paddingTop: 4, paddingBottom: 12, paddingHorizontal: isWeb ? 0 : undefined },
  resultCount: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 14,
    marginBottom: 16,
    ...shadows.medium,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  businessIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    flexShrink: 1,
  },
  cardCategory: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary, textTransform: 'capitalize' },
  cpidLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CultureTokens.saffron + '26',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  ratingText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: CultureTokens.saffron },
  cardDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  servicePill: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  serviceText: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  moreServices: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionCirclePhone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CultureTokens.teal + '26',
  },
  quickActionCircleAddr: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CultureTokens.saffron + '26',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  followersText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.teal },
  reviewCount: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textTertiary },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: CultureTokens.indigo + '14',
    borderWidth: 1,
    borderColor: CultureTokens.indigo + '26',
  },
  cardActionText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: CultureTokens.indigo },
  
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 14 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
import {
  View, Text, Pressable, StyleSheet, Platform,
  TextInput, RefreshControl, FlatList, ScrollView, ActivityIndicator, useColorScheme,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaved } from '@/contexts/SavedContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useState, useMemo, useCallback } from 'react';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { Profile } from '@shared/schema';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { EntityTypeColors, CultureTokens, shadows, gradients } from '@/constants/theme';
import { useCouncil } from '@/hooks/useCouncil';
import { useAuth } from '@/lib/auth';
import { useLayout } from '@/hooks/useLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const isWeb = Platform.OS === 'web';

const TYPE_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  community:    { color: EntityTypeColors.community, icon: 'people' },
  organisation: { color: EntityTypeColors.organisation, icon: 'business' },
  venue:        { color: EntityTypeColors.venue, icon: 'location' },
  council:      { color: EntityTypeColors.council, icon: 'shield-checkmark' },
  government:   { color: EntityTypeColors.government, icon: 'flag' },
  artist:       { color: EntityTypeColors.artist, icon: 'musical-notes' },
  business:     { color: EntityTypeColors.business, icon: 'storefront' },
};

const CATEGORIES = [
  { id: 'all',          label: 'All',           icon: 'grid' },
  { id: 'community',    label: 'Communities',   icon: 'people' },
  { id: 'organisation', label: 'Organisations', icon: 'business' },
  { id: 'venue',        label: 'Venues',        icon: 'location' },
  { id: 'council',      label: 'Councils',      icon: 'shield-checkmark' },
  { id: 'artist',       label: 'Artists',       icon: 'musical-notes' },
  { id: 'business',     label: 'Businesses',    icon: 'storefront' },
];

function fmt(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
}

// ---------------------------------------------------------------------------
// Featured card (horizontal scroll)
// ---------------------------------------------------------------------------
function FeaturedCard({ profile, colors, styles }: { profile: Profile; colors: ReturnType<typeof useColors>; styles: any }) {
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined = isCommunityJoined(profile.id);
  const meta = TYPE_META[profile.entityType] ?? { color: CultureTokens.indigo, icon: 'people' as const };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fcCard,
        pressed && !isWeb && { transform: [{ scale: 0.98 }] },
        pressed && isWeb && { opacity: 0.9 },
      ]}
      onPress={() => {
        if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
      }}
    >
      <LinearGradient
        colors={[`${meta.color}22`, `${meta.color}05`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.fcTop}>
        <View style={[styles.fcIconBox, { backgroundColor: `${meta.color}20` }]}>
          <Ionicons name={meta.icon} size={28} color={meta.color} />
        </View>
        {profile.isVerified && (
          <View style={styles.fcVerifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={CultureTokens.indigo} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.fcName} numberOfLines={2}>{profile.name}</Text>
        <Text style={styles.fcDesc} numberOfLines={2}>
          {profile.description || `${profile.entityType} · ${profile.city ?? 'Australia'}`}
        </Text>
      </View>

      <View style={styles.fcBottom}>
        <View style={styles.fcMembers}>
          <Ionicons name="people" size={16} color={colors.textTertiary} />
          <Text style={styles.fcMembersText}>{fmt(profile.membersCount ?? 0)}</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={(e) => { 
            e?.stopPropagation?.(); 
            if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
            toggleJoinCommunity(profile.id); 
          }}
          style={joined ? styles.fcJoinBtnJoined : [styles.fcJoinBtnDefault, { backgroundColor: meta.color }]}
        >
          {joined ? (
            <Ionicons name="checkmark" size={16} color={CultureTokens.indigo} />
          ) : (
            <Text style={styles.fcJoinTextDefault}>Join</Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// List card
// ---------------------------------------------------------------------------
function CommunityCard({ profile, colors, styles }: { profile: Profile; colors: ReturnType<typeof useColors>; styles: any }) {
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined = isCommunityJoined(profile.id);
  const meta = TYPE_META[profile.entityType] ?? { color: CultureTokens.indigo, icon: 'people' as const };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.lcCard,
        pressed && !isWeb && { transform: [{ scale: 0.98 }] },
        pressed && isWeb && { opacity: 0.9 },
      ]}
      onPress={() => {
        if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
      }}
    >
      <View style={[styles.lcIconBox, { backgroundColor: `${meta.color}15` }]}>
        <Ionicons name={meta.icon} size={26} color={meta.color} />
      </View>

      <View style={styles.lcCenter}>
        <View style={styles.lcNameRow}>
          <Text style={styles.lcName} numberOfLines={1}>{profile.name}</Text>
          {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={CultureTokens.indigo} />}
        </View>
        <View style={styles.lcMetaRow}>
          <View style={[styles.lcTypePill, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.lcTypePillText, { color: meta.color }]}>{profile.entityType}</Text>
          </View>
          {profile.city && (
            <View style={styles.lcLocationRow}>
              <Ionicons name="location" size={14} color={colors.textTertiary} />
              <Text style={styles.lcLocationText} numberOfLines={1}>{profile.city}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.lcRight}>
        <View style={styles.lcMembersRow}>
          <Ionicons name="people" size={14} color={colors.textSecondary} />
          <Text style={styles.lcMembersText}>{fmt(profile.membersCount ?? 0)}</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={(e) => { 
            e?.stopPropagation?.(); 
            if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
            toggleJoinCommunity(profile.id); 
          }}
          style={joined ? styles.lcJoinBtnJoined : [styles.lcJoinBtnDefault, { backgroundColor: meta.color }]}
        >
          {joined ? (
            <Ionicons name="checkmark" size={18} color={CultureTokens.indigo} />
          ) : (
            <Text style={styles.lcJoinTextDefault}>Join</Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function CommunitiesScreen() {
  const insets  = useSafeAreaInsets();
  const colors  = useColors();
  const styles  = getStyles(colors);
  
  const { width, isDesktop, isTablet } = useLayout();
  const isDesktopWeb = isWeb && isDesktop;
  
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  
  const topInset = isWeb ? 0 : insets.top;
  const bottomInset = insets.bottom;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 800 : width;
  
  const [search,        setSearch]        = useState('');
  const [selectedType,  setSelectedType]  = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allProfiles, isLoading } = useQuery<Profile[]>({ queryKey: ['/api/profiles'] });
  const { data: councilData } = useCouncil();
  const council = councilData?.council;
  const facilities = councilData?.facilities ?? [];
  const { isAuthenticated } = useAuth();

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

  const filteredProfiles = useMemo(() => {
    let profiles = allProfiles ?? [];
    if (selectedType !== 'all') profiles = profiles.filter((p) => p.entityType === selectedType);
    if (search.trim()) {
      const q = search.toLowerCase();
      profiles = profiles.filter((p) => {
        const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    return [...profiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [allProfiles, search, selectedType]);

  const featuredProfiles = useMemo(() => (
    (allProfiles ?? [])
      .filter((p) => p.isVerified || (p.membersCount ?? 0) > 500)
      .sort((a, b) => (b.membersCount ?? 0) - (a.membersCount ?? 0))
      .slice(0, 8)
  ), [allProfiles]);

  const typeCounts = useMemo(() => {
    const profiles = allProfiles ?? [];
    const counts: Record<string, number> = { all: profiles.length };
    for (const p of profiles) counts[p.entityType] = (counts[p.entityType] ?? 0) + 1;
    return counts;
  }, [allProfiles]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
    setTimeout(() => {
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSelectType = useCallback((id: string) => {
    if (!isWeb) Haptics.selectionAsync();
    setSelectedType(id);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
          <Text style={styles.loadingText}>Discovering communities...</Text>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>

        {/* Global Transparent Blur Header (Mobile Only) */}
        {!(isWeb && isDesktop) && (
          <View style={styles.topBar}>
            {Platform.OS === 'ios' && (
              <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
                <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.View style={[styles.topBarBorder, headerBorderStyle]} pointerEvents="none" />

            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{typeCounts.all ?? 0} active communities</Text>
              </View>
              <Pressable
                onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/submit' as never); }}
                hitSlop={8}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: CultureTokens.indigo + '15', opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="add" size={24} color={CultureTokens.indigo} />
              </Pressable>
            </View>
          </View>
        )}

        <Animated.FlatList
          data={[...filteredProfiles]} // Wrap to force clean render
          keyExtractor={(item: Profile) => item.id}
          renderItem={({ item }) => (
            <View style={[
              isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
              !isDesktop && { paddingHorizontal: 20 }
            ]}>
              <CommunityCard profile={item} colors={colors} styles={styles} />
            </View>
          )}
          onScroll={isWeb ? undefined : scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            { paddingBottom: isWeb ? 134 : bottomInset + 110 },
            isDesktop && { paddingTop: 32 },
            !isDesktop && !isWeb && { paddingTop: 16 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CultureTokens.indigo} />}
          ListHeaderComponent={
            <View style={isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              
              {/* Desktop Only Header */}
              {isWeb && isDesktop && (
                <View style={[styles.headerRow, { paddingHorizontal: 20, marginBottom: 24 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text, fontSize: 36 }]}>Explore Communities</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary, fontSize: 16 }]}>{typeCounts.all ?? 0} active communities, artists, and venues to discover.</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/submit' as never)}
                    style={({ pressed }) => [styles.addBtn, { height: 48, width: 48, backgroundColor: CultureTokens.indigo + '15', opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="add" size={24} color={CultureTokens.indigo} />
                  </Pressable>
                </View>
              )}

              <View style={[styles.shellHorizontal, isDesktop && { paddingHorizontal: 0 }]}>
                {/* Search Bar */}
                <View style={[
                  styles.searchBar,
                  searchFocused && styles.searchBarFocused,
                ]}>
                  <Ionicons name="search" size={22} color={searchFocused ? CultureTokens.indigo : colors.textTertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search communities, venues, artists…"
                    placeholderTextColor={colors.textTertiary}
                    value={search}
                    onChangeText={setSearch}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={14} style={styles.clearSearchBtn}>
                      <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={[styles.shellHorizontal, isDesktop && { paddingHorizontal: 0 }]}>
                {/* Civic Nudge */}
                <Pressable
                  style={({ pressed }) => [
                    styles.councilBar, 
                    pressed && !isWeb && { transform: [{ scale: 0.98 }] },
                    pressed && isWeb && { opacity: 0.9 }
                  ]}
                  onPress={() => {
                    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (isAuthenticated) {
                      router.push('/(tabs)/council');
                      return;
                    }
                    router.push({ pathname: '/council/select', params: { next: '/(tabs)/council' } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isAuthenticated ? 'Open My Council' : 'Choose My Council'}
                >
                  <View style={styles.councilIcon}> 
                    <Ionicons name="business" size={22} color={CultureTokens.teal} />
                  </View>
                  <View style={styles.councilTextWrap}>
                    <Text style={styles.councilTitle}>My Local Council</Text>
                    <Text style={styles.councilSub}> 
                      {council ? `${council.name} • ${facilities.length} spaces` : 'Connect with civic alerts & grants'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={CultureTokens.teal} />
                </Pressable>
              </View>

              {/* Filter Chips */}
              <View style={[styles.shellHorizontal, isDesktop && { paddingHorizontal: 0 }, { marginBottom: 12 }]}>
                <FilterChipRow
                  items={CATEGORIES.map((cat) => ({
                    id: cat.id,
                    label: cat.label,
                    icon: cat.icon,
                    color: cat.id === 'all' ? CultureTokens.indigo : (TYPE_META[cat.id]?.color ?? CultureTokens.indigo),
                  }))}
                  selectedId={selectedType}
                  onSelect={handleSelectType}
                  size="small"
                />
              </View>

              {/* Featured Horizon */}
              {featuredProfiles.length > 0 && !search.trim() && selectedType === 'all' && (
                <View style={[styles.featSection, isDesktop && { paddingHorizontal: 0 }]}>
                  <View style={[styles.sectionRow, isDesktop && { paddingHorizontal: 0 }]}>
                    <Ionicons name="star" size={18} color={CultureTokens.saffron} />
                    <Text style={styles.sectionTitle}>Featured</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalScroll, isDesktop && { paddingHorizontal: 0 }]}>
                    {featuredProfiles.map((p) => <FeaturedCard key={p.id} profile={p} colors={colors} styles={styles} />)}
                  </ScrollView>
                </View>
              )}

              {/* List Header */}
              <View style={[styles.sectionHeader, isDesktop && { paddingHorizontal: 0 }]}>
                <Text style={styles.sectionTitle}>Directory</Text>
                <Text style={styles.resultsCount}>
                  {filteredProfiles.length} {filteredProfiles.length === 1 ? 'result' : 'results'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }, styles.emptyWrap, isDesktop && { paddingHorizontal: 0 }]}>
              <View style={[styles.emptyStateCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={42} color={colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search.length > 0 || selectedType !== 'all' ? 'No communities found' : 'No communities yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {search.length > 0 || selectedType !== 'all' ? 'Try adjusting your search criteria or filters.' : 'Discover and join communities here.'}
                </Text>
                {search.length > 0 && (
                  <Pressable
                    style={styles.clearBtn}
                    onPress={() => { setSearch(''); setSelectedType('all'); }}
                  >
                    <Text style={styles.clearBtnText}>Clear all filters</Text>
                  </Pressable>
                )}
              </View>
            </View>
          }
        />
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles Implementation
// ---------------------------------------------------------------------------
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  shellHorizontal: { paddingHorizontal: 20 },

  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, zIndex: 100 },
  topBarBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5, marginBottom: 2 },
  headerSub: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },

  councilBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 18, borderRadius: 20, borderWidth: 1, gap: 14, backgroundColor: colors.surface, borderColor: CultureTokens.teal + '40' },
  councilIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.teal + '15' },
  councilTextWrap: { flex: 1 },
  councilTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2, color: colors.text },
  councilSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },

  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16, backgroundColor: colors.surface, borderColor: colors.borderLight },
  searchBarFocused: { borderColor: CultureTokens.indigo },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins_500Medium', padding: 0, height: 24, color: colors.text },
  clearSearchBtn: { padding: 4 },

  featSection: { marginBottom: 24, marginTop: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 20 },
  horizontalScroll: { gap: 16, paddingHorizontal: 20, paddingRight: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  resultsCount: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: colors.textTertiary },

  emptyWrap: { paddingHorizontal: 20 },
  emptyStateCard: { padding: 40, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', gap: 12, marginBottom: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: colors.background },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  emptySub: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: colors.textSecondary },
  clearBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: CultureTokens.indigo + '15' },
  clearBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },

  fcCard: { width: 260, height: 210, borderRadius: 20, padding: 20, borderWidth: 1, overflow: 'hidden', gap: 12, backgroundColor: colors.surface, borderColor: colors.borderLight },
  fcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fcIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fcVerifiedBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo + '15' },
  fcName: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', lineHeight: 22, color: colors.text },
  fcDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
  fcBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 },
  fcMembers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fcMembersText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.textTertiary },
  fcJoinBtnDefault: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  fcJoinBtnJoined: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: CultureTokens.indigo + '15', borderWidth: 1, borderColor: CultureTokens.indigo + '30' },
  fcJoinTextDefault: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  lcCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 14, gap: 16, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.borderLight },
  lcIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lcCenter: { flex: 1, gap: 6, minWidth: 0 },
  lcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lcName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', flexShrink: 1, color: colors.text },
  lcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lcTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  lcTypePillText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  lcLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  lcLocationText: { fontSize: 12, fontFamily: 'Poppins_400Regular', flexShrink: 1, color: colors.textTertiary },
  lcRight: { alignItems: 'flex-end', gap: 10 },
  lcMembersRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lcMembersText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  lcJoinBtnDefault: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 64, backgroundColor: CultureTokens.indigo },
  lcJoinBtnJoined: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 64, backgroundColor: CultureTokens.indigo + '15', borderWidth: 1, borderColor: CultureTokens.indigo + '40' },
  lcJoinTextDefault: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
});

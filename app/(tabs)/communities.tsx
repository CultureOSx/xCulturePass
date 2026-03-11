import {
  View, Text, Pressable, StyleSheet, Platform,
  TextInput, RefreshControl, FlatList, ScrollView, ActivityIndicator,
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
import type { Profile } from '@shared/schema';
import { FilterChipRow } from '@/components/FilterChip';
import { EntityTypeColors, CultureTokens, shadows } from '@/constants/theme';
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
  { id: 'all',          label: 'All',           icon: 'grid-outline' },
  { id: 'community',    label: 'Communities',   icon: 'people-outline' },
  { id: 'organisation', label: 'Organisations', icon: 'business-outline' },
  { id: 'venue',        label: 'Venues',        icon: 'location-outline' },
  { id: 'council',      label: 'Councils',      icon: 'shield-checkmark-outline' },
  { id: 'artist',       label: 'Artists',       icon: 'musical-notes-outline' },
  { id: 'business',     label: 'Businesses',    icon: 'storefront-outline' },
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
          <Ionicons name="people-outline" size={16} color={colors.textTertiary} />
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
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.lcLocationText} numberOfLines={1}>{profile.city}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.lcRight}>
        <View style={styles.lcMembersRow}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.lcMembersText}>{fmt(profile.membersCount ?? 0)}</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={(e) => { 
            e?.stopPropagation?.(); 
            if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
            toggleJoinCommunity(profile.id); 
          }}
          style={joined ? styles.lcJoinBtnJoined : styles.lcJoinBtnDefault}
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
  
  const topInset    = isWeb ? (isDesktopWeb ? 32 : 16) : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const shellMaxWidth = isDesktopWeb ? 1120 : isTablet ? 840 : width;
  
  const shellStyle: ViewStyle | undefined = isWeb || isTablet
    ? { maxWidth: shellMaxWidth, width: '100%', alignSelf: 'center' as const }
    : undefined;

  const [search,        setSearch]        = useState('');
  const [selectedType,  setSelectedType]  = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allProfiles, isLoading } = useQuery<Profile[]>({ queryKey: ['/api/profiles'] });
  const { data: councilData } = useCouncil();
  const council = councilData?.council;
  const facilities = councilData?.facilities ?? [];
  const { isAuthenticated } = useAuth();

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

  const renderItem = useCallback(({ item }: { item: Profile }) => <CommunityCard profile={item} colors={colors} styles={styles} />, [colors, styles]);
  const keyExtractor = useCallback((item: Profile) => item.id, []);

  const ListHeader = useMemo(() => (
    <>
      {featuredProfiles.length > 0 && !search.trim() && selectedType === 'all' && (
        <View style={styles.featSection}>
          <View style={[styles.sectionRow, { paddingHorizontal: isWeb ? 0 : 20 }]}>
            <Ionicons name="star" size={20} color={CultureTokens.saffron} />
            <Text style={styles.sectionTitle}>Featured Communities</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingRight: 20, paddingLeft: isWeb ? 0 : 20 }}>
            {featuredProfiles.map((p) => <FeaturedCard key={p.id} profile={p} colors={colors} styles={styles} />)}
          </ScrollView>
        </View>
      )}
      <View style={{ paddingHorizontal: isWeb ? 0 : 20, paddingBottom: 16, paddingTop: search.trim() || selectedType !== 'all' ? 8 : 12 }}>
        <Text style={styles.resultsCount}>
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'community' : 'communities'}
        </Text>
      </View>
    </>
  ), [featuredProfiles, filteredProfiles.length, search, selectedType, colors, styles]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={[shellStyle, styles.shellHorizontal]}>
          <View style={styles.header}> 
            <Text style={styles.title}>Explore</Text>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={CultureTokens.indigo} />
            <Text style={styles.loadingText}>Discovering communities...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={[shellStyle, styles.shellHorizontal]}>
          <View style={styles.header}> 
            {!isDesktopWeb && (
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Explore</Text>
                <Text style={styles.subtitle}> 
                  {typeCounts.all ?? 0} active communities to discover
                </Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed && isWeb ? 0.7 : pressed && !isWeb ? 0.9 : 1, transform: [{ scale: pressed && !isWeb ? 0.95 : 1 }] }]}
              onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/submit' as never); }}
              accessibilityRole="button"
              accessibilityLabel="Submit listing"
            >
              <Ionicons name="add" size={26} color={CultureTokens.indigo} />
            </Pressable>
          </View>
        </View>

        <View style={[shellStyle, styles.shellHorizontal]}> 
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
              <Ionicons name="business" size={24} color={CultureTokens.teal} />
            </View>
            <View style={styles.councilTextWrap}>
              <Text style={styles.councilTitle}>My Local Council</Text>
              <Text style={styles.councilSub}> 
                {council ? `${council.name} • ${facilities.length} spaces` : 'Connect with civic alerts & grants'}
              </Text>
              {!isAuthenticated && (
                <Text style={styles.councilHint}>Select your community council</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={[shellStyle, styles.shellHorizontal]}> 
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

        <View style={[shellStyle, styles.shellHorizontal]}> 
          <FilterChipRow
            items={CATEGORIES.map((cat) => ({
              id: cat.id,
              label: cat.label,
              icon: cat.icon.replace('-outline', ''),
              color: cat.id === 'all' ? CultureTokens.indigo : (TYPE_META[cat.id]?.color ?? CultureTokens.indigo),
              count: typeCounts[cat.id] ?? 0,
            }))}
            selectedId={selectedType}
            onSelect={handleSelectType}
          />
        </View>

        <FlatList
          data={filteredProfiles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          style={shellStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CultureTokens.indigo} colors={[CultureTokens.indigo]} />
          }
          contentContainerStyle={{ paddingBottom: bottomInset + 140, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[shellStyle, styles.emptyWrap]}>
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
  container: { flex: 1, backgroundColor: colors.background },
  shellHorizontal: { paddingHorizontal: isWeb ? 0 : 20 },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCard: { backgroundColor: colors.surface, padding: 36, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: colors.borderLight },
  loadingText: { marginTop: 20, fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: -0.6, marginBottom: 4, color: colors.text },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },
  headerBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(44, 42, 114, 0.1)', borderColor: 'rgba(44, 42, 114, 0.25)' },

  councilBar: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 16, gap: 16, backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.small },
  councilIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46, 196, 182, 0.15)' },
  councilTextWrap: { flex: 1 },
  councilTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', marginBottom: 2, color: colors.text },
  councilSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },
  councilHint: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 4, color: colors.textTertiary },

  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14, borderRadius: 18, borderWidth: 1, marginBottom: 16, marginTop: 12, backgroundColor: colors.surface, borderColor: colors.borderLight },
  searchBarFocused: { borderColor: CultureTokens.indigo },
  searchInput: { flex: 1, fontSize: 17, fontFamily: 'Poppins_500Medium', padding: 0, height: 26, color: colors.text },
  clearSearchBtn: { padding: 4 },

  featSection: { marginBottom: 24, marginTop: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  resultsCount: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.textTertiary },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20, gap: 14 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  emptySub: { fontSize: 16, fontFamily: 'Poppins_400Regular', textAlign: 'center', maxWidth: 300, color: colors.textSecondary },
  clearBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(44, 42, 114, 0.1)' },
  clearBtnText: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },

  fcCard: { width: 260, height: 210, borderRadius: 24, padding: 22, borderWidth: 1, overflow: 'hidden', gap: 14, backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.medium },
  fcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fcIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fcVerifiedBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(44, 42, 114, 0.15)' },
  fcName: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', lineHeight: 24, color: colors.text },
  fcDesc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20, color: colors.textSecondary, marginTop: 4 },
  fcBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 },
  fcMembers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fcMembersText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.textTertiary },
  fcJoinBtnDefault: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16 },
  fcJoinBtnJoined: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(44, 42, 114, 0.1)', borderWidth: 1, borderColor: 'rgba(44, 42, 114, 0.25)' },
  fcJoinTextDefault: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  lcCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 14, gap: 18, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.small },
  lcIconBox: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lcCenter: { flex: 1, gap: 8, minWidth: 0 },
  lcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lcName: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', flexShrink: 1, color: colors.text },
  lcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lcTypePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  lcTypePillText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  lcLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  lcLocationText: { fontSize: 13, fontFamily: 'Poppins_400Regular', flexShrink: 1, color: colors.textTertiary },
  lcRight: { alignItems: 'flex-end', gap: 12 },
  lcMembersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lcMembersText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  lcJoinBtnDefault: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', minWidth: 72, backgroundColor: CultureTokens.indigo },
  lcJoinBtnJoined: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', minWidth: 72, backgroundColor: 'rgba(44, 42, 114, 0.1)', borderWidth: 1, borderColor: 'rgba(44, 42, 114, 0.25)' },
  lcJoinTextDefault: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
});

import {
  View, Text, Pressable, StyleSheet, Platform,
  TextInput, RefreshControl, FlatList, ScrollView, ActivityIndicator,
} from 'react-native';
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

const isWeb = Platform.OS === 'web';

const TYPE_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  community:    { color: '#0081C8', icon: 'people' },
  organisation: { color: '#5856D6', icon: 'business' },
  venue:        { color: '#34C759', icon: 'location' },
  council:      { color: '#FF9500', icon: 'shield-checkmark' },
  government:   { color: '#AF52DE', icon: 'flag' },
  artist:       { color: '#FF2D55', icon: 'musical-notes' },
  business:     { color: '#5AC8FA', icon: 'storefront' },
};

const CATEGORIES = [
  { id: 'all',          label: 'All',           icon: 'grid-outline' },
  { id: 'community',    label: 'Communities',    icon: 'people-outline' },
  { id: 'organisation', label: 'Organisations',  icon: 'business-outline' },
  { id: 'venue',        label: 'Venues',         icon: 'location-outline' },
  { id: 'council',      label: 'Councils',       icon: 'shield-checkmark-outline' },
  { id: 'artist',       label: 'Artists',        icon: 'musical-notes-outline' },
  { id: 'business',     label: 'Businesses',     icon: 'storefront-outline' },
];

function fmt(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
}

// ---------------------------------------------------------------------------
// Featured card (horizontal scroll)
// ---------------------------------------------------------------------------
function FeaturedCard({ profile }: { profile: Profile }) {
  const colors = useColors();
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined = isCommunityJoined(profile.id);
  const meta   = TYPE_META[profile.entityType] ?? { color: colors.primary, icon: 'people' as const };

  return (
    <Pressable
      style={[fc.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: profile.id } })}
    >
      <LinearGradient
        colors={[meta.color + '22', meta.color + '06', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={fc.top}>
        <View style={[fc.iconBox, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        {profile.isVerified && (
          <View style={[fc.verifiedBadge, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          </View>
        )}
      </View>

      <Text style={[fc.name, { color: colors.text }]} numberOfLines={2}>{profile.name}</Text>
      <Text style={[fc.desc, { color: colors.textSecondary }]} numberOfLines={2}>
        {profile.description || `${profile.entityType} · ${profile.city ?? 'Australia'}`}
      </Text>

      <View style={fc.bottom}>
        <View style={fc.members}>
          <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
          <Text style={[fc.membersText, { color: colors.textTertiary }]}>{fmt(profile.membersCount ?? 0)}</Text>
        </View>
        <Pressable
          hitSlop={4}
          onPress={(e) => { e?.stopPropagation?.(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleJoinCommunity(profile.id); }}
          style={[fc.joinBtn, joined ? { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary + '40' } : { backgroundColor: meta.color }]}
        >
          <Ionicons name={joined ? 'checkmark' : 'add'} size={13} color={joined ? colors.primary : colors.textInverse} />
          <Text style={[fc.joinText, { color: joined ? colors.primary : colors.textInverse }]}>{joined ? 'Joined' : 'Join'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// List card
// ---------------------------------------------------------------------------
function CommunityCard({ profile }: { profile: Profile }) {
  const colors = useColors();
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined = isCommunityJoined(profile.id);
  const meta   = TYPE_META[profile.entityType] ?? { color: colors.primary, icon: 'people' as const };

  return (
    <Pressable
      style={({ pressed }) => [lc.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: profile.id } })}
    >
      <View style={[lc.iconBox, { backgroundColor: meta.color + '14' }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>

      <View style={lc.center}>
        <View style={lc.nameRow}>
          <Text style={[lc.name, { color: colors.text }]} numberOfLines={1}>{profile.name}</Text>
          {profile.isVerified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
        </View>
        <View style={lc.metaRow}>
          <View style={[lc.typePill, { backgroundColor: meta.color + '12' }]}>
            <Text style={[lc.typePillText, { color: meta.color }]}>{profile.entityType}</Text>
          </View>
          {profile.city && (
            <View style={lc.locationRow}>
              <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
              <Text style={[lc.locationText, { color: colors.textTertiary }]} numberOfLines={1}>{profile.city}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={lc.right}>
        <View style={lc.membersRow}>
          <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
          <Text style={[lc.membersText, { color: colors.textSecondary }]}>{fmt(profile.membersCount ?? 0)}</Text>
        </View>
        <Pressable
          hitSlop={4}
          onPress={(e) => { e?.stopPropagation?.(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleJoinCommunity(profile.id); }}
          style={[lc.joinBtn, joined ? { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary + '35' } : { backgroundColor: colors.primary }]}
        >
          {joined ? (
            <Ionicons name="checkmark" size={14} color={colors.primary} />
          ) : (
            <Text style={[lc.joinText, { color: colors.textInverse }]}>Join</Text>
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
  const topInset    = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const [search,        setSearch]        = useState('');
  const [selectedType,  setSelectedType]  = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allProfiles, isLoading } = useQuery<Profile[]>({ queryKey: ['/api/profiles'] });

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
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSelectType = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedType(id);
  }, []);

  const renderItem = useCallback(({ item }: { item: Profile }) => <CommunityCard profile={item} />, []);
  const keyExtractor = useCallback((item: Profile) => item.id, []);

  const ListHeader = useMemo(() => (
    <>
      {featuredProfiles.length > 0 && !search.trim() && selectedType === 'all' && (
        <View style={s.featSection}>
          <View style={s.sectionRow}>
            <Ionicons name="star" size={16} color={colors.accent} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Featured</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {featuredProfiles.map((p) => <FeaturedCard key={p.id} profile={p} />)}
          </ScrollView>
        </View>
      )}
      <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
        <Text style={[s.resultsCount, { color: colors.textTertiary }]}>
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'result' : 'results'}
        </Text>
      </View>
    </>
  ), [featuredProfiles, filteredProfiles.length, search, selectedType, colors]);

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={[s.header, { borderBottomColor: colors.divider }]}>
          <Text style={[s.title, { color: colors.text }]}>Community</Text>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading Community tab...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>Community</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            {typeCounts.all ?? 0} communities &amp; organisations
          </Text>
        </View>
        <Pressable
          style={[s.headerBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/submit' as never); }}
          accessibilityRole="button"
          accessibilityLabel="Submit listing"
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable
        style={[s.councilBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(tabs)/council');
        }}
        accessibilityRole="button"
        accessibilityLabel="Open My Council"
      >
        <View style={[s.councilIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="business" size={16} color={colors.primary} />
        </View>
        <View style={s.councilTextWrap}>
          <Text style={[s.councilTitle, { color: colors.text }]}>My Council</Text>
          <Text style={[s.councilSub, { color: colors.textSecondary }]}>Alerts, waste days, grants & links</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      {/* Search */}
      <View style={[
        s.searchBar,
        { backgroundColor: colors.surface, borderColor: searchFocused ? colors.primary : colors.borderLight },
      ]}>
        <Ionicons name="search" size={18} color={searchFocused ? colors.primary : colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search communities, venues, artists…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <FilterChipRow
        items={CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon.replace('-outline', ''),
          color: cat.id === 'all' ? colors.primary : (TYPE_META[cat.id]?.color ?? colors.primary),
          count: typeCounts[cat.id] ?? 0,
        }))}
        selectedId={selectedType}
        onSelect={handleSelectType}
      />

      {/* List */}
      <FlatList
        data={filteredProfiles}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        contentContainerStyle={{ paddingBottom: bottomInset + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {search.length > 0 || selectedType !== 'all' ? 'No results found' : 'No communities yet'}
            </Text>
            <Text style={[s.emptySub, { color: colors.textTertiary }]}>
              {search.length > 0 || selectedType !== 'all' ? 'Try adjusting your search or filters' : 'No communities in this tab yet.'}
            </Text>
            {search.length > 0 && (
              <Pressable
                style={[s.clearBtn, { backgroundColor: colors.primaryGlow }]}
                onPress={() => { setSearch(''); setSelectedType('all'); }}
              >
                <Text style={[s.clearBtnText, { color: colors.primary }]}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: -2 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },

  councilBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 2, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  councilIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  councilTextWrap: { flex: 1 },
  councilTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  councilSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderRadius: 14, borderWidth: 1, marginBottom: 10, marginTop: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', padding: 0 },

  featSection: { marginBottom: 16, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  resultsCount: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  emptySub: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  clearBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  clearBtnText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
});

const fc = StyleSheet.create({
  card: { width: 190, borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', lineHeight: 20 },
  desc: { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 16, flexShrink: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  members: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  membersText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  joinText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
});

const lc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  center: { flex: 1, gap: 5, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  locationText: { fontSize: 12, fontFamily: 'Poppins_400Regular', flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: 8 },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  membersText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  joinBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 54 },
  joinText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
});

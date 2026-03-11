import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { api, type ActivityData } from '@/lib/api';
import type { EventData, Community, Profile } from '@/shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CultureTokens } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

type ResultType = 'event' | 'movie' | 'restaurant' | 'activity' | 'shopping' | 'community';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  imageUrl?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const POPULAR_SEARCHES = ['Diwali', 'Comedy Night', 'Bollywood', 'Food Festival', 'Art Exhibition', 'Cricket'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  
  const topInset = isWeb ? 72 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const isDesktop = width >= 1024;

  const s = useMemo(() => getStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ResultType | 'all'>('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const { state } = useOnboarding();

  const TYPE_CONFIG = useMemo((): Record<ResultType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
    event:      { label: 'Events',       icon: 'calendar',   color: CultureTokens.saffron },
    movie:      { label: 'Movies',       icon: 'film',       color: CultureTokens.gold },
    restaurant: { label: 'Dining',       icon: 'restaurant', color: CultureTokens.coral },
    activity:   { label: 'Activities',   icon: 'football',   color: CultureTokens.teal },
    shopping:   { label: 'Stores',       icon: 'bag',        color: '#FF9F1C' },
    community:  { label: 'Communities',  icon: 'people',     color: CultureTokens.indigo },
  }), []);

  const locationParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (state.country) params.country = state.country;
    if (state.city) params.city = state.city;
    return params;
  }, [state.country, state.city]);

  const { data: events = [] } = useQuery<EventData[]>({
    queryKey: ['/api/events', state.country, state.city],
    queryFn: async () => {
      const data = await api.events.list(locationParams);
      return data.events ?? [];
    },
  });

  const { data: movies = [] } = useQuery<Profile[]>({
    queryKey: ['/api/movies', state.country, state.city],
    queryFn: () => api.movies.list(locationParams),
  });

  const { data: restaurants = [] } = useQuery<Profile[]>({
    queryKey: ['/api/restaurants', state.country, state.city],
    queryFn: () => api.restaurants.list(locationParams),
  });

  const { data: activities = [] } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities', state.country, state.city],
    queryFn: () => api.activities.list(locationParams),
  });

  const { data: shopping = [] } = useQuery<Profile[]>({
    queryKey: ['/api/shopping', state.country, state.city],
    queryFn: () => api.shopping.list(locationParams),
  });

  const { data: communities = [] } = useQuery<Community[]>({
    queryKey: ['/api/communities', state.country, state.city],
    queryFn: () => api.communities.list(locationParams),
  });

  const allResults = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const toLower = (value: unknown) => String(value ?? '').toLowerCase();
    const asString = (value: unknown) => String(value ?? '');
    const asStringArray = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v)) : []);

    const results: SearchResult[] = [];

    events.forEach((e) => {
      if (toLower(e.title).includes(q) || toLower(e.communityTag).includes(q) || toLower(e.venue).includes(q)) {
        results.push({
          id: e.id,
          type: 'event',
          title: e.title,
          subtitle: `${asString(e.communityTag)} · ${asString(e.venue)}`,
          imageUrl: e.imageUrl,
          icon: TYPE_CONFIG.event.icon,
          color: TYPE_CONFIG.event.color,
        });
      }
    });

    movies.forEach((m) => {
      const movie = m as unknown as Record<string, unknown>;
      const genre = asStringArray(movie.genre);
      if (toLower(movie.title).includes(q) || toLower(movie.language).includes(q) || genre.some((g) => g.toLowerCase().includes(q))) {
        results.push({
          id: asString(movie.id),
          type: 'movie',
          title: asString(movie.title),
          subtitle: `${asString(movie.language)} · ${genre.join(', ')}`,
          imageUrl: asString(movie.posterUrl) || undefined,
          icon: TYPE_CONFIG.movie.icon,
          color: TYPE_CONFIG.movie.color,
        });
      }
    });

    restaurants.forEach((r) => {
      const restaurant = r as unknown as Record<string, unknown>;
      if (toLower(restaurant.name).includes(q) || toLower(restaurant.cuisine).includes(q) || toLower(restaurant.description).includes(q)) {
        results.push({
          id: asString(restaurant.id),
          type: 'restaurant',
          title: asString(restaurant.name),
          subtitle: `${asString(restaurant.cuisine)} · ${asString(restaurant.priceRange)}`,
          imageUrl: asString(restaurant.imageUrl) || undefined,
          icon: TYPE_CONFIG.restaurant.icon,
          color: TYPE_CONFIG.restaurant.color,
        });
      }
    });

    activities.forEach((activity) => {
      if (toLower(activity.name).includes(q) || toLower(activity.category).includes(q) || toLower(activity.description).includes(q)) {
        results.push({
          id: activity.id,
          type: 'activity',
          title: activity.name,
          subtitle: `${activity.category} · ${activity.priceLabel ?? 'Free'}`,
          imageUrl: activity.imageUrl,
          icon: TYPE_CONFIG.activity.icon,
          color: TYPE_CONFIG.activity.color,
        });
      }
    });

    shopping.forEach((s) => {
      const shop = s as unknown as Record<string, unknown>;
      if (toLower(shop.name).includes(q) || toLower(shop.category).includes(q) || toLower(shop.description).includes(q)) {
        results.push({
          id: asString(shop.id),
          type: 'shopping',
          title: asString(shop.name),
          subtitle: `${asString(shop.category)} · ${asString(shop.location)}`,
          imageUrl: asString(shop.imageUrl) || undefined,
          icon: TYPE_CONFIG.shopping.icon,
          color: TYPE_CONFIG.shopping.color,
        });
      }
    });

    communities.forEach((c) => {
      if (toLower(c.name).includes(q) || toLower(c.category).includes(q)) {
        results.push({
          id: c.id,
          type: 'community',
          title: c.name ?? 'Community',
          subtitle: `${asString(c.category)} · ${c.membersCount ?? c.memberCount ?? 0} members`,
          icon: TYPE_CONFIG.community.icon,
          color: TYPE_CONFIG.community.color,
        });
      }
    });

    return results;
  }, [query, events, movies, restaurants, activities, shopping, communities, TYPE_CONFIG]);

  const filteredResults = useMemo(() => {
    if (selectedType === 'all') return allResults;
    return allResults.filter(r => r.type === selectedType);
  }, [allResults, selectedType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allResults.length };
    allResults.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return counts;
  }, [allResults]);

  const handleResultPress = (result: SearchResult) => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const routes: Record<ResultType, string> = {
      event: '/event/[id]',
      movie: '/movies/[id]',
      restaurant: '/restaurants/[id]',
      activity: '/activities/[id]',
      shopping: '/shopping/[id]',
      community: '/community/[id]',
    };
    router.push({ pathname: routes[result.type] as never, params: { id: result.id } });
  };

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: topInset }]}>
        <View style={[s.shell, isDesktop && s.desktopShell]}>
          <View style={s.header}>
            <Pressable 
              onPress={() => router.back()} 
              style={({ pressed }) => [s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.95 : 1 }] }]} 
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: searchFocused ? CultureTokens.indigo : colors.borderLight }]}>
              <Ionicons name="search" size={20} color={searchFocused ? CultureTokens.indigo : colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search events, restaurants, movies..."
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>

          {query.length > 0 && allResults.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow} style={{ flexGrow: 0 }}>
              <Pressable
                style={[s.typeChip, { backgroundColor: selectedType === 'all' ? CultureTokens.indigo : colors.surface, borderColor: selectedType === 'all' ? CultureTokens.indigo : colors.borderLight }]}
                onPress={() => { if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType('all'); }}
              >
                <Text style={[s.typeChipText, { color: selectedType === 'all' ? '#FFFFFF' : colors.textSecondary }]}>All ({typeCounts.all})</Text>
              </Pressable>
              {(Object.keys(TYPE_CONFIG) as ResultType[]).filter(t => typeCounts[t]).map(type => (
                <Pressable
                  key={type}
                  style={[s.typeChip, { backgroundColor: selectedType === type ? TYPE_CONFIG[type].color : colors.surface, borderColor: selectedType === type ? TYPE_CONFIG[type].color : colors.borderLight }]}
                  onPress={() => { if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type); }}
                >
                  <Ionicons name={TYPE_CONFIG[type].icon} size={14} color={selectedType === type ? '#FFFFFF' : TYPE_CONFIG[type].color} />
                  <Text style={[s.typeChipText, { color: selectedType === type ? '#FFFFFF' : colors.textSecondary }]}> 
                    {TYPE_CONFIG[type].label} ({typeCounts[type]})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 40 }}>
            {query.length === 0 ? (
              <View style={s.suggestionsContainer}>
                <Text style={[s.suggestionsTitle, { color: colors.text }]}>Trending Searches</Text>
                <View style={s.suggestionsGrid}>
                  {POPULAR_SEARCHES.map(term => (
                    <Pressable 
                      key={term} 
                      style={({ pressed }) => [s.suggestionPill, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => setQuery(term)}
                    >
                      <Ionicons name="trending-up" size={16} color={CultureTokens.indigo} />
                      <Text style={[s.suggestionText, { color: colors.text }]}>{term}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[s.suggestionsTitle, { color: colors.text, marginTop: 32 }]}>Explore Categories</Text>
                <View style={s.categoriesGrid}>
                  {(Object.entries(TYPE_CONFIG) as [ResultType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }][]).map(([key, config]) => (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [s.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                      onPress={() => {
                        if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const routes: Record<ResultType, string> = {
                          event: '/(tabs)/explore',
                          movie: '/movies',
                          restaurant: '/restaurants',
                          activity: '/activities',
                          shopping: '/shopping',
                          community: '/(tabs)/communities',
                        };
                        router.push(routes[key] as never);
                      }}
                    >
                      <View style={[s.categoryIcon, { backgroundColor: config.color + '15' }]}>
                        <Ionicons name={config.icon} size={24} color={config.color} />
                      </View>
                      <Text style={[s.categoryLabel, { color: colors.text }]}>{config.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : filteredResults.length === 0 ? (
              <View style={s.emptyState}>
                <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text }]}>No results found</Text>
                <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>We couldn&apos;t find anything matching &quot;{query}&quot;. Try different keywords or browse categories.</Text>
              </View>
            ) : (
              <View style={s.resultsList}>
                <Text style={[s.resultsCount, { color: colors.textSecondary }]}>
                  {filteredResults.length} {filteredResults.length === 1 ? 'match found' : 'matches found'}
                </Text>
                {filteredResults.map((result) => (
                  <View key={`${result.type}-${result.id}`}>
                    <Pressable 
                      style={({ pressed }) => [s.resultCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => handleResultPress(result)}
                    >
                      {result.imageUrl ? (
                        <Image source={{ uri: result.imageUrl }} style={s.resultImage} />
                      ) : (
                        <View style={[s.resultIconBox, { backgroundColor: result.color + '15' }]}>
                          <Ionicons name={result.icon as never} size={24} color={result.color} />
                        </View>
                      )}
                      <View style={s.resultInfo}>
                        <View style={s.resultTypeBadge}>
                          <View style={[s.resultTypeDot, { backgroundColor: result.color }]} />
                          <Text style={[s.resultTypeText, { color: colors.textSecondary }]}>{TYPE_CONFIG[result.type].label}</Text>
                        </View>
                        <Text style={[s.resultTitle, { color: colors.text }]} numberOfLines={1}>{result.title}</Text>
                        <Text style={[s.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{result.subtitle}</Text>
                      </View>
                      <View style={[s.resultArrowBox, { backgroundColor: colors.backgroundSecondary }]}>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  desktopShell: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, gap: 10, borderWidth: 1, height: 48, overflow: 'hidden' },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Poppins_500Medium', paddingVertical: 0, minWidth: 0 },
  
  typeRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 16, paddingTop: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  
  suggestionsContainer: { paddingHorizontal: 20, paddingTop: 20 },
  suggestionsTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 16 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: '31%' as never, flexGrow: 1, borderRadius: 20, padding: 20, alignItems: 'center', gap: 12, borderWidth: 1 },
  categoryIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  emptyDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22 },
  
  resultsList: { paddingHorizontal: 20, paddingTop: 12 },
  resultsCount: { fontSize: 14, fontFamily: 'Poppins_500Medium', marginBottom: 16 },
  resultCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  resultImage: { width: 64, height: 64, borderRadius: 14 },
  resultIconBox: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1, gap: 3 },
  resultTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultTypeDot: { width: 8, height: 8, borderRadius: 4 },
  resultTypeText: { fontSize: 11, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', paddingRight: 8 },
  resultSubtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  resultArrowBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

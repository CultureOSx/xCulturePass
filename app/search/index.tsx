import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, Image } from 'react-native';
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

type ResultType = 'event' | 'movie' | 'restaurant' | 'activity' | 'shopping' | 'community';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  imageUrl?: string;
  icon: string;
  color: string;
}

const POPULAR_SEARCHES = ['Diwali', 'Comedy Night', 'Bollywood', 'Food Festival', 'Art Exhibition', 'Cricket'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ResultType | 'all'>('all');
  const { state } = useOnboarding();

  const TYPE_CONFIG = useMemo((): Record<ResultType, { label: string; icon: string; color: string }> => ({
    event:      { label: 'Events',       icon: 'calendar',   color: colors.primary },
    movie:      { label: 'Movies',       icon: 'film',       color: colors.secondary },
    restaurant: { label: 'Restaurants',  icon: 'restaurant', color: colors.success },
    activity:   { label: 'Activities',   icon: 'football',   color: colors.info },
    shopping:   { label: 'Shopping',     icon: 'bag',        color: colors.accent },
    community:  { label: 'Communities',  icon: 'people',     color: colors.info },
  }), [colors]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search events, restaurants, movies..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {query.length > 0 && allResults.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow} style={{ flexGrow: 0 }}>
          <Pressable
            style={[s.typeChip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
              selectedType === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType('all'); }}
          >
            <Text style={[s.typeChipText, { color: colors.text }, selectedType === 'all' && { color: colors.textInverse }]}>All ({typeCounts.all})</Text>
          </Pressable>
          {(Object.keys(TYPE_CONFIG) as ResultType[]).filter(t => typeCounts[t]).map(type => (
            <Pressable
              key={type}
              style={[s.typeChip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                selectedType === type && { backgroundColor: TYPE_CONFIG[type].color, borderColor: TYPE_CONFIG[type].color }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type); }}
            >
              <Ionicons name={TYPE_CONFIG[type].icon as never} size={14} color={selectedType === type ? colors.textInverse : TYPE_CONFIG[type].color} />
              <Text style={[s.typeChipText, { color: colors.text }, selectedType === type && { color: colors.textInverse }]}> 
                {TYPE_CONFIG[type].label} ({typeCounts[type]})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        {query.length === 0 ? (
          <View style={s.suggestionsContainer}>
            <Text style={[s.suggestionsTitle, { color: colors.text }]}>Popular Searches</Text>
            <View style={s.suggestionsGrid}>
              {POPULAR_SEARCHES.map(term => (
                <Pressable key={term} style={[s.suggestionPill, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]} onPress={() => setQuery(term)}>
                  <Ionicons name="trending-up" size={14} color={colors.primary} />
                  <Text style={[s.suggestionText, { color: colors.primary }]}>{term}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.suggestionsTitle, { color: colors.text, marginTop: 28 }]}>Browse Categories</Text>
            <View style={s.categoriesGrid}>
              {(Object.entries(TYPE_CONFIG) as [ResultType, { label: string; icon: string; color: string }][]).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[s.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    <Ionicons name={config.icon as never} size={24} color={config.color} />
                  </View>
                  <Text style={[s.categoryLabel, { color: colors.text }]}>{config.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : filteredResults.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="search-outline" size={56} color={colors.textSecondary} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[s.emptyDesc, { color: colors.text }]}>Try different keywords or browse categories</Text>
          </View>
        ) : (
          <View style={s.resultsList}>
            <Text style={[s.resultsCount, { color: colors.text }]}>{filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found</Text>
            {filteredResults.map((result) => (
              <View key={`${result.type}-${result.id}`}>
                <Pressable style={[s.resultCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => handleResultPress(result)}>
                  {result.imageUrl ? (
                    <Image source={{ uri: result.imageUrl }} style={s.resultImage} />
                  ) : (
                    <View style={[s.resultIconBox, { backgroundColor: result.color + '15' }]}>
                      <Ionicons name={result.icon as never} size={22} color={result.color} />
                    </View>
                  )}
                  <View style={s.resultInfo}>
                    <View style={s.resultTypeBadge}>
                      <View style={[s.resultTypeDot, { backgroundColor: result.color }]} />
                      <Text style={[s.resultTypeText, { color: colors.textSecondary }]}>{TYPE_CONFIG[result.type].label}</Text>
                    </View>
                    <Text style={[s.resultTitle, { color: colors.text }]} numberOfLines={1}>{result.title}</Text>
                    <Text style={[s.resultSubtitle, { color: colors.text }]} numberOfLines={1}>{result.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtn:          { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  searchBar:        { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, gap: 8, borderWidth: 1, height: 44, overflow: 'hidden' },
  searchInput:      { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', paddingVertical: 0, minWidth: 0 },
  typeRow:          { paddingHorizontal: 20, gap: 8, paddingBottom: 12, paddingTop: 4 },
  typeChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1 },
  typeChipText:     { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  suggestionsContainer: { paddingHorizontal: 20, paddingTop: 24 },
  suggestionsTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: 14 },
  suggestionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1 },
  suggestionText:   { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  categoriesGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard:     { width: '31%' as never, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  categoryIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryLabel:    { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  emptyState:       { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle:       { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  emptyDesc:        { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  resultsList:      { paddingHorizontal: 20, paddingTop: 8 },
  resultsCount:     { fontSize: 13, fontFamily: 'Poppins_500Medium', marginBottom: 12 },
  resultCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 12 },
  resultImage:      { width: 52, height: 52, borderRadius: 12 },
  resultIconBox:    { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultInfo:       { flex: 1, gap: 2 },
  resultTypeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultTypeDot:    { width: 6, height: 6, borderRadius: 3 },
  resultTypeText:   { fontSize: 10, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultTitle:      { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  resultSubtitle:   { fontSize: 12, fontFamily: 'Poppins_400Regular' },
});

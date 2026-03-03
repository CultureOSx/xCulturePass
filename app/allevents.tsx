import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, ActivityIndicator,
  FlatList, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOnboarding } from '@/contexts/OnboardingContext';
import EventCard from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FilterModal, { type DateFilter } from '@/components/FilterModal';
import type { EventData, PaginatedEventsResponse } from '@/shared/schema';

const PAGE_SIZE = 20;

export default function AllEventsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { state } = useOnboarding();
  const { width: screenWidth } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && screenWidth >= 1024;
  const isTablet = screenWidth >= 768;
  const numCols = isDesktop ? 3 : 2;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const queryKey = useMemo(() => [
    '/api/events/paginated',
    state.country,
    state.city,
    selectedCategory,
  ], [state.country, state.city, selectedCategory]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery<PaginatedEventsResponse>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      return api.events.list({
        country: state.country || undefined,
        city: state.city || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        page: (pageParam as number) ?? 1,
        pageSize: PAGE_SIZE,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
  });

  const allEvents: EventData[] = useMemo(
    () => data?.pages.flatMap((p) => p.events) ?? [],
    [data],
  );

  const CATEGORIES = useMemo(
    () => ['All', ...Array.from(new Set(allEvents.map((e) => e.category).filter(Boolean) as string[]))],
    [allEvents],
  );

  const handleSelectCategory = useCallback((cat: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: EventData }) => (
    <View style={s.cardWrapper}>
      <EventCard event={item} />
    </View>
  ), []);

  const ListFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={s.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!hasNextPage && allEvents.length > 0) {
      return (
        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textTertiary }]}>All events loaded</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, allEvents.length, colors]);

  const hPad = isDesktop ? 32 : isTablet ? 24 : 20;
  const columnGap = isDesktop ? 16 : 14;

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 0 : 0), backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingHorizontal: hPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }, isDesktop && s.headerTitleDesktop]}>
          All Events
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[s.filterBar, { paddingLeft: hPad, paddingRight: hPad - 10 }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={s.categoryList}
          renderItem={({ item: cat }) => (
            <Pressable
              onPress={() => handleSelectCategory(cat)}
              style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                selectedCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[s.chipText, { color: colors.text }, selectedCategory === cat && { color: '#FFF' }]}>
                {cat}
              </Text>
            </Pressable>
          )}
        />
        <Pressable style={s.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <FlatList
          key={`skeleton-cols-${numCols}`}
          data={Array.from({ length: 8 })}
          renderItem={() => (
            <View style={s.cardWrapper}>
              <EventCardSkeleton />
            </View>
          )}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={numCols}
          columnWrapperStyle={{ gap: columnGap }}
          contentContainerStyle={[s.list, { paddingHorizontal: hPad, gap: columnGap }]}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          key={`events-cols-${numCols}`}
          data={allEvents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numCols}
          columnWrapperStyle={{ gap: columnGap }}
          contentContainerStyle={[s.list, { paddingHorizontal: hPad, gap: columnGap }]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={ListFooter}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
              <Text style={[s.emptyText, { color: colors.textTertiary }]}>No events in this category</Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedDateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />
    </View>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  container:            { flex: 1 },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerTitle:          { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  headerTitleDesktop:   { fontSize: 24 },
  filterBar:            { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  categoryList:         { gap: 8 },
  chip:                 { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, borderWidth: 1 },
  chipText:             { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  filterButton:         { padding: 8, marginLeft: 8 },
  list:                 { paddingBottom: 100 },
  cardWrapper:          { flex: 1 },
  footer:               { paddingVertical: 20, alignItems: 'center' },
  footerText:           { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  emptyState:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText:            { fontFamily: 'Poppins_500Medium', fontSize: 15 },
});

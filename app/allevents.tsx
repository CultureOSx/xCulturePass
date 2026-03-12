import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, ActivityIndicator,
  FlatList, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOnboarding } from '@/contexts/OnboardingContext';
import EventCard from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FilterModal, { type DateFilter } from '@/components/FilterModal';
import type { EventData, PaginatedEventsResponse } from '@/shared/schema';
import { CultureTokens } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const PAGE_SIZE = 20;
const isWeb = Platform.OS === 'web';

export default function AllEventsScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const { width: screenWidth } = useWindowDimensions();

  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 768;
  const numCols = isDesktop ? 3 : isTablet ? 2 : 1;

  const topInset = isWeb ? 72 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

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
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.page + 1 : undefined,
  });

  const allEvents: EventData[] = useMemo(() => data?.pages.flatMap((p) => p.events) ?? [], [data]);
  const CATEGORIES = useMemo(() => ['All', ...Array.from(new Set(allEvents.map((e) => e.category).filter(Boolean) as string[]))], [allEvents]);

  const handleSelectCategory = useCallback((cat: string) => {
    if(!isWeb) Haptics.selectionAsync();
    setSelectedCategory(cat);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: EventData }) => (
    <View style={s.cardWrapper}>
      <EventCard event={item} />
    </View>
  ), []);

  const ListFooter = useCallback(() => {
    if (isFetchingNextPage) return <View style={s.footer}><ActivityIndicator size="small" color={CultureTokens.indigo} /></View>;
    if (!hasNextPage && allEvents.length > 0) return <View style={s.footer}><Text style={s.footerText}>No more events found in this category.</Text></View>;
    return null;
  }, [isFetchingNextPage, hasNextPage, allEvents.length]);

  const hPad = isDesktop ? 32 : isTablet ? 24 : 20;
  const columnGap = isDesktop ? 20 : 16;

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: topInset }]}>
        <LinearGradient 
          colors={['rgba(255, 140, 66, 0.15)', 'transparent']} 
          style={StyleSheet.absoluteFillObject} 
          pointerEvents="none" 
        />
        <View style={[s.shell, isDesktop && s.desktopShell]}>
          <View style={[s.header, { paddingHorizontal: hPad }]}>
            <Pressable 
              onPress={() => router.back()} 
              style={({ pressed }) => [s.backBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]} 
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={[s.headerTitle, isDesktop && s.headerTitleDesktop]}>{state.city || 'Events'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={[s.filterBar, { paddingLeft: hPad, paddingRight: hPad }]}>
            <View style={{ flex: 1 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(item) => item}
                contentContainerStyle={s.categoryList}
                renderItem={({ item: cat }) => (
                  <Pressable
                    onPress={() => handleSelectCategory(cat)}
                    style={({ pressed }) => [
                      s.chip, 
                      selectedCategory === cat ? { backgroundColor: CultureTokens.indigo, borderColor: CultureTokens.indigo } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
                      pressed && selectedCategory !== cat && { opacity: 0.8 }
                    ]}
                  >
                    <Text style={[s.chipText, { color: selectedCategory === cat ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }]}>{cat}</Text>
                  </Pressable>
                )}
              />
            </View>
            <Pressable 
               style={({pressed}) => [s.filterButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }]} 
               onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {isLoading ? (
            <FlatList
              key={`skeleton-cols-${numCols}`}
              data={Array.from({ length: 8 })}
              renderItem={() => ( <View style={s.cardWrapper}><EventCardSkeleton /></View> )}
              keyExtractor={(_, i) => `skeleton-${i}`}
              numColumns={numCols}
              columnWrapperStyle={numCols > 1 ? { gap: columnGap } : undefined}
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
              columnWrapperStyle={numCols > 1 ? { gap: columnGap } : undefined}
              contentContainerStyle={[s.list, { paddingHorizontal: hPad, gap: columnGap, paddingBottom: bottomInset + 80 }]}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              refreshing={isRefetching}
              onRefresh={refetch}
              ListFooterComponent={ListFooter}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <View style={s.emptyIconBox}>
                    <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.4)" />
                  </View>
                  <Text style={s.emptyTitle}>No events found</Text>
                  <Text style={s.emptyDesc}>There are currently no upcoming events in this category. Try adjusting your filters.</Text>
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
      </View>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  shell: { flex: 1 },
  desktopShell: { maxWidth: 1040, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFFFFF' },
  headerTitleDesktop: { fontSize: 26 },
  
  filterBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  categoryList: { gap: 8, paddingRight: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  filterButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  
  list: { paddingTop: 8 },
  cardWrapper: { flex: 1, minWidth: '45%' },
  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFFFFF' },
  emptyDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
});

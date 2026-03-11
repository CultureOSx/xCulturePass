import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useColorScheme,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import type { PaginatedEventsResponse, EventData, Community } from '@/shared/schema';
import { useMemo, useCallback, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LocationPicker } from '@/components/LocationPicker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api, type ActivityData } from '@/lib/api';
import { useColors } from '@/hooks/useColors';
import EventCard from '@/components/Discover/EventCard';
import CategoryCard from '@/components/Discover/CategoryCard';
import CommunityCard from '@/components/Discover/CommunityCard';
import CityCard from '@/components/Discover/CityCard';
import { CategoryColors, CultureTokens, gradients } from '@/constants/theme';
import { FilterChip } from '@/components/FilterChip';
import SectionHeader from '@/components/Discover/SectionHeader';
import SpotlightCard, { SpotlightItem } from '@/components/Discover/SpotlightCard';
import { calculateDistance, getPostcodesByPlace } from '@shared/location/australian-postcodes';
import { useCouncil } from '@/hooks/useCouncil';
import { useLayout } from '@/hooks/useLayout';

const isWeb = Platform.OS === 'web';

const superAppSections = [
  { id: 'movies', label: 'Movies', icon: 'film', color: CultureTokens.error, route: '/movies' },
  { id: 'restaurants', label: 'Dining', icon: 'restaurant', color: CultureTokens.saffron, route: '/restaurants' },
  { id: 'activities', label: 'Activities', icon: 'compass', color: CultureTokens.success, route: '/activities' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle', color: CategoryColors.shopping, route: '/shopping' },
  { id: 'events', label: 'Events', icon: 'calendar', color: CultureTokens.indigo, route: '/(tabs)/explore' },
  { id: 'directory', label: 'Directory', icon: 'storefront', color: CultureTokens.teal, route: '/(tabs)/directory' },
];

const browseCategories = [
  { id: 'c1', label: 'Music', icon: 'musical-notes', color: CategoryColors.music },
  { id: 'c2', label: 'Dance', icon: 'body', color: CategoryColors.dance },
  { id: 'c3', label: 'Food', icon: 'restaurant', color: CategoryColors.food },
  { id: 'c4', label: 'Art', icon: 'color-palette', color: CategoryColors.art },
  { id: 'c5', label: 'Wellness', icon: 'heart', color: CategoryColors.wellness },
  { id: 'c6', label: 'Movies', icon: 'film', color: CategoryColors.movies },
  { id: 'c7', label: 'Workshop', icon: 'construct', color: CategoryColors.workshop },
  { id: 'c8', label: 'Heritage', icon: 'library', color: CategoryColors.heritage },
  { id: 'c9', label: 'Activities & Play', icon: 'game-controller', color: CategoryColors.activities },
  { id: 'c10', label: 'Nightlife', icon: 'moon', color: CategoryColors.nightlife },
  { id: 'c14', label: 'Featured Artists', icon: 'star', color: CategoryColors.artists },
];

const FEATURED_CITIES = [
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Brisbane', country: 'Australia' },
  { name: 'Perth', country: 'Australia' },
  { name: 'Adelaide', country: 'Australia' },
  { name: 'Gold Coast', country: 'Australia' },
  { name: 'Canberra', country: 'Australia' },
  { name: 'Hobart', country: 'Australia' },
];

function pushSafe(route?: string) {
  if (!route) return;
  router.push(route as never);
}

interface DiscoverSection {
  title: string;
  subtitle?: string;
  type: 'events' | 'communities' | 'businesses' | 'activities' | 'spotlight' | 'mixed';
  items: Record<string, unknown>[];
  priority: number;
}

interface DiscoverFeed {
  sections: DiscoverSection[];
  meta?: {
    userId: string;
    city: string;
    country: string;
    generatedAt: string;
    totalItems: number;
  };
}

function cityToCoordinates(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  const match = getPostcodesByPlace(city)[0];
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = isWeb ? 0 : insets.top;
  const colors = useColors();
  const styles = getStyles(colors);
  const { width, isDesktop, isTablet } = useLayout();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { state } = useOnboarding();
  const { isAuthenticated, userId: authUserId, user: authUser } = useAuth();
  const pathname = usePathname();
  const { data: councilData } = useCouncil();
  const council = councilData?.council;

  const [refreshing, setRefreshing] = useState(false);

  const { data: allEvents = [] } = useQuery<EventData[]>({
    queryKey: ['/api/events', state.country, state.city],
    queryFn: async () => {
      const result = await api.events.list({
        country: state.country || undefined,
        city: state.city || undefined,
        pageSize: 50,
      });
      return result.events ?? [];
    },
  });

  const activeAlerts = (councilData?.alerts ?? []).filter((alert: { status: string }) => alert.status === 'active');
  const isCouncilVerified = council?.verificationStatus === 'verified';
  const lgaCode = council?.lgaCode;

  const councilEvents = useMemo(() => {
    if (!council || !allEvents.length) return [];
    return allEvents.filter((e: EventData) =>
      (e.lgaCode && council.lgaCode && e.lgaCode === council.lgaCode) ||
      (e.councilId && council.id && e.councilId === council.id)
    );
  }, [council, allEvents]);

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

  const { data: traditionalLandsData = [] } = useQuery<{ city: string, landName: string, traditionalCustodians: string }[]>({
    queryKey: ['/api/indigenous/traditional-lands'],
    queryFn: () => api.raw('GET', 'api/indigenous/traditional-lands'),
  });

  const { data: allCommunities = [] } = useQuery<Community[]>({
    queryKey: ['/api/communities', state.city, state.country],
    queryFn: () => api.communities.list({ city: state.city || undefined, country: state.country || undefined }),
  });

  const { data: allActivities = [] } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities', state.country, state.city],
    queryFn: () => api.activities.list({ country: state.country || undefined, city: state.city || undefined }),
  });

  const { data: discoverFeed, isLoading: discoverLoading, refetch } = useQuery<DiscoverFeed>({
    queryKey: ['/api/discover', authUserId ?? 'guest', state.city, state.country],
    queryFn: async () => {
      if (authUserId) {
        const qs = new URLSearchParams();
        if (state.city) qs.set('city', state.city);
        if (state.country) qs.set('country', state.country);
        const q = qs.toString();
        return api.raw('GET', `api/discover/${authUserId}${q ? `?${q}` : ''}`);
      }
      return { sections: [] };
    },
  });

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = useMemo(() => {
    if (!isAuthenticated) return 'Explorer';
    const name = authUser?.displayName ?? authUser?.username ?? '';
    return name.split(' ')[0] || 'Explorer';
  }, [isAuthenticated, authUser]);

  const sections = discoverFeed?.sections ?? [];
  const nearYou = sections.find((s: any) => s.title === 'Near You');
  
  const selectedCityCoordinates = useMemo(() => cityToCoordinates(state.city), [state.city]);
  
  const distanceSortedEvents = useMemo(() => {
    if (!selectedCityCoordinates) return [] as EventData[];
    return allEvents
      .filter((event: EventData) => Boolean(event.venue && event.city))
      .map((event: EventData) => {
        const eventCoordinates = cityToCoordinates(event.city);
        if (!eventCoordinates) return null;
        return {
          event,
          distanceKm: calculateDistance(
            selectedCityCoordinates.latitude, selectedCityCoordinates.longitude,
            eventCoordinates.latitude, eventCoordinates.longitude,
          ),
        };
      })
      .filter((entry: any) => Boolean(entry))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 12)
      .map((entry: any) => ({ ...entry.event, distanceKm: entry.distanceKm }));
  }, [allEvents, selectedCityCoordinates]);

  const popularEvents = useMemo(() => {
    if (nearYou?.items?.length) {
      const result = [];
      for (const item of nearYou.items) {
        if (item.venue) {
          result.push(item);
          if (result.length === 12) break;
        }
      }
      return result;
    }
    if (distanceSortedEvents.length > 0) return distanceSortedEvents;
    return allEvents.filter(e => e.venue).sort((a, b) => (b.attending || 0) - (a.attending || 0)).slice(0, 12);
  }, [nearYou, allEvents, distanceSortedEvents]);

  const featuredEvent = allEvents.find((e) => e.isFeatured) || allEvents[0];
  const otherSections = sections.filter((s: any) => s.title !== 'Near You' && (s.type === 'events' || s.type === 'mixed'));

  const cultureCards = useMemo(() => {
    const types: Record<string, any[]> = {};
    allCommunities.forEach((c) => {
      const key = c.type || 'other';
      if (!types[key]) types[key] = [];
      if (types[key].length < 8) {
        types[key].push({
          id: c.id,
          label: c.name?.split(' ')[0] || c.name || 'Community',
          color: CultureTokens.indigo,
          emoji: c.iconEmoji,
          icon: 'people',
        });
      }
    });
    return Object.values(types).flat().slice(0, 10);
  }, [allCommunities]);

  const cityColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 800 : width;
  const cityCardWidth = Math.max(140, (width - 40 - (14 * (cityColumns - 1))) / cityColumns);

  const signInRoute = useMemo(() => {
    const redirectTo = pathname && pathname.startsWith('/') ? pathname : '/(tabs)';
    return `/(onboarding)/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);

  const openNotifications = useCallback(() => {
    if (isAuthenticated) { pushSafe('/notifications'); return; }
    pushSafe('/(onboarding)/login?redirectTo=/notifications');
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const land = traditionalLandsData.find((l) => l.city === state.city);

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}>
        {!(isWeb && isDesktop) && (
          <View style={[styles.topBar, isWeb && { paddingHorizontal: 20, paddingTop: 16 }]}>
            {Platform.OS === 'ios' && (
              <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
                <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.View style={[styles.topBarBorder, headerBorderStyle]} pointerEvents="none" />

            <View style={styles.brandBlock}>
              <Ionicons name="globe-outline" size={24} color={CultureTokens.indigo} />
              <View>
                <Text style={styles.brandName}>CulturePass</Text>
                <Text style={styles.brandUrl}>Belong Anywhere</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]} onPress={() => router.push('/search')}>
                <Ionicons name="search" size={22} color={colors.text} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]} onPress={() => pushSafe('/map')}>
                <Ionicons name="map-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]} onPress={openNotifications}>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {isAuthenticated && <View style={styles.notifDot} />}
              </Pressable>
            </View>
          </View>
        )}

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={isWeb ? (e: any) => { scrollY.value = e.nativeEvent.contentOffset.y; } : scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            { paddingBottom: 120 },
            isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CultureTokens.indigo} />}
        >


          {isWeb && isDesktop ? (
            <View style={styles.heroSectionDesktop}>
              <View style={styles.heroDesktopLeft}>
                <Text style={styles.heroSubtitleDesktop}>{timeGreeting}, {firstName}</Text>
                <Pressable onPress={() => router.push('/allevents')}>
                  <LinearGradient
                    colors={gradients.culturepassBrandReversed}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center' }}
                  >
                    <Text style={styles.heroTitleDesktop}>WATS ON This Week.</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.locationPickerRow, isDesktop && { paddingHorizontal: 0 }]}>
                <LocationPicker />
              </View>

              {/* Hero Row / Header */}
              <View style={[styles.heroSection, isDesktop && { paddingHorizontal: 0 }]}>
                <Text style={styles.heroSubtitle}>{timeGreeting}, {firstName}</Text>
                <Pressable onPress={() => router.push('/allevents')}>
                  <LinearGradient
                    colors={gradients.culturepassBrandReversed}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}
                  >
                    <Text style={styles.heroTitle}>WATS ON This Week.</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          )}

          {/* First Nations Spotlight  */}
          {land && (
            <View style={[styles.landBanner, isDesktop && { marginHorizontal: 0 }]}>
              <LinearGradient colors={['rgba(139,69,19,0.15)', 'rgba(139,69,19,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <View style={styles.landBannerContent}>
                <Ionicons name="earth" size={16} color="#D4A574" />
                <Text style={styles.landBannerTitle}>You are on {land.landName}</Text>
              </View>
              <Text style={styles.landBannerSub}>Traditional Custodians: {land.traditionalCustodians}</Text>
            </View>
          )}

          {/* Civic / Council Alerts */}
          {council && (
            <View style={[styles.civicCard, isDesktop && { marginHorizontal: 0 }]}>
              <View style={styles.civicCardHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color={CultureTokens.indigo} />
                <Text style={styles.civicCardTitle}>{council.name}</Text>
              </View>
              <Text style={styles.civicCardSub}>
                {isCouncilVerified ? `Council Verified • LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
                {activeAlerts.length > 0 ? ` • ${activeAlerts.length} active alert${activeAlerts.length === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
          )}

          {/* SuperApp Links */}
          <View style={styles.quickChipRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.quickChipScroll, isDesktop && { paddingHorizontal: 0 }]} style={{ flexGrow: 0 }}>
              {superAppSections.map((sec) => (
                <FilterChip
                  key={sec.id}
                  item={{ id: sec.id, label: sec.label, icon: sec.icon, color: sec.color }}
                  isActive={false}
                  onPress={() => { if (!isWeb) Haptics.selectionAsync(); pushSafe(sec.route); }}
                />
              ))}
            </ScrollView>
          </View>

          {discoverLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={CultureTokens.indigo} />
              <Text style={styles.loadingText}>Personalising your feed...</Text>
            </View>
          )}

          {/* Empty Fallback */}
          {!discoverLoading && !featuredEvent && popularEvents.length === 0 && allActivities.length === 0 && allCommunities.length === 0 && (
            <View style={[styles.emptyStateCard, isDesktop && { marginHorizontal: 0 }]}> 
              <Ionicons name="compass-outline" size={42} color={colors.textTertiary} />
              <Text style={styles.emptyStateTitle}>No events or activities found.</Text>
              <Text style={styles.emptyStateSub}>Try changing your city, check council events, or pull to refresh.</Text>
            </View>
          )}

          {/* Feature Highlight */}
          {featuredEvent && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Cultural Highlight" subtitle="Don't miss this week" />
              </View>
              <View style={[isDesktop && { paddingHorizontal: 0 }]}>
                <EventCard event={featuredEvent} highlight index={0} />
              </View>
            </View>
          )}

          {/* Popular / Near You Rail */}
          {popularEvents.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Popular Near You" onSeeAll={() => router.push('/(tabs)/explore')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {popularEvents.map((event: any, i: number) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Council Integration */}
          {councilEvents.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Council Events" subtitle={council?.name ? `Events from ${council.name}` : 'Local events'} onSeeAll={() => router.push('/(tabs)/council')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {councilEvents.slice(0, 10).map((event, i) => ( <EventCard key={event.id} event={event} index={i} /> ))}
              </ScrollView>
            </View>
          )}

          {/* Core Activities */}
          {allActivities.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Activities" subtitle="Workshops and experiences" onSeeAll={() => router.push('/activities')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]}>
                {allActivities.slice(0, 10).map((activity) => (
                  <Pressable key={activity.id} onPress={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })} style={styles.activityTile}>
                    <Text style={styles.activityCategory}>{activity.category}</Text>
                    <Text numberOfLines={1} style={styles.activityName}>{activity.name}</Text>
                    <Text numberOfLines={2} style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityMeta}>{activity.city} • {activity.priceLabel || 'Free'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Explore Culture */}
          {cultureCards.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Explore Your Culture" onSeeAll={() => router.push('/(tabs)/communities')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, { gap: 12 }, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={122} snapToAlignment="start">
                {cultureCards.map((item) => (
                  <CategoryCard key={item.id} item={item} onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } })} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Algorithmic Rails */}
          {otherSections.map((section: any) => (
            <View key={section.title} style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title={section.title} subtitle={section.subtitle} onSeeAll={() => router.push('/(tabs)/explore')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {section.items.filter((e: any) => Boolean(e.venue)).slice(0, 10).map((event: any, i: number) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </ScrollView>
            </View>
          ))}

          {/* Browse Categories */}
          <View style={{ marginBottom: 32 }}>
            <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
              <SectionHeader title="Browse Categories" onSeeAll={() => router.push('/allevents')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, { gap: 12 }, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={122} snapToAlignment="start">
              {browseCategories.map(cat => ( <CategoryCard key={cat.id} item={cat} onPress={() => pushSafe('/(tabs)/explore')} /> ))}
            </ScrollView>
          </View>

          {/* City Discovery */}
          <View style={{ marginBottom: 40 }}>
            <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
              <SectionHeader title="Explore Cities" subtitle="Discover culture nationwide" />
            </View>
            <View style={[styles.cityGridRow, isDesktop && { paddingHorizontal: 0 }]}>
              {FEATURED_CITIES.map((city, i) => (
                <CityCard key={city.name} city={city} width={isDesktop ? 280 : cityCardWidth} onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pushSafe('/(tabs)/explore'); }} />
              ))}
            </View>
          </View>

        </Animated.ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.background, overflow: 'hidden' },
  topBarBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text, lineHeight: 22 },
  brandUrl: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo, lineHeight: 14, letterSpacing: 0.2 },
  
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 21, borderWidth: 1, borderColor: colors.borderLight },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: CultureTokens.error, borderWidth: 1.5, borderColor: colors.surface },
  
  locationPickerRow: { paddingHorizontal: 20, paddingTop: 16 },
  
  guestAuthRow: { marginTop: 12, marginHorizontal: 20, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, gap: 12 },
  guestAuthHint: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  guestAuthButtons: { flexDirection: 'row', gap: 12 },
  guestAuthBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, borderWidth: 1 },
  guestSignupBtn: { backgroundColor: 'transparent', borderColor: colors.borderLight },
  guestSigninBtn: { backgroundColor: CultureTokens.indigo, borderColor: CultureTokens.indigo },
  guestAuthBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  guestSignupText: { color: colors.text },
  guestSigninText: { color: '#FFFFFF' },

  heroSection: { paddingHorizontal: 20, marginBottom: 20, marginTop: 12 },
  heroSubtitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron, marginBottom: 8, letterSpacing: 0.2 },
  heroTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold', lineHeight: 32, letterSpacing: -0.2, color: '#FFFFFF' },
  heroSectionDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 18 },
  heroDesktopLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroSubtitleDesktop: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron, letterSpacing: 0.2 },
  heroTitleDesktop: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 24, letterSpacing: -0.2, color: '#FFFFFF' },

  landBanner: { borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#D4A574', marginHorizontal: 20, marginBottom: 20, overflow: 'hidden' },
  landBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  landBannerTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#D4A574' },
  landBannerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#8B7355', marginTop: 4, marginLeft: 24 },

  civicCard: { marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface },
  civicCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  civicCardTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  civicCardSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, marginTop: 6 },

  quickChipRow: { marginBottom: 26 },
  quickChipScroll: { paddingHorizontal: 20, gap: 10, paddingVertical: 4 },

  sectionPad: { paddingHorizontal: 20 },
  scrollRail: { paddingHorizontal: 20, gap: 14 },

  activityTile: { width: 240, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, gap: 8 },
  activityCategory: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron },
  activityName: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text },
  activityDescription: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, minHeight: 40 },
  activityMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: colors.textTertiary },

  loadingWrap: { alignItems: 'center', paddingVertical: 50, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },

  emptyStateCard: { marginHorizontal: 20, padding: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', gap: 12 },
  emptyStateTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: colors.text, textAlign: 'center' },
  emptyStateSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, textAlign: 'center' },

  cityGridRow: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
});

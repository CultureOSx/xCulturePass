import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
    ActivityIndicator,
  Dimensions,
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
import type { EventData, Community } from '@shared/schema';
import { useMemo, useCallback, useState, } from 'react';
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
import { Colors, CategoryColors, gradients } from '@/constants/theme';
import { FilterChip } from '@/components/FilterChip';
import SectionHeader from '@/components/Discover/SectionHeader';
import SpotlightCard, { SpotlightItem } from '@/components/Discover/SpotlightCard';
import WebRailSection from '@/components/Discover/WebRailSection';
import WebHeroCarousel from '@/components/Discover/WebHeroCarousel';
import { calculateDistance, getPostcodesByPlace } from '@shared/location/australian-postcodes';
import { useCouncil } from '@/hooks/useCouncil';


const isWeb = Platform.OS === 'web';

const superAppSections = [
  { id: 'movies', label: 'Movies', icon: 'film', color: Colors.error, route: '/movies' },
  { id: 'restaurants', label: 'Dining', icon: 'restaurant', color: Colors.accent, route: '/restaurants' },
  { id: 'activities', label: 'Activities', icon: 'compass', color: Colors.success, route: '/activities' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle', color: CategoryColors.shopping, route: '/shopping' },
  { id: 'events', label: 'Events', icon: 'calendar', color: Colors.tint, route: '/(tabs)/explore' },
  { id: 'directory', label: 'Directory', icon: 'storefront', color: Colors.secondary, route: '/(tabs)/directory' },
];

const SECTION_ROUTES: Record<string, string> = {
  movies: '/movies',
  restaurants: '/restaurants',
  activities: '/activities',
  shopping: '/shopping',
  events: '/(tabs)/explore',
  directory: '/(tabs)/directory',
};

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
  { id: 'c11', label: 'Comedy', icon: 'happy', color: CategoryColors.comedy },
  { id: 'c12', label: 'Sports', icon: 'football', color: CategoryColors.sports },
  { id: 'c13', label: 'Historical Monuments', icon: 'build', color: CategoryColors.monuments },
  { id: 'c14', label: 'Featured Artists', icon: 'star', color: CategoryColors.artists },
];

const WEB_CATEGORIES = ['All', 'Music', 'Dance', 'Food', 'Art', 'Wellness', 'Movies', 'Workshop', 'Heritage', 'Activities & Play', 'Nightlife', 'Comedy', 'Sports', 'Historical Monuments', 'Featured Artists'];

const FEATURED_CITIES = [
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Brisbane', country: 'Australia' },
  { name: 'Perth', country: 'Australia' },
  { name: 'Adelaide', country: 'Australia' },
  { name: 'Gold Coast', country: 'Australia' },
  { name: 'Canberra', country: 'Australia' },
  { name: 'Darwin', country: 'Australia' },
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
  meta: {
    userId: string;
    city: string;
    country: string;
    generatedAt: string;
    totalItems: number;
  };
}

interface TraditionalLand {
  id: string;
  city: string;
  landName: string;
  traditionalCustodians: string;
}



interface CultureCard {
  id: string;
  label: string;
  color: string;
  emoji?: string;
  icon: string;
}




function eventToTimestamp(event: EventData): number {
  const [year, month, day] = (event.date ?? '').split('-').map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  return new Date(year, month - 1, day).getTime();
}

function cityToCoordinates(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  const match = getPostcodesByPlace(city)[0];
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude };
}




export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { state } = useOnboarding();
  const { isAuthenticated, userId: authUserId, user: authUser } = useAuth();
  const pathname = usePathname();
  const { council, activeAlerts, isCouncilVerified, lgaCode } = useCouncil({ city: state.city, country: state.country });

  // Scroll-reactive header
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

  const { data: traditionalLandsData = [] } = useQuery<TraditionalLand[]>({
    queryKey: ['/api/indigenous/traditional-lands'],
    queryFn: () => api.raw('GET', 'api/indigenous/traditional-lands'),
  });

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

  const { data: allCommunities = [] } = useQuery<Community[]>({
    queryKey: ['/api/communities', state.city, state.country],
    queryFn: () => api.communities.list({
      city:    state.city    || undefined,
      country: state.country || undefined,
    }),
  });

  const { data: allActivities = [] } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities', state.country, state.city],
    queryFn: () =>
      api.activities.list({
        country: state.country || undefined,
        city: state.city || undefined,
      }),
  });

  const { data: spotlights = [] } = useQuery<SpotlightItem[]>({
    queryKey: ['/api/indigenous/spotlights'],
    queryFn: () => api.raw('GET', 'api/indigenous/spotlights'),
  });

  const { data: discoverFeed, isLoading: discoverLoading, refetch } = useQuery<DiscoverFeed>({
    queryKey: ['/api/discover', authUserId ?? 'guest', state.city, state.country],
    queryFn: async () => {
      if (authUserId) {
        const qs = new URLSearchParams();
        if (state.city)    qs.set('city',    state.city);
        if (state.country) qs.set('country', state.country);
        const q = qs.toString();
        return api.raw('GET', `api/discover/${authUserId}${q ? `?${q}` : ''}`);
      }
      return { sections: [], meta: { userId: 'guest', city: state.city ?? '', country: state.country ?? '', generatedAt: new Date().toISOString(), totalItems: 0 } };
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
  const nearYou = sections.find(s => s.title === 'Near You');
  const selectedCityCoordinates = useMemo(
    () => cityToCoordinates(state.city),
    [state.city],
  );
  const distanceSortedEvents = useMemo(() => {
    if (!selectedCityCoordinates) return [] as EventData[];

    return allEvents
      .filter((event) => Boolean(event.venue && event.city))
      .map((event) => {
        const eventCoordinates = cityToCoordinates(event.city);
        if (!eventCoordinates) return null;

        return {
          event,
          distanceKm: calculateDistance(
            selectedCityCoordinates.latitude,
            selectedCityCoordinates.longitude,
            eventCoordinates.latitude,
            eventCoordinates.longitude,
          ),
        };
      })
      .filter((entry): entry is { event: EventData; distanceKm: number } => Boolean(entry))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12)
        .map((entry) => ({ ...entry.event, distanceKm: entry.distanceKm }));
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

    if (distanceSortedEvents.length > 0) {
      return distanceSortedEvents;
    }

    const result = [];
    for (const e of allEvents) {
      if (!e.venue) continue;
      const attending = e.attending || 0;

      if (result.length === 12 && attending <= (result[11].attending || 0)) continue;

      let inserted = false;
      for (let j = 0; j < result.length; j++) {
        if (attending > (result[j].attending || 0)) {
          result.splice(j, 0, e);
          if (result.length > 12) result.pop();
          inserted = true;
          break;
        }
      }
      if (!inserted && result.length < 12) {
        result.push(e);
      }
    }
    return result;
  }, [nearYou, allEvents, distanceSortedEvents]);
  const featuredEvent = allEvents.find((e) => e.isFeatured) || allEvents[0];
  const otherSections = sections.filter(s => s.title !== 'Near You');

  const cultureCards = useMemo<CultureCard[]>(() => {
    const types: Record<string, CultureCard[]> = {};
    allCommunities.forEach((c) => {
      const key = c.type || 'other';
      if (!types[key]) types[key] = [];
      if (types[key].length < 8) {
        types[key].push({
          id: c.id,
          label: c.name?.split(' ')[0] || c.name || 'Community',
          color: Colors.primary,
          emoji: c.iconEmoji,
          icon: 'people',
        });
      }
    });
    const all = Object.values(types).flat();
    return all.slice(0, 10);
  }, [allCommunities]);

  const screenWidth = Dimensions.get('window').width;
  // On desktop web, expand to full content area width (sidebar is 240px wide)
  const isDesktopWeb = Platform.OS === 'web' && screenWidth >= 1024;
  const maxWidth = Platform.OS === 'web'
    ? (isDesktopWeb ? screenWidth - 240 : Math.min(screenWidth, 480))
    : screenWidth;
  const cityCardWidth = (maxWidth - 40 - 14) / 2;

  const [refreshing, setRefreshing] = useState(false);
  const [webSearch, setWebSearch] = useState('');
  const [webCategoryFilter, setWebCategoryFilter] = useState('All');
  const signInRoute = useMemo(() => {
    const redirectTo = pathname && pathname.startsWith('/') ? pathname : '/(tabs)';
    return `/(onboarding)/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);
  const openNotifications = useCallback(() => {
    if (isAuthenticated) {
      pushSafe('/notifications');
      return;
    }
    pushSafe('/(onboarding)/login?redirectTo=/notifications');
  }, [isAuthenticated]);
  const categoryFilteredEvents = useCallback((evts: EventData[]) => {
    if (webCategoryFilter === 'All') return evts;
    return evts.filter((event) => {
      const bucket = `${event.category ?? ''} ${event.communityTag ?? ''} ${(event.tags ?? []).join(' ')} ${event.title}`.toLowerCase();
      return bucket.includes(webCategoryFilter.toLowerCase());
    });
  }, [webCategoryFilter]);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const land = traditionalLandsData.find((l) => l.city === state.city);
  const searchableEvents = useMemo(
    () => allEvents.filter((event) => Boolean(event.imageUrl && event.venue)),
    [allEvents]
  );
  const filterEventsForWeb = useCallback((events: EventData[]) => {
    const term = webSearch.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => {
      const bucket = `${event.title} ${event.venue ?? ''} ${event.communityTag ?? ''} ${event.city ?? ''}`.toLowerCase();
      return bucket.includes(term);
    });
  }, [webSearch]);
  const webFeatured = useMemo(
    () => filterEventsForWeb([...searchableEvents].sort((a, b) => (b.attending ?? 0) - (a.attending ?? 0)).slice(0, 12)),
    [searchableEvents, filterEventsForWeb]
  );
  const webActivities = useMemo(
    () => allActivities
      .filter((activity) => activity.status !== 'archived')
      .slice()
      .sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0))
      .slice(0, 12)
      .map((activity) => ({
        id: activity.id,
        title: activity.name,
        description: activity.description,
        category: activity.category,
        communityTag: activity.category,
        date: activity.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        time: '18:00',
        venue: activity.location || activity.city,
        city: activity.city,
        country: activity.country,
        imageUrl: activity.imageUrl || '',
        priceLabel: activity.priceLabel || 'Free',
        isFeatured: activity.isPromoted,
        isPromoted: activity.isPromoted,
      } as EventData)),
    [allActivities]
  );
  const webArtists = useMemo(
    () => filterEventsForWeb(searchableEvents.filter((event) => {
      const tag = `${event.organizer ?? ''} ${event.title}`.toLowerCase();
      return tag.includes('dj') || tag.includes('artist') || tag.includes('band') || tag.includes('live');
    }).slice(0, 12)),
    [searchableEvents, filterEventsForWeb]
  );
  const webUpcoming = useMemo(
    () => filterEventsForWeb([...searchableEvents].sort((a, b) => eventToTimestamp(a) - eventToTimestamp(b)).slice(0, 12)),
    [searchableEvents, filterEventsForWeb]
  );
  const webHeroEvents = useMemo(
    () => (webFeatured.length > 0 ? webFeatured : searchableEvents).slice(0, 6),
    [webFeatured, searchableEvents]
  );

  // Interest-based "For You" recommendations — matches user's stored interests
  const webForYou = useMemo(() => {
    const interests = state.interests ?? [];
    if (!interests.length) return filterEventsForWeb(webFeatured.slice(0, 12));
    const matched = filterEventsForWeb(
      searchableEvents.filter((event) => {
        const bucket = `${event.category ?? ''} ${event.communityTag ?? ''} ${event.title} ${event.tags?.join(' ') ?? ''}`.toLowerCase();
        return interests.some((i) => bucket.includes(i.toLowerCase()));
      })
    ).slice(0, 12);
    return matched.length >= 3 ? matched : filterEventsForWeb(webFeatured.slice(0, 12));
  }, [searchableEvents, state.interests, filterEventsForWeb, webFeatured]);

  // City-based "Near You" recommendations
  const webNearYou = useMemo(() => {
    if (!state.city) return [];
    return filterEventsForWeb(
      searchableEvents.filter((event) =>
        (event.city ?? '').toLowerCase() === state.city.toLowerCase()
      )
    ).slice(0, 12);
  }, [searchableEvents, state.city, filterEventsForWeb]);

  if (isWeb) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset }]}>
          <LinearGradient
            colors={['#090A13', '#0F131F', '#0A111C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.webScrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E7EEF7" />}
          >
            {/* Discover Header — branding lives in sidebar; just show search + actions */}
            <View style={styles.webTopRow}>
              {/* Left: greeting */}
              <View style={styles.webTopRowLeft}>
                <View>
                  <Text style={styles.webGreeting}>{timeGreeting}, {firstName}</Text>
                  <View style={styles.webLocationRow}>
                    <Ionicons name="location-outline" size={13} color="#F2A93B" />
                    <Text style={styles.webLocationText}>{state.city || 'Sydney'}, {state.country || 'Australia'}</Text>
                  </View>
                </View>
              </View>

              {/* Central Search */}
              <View style={styles.webSearchWrap}>
                <Ionicons name="search-outline" size={18} color="#94A2C4" />
                <TextInput
                  value={webSearch}
                  onChangeText={setWebSearch}
                  placeholder="Search events, communities, venues…"
                  placeholderTextColor="#8F9CBC"
                  style={styles.webSearchInput}
                />
                {webSearch.length > 0 && (
                  <Pressable onPress={() => setWebSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#8F9CBC" />
                  </Pressable>
                )}
              </View>

              <View style={styles.webTopActions}>
                <Pressable style={styles.webIconBtn} onPress={openNotifications}>
                  <Ionicons name="notifications-outline" size={19} color="#EAF0FF" />
                </Pressable>
                <Pressable style={styles.webIconBtn} onPress={() => pushSafe('/map')}>
                  <Ionicons name="map-outline" size={19} color="#EAF0FF" />
                </Pressable>
                {isAuthenticated ? (
                  <Pressable style={styles.webAvatarBtn} onPress={() => pushSafe('/(tabs)/profile')}>
                    <Text style={styles.webAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable style={styles.webSignupBtn} onPress={() => pushSafe('/(onboarding)/signup')}>
                      <Text style={styles.webSignupText}>Sign up</Text>
                    </Pressable>
                    <Pressable style={styles.webLoginBtn} onPress={() => pushSafe(signInRoute)}>
                      <Text style={styles.webLoginText}>Sign in</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.webCategoryChipsRow}>
              {WEB_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setWebCategoryFilter(cat)}
                  style={[styles.webCategoryChip, webCategoryFilter === cat && styles.webCategoryChipActive]}
                >
                  {webCategoryFilter === cat && (
                    <LinearGradient
                      colors={['#0081C8', '#EE334E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                    />
                  )}
                  <Text style={[styles.webCategoryChipText, webCategoryFilter === cat && styles.webCategoryChipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Auto-cycling hero carousel */}
            <WebHeroCarousel events={webHeroEvents} />

            {council && (
              <View style={styles.webCivicCard}>
                <View style={styles.webCivicRow}>
                  <Ionicons name="business-outline" size={16} color="#F2A93B" />
                  <Text style={styles.webCivicTitle}>{council.name}</Text>
                </View>
                <Text style={styles.webCivicSub}>
                  {isCouncilVerified ? `Council Verified • LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
                  {activeAlerts.length > 0 ? ` • ${activeAlerts.length} active alert${activeAlerts.length === 1 ? '' : 's'}` : ''}
                </Text>
              </View>
            )}

            {/* Event rails */}
            {webNearYou.length > 0 && (
              <WebRailSection
                title={`In ${state.city}`}
                subtitle={`Events happening in ${state.city}${state.country ? `, ${state.country}` : ''}`}
                events={categoryFilteredEvents(webNearYou)}
                onSeeAll={() => router.push('/(tabs)/explore')}
              />
            )}
            <WebRailSection
              title={isAuthenticated ? 'Recommended for You' : 'Featured Events'}
              subtitle={isAuthenticated && (state.interests ?? []).length > 0 ? `Based on your interests: ${(state.interests ?? []).slice(0, 3).join(', ')}` : 'Popular picks this week'}
              events={categoryFilteredEvents(webForYou)}
              onSeeAll={() => router.push('/allevents')}
            />
            <WebRailSection
              title="Activities Near You"
              subtitle="Workshops, food and wellness"
              events={categoryFilteredEvents(webActivities.length > 0 ? webActivities : webFeatured)}
              onSeeAll={() => router.push('/(tabs)/explore')}
            />
            <WebRailSection
              title="Artists Performing"
              subtitle="Live acts and cultural performances"
              events={categoryFilteredEvents(webArtists.length > 0 ? webArtists : webFeatured)}
              onSeeAll={() => router.push('/(tabs)/explore')}
            />
            <WebRailSection
              title="Upcoming Festivals"
              subtitle="Plan your next month"
              events={categoryFilteredEvents(webUpcoming)}
              onSeeAll={() => router.push('/(tabs)/calendar')}
            />
          </ScrollView>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        {/* Scroll-reactive frosted glass background (iOS only) */}
        {Platform.OS === 'ios' && (
          <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        {/* Scroll-reactive hairline border */}
        <Animated.View style={[styles.topBarBorder, headerBorderStyle]} pointerEvents="none" />

        <View style={styles.brandBlock}>
          <Ionicons name="globe-outline" size={20} color={Colors.primary} />
          <View>
            <Text style={styles.brandName}>CulturePass</Text>
            <Text style={[styles.brandUrl, { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.primary }]}>Belong Anywhere</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <Pressable style={styles.iconButton} onPress={() => router.push('/search')} testID="search-btn" accessibilityLabel="Search">
            <Ionicons name="search" size={24} color={Colors.text} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => pushSafe('/map')} testID="map-btn" accessibilityLabel="Events Map">
            <Ionicons name="map-outline" size={24} color={Colors.text} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={openNotifications} testID="notifications-btn" accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {isAuthenticated ? <View style={styles.notifDot} /> : null}
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          { paddingBottom: 120 },
          Platform.OS === 'web' && { maxWidth: 1200, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {!isAuthenticated && (
          <View style={styles.guestAuthRow}>
            <Text style={styles.guestAuthHint}>Create an account to save events and get personalised recommendations.</Text>
            <View style={styles.guestAuthButtons}>
              <Pressable
                style={[styles.guestAuthBtn, styles.guestSignupBtn]}
                onPress={() => pushSafe('/(onboarding)/signup')}
                accessibilityRole="button"
                accessibilityLabel="Sign up"
              >
                <Text style={[styles.guestAuthBtnText, styles.guestSignupText]}>Sign up</Text>
              </Pressable>
              <Pressable
                style={[styles.guestAuthBtn, styles.guestSigninBtn]}
                onPress={() => pushSafe(signInRoute)}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={[styles.guestAuthBtnText, styles.guestSigninText]}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.locationPickerRow}>
          <LocationPicker />
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>{timeGreeting}, {firstName}</Text>
          <LinearGradient
            colors={gradients.culturepassBrandReversed}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={[styles.heroTitle, { color: '#FFFFFF', marginBottom: 0 }]}>
              What&apos;s On
            </Text>
          </LinearGradient>
        </View>

        {council && (
          <View style={styles.civicCard}>
            <View style={styles.civicCardHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
              <Text style={styles.civicCardTitle}>{council.name}</Text>
            </View>
            <Text style={styles.civicCardSub}>
              {isCouncilVerified ? `Council Verified • LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
              {activeAlerts.length > 0 ? ` • ${activeAlerts.length} active alert${activeAlerts.length === 1 ? '' : 's'}` : ''}
            </Text>
          </View>
        )}

        {land && (
          <View style={styles.landBanner}>
            <LinearGradient
              colors={['rgba(139,69,19,0.15)', 'rgba(139,69,19,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.landBannerContent}>
              <Ionicons name="earth" size={14} color="#D4A574" />
              <Text style={styles.landBannerTitle}>You are on {land.landName}</Text>
            </View>
            <Text style={styles.landBannerSub}>Traditional Custodians: {land.traditionalCustodians}</Text>
          </View>
        )}

        <View style={styles.quickChipRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChipScroll}
            style={{ flexGrow: 0 }}
          >
            {superAppSections.map((sec) => (
              <FilterChip
                key={sec.id}
                item={{ id: sec.id, label: sec.label, icon: sec.icon, color: sec.color }}
                isActive={false}
                onPress={() => {
                  Haptics.selectionAsync();
                  pushSafe(SECTION_ROUTES[sec.id]);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {discoverLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Personalising your feed...</Text>
          </View>
        )}

        {!discoverLoading && !featuredEvent && popularEvents.length === 0 && allActivities.length === 0 && allCommunities.length === 0 && spotlights.length === 0 && (
          <View style={[styles.emptyStateCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
            <Ionicons name="compass-outline" size={42} color={colors.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No items in Discover yet.</Text>
            <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>Try changing your city or pull to refresh.</Text>
          </View>
        )}

        {featuredEvent && (
          <View style={{ marginBottom: 28}}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="Cultural Highlight " subtitle="Don't miss this week" />
            </View>
            <EventCard event={featuredEvent} highlight index={0} />
          </View>
        )}

        {popularEvents.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader
                title="Popular Near You"
                onSeeAll={() => router.push('/(tabs)/explore')}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              decelerationRate="fast"
              snapToInterval={254}
              snapToAlignment="start"
            >
              {popularEvents.map((event, i: number) => (
                <EventCard key={(event as unknown as EventData).id} event={event as unknown as EventData} index={i} />
              ))}
            </ScrollView>
          </View>
        )}

        {allActivities.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader
                title="Activities"
                subtitle="Workshops and local experiences"
                onSeeAll={() => router.push('/activities')}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {allActivities.slice(0, 10).map((activity) => (
                <Pressable
                  key={activity.id}
                  onPress={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })}
                  style={[styles.activityTile, { backgroundColor: colors.card }]}
                >
                  <Text style={[styles.activityCategory, { color: colors.primary }]}>{activity.category}</Text>
                  <Text numberOfLines={1} style={[styles.activityName, { color: colors.text }]}>{activity.name}</Text>
                  <Text numberOfLines={2} style={[styles.activityDescription, { color: colors.textSecondary }]}>{activity.description}</Text>
                  <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>{activity.city} • {activity.priceLabel || 'Free'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {allCommunities.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader
                title="Cultural Communities"
                subtitle={isAuthenticated ? "Your communities" : "Join a community"}
                onSeeAll={() => router.push('/(tabs)/communities')}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              decelerationRate="fast"
              snapToInterval={210}
              snapToAlignment="start"
            >
              {[...allCommunities].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)).slice(0, 10).map((c, i: number) => (
                <CommunityCard key={c.id} community={c} index={i} />
              ))}
            </ScrollView>
          </View>
        )}

        {spotlights.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader title="First Nations Spotlight" subtitle="Celebrating Indigenous culture" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              decelerationRate="fast"
              snapToInterval={294}
              snapToAlignment="start"
            >
              {spotlights.map((item: SpotlightItem, i: number) => (
                <SpotlightCard key={item.id} item={item} index={i} />
              ))}
            </ScrollView>
          </View>
        )}

        {cultureCards.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader title="Explore Your Culture" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              decelerationRate="fast"
              snapToInterval={122}
              snapToAlignment="start"
            >
              {cultureCards.map((item) => (
                <CategoryCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {otherSections.filter(s => s.type === 'events' || s.type === 'mixed').map((section) => (
          <View key={section.title} style={{ marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader title={section.title} subtitle={section.subtitle} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              decelerationRate="fast"
              snapToInterval={254}
              snapToAlignment="start"
            >
              {section.items.filter((e) => Boolean(e.venue)).slice(0, 10).map((event, i: number) => (
                <EventCard key={String((event as unknown as EventData).id)} event={event as unknown as EventData} index={i} />
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={{ marginBottom: 32 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader title="Browse Categories" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={122}
            snapToAlignment="start"
          >
            {browseCategories.map(cat => (
              <CategoryCard
                key={cat.id}
                item={cat}
                onPress={() => router.push('/(tabs)/explore')}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginBottom: 32 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader title="Explore Cities" subtitle="Discover culture worldwide" />
          </View>
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {FEATURED_CITIES.map((city, i) => (
              <CityCard
                key={city.name}
                city={city}
                width={cityCardWidth}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/(tabs)/explore', params: { city: city.name } });
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.bannerWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.plusBanner,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              Platform.OS === 'web' && { cursor: 'pointer' as any },
            ]}
            onPress={() => router.push('/membership/upgrade')}
          >
            <LinearGradient
              colors={['#111111', '#1A1A24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.bannerDecoration1} />
            <View style={styles.bannerDecoration2} />
            <View style={styles.plusBannerLeft}>
              <View style={styles.plusBannerIconWrap}>
                <Ionicons name="star" size={20} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plusBannerTitle}>CulturePass <Text style={{ color: Colors.gold }}>PRO</Text></Text>
                <Text style={styles.plusBannerSub}>2% cashback & exclusive VIP access</Text>
              </View>
            </View>
            <View style={styles.plusBannerCta}>
              <Text style={styles.plusBannerCtaText}>Explore</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.bannerWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.perksBanner,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              Platform.OS === 'web' && { cursor: 'pointer' as any },
            ]}
            onPress={() => router.push('/perks')}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.plusBannerLeft}>
              <View style={styles.perksBannerIconWrap}>
                <Ionicons name="gift" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plusBannerTitle}>Perks & Benefits</Text>
                <Text style={styles.plusBannerSub}>Exclusive discounts and rewards</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <View style={styles.bannerWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.exploreCta,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              Platform.OS === 'web' && { cursor: 'pointer' as any },
            ]}
            onPress={() => router.push('/allevents')}
          >
            <View style={styles.exploreCtaIcon}>
              <Ionicons name="compass" size={24} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exploreCtaTitle}>Explore All Events</Text>
              <Text style={styles.exploreCtaSub}>Discover what&apos;s happening near you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#636366" />
          </Pressable>
        </View>
      </Animated.ScrollView>
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  topBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    lineHeight: 18,
  },
  brandUrl: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 13,
  },
  locationPickerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  guestAuthRow: {
    marginTop: 8,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  guestAuthHint: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textSecondary,
  },
  guestAuthButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  guestAuthBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
  },
  guestSignupBtn: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  guestSigninBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  guestAuthBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  guestSignupText: {
    color: Colors.text,
  },
  guestSigninText: {
    color: Colors.textInverse,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderLight,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.surfaceSecondary,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 18,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.tint,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  landBanner: {
    borderRadius: 14,
    padding: 14,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#D4A574',
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  landBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landBannerTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#D4A574',
  },
  landBannerSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#8B7355',
    marginTop: 3,
    marginLeft: 20,
  },
  quickChipRow: {
    marginBottom: 24,
  },
  quickChipScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  emptyStateCard: {
    marginHorizontal: 20,
    marginBottom: 26,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 18,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyStateSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  bannerWrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  plusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    ...Colors.shadows.large,
  },
  bannerDecoration1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  bannerDecoration2: {
    position: 'absolute',
    bottom: -30,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  plusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  plusBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  plusBannerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFF',
  },
  plusBannerSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  plusBannerCta: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  plusBannerCtaText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#000',
  },
  perksBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    ...Colors.shadows.large,
  },
  perksBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...Colors.shadows.medium,
  },
  exploreCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCtaTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  exploreCtaSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  webScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  webTopRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 20,
  },
  webTopRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
  },
  webGreeting: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#E8F0FF',
    lineHeight: 22,
  },
  webLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  webLocationText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#94A2C4',
  },
  webSearchWrap: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 600,
  },
  webSearchInput: {
    flex: 1,
    height: '100%' as unknown as number,
    color: '#E8F0FF',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  } as object,
  webTopActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  webIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  webAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    overflow: 'hidden',
  },
  webAvatarText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  webLoginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0081C8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSignupBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webLoginText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFF',
  },
  webSignupText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EAF0FF',
  },
  webCategoryChipsRow: {
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  webCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  webCategoryChipActive: {
    borderColor: 'transparent',
  },
  webCategoryChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textSecondary,
  },
  webCategoryChipTextActive: {
    color: Colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  webCivicCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  webCivicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webCivicTitle: {
    color: '#EAF0FF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  webCivicSub: {
    color: '#94A2C4',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  civicCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  civicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  civicCardTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
  },
  civicCardSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  activityTile: {
    width: 238,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  activityCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  activityName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  activityDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    minHeight: 34,
  },
  activityMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
});

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Image,
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
import FeedCard from '@/components/Discover/FeedCard';
import { FeedCardSkeleton } from '@/components/FeedCardSkeleton';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { CommunityCardSkeleton } from '@/components/CommunityCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import type { FeedItem } from '@/shared/schema/feedItem';
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
  trendingEvents?: EventData[];
  rankedEvents?: EventData[];
  suggestedCommunities?: Community[];
  meta?: {
    userId: string;
    city: string;
    country: string;
    generatedAt: string;
    totalItems: number;
    signalsUsed?: any;
  };
}

function cityToCoordinates(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  const match = getPostcodesByPlace(city)[0];
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[monthIndex] || ''}`;
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

  const { data: allEvents = [], isLoading: eventsLoading } = useQuery<EventData[]>({
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

  const { data: allCommunities = [], isLoading: communitiesLoading } = useQuery<Community[]>({
    queryKey: ['/api/communities', state.city, state.country],
    queryFn: () => api.communities.list({ city: state.city || undefined, country: state.country || undefined }),
  });

  const { data: allActivities = [], isLoading: activitiesLoading } = useQuery<ActivityData[]>({
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
        return api.raw('GET', `api/discover/${authUserId}${q ? `?${q}` : ''}`) as Promise<DiscoverFeed>;
      }
      return {};
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

  const trendingEvents = discoverFeed?.trendingEvents ?? [];
  const rankedEvents = discoverFeed?.rankedEvents ?? [];
  const suggestedCommunities = discoverFeed?.suggestedCommunities ?? [];
  
  const virtualFeed = useMemo(() => {
    const feed: FeedItem[] = [];
    
    // Convert ranked events into 'event_created' feed items
    rankedEvents.slice(0, 8).forEach((item: any, i: number) => {
      feed.push({
        id: `evt-${item.id}`,
        type: 'event_created',
        communityId: item.communityId || 'General',
        city: item.city || '',
        referenceId: item.id,
        createdAt: new Date().toISOString(),
        payload: {
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          date: item.date,
          venue: item.venue,
        }
      });
      
      // Inject pseudo-announcements or fake perks after every other event
      if (i % 2 === 0 && suggestedCommunities[i]) {
        const comm = suggestedCommunities[i];
        feed.push({
          id: `ann-${comm.id}`,
          type: 'announcement',
          communityId: comm.name,
          city: (comm as any).city || '',
          referenceId: comm.id,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          payload: {
            title: `Welcome to ${comm.name}!`,
            description: (comm as any).description || 'Join our community to stay updated on the latest culturally rich events in your area.',
            authorName: comm.name,
            authorAvatar: (comm as any).imageUrl,
          }
        });
      }
      
      if (i === 1) {
         feed.push({
          id: `perk-1`,
          type: 'perk_added',
          communityId: 'CulturePass Plus',
          city: '',
          referenceId: 'perk1',
          createdAt: new Date(Date.now() - 120000).toISOString(),
          payload: {
            title: '15% Off Participating Venues',
            description: 'Plus members now receive default 15% discounts.',
            authorName: 'CulturePass',
          }
        });
      }
    });

    return feed;
  }, [rankedEvents, suggestedCommunities]);
  
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
    if (trendingEvents.length > 0) return trendingEvents;
    if (distanceSortedEvents.length > 0) return distanceSortedEvents;
    return allEvents.filter(e => e.venue).sort((a, b) => (b.attending || 0) - (a.attending || 0)).slice(0, 12);
  }, [trendingEvents, allEvents, distanceSortedEvents]);

  const featuredEvents = useMemo(() => {
    const featured = allEvents.filter((e: EventData) => e.isFeatured);
    if (featured.length >= 3) return featured.slice(0, 5);
    return [...featured, ...allEvents.filter((e: EventData) => !e.isFeatured)].slice(0, 5);
  }, [allEvents]);

  const cultureCards = useMemo(() => {
    return allCommunities.slice(0, 10);
  }, [allCommunities]);

  const cityColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 800 : width;
  const cityCardWidth = Math.max(140, (width - 40 - (14 * (cityColumns - 1))) / cityColumns);

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
        
        {/* Deep, rich dark-mode atmospheric ambient background */}
        <LinearGradient
          colors={[CultureTokens.indigo + '80', CultureTokens.saffron + '10', 'transparent']}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 600, opacity: 0.8 }}
        />
        {isWeb && (
          <>
            <View style={[styles.orb, { top: -100, right: -50, backgroundColor: CultureTokens.indigo, opacity: 0.4, filter: 'blur(100px)' } as any]} />
            <View style={[styles.orb, { top: 200, left: -100, backgroundColor: CultureTokens.saffron, opacity: 0.25, filter: 'blur(120px)' } as any]} />
          </>
        )}

        {/* Mobile Header */}
        {!(isWeb && isDesktop) && (
          <View style={styles.topBar}>
            {Platform.OS === 'ios' && (
              <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.View style={[styles.topBarBorder, headerBorderStyle]} pointerEvents="none" />

            <View style={styles.brandBlock}>
              <View style={styles.logoWrap}>
                <Ionicons name="compass" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandName}>CulturePass</Text>
                <Text style={styles.brandUrl}>Belong Anywhere</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => router.push('/search')}>
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={openNotifications}>
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
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

          {/* Location Picker Row */}
          {isWeb && isDesktop ? (
            <View style={styles.heroSectionDesktop}>
              <View style={styles.heroDesktopLeft}>
                <Text style={styles.heroSubtitleDesktop}>{timeGreeting}, {firstName} 👋</Text>
                <Text style={styles.heroTitleDesktop}>Explore {state.city || 'Australia'}</Text>
              </View>
              <LocationPicker />
            </View>
          ) : (
            <View style={[styles.locationPickerRow, { zIndex: 10, marginTop: 12 }]}>
              <LocationPicker />
              <Text style={styles.heroGreetingMobile}>{timeGreeting}, {firstName}</Text>
            </View>
          )}

          {/* SuperApp Quick Links */}
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

          {/* Dynamic Hero Carousel */}
          {featuredEvents.length > 0 && (
            <View style={styles.carouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled={!isDesktop}
                showsHorizontalScrollIndicator={false}
                snapToInterval={isDesktop ? 800 + 16 : width}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={isDesktop ? { gap: 16, paddingHorizontal: 0 } : {}}
              >
                {featuredEvents.map((event, idx) => (
                  <View key={event.id} style={{ width: isDesktop ? 800 : width, paddingHorizontal: isDesktop ? 0 : 20 }}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                      style={({ pressed }) => [
                        styles.heroCard,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                       <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode='cover' />
                       <LinearGradient colors={['transparent', 'rgba(11,11,20,0.5)', 'rgba(11,11,20,0.85)', 'rgba(11,11,20,1)']} style={StyleSheet.absoluteFillObject} locations={[0, 0.4, 0.75, 1]} />
                       <View style={styles.heroCardBadge}>
                          {Platform.OS === 'ios' || isWeb ? (
                             <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                          ) : (
                             <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                          )}
                          <LinearGradient colors={gradients.culturepassBrand} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill, { opacity: 0.8 }]} />
                          <Text style={styles.heroCardBadgeText}>FEATURED</Text>
                       </View>
                       <View style={styles.heroCardContent}>
                          {(event.priceCents === 0 || event.isFree) ? (
                            <View style={[styles.heroCardPrice, { backgroundColor: CultureTokens.saffron }]}>
                              <Text style={styles.heroCardPriceText}>FREE</Text>
                            </View>
                          ) : event.priceLabel ? (
                            <View style={[styles.heroCardPrice, { backgroundColor: CultureTokens.indigo }]}>
                              <Text style={[styles.heroCardPriceText, { color: '#FFF' }]}>{event.priceLabel}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.heroCardDate}>{formatDate(event.date)}</Text>
                          <Text style={styles.heroCardTitle} numberOfLines={2}>{event.title}</Text>
                          <View style={styles.heroCardMeta}>
                             <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
                             <Text style={styles.heroCardLocation} numberOfLines={1}>{event.venue || event.city}</Text>
                          </View>
                       </View>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* First Nations Spotlight */}
          {land && (
            <View style={[styles.landBanner, isDesktop && { marginHorizontal: 0 }]}>
              {Platform.OS === 'ios' || isWeb ? (
                 <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              ) : null}
              <LinearGradient colors={['rgba(212,165,116,0.15)', 'rgba(212,165,116,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <View style={styles.landBannerContent}>
                <Ionicons name="leaf" size={16} color="#D4A574" />
                <Text style={styles.landBannerTitle}>You are on {land.landName}</Text>
              </View>
              <Text style={styles.landBannerSub}>Traditional Custodians: {land.traditionalCustodians}</Text>
            </View>
          )}

          {/* Civic / Council Alerts */}
          {council && (
            <View style={[styles.civicCard, isDesktop && { marginHorizontal: 0 }]}>
              <View style={styles.civicCardHeader}>
                <Ionicons name="shield-checkmark" size={18} color={CultureTokens.indigo} />
                <Text style={styles.civicCardTitle}>{council.name}</Text>
              </View>
              <Text style={styles.civicCardSub}>
                {isCouncilVerified ? `Council Verified • LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
                {activeAlerts.length > 0 ? ` • ${activeAlerts.length} active alert${activeAlerts.length === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
          )}



          {/* Empty Fallback */}
          {!discoverLoading && featuredEvents.length === 0 && popularEvents.length === 0 && allActivities.length === 0 && allCommunities.length === 0 && (
            <View style={[styles.emptyStateCard, isDesktop && { marginHorizontal: 0 }]}> 
              <Ionicons name="compass-outline" size={42} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyStateTitle}>No events right now</Text>
              <Text style={styles.emptyStateSub}>Try changing your city or pull to refresh.</Text>
            </View>
          )}

          {/* Popular Near You */}
          {(discoverLoading || eventsLoading || popularEvents.length > 0) && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Popular Near You" subtitle="Trending in your area" onSeeAll={() => router.push('/(tabs)/explore')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {(discoverLoading || eventsLoading) ? (
                  Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={`sk-pop-${i}`} />)
                ) : popularEvents.map((event: any, i: number) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Explore Culture */}
          {(communitiesLoading || cultureCards.length > 0) && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Communities" subtitle="Connect with your culture" onSeeAll={() => router.push('/(tabs)/communities')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, { gap: 12 }, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={196} snapToAlignment="start">
                {communitiesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <CommunityCardSkeleton key={`sk-com-${i}`} />)
                ) : cultureCards.map((item, index) => (
                  <CommunityCard key={item.id} community={item} index={index} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Council Integration */}
          {(eventsLoading || councilEvents.length > 0) && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Council Events" subtitle={council?.name ? `Events from ${council.name}` : 'Local events'} onSeeAll={() => router.push('/(tabs)/council')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {eventsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={`sk-cou-${i}`} />)
                ) : councilEvents.slice(0, 10).map((event, i) => ( 
                  <EventCard key={event.id} event={event} index={i} /> 
                ))}
              </ScrollView>
            </View>
          )}

          {/* Core Activities */}
          {(activitiesLoading || allActivities.length > 0) && (
            <View style={{ marginBottom: 32 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="Activities" subtitle="Workshops and experiences" onSeeAll={() => router.push('/activities')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRail, isDesktop && { paddingHorizontal: 0 }]}>
                {activitiesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <View key={`sk-act-${i}`} style={[styles.activityTile]}>
                      <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                      <Skeleton width="90%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                      <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
                      <Skeleton width="50%" height={12} borderRadius={4} />
                    </View>
                  ))
                ) : allActivities.slice(0, 10).map((activity) => (
                  <Pressable 
                     key={activity.id} 
                     onPress={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })} 
                     style={({ pressed }) => [
                        styles.activityTile,
                        pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }
                     ]}
                  >
                    <Text style={styles.activityCategory}>{activity.category}</Text>
                    <Text numberOfLines={1} style={styles.activityName}>{activity.name}</Text>
                    <Text numberOfLines={2} style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityMeta}>{activity.city} • {activity.priceLabel || 'Free'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}



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
          <View style={{ marginBottom: 50 }}>
            <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
              <SectionHeader title="Explore Cities" subtitle="Discover culture nationwide" />
            </View>
            <View style={[styles.cityGridRow, isDesktop && { paddingHorizontal: 0 }]}>
              {FEATURED_CITIES.map((city, i) => (
                <CityCard key={city.name} city={city} width={isDesktop ? 280 : cityCardWidth} onPress={() => { if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pushSafe('/(tabs)/explore'); }} />
              ))}
            </View>
          </View>

          {/* Virtual Infinite Feed skeleton loaders */}
          {discoverLoading && (
            <View style={{ marginBottom: 40 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="The Feed" subtitle="Loading ecosystem..." />
              </View>
              <View style={[styles.feedGrid, isDesktop && { paddingHorizontal: 0 }]}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <FeedCardSkeleton key={`skeleton-${i}`} />
                ))}
              </View>
            </View>
          )}

          {/* Virtual Infinite Feed */}
          {virtualFeed.length > 0 && (
            <View style={{ marginBottom: 40 }}>
              <View style={[styles.sectionPad, isDesktop && { paddingHorizontal: 0 }]}>
                <SectionHeader title="The Feed" subtitle="Culture, live from your ecosystem" />
              </View>
              <View style={[styles.feedGrid, isDesktop && { paddingHorizontal: 0 }]}>
                {virtualFeed.map((feedItem) => (
                  <FeedCard key={feedItem.id} item={feedItem} />
                ))}
              </View>
            </View>
          )}

        </Animated.ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  orb: { position: 'absolute', width: 350, height: 350, borderRadius: 175 },
  
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'transparent', zIndex: 100 },
  topBarBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.05)' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: CultureTokens.indigo, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  brandName: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', lineHeight: 18 },
  brandUrl: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)', lineHeight: 14, letterSpacing: 0.2 },
  
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: CultureTokens.coral, borderWidth: 1.5, borderColor: '#0B0B14' },
  
  locationPickerRow: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  heroGreetingMobile: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)', marginBottom: 10, marginRight: 2 },
  
  heroSectionDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingVertical: 18, paddingHorizontal: 20 },
  heroDesktopLeft: { flexDirection: 'column' },
  heroSubtitleDesktop: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.2, marginBottom: 4 },
  heroTitleDesktop: { fontSize: 28, fontFamily: 'Poppins_700Bold', lineHeight: 34, letterSpacing: -0.5, color: '#FFFFFF' },

  carouselContainer: { marginBottom: 36 },
  heroCard: { height: 440, borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroCardBadge: { position: 'absolute', top: 18, left: 18, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroCardBadgeText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: 1.2 },
  heroCardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 26, paddingTop: 80 },
  heroCardPrice: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  heroCardPriceText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#1C1C1E', letterSpacing: 0.5 },
  heroCardDate: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  heroCardTitle: { fontSize: 30, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', lineHeight: 36, marginBottom: 14, letterSpacing: -0.5 },
  heroCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroCardLocation: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.85)', flex: 1 },

  landBanner: { borderRadius: 20, padding: 18, borderLeftWidth: 4, borderLeftColor: '#D4A574', marginHorizontal: 20, marginBottom: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  landBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  landBannerTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#D4A574' },
  landBannerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 6, marginLeft: 26 },

  civicCard: { marginHorizontal: 20, marginBottom: 32, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  civicCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  civicCardTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  civicCardSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 8 },

  quickChipRow: { marginBottom: 24, paddingVertical: 4 },
  quickChipScroll: { paddingHorizontal: 20, gap: 10 },

  sectionPad: { paddingHorizontal: 20, marginBottom: 16 },
  scrollRail: { paddingHorizontal: 20, gap: 14 },

  activityTile: { width: 250, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', gap: 10 },
  activityCategory: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.saffron, textTransform: 'uppercase', letterSpacing: 0.5 },
  activityName: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', lineHeight: 22 },
  activityDescription: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', lineHeight: 20, minHeight: 40 },
  activityMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },

  emptyStateCard: { marginHorizontal: 20, padding: 36, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', gap: 12, marginBottom: 40 },
  emptyStateTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', textAlign: 'center' },
  emptyStateSub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  cityGridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  
  feedGrid: { width: '100%' },
});

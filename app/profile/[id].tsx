import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/theme';
import { useState } from 'react';
import type { Profile, Review, EventData } from '@/shared/schema';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { ProfileHero } from './components/ProfileHero';
import { ProfileStats } from './components/ProfileStats';
import { ProfileSocials } from './components/ProfileSocials';
import { ProfileContact } from './components/ProfileContact';
import { ProfileTags } from './components/ProfileTags';
import { ProfileEvents } from './components/ProfileEvents';
import { ProfileMap } from './components/ProfileMap';
import { ProfileReviews } from './components/ProfileReviews';
import { ProfileBottomBar } from './components/ProfileBottomBar';

const ENTITY_COLORS: Record<string, string> = {
  community: '#E85D3A',
  organisation: '#1A7A6D',
  venue: '#9B59B6',
  business: '#F2A93B',
  council: '#3498DB',
  government: '#2C3E50',
};

const ENTITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  community: 'people',
  organisation: 'business',
  venue: 'location',
  business: 'storefront',
  council: 'shield-checkmark',
  government: 'flag',
};

const SOCIAL_ICONS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'facebook', icon: 'logo-facebook' },
  { key: 'instagram', icon: 'logo-instagram' },
  { key: 'twitter', icon: 'logo-twitter' },
  { key: 'linkedin', icon: 'logo-linkedin' },
  { key: 'youtube', icon: 'logo-youtube' },
  { key: 'tiktok', icon: 'logo-tiktok' },
];

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['/api/profiles', id as string],
    enabled: !!id,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ['/api/reviews', id as string],
    enabled: !!id,
  });

  const { data: allEventsData = [] } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'profile-detail', String(id)],
    queryFn: async () => {
      const data = await api.events.list({ pageSize: 100 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  if (isLoading) {
    return (
      <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
      </ErrorBoundary>
    );
  }

  if (!profile) {
    return (
      <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Profile not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
      </ErrorBoundary>
    );
  }

  const entityColor = ENTITY_COLORS[profile.entityType] || Colors.primary;
  const entityIcon = ENTITY_ICONS[profile.entityType] || 'person';
  const socialLinks = (profile.socialLinks || {}) as Record<string, string | undefined>;
  const activeSocials = SOCIAL_ICONS.filter(s => socialLinks[s.key]);
  const tags = (profile.tags || []) as string[];
  const locationText = [profile.address, profile.city, profile.country].filter(Boolean).join(', ');
  const hasCoordinates = !!(profile.latitude && profile.longitude);

  const profileName = (profile.name || '').toLowerCase();
  const profileTags = (profile.tags || []) as string[];
  const profileLocation = (profile.city || profile.location || '').toLowerCase();

  const matchedEvents = allEventsData.filter((ev) => {
    const tag = (ev.communityTag || '').toLowerCase();
    const organizer = (ev.organizerId || '').toLowerCase();
    const venue = (ev.venue || '').toLowerCase();
    const nameWords = profileName.split(/\s+/).filter((w: string) => w.length > 2);
    return nameWords.some((w: string) => tag.includes(w) || organizer.includes(w)) ||
      profileTags.some((t: string) => tag.includes(t.toLowerCase()) || (ev.category || '').toLowerCase().includes(t.toLowerCase())) ||
      (profileLocation && venue.includes(profileLocation));
  });
  const upcomingEvents = matchedEvents.length > 0
    ? matchedEvents.slice(0, 4)
    : allEventsData.filter((ev) => ev.isFeatured || ev.priceCents === 0).slice(0, 4);

  const stats = [
    profile.followersCount ? { label: 'Followers', value: profile.followersCount } : null,
    profile.likesCount ? { label: 'Likes', value: profile.likesCount } : null,
    profile.membersCount ? { label: 'Members', value: profile.membersCount } : null,
    profile.reviewsCount ? { label: 'Reviews', value: profile.reviewsCount } : null,
  ].filter(Boolean) as { label: string; value: number }[];

  if (stats.length === 0) {
    stats.push({ label: 'Followers', value: 0 }, { label: 'Members', value: 0 });
  }

  return (
    <ErrorBoundary>
    <View style={styles.container}>
      <ProfileHero
        profile={profile}
        entityColor={entityColor}
        entityIcon={entityIcon}
        topInset={topInset}
        id={id as string}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <ProfileStats stats={stats} />

        <ProfileSocials
          activeSocials={activeSocials}
          socialLinks={socialLinks}
          entityColor={entityColor}
        />

        <ProfileContact
          profile={profile}
          hasCoordinates={hasCoordinates}
          entityColor={entityColor}
        />

        <ProfileTags
          tags={tags}
          entityColor={entityColor}
        />

        <ProfileEvents
          upcomingEvents={upcomingEvents}
          entityColor={entityColor}
        />

        <ProfileMap
          hasCoordinates={hasCoordinates}
          profile={profile}
          entityColor={entityColor}
          locationText={locationText}
        />

        <ProfileReviews reviews={reviews} />

        <View style={styles.section}>
          <View style={styles.membersCard}>
            <View style={styles.membersInfo}>
              <Ionicons name="people" size={24} color={entityColor} />
              <View>
                <Text style={styles.membersTitle}>{formatNumber(profile.membersCount || 0)} Members</Text>
                <Text style={styles.membersSubtitle}>Join this {profile.entityType}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <ProfileBottomBar
        bottomInset={bottomInset}
        isLiked={isLiked}
        setIsLiked={setIsLiked}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        entityColor={entityColor}
      />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorText: { fontSize: 16, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  backLink: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.primary, marginTop: 12 },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  membersCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  membersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  membersTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  membersSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
});

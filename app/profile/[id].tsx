import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CultureTokens } from '@/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { Profile, Review, EventData } from '@/shared/schema';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ENTITY_COLORS: Record<string, string> = {
  community: CultureTokens.indigo,
  organisation: CultureTokens.teal,
  venue: CultureTokens.indigo,
  business: CultureTokens.saffron,
  council: CultureTokens.teal,
  government: CultureTokens.coral,
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
    queryFn: () => api.profiles.get(id as string),
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
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
        </View>
      </ErrorBoundary>
    );
  }

  if (!profile) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>Profile not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backLinkBtn}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  const entityColor = ENTITY_COLORS[profile.entityType] || CultureTokens.indigo;
  const entityIcon = ENTITY_ICONS[profile.entityType] || 'person';
  const socialLinks = (profile.socialLinks || {}) as Record<string, string | undefined>;
  const activeSocials = SOCIAL_ICONS.filter(s => socialLinks[s.key] || (profile as any)[s.key]);
  const tags = (profile.tags || []) as string[];
  const locationText = [profile.address, profile.city, profile.country].filter(Boolean).join(', ');
  
  const heroImage = profile.coverImageUrl || profile.avatarUrl;

  const profileName = (profile.name || '').toLowerCase();
  const profileTags = (profile.tags || []) as string[];
  const profileLocation = (profile.city || profile.location || '').toString().toLowerCase();

  const matchedEvents = allEventsData.filter((ev) => {
    const tag = (ev.communityId || '').toLowerCase();
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
    profile.likes ? { label: 'Likes', value: profile.likes } : null,
    profile.membersCount ? { label: 'Members', value: profile.membersCount } : null,
    profile.reviewsCount ? { label: 'Reviews', value: profile.reviewsCount } : null,
  ].filter(Boolean) as { label: string; value: number }[];

  if (stats.length === 0) {
    stats.push({ label: 'Followers', value: 0 }, { label: 'Members', value: 0 });
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
          
          {/* Hero */}
          <View style={styles.heroContainer}>
            {heroImage ? (
              <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" transition={300} />
            ) : (
              <LinearGradient colors={[entityColor, '#0B0B14']} style={styles.heroImage} />
            )}
            
            <LinearGradient
              colors={["rgba(11,11,20,0.1)", "rgba(11,11,20,0.6)", "#0B0B14"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={[styles.heroTopBar, { top: topInset + 12 }]}>
              <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>

              <Pressable onPress={() => { Haptics.impactAsync(); }} style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </Pressable>
            </View>
            
            <View style={styles.heroContent}>
              <View style={[styles.entityBadge, { backgroundColor: entityColor + '20', borderColor: entityColor + '40' }]}>
                <Ionicons name={entityIcon} size={14} color={entityColor} />
                <Text style={[styles.entityBadgeText, { color: entityColor }]}>{profile.entityType}</Text>
              </View>
              
              <Text style={styles.profileName}>{profile.name}</Text>
              
              {locationText && (
                <View style={styles.heroMetaRow}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroMetaText}>{locationText}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.content}>
            
            {/* Stats */}
            <View style={styles.statsRow}>
              {stats.map((stat, i) => (
                <View key={i} style={styles.statCard}>
                  <Text style={styles.statValue}>{formatNumber(stat.value)}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            
            {/* CPID */}
            {(profile as any).culturePassId && (
              <View style={[styles.cpidChip, { backgroundColor: entityColor + '15', borderColor: entityColor + '30' }]}>
                <Ionicons name="finger-print" size={16} color={entityColor} />
                <Text style={[styles.cpidText, { color: entityColor }]}>{(profile as any).culturePassId}</Text>
              </View>
            )}

            {/* About */}
            {(profile.bio || profile.description) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bio}>{profile.bio || profile.description}</Text>
              </View>
            )}

            {/* Contact */}
            {(profile.phone || profile.contactEmail || profile.website) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.contactCard}>
                  {profile.website && (
                    <Pressable 
                       style={styles.contactRow}
                       onPress={() => profile.website && Linking.openURL(profile.website)}
                    >
                      <View style={[styles.contactIconBox, { backgroundColor: entityColor + '15' }]}>
                        <Ionicons name="globe-outline" size={20} color={entityColor} />
                      </View>
                      <Text style={styles.contactText} numberOfLines={1}>{profile.website}</Text>
                    </Pressable>
                  )}
                  {profile.phone && (
                    <Pressable 
                       style={[styles.contactRow, profile.website && styles.contactDivider]}
                       onPress={() => profile.phone && Linking.openURL(`tel:${profile.phone}`)}
                    >
                      <View style={[styles.contactIconBox, { backgroundColor: entityColor + '15' }]}>
                        <Ionicons name="call-outline" size={20} color={entityColor} />
                      </View>
                      <Text style={styles.contactText}>{profile.phone}</Text>
                    </Pressable>
                  )}
                  {profile.contactEmail && (
                    <Pressable 
                       style={[styles.contactRow, (profile.website || profile.phone) && styles.contactDivider]}
                       onPress={() => profile.contactEmail && Linking.openURL(`mailto:${profile.contactEmail}`)}
                    >
                      <View style={[styles.contactIconBox, { backgroundColor: entityColor + '15' }]}>
                        <Ionicons name="mail-outline" size={20} color={entityColor} />
                      </View>
                      <Text style={styles.contactText} numberOfLines={1}>{profile.contactEmail}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Socials */}
            {activeSocials.length > 0 && (
               <View style={styles.section}>
                 <Text style={styles.sectionTitle}>Socials</Text>
                 <View style={styles.socialsRow}>
                   {activeSocials.map(social => {
                     const link = socialLinks[social.key] || (profile as any)[social.key];
                     if (!link) return null;
                     return (
                       <Pressable 
                         key={social.key} 
                         style={[styles.socialBtn, { borderColor: entityColor + '30' }]} 
                         onPress={() => Linking.openURL(link)}
                       >
                         <Ionicons name={social.icon} size={22} color={entityColor} />
                       </Pressable>
                     );
                   })}
                 </View>
               </View>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsRow}>
                  {tags.map((tag, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Events */}
            {upcomingEvents.length > 0 && (
               <View style={styles.section}>
                 <View style={styles.sectionHeaderRow}>
                   <Text style={styles.sectionTitle}>Related Events</Text>
                   <Pressable onPress={() => router.push('/(tabs)')}>
                     <Text style={[styles.seeAllText, { color: entityColor }]}>See all</Text>
                   </Pressable>
                 </View>
                 <View style={styles.eventsStack}>
                   {upcomingEvents.map((event) => (
                     <Pressable 
                       key={event.id}
                       style={styles.eventItem}
                       onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                     >
                       <Image source={{ uri: event.imageUrl }} style={styles.eventImg} />
                       <View style={styles.eventInfo}>
                         <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                         <Text style={styles.eventDate} numberOfLines={1}>{event.date}</Text>
                       </View>
                       <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                     </Pressable>
                   ))}
                 </View>
               </View>
            )}
            
            {/* Members Join Prompt */}
            {profile.entityType === 'community' && (
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
            )}
            
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}>
          <Pressable 
            style={({pressed}) => [styles.actionBtn, pressed && { opacity: 0.8 }, { flex: 1, backgroundColor: isFollowing ? 'transparent' : entityColor, borderColor: isFollowing ? entityColor + '50' : 'transparent', borderWidth: 1 }]}
            onPress={() => { Haptics.impactAsync(); setIsFollowing(!isFollowing); }}
          >
            <Ionicons name={isFollowing ? "checkmark" : "person-add"} size={20} color={isFollowing ? entityColor : '#0B0B14'} />
            <Text style={[styles.actionBtnText, { color: isFollowing ? entityColor : '#0B0B14' }]}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </Pressable>
          
          <Pressable 
            style={({pressed}) => [styles.iconActionBtn, pressed && { opacity: 0.8 }, { borderColor: entityColor + '40' }]}
            onPress={() => { Haptics.impactAsync(); setIsLiked(!isLiked); }}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? CultureTokens.coral : entityColor} />
          </Pressable>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  errorText: { fontSize: 16, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  backLinkBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: CultureTokens.indigo + '15' },
  backLink: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },
  
  heroContainer: { height: 380, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroTopBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroContent: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  
  entityBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  entityBadgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileName: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.8)' },
  
  content: { padding: 20 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  
  cpidChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 24, borderWidth: 1 },
  cpidText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1 },
  
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  seeAllText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  
  bio: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 24 },
  
  contactCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  contactDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  contactIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactText: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: '#FFFFFF', flex: 1 },
  
  socialsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  socialBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tagText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: '#FFFFFF' },
  
  eventsStack: { gap: 12 },
  eventItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  eventImg: { width: 56, height: 56, borderRadius: 12 },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  eventDate: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  
  membersCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  membersInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  membersTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  membersSubtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(11,11,20,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, height: 56 },
  actionBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  iconActionBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1 },
});

import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Platform, Image, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSaved } from '@/contexts/SavedContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/query-client';
import { api } from '@/lib/api';
import { Community, EventData } from '@shared/schema';
import { confirmAndReport } from '@/lib/reporting';
import { useColors } from '@/hooks/useColors';
import { CultureTokens } from '@/constants/theme';
import { BlurView } from 'expo-blur';

const isWeb = Platform.OS === 'web';

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Keep the same community type colors but they acts as hints
const COMMUNITY_TYPE_COLORS: Record<string, string> = {
  diaspora:   CultureTokens.indigo,
  indigenous: CultureTokens.saffron,
  language:   CultureTokens.teal,
  religion:   CultureTokens.coral,
};

const COMMUNITY_TYPE_ICONS: Record<string, string> = {
  diaspora:   'earth',
  indigenous: 'leaf',
  language:   'chatbubbles',
  religion:   'heart',
};

export default function CommunityDetailScreen() {
  const colors = useColors();
  const s = getStyles(colors);
  const { id }      = useLocalSearchParams<{ id: string }>();
  const insets      = useSafeAreaInsets();
  const topInset    = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const { data: dbCommunity, isLoading } = useQuery<Community>({
    queryKey: ['/api/communities', id],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topInset + 20, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={CultureTokens.indigo} />
      </View>
    );
  }

  if (dbCommunity) {
    return <DbCommunityView community={dbCommunity} topInset={topInset} bottomInset={bottomInset} />;
  }

  return (
    <View style={[s.container, { paddingTop: topInset + 20, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={s.errorText}>Community not found</Text>
      <Pressable onPress={() => goBackOrReplace('/(tabs)')}>
        <Text style={s.backLink}>Go Back</Text>
      </Pressable>
    </View>
  );
}

interface DbViewProps {
  community: Community;
  topInset: number;
  bottomInset: number;
}

function DbCommunityView({ community, topInset, bottomInset }: DbViewProps) {
  const colors = useColors();
  const s = getStyles(colors);
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined      = isCommunityJoined(community.id);
  const queryClient = useQueryClient();
  const color       = COMMUNITY_TYPE_COLORS[community.communityType ?? ''] || CultureTokens.indigo;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const joinMutation = useMutation({
    mutationFn: () => api.communities.join(String(community.id)),
    onSuccess: () => {
      toggleJoinCommunity(community.id);
      queryClient.invalidateQueries({ queryKey: ['/api/communities', String(community.id)] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.communities.leave(String(community.id)),
    onSuccess: () => {
      toggleJoinCommunity(community.id);
      queryClient.invalidateQueries({ queryKey: ['/api/communities', String(community.id)] });
    },
  });

  const handleJoinPress = () => {
    if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (joined) leaveMutation.mutate();
    else joinMutation.mutate();
  };

  const isMutating = joinMutation.isPending || leaveMutation.isPending;
  const icon       = COMMUNITY_TYPE_ICONS[community.communityType ?? ''] || 'people';

  const { data: relatedEvents = [] } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'community-db', community.id],
    queryFn: async () => {
      const data = await api.events.list({ communityId: String(community.id), pageSize: 10 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  return (
    <View style={s.container}>
      <View style={[isDesktop && s.desktopShellWrapper]}>
        <View style={[isDesktop && s.desktopShell]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 120 }}>
            {/* Hero */}
            <View style={s.heroWrapper}>
              <View style={[s.heroSection, { height: isDesktop ? 340 : 280 + topInset }, isDesktop && { borderRadius: 24, marginHorizontal: 20, marginTop: 20, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={[color + '80', color + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                  colors={["rgba(11,11,20,0.1)", "rgba(11,11,20,0.6)", "rgba(11,11,20,1)"]}
                  locations={[0, 0.4, 1]}
                  style={[StyleSheet.absoluteFillObject, { paddingTop: topInset }]}
                >
                  <View style={s.heroNav}>
                    <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => goBackOrReplace('/(tabs)')}>
                      <Ionicons name="chevron-back" size={24} color={colors.text} />
                      {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                    </Pressable>
                    <Pressable style={({pressed}) => [s.navBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]} onPress={() => confirmAndReport({ targetType: 'community', targetId: String(community.id) })}>
                      <Ionicons name="flag-outline" size={20} color={colors.text} />
                      {!isWeb && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
                    </Pressable>
                  </View>
                  
                  <View style={s.heroContent}>
                    <View style={[s.heroIconWrap, { backgroundColor: color + '40', borderWidth: 1, borderColor: color + '80' }]}>
                      {community.iconEmoji ? (
                        <Text style={{ fontSize: 32 }}>{community.iconEmoji}</Text>
                      ) : (
                        <Ionicons name={icon as never} size={28} color={colors.text} />
                      )}
                    </View>
                    <Text style={s.heroTitle}>{community.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <View style={s.dbTypeBadge}>
                        <Text style={s.dbTypeBadgeText}>{community.communityType}</Text>
                      </View>
                      {community.isIndigenous && (
                        <View style={[s.dbTypeBadge, { backgroundColor: 'rgba(255, 140, 66, 0.2)', borderColor: 'rgba(255, 140, 66, 0.4)' }]}>
                          <Text style={[s.dbTypeBadgeText, { color: CultureTokens.saffron }]}>Indigenous</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <View style={s.detailShell}>
              {/* Stats */}
              <View style={s.statsRow}>
                <View style={s.statCard}>
                  <View style={[s.statIconBg, { backgroundColor: color + '20' }]}>
                    <Ionicons name="people" size={18} color={color} />
                  </View>
                  <Text style={s.statNum}>{formatNumber(community.memberCount ?? 0)}</Text>
                  <Text style={s.statLabel}>Members</Text>
                </View>
                <View style={s.statCard}>
                  <View style={[s.statIconBg, { backgroundColor: CultureTokens.saffron + '20' }]}>
                    <Ionicons name="calendar" size={18} color={CultureTokens.saffron} />
                  </View>
                  <Text style={s.statNum}>{relatedEvents.length}</Text>
                  <Text style={s.statLabel}>Events</Text>
                </View>
                {community.countryOfOrigin && (
                  <View style={s.statCard}>
                    <View style={[s.statIconBg, { backgroundColor: CultureTokens.teal + '20' }]}>
                      <Ionicons name="globe" size={18} color={CultureTokens.teal} />
                    </View>
                    <Text style={[s.statNum, { fontSize: 14 }]} numberOfLines={1}>{community.countryOfOrigin}</Text>
                    <Text style={s.statLabel}>Origin</Text>
                  </View>
                )}
              </View>

              {/* About */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.description}>
                  {community.description || 'A vibrant cultural community connecting people through shared heritage and traditions.'}
                </Text>
              </View>

              {/* Related events */}
              {relatedEvents.length > 0 && (
                <>
                  <View style={s.sectionDivider} />
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Related Events</Text>
                    {relatedEvents.slice(0, 5).map((event: EventData) => (
                      <Pressable
                        key={event.id}
                        style={({pressed}) => [s.eventCard, pressed && { opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                        onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                      >
                        <Image source={{ uri: event.imageUrl }} style={s.eventImage} />
                        <View style={s.eventInfo}>
                          <Text style={s.eventTitle} numberOfLines={1}>{event.title as string}</Text>
                          <Text style={s.eventDate}>{formatDate(event.date as string)} - {event.time as string}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={s.sectionDivider} />

              {/* Wellbeing */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Wellbeing & Support</Text>
                <View style={[s.wellbeingCard, { backgroundColor: CultureTokens.saffron + '10', borderColor: CultureTokens.saffron + '30' }]}>
                  <Ionicons name="heart-circle" size={28} color={CultureTokens.saffron} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.wellbeingTitle}>Mental Health & Belonging</Text>
                    <Text style={s.wellbeingDesc}>
                      Community support resources, cultural counselling, and wellbeing programs are available for all members.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Floating Bottom Bar Container */}
      <View style={[s.floatingBottomBarWrapper, { paddingBottom: bottomInset + 16 }]}>
        <LinearGradient colors={['transparent', colors.background]} style={StyleSheet.absoluteFillObject} />
        <View style={{ overflow: 'hidden', borderRadius: 24, marginHorizontal: 20 }}>
          <BlurView 
            intensity={isWeb ? 80 : 30} 
            tint="dark" 
            style={[s.floatingBottomBar, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%', bottom: 0 }]}
          >
            <Pressable
              style={({ pressed }) => [
                s.joinButton,
                { backgroundColor: joined ? 'transparent' : color },
                joined && { borderWidth: 1, borderColor: color + '50', backgroundColor: color + '15' },
                isMutating && { opacity: 0.6 },
                pressed && !isMutating && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleJoinPress}
              disabled={isMutating}
            >
              {isMutating ? (
                <ActivityIndicator size="small" color={joined ? color : '#FFFFFF'} />
              ) : (
                <Ionicons name={joined ? 'checkmark-circle' : 'add-circle'} size={22} color={joined ? color : '#FFFFFF'} />
              )}
              <Text style={[s.joinText, { color: joined ? color : '#FFFFFF' }]}>
                {joined ? 'Joined Community' : 'Join Community'}
              </Text>
            </Pressable>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  errorText:      { fontSize: 16, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  backLink:       { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 12, color: '#A5B4FC' },

  desktopShellWrapper: { flex: 1, alignItems: 'center' },
  desktopShell: { width: '100%', maxWidth: 800 },
  detailShell: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  heroWrapper: { width: '100%' },
  heroSection: { position: 'relative', justifyContent: 'flex-end' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, zIndex: 10 },
  navBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: colors.borderLight },
  heroContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 8, zIndex: 2 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 32, fontFamily: 'Poppins_700Bold', lineHeight: 38, color: colors.text, letterSpacing: -0.5 },
  
  dbTypeBadge: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  dbTypeBadgeText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize', color: colors.text },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  statIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { marginTop: 28 },
  sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 12, color: colors.text },
  sectionDivider: { height: 1, backgroundColor: colors.surfaceElevated, marginVertical: 24, marginHorizontal: 10 },
  description: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 24, color: colors.textSecondary },

  eventCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 12, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  eventImage: { width: 48, height: 48, borderRadius: 14 },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  eventDate: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },

  wellbeingCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 20, padding: 20, borderWidth: 1 },
  wellbeingTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 4, color: colors.text },
  wellbeingDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20, color: colors.textSecondary },

  floatingBottomBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  floatingBottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight },
  joinButton: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
  joinText: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
});

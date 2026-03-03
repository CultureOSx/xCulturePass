import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Platform, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useSaved } from '@/contexts/SavedContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/query-client';
import { api } from '@/lib/api';
import { Community, EventData } from '@shared/schema';
import { confirmAndReport } from '@/lib/reporting';

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

const COMMUNITY_TYPE_COLORS: Record<string, string> = {
  diaspora:   '#2E86C1',
  indigenous: '#8B4513',
  language:   '#7B1FA2',
  religion:   '#00897B',
};

const COMMUNITY_TYPE_ICONS: Record<string, string> = {
  diaspora:   'earth',
  indigenous: 'leaf',
  language:   'chatbubbles',
  religion:   'heart',
};

export default function CommunityDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();

  const { data: dbCommunity, isLoading } = useQuery<Community>({
    queryKey: ['/api/communities', id],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topInset + 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (dbCommunity) {
    return <DbCommunityView community={dbCommunity} topInset={topInset} bottomInset={bottomInset} colors={colors} />;
  }

  return (
    <View style={[s.container, { paddingTop: topInset + 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[s.errorText, { color: colors.textSecondary }]}>Community not found</Text>
      <Pressable onPress={() => goBackOrReplace('/(tabs)')}>
        <Text style={[s.backLink, { color: colors.primary }]}>Go Back</Text>
      </Pressable>
    </View>
  );
}

interface DbViewProps {
  community: Community;
  topInset: number;
  bottomInset: number;
  colors: ReturnType<typeof useColors>;
}

function DbCommunityView({ community, topInset, bottomInset, colors }: DbViewProps) {
  const { isCommunityJoined, toggleJoinCommunity } = useSaved();
  const joined      = isCommunityJoined(community.id);
  const queryClient = useQueryClient();
  const color       = COMMUNITY_TYPE_COLORS[community.communityType ?? ''] || colors.primary;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (joined) leaveMutation.mutate();
    else joinMutation.mutate();
  };

  const isMutating = joinMutation.isPending || leaveMutation.isPending;
  const icon       = COMMUNITY_TYPE_ICONS[community.communityType ?? ''] || 'people';

  const { data: allEvents = [] } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'community-db', community.id],
    queryFn: async () => {
      const data = await api.events.list({ pageSize: 200 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  const relatedTags   = getRelatedTagsForDb(community);
  const relatedEvents = allEvents.filter((e: EventData) =>
    relatedTags.some((tag: string) => {
      const ct = (e.communityTag || '').toLowerCase();
      return ct.includes(tag) || tag.includes(ct);
    })
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.hero, { height: 240 + topInset }]}>
        <LinearGradient
          colors={[color, color + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <View style={[s.heroOverlay, { paddingTop: topInset + 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable style={s.backButton} onPress={() => goBackOrReplace('/(tabs)')}>
              <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
            </Pressable>
            <Pressable
              style={s.backButton}
              onPress={() => confirmAndReport({ targetType: 'community', targetId: String(community.id) })}
            >
              <Ionicons name="flag-outline" size={20} color={colors.textInverse} />
            </Pressable>
          </View>
          <View style={s.heroBottom}>
            <View style={s.heroIconWrap}>
              {community.iconEmoji ? (
                <Text style={{ fontSize: 30 }}>{community.iconEmoji}</Text>
              ) : (
                <Ionicons name={icon as never} size={28} color={colors.textInverse} />
              )}
            </View>
            <Text style={[s.heroTitle, { color: colors.textInverse }]}>{community.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={s.dbTypeBadge}>
                <Text style={[s.dbTypeBadgeText, { color: colors.textInverse }]}>{community.communityType}</Text>
              </View>
              {community.isIndigenous && (
                <View style={[s.dbTypeBadge, { backgroundColor: '#8B451330' }]}>
                  <Text style={[s.dbTypeBadgeText, { color: '#F5EDE3' }]}>Indigenous</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: colors.surface }]}>
            <View style={[s.statIconBg, { backgroundColor: color + '12' }]}>
              <Ionicons name="people" size={18} color={color} />
            </View>
            <Text style={[s.statNum, { color: colors.text }]}>{formatNumber(community.memberCount ?? 0)}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Members</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface }]}>
            <View style={[s.statIconBg, { backgroundColor: colors.secondary + '12' }]}>
              <Ionicons name="calendar" size={18} color={colors.secondary} />
            </View>
            <Text style={[s.statNum, { color: colors.text }]}>{relatedEvents.length}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Events</Text>
          </View>
          {community.countryOfOrigin && (
            <View style={[s.statCard, { backgroundColor: colors.surface }]}>
              <View style={[s.statIconBg, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="globe" size={18} color={colors.accent} />
              </View>
              <Text style={[s.statNum, { color: colors.text, fontSize: 14 }]}>{community.countryOfOrigin}</Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>Origin</Text>
            </View>
          )}
        </View>

        {/* About */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>About</Text>
          <Text style={[s.description, { color: colors.textSecondary }]}>
            {community.description || 'A vibrant cultural community connecting people through shared heritage and traditions.'}
          </Text>
        </View>

        {/* Related events */}
        {relatedEvents.length > 0 && (
          <>
            <View style={s.sectionDivider}>
              <View style={[s.accentBar, { backgroundColor: colors.secondary + '25' }]} />
            </View>
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Related Events</Text>
              {relatedEvents.slice(0, 5).map((event: EventData) => (
                <Pressable
                  key={event.id}
                  style={[s.eventCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                >
                  <Image source={{ uri: event.imageUrl }} style={s.eventImage} />
                  <View style={s.eventInfo}>
                    <Text style={[s.eventTitle, { color: colors.text }]} numberOfLines={1}>{event.title as string}</Text>
                    <Text style={[s.eventDate, { color: colors.textSecondary }]}>{formatDate(event.date as string)} - {event.time as string}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={s.sectionDivider}>
          <View style={[s.accentBar, { backgroundColor: colors.secondary + '25' }]} />
        </View>

        {/* Wellbeing */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Wellbeing & Support</Text>
          <View style={[s.wellbeingCard, { backgroundColor: colors.secondary + '08', borderColor: colors.secondary + '20' }]}>
            <Ionicons name="heart-circle" size={28} color={colors.secondary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.wellbeingTitle, { color: colors.text }]}>Mental Health & Belonging</Text>
              <Text style={[s.wellbeingDesc, { color: colors.textSecondary }]}>
                Community support resources, cultural counselling, and wellbeing programs are available for all members.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[s.bottomBar, { paddingBottom: bottomInset + 14, backgroundColor: colors.surface, borderTopColor: colors.border + '40' }]}>
        <Pressable
          style={({ pressed }) => [
            s.joinButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            joined && { backgroundColor: colors.secondary + '12', borderWidth: 1, borderColor: colors.secondary + '30', shadowOpacity: 0, elevation: 0 },
            isMutating && { opacity: 0.6 },
            pressed && !isMutating && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleJoinPress}
          disabled={isMutating}
        >
          {isMutating ? (
            <ActivityIndicator size="small" color={joined ? colors.secondary : colors.textInverse} />
          ) : (
            <Ionicons name={joined ? 'checkmark-circle' : 'add-circle'} size={22} color={joined ? colors.secondary : colors.textInverse} />
          )}
          <Text style={[s.joinText, { color: joined ? colors.secondary : colors.textInverse }]}>
            {joined ? 'Joined Community' : 'Join Community'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function getRelatedTagsForDb(community: Community): string[] {
  const name = community.name.toLowerCase();
  const tags = [name];
  if (name.includes('indian'))   tags.push('indian', 'tamil', 'malayalee', 'punjabi', 'bengali', 'gujarati', 'telugu');
  if (name.includes('chinese'))  tags.push('chinese', 'cantonese', 'mandarin');
  if (name.includes('filipino')) tags.push('filipino');
  if (name.includes('vietnamese')) tags.push('vietnamese');
  if (name.includes('lebanese')) tags.push('lebanese', 'arabic');
  if (name.includes('greek'))    tags.push('greek');
  if (name.includes('italian'))  tags.push('italian');
  if (name.includes('korean'))   tags.push('korean');
  if (name.includes('aboriginal') || name.includes('torres strait') || name.includes('māori') || name.includes('first nations')) {
    tags.push('aboriginal', 'indigenous', 'first nations', 'aboriginal & torres strait islander');
  }
  if (name.includes('punjabi') || name.includes('sikh')) tags.push('punjabi');
  return tags;
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  errorText:      { fontSize: 16, fontFamily: 'Poppins_500Medium' },
  backLink:       { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 12 },
  hero:           { overflow: 'hidden' },
  heroOverlay:    { flex: 1, padding: 16, paddingBottom: 20, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)' },
  backButton:     { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroBottom:     { gap: 6 },
  heroIconWrap:   { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle:      { fontSize: 26, fontFamily: 'Poppins_700Bold', lineHeight: 32 },
  statsRow:       { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 20, marginBottom: 8 },
  statCard:       { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 4 },
  statIconBg:     { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNum:        { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  statLabel:      { fontSize: 11, fontFamily: 'Poppins_500Medium' },
  section:        { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle:   { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  sectionDivider: { paddingHorizontal: 20, marginTop: 24, alignItems: 'center' },
  accentBar:      { width: 40, height: 3, borderRadius: 2 },
  description:    { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
  eventCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 10, gap: 12 },
  eventImage:     { width: 48, height: 48, borderRadius: 14 },
  eventInfo:      { flex: 1, gap: 2 },
  eventTitle:     { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  eventDate:      { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  wellbeingCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 20, padding: 18, borderWidth: 1 },
  wellbeingTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  wellbeingDesc:  { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  joinButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  joinText:       { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  dbTypeBadge:    { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  dbTypeBadgeText:{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' as const },
});

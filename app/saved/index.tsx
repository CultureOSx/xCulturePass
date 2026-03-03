import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaved } from '@/contexts/SavedContext';
import { useColors } from '@/hooks/useColors';
import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Community, EventData } from '@/shared/schema';
import { AuthGuard } from '@/components/AuthGuard';

type TabKey = 'events' | 'communities';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabKey>('events');
  const { savedEvents, joinedCommunities, toggleSaveEvent, toggleJoinCommunity } = useSaved();

  const { data: allEvents = [] } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'saved'],
    queryFn: async () => {
      const data = await api.events.list();
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  const { data: allCommunities = [] } = useQuery<Community[]>({
    queryKey: ['/api/communities'],
    queryFn: () => api.communities.list(),
  });

  const savedEventItems = useMemo(
    () => allEvents.filter((e) => savedEvents.includes(e.id)),
    [savedEvents, allEvents],
  );

  const joinedCommunityItems = useMemo(
    () => allCommunities.filter((c) => joinedCommunities.includes(c.id)),
    [joinedCommunities, allCommunities],
  );

  const tabs: { key: TabKey; label: string; icon: string; count: number }[] = [
    { key: 'events',      label: 'Saved Events',  icon: 'bookmark', count: savedEventItems.length },
    { key: 'communities', label: 'Communities',   icon: 'people',   count: joinedCommunityItems.length },
  ];

  return (
    <AuthGuard icon="bookmark" title="My Saved" message="Sign in to save events and communities you love.">
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>My Saved</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabRow}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[s.tab, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                isActive && { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <Ionicons name={tab.icon as never} size={16} color={isActive ? colors.primary : colors.textSecondary} />
              <Text style={[s.tabText, { color: colors.text }, isActive && { color: colors.primary }]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={[s.countBadge, { backgroundColor: colors.backgroundSecondary },
                  isActive && { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[s.countText, { color: colors.text }, isActive && { color: colors.primary }]}>{tab.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: bottomInset + 20 }}
      >
        {activeTab === 'events' && (
          <>
            {savedEventItems.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="bookmark-outline" size={56} color={colors.textSecondary} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No saved events</Text>
                <Text style={[s.emptyDesc, { color: colors.text }]}>Tap the bookmark icon on any event to save it here for later</Text>
                <Pressable style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)')}>
                  <Text style={[s.emptyBtnText, { color: colors.textInverse }]}>Browse Events</Text>
                </Pressable>
              </View>
            ) : (
              savedEventItems.map((event: EventData) => (
                <View key={event.id}>
                  <Pressable
                    style={[s.eventCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                    onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                  >
                    <Image source={{ uri: event.imageUrl }} style={s.eventImage} />
                    <View style={s.eventInfo}>
                      <View style={s.eventCommunityRow}>
                        <Text style={[s.eventCommunity, { color: colors.primary, backgroundColor: colors.primary + '10' }]}>{event.communityTag}</Text>
                      </View>
                      <Text style={[s.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                      <View style={s.eventMeta}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                        <Text style={[s.eventMetaText, { color: colors.text }]}>{formatDate(event.date)}</Text>
                      </View>
                      <View style={s.eventMeta}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={[s.eventMetaText, { color: colors.text }]} numberOfLines={1}>{event.venue}</Text>
                      </View>
                      <View style={s.eventBottom}>
                        <Text style={[s.eventPrice, { color: colors.primary }]}>{event.priceLabel}</Text>
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            toggleSaveEvent(event.id);
                          }}
                        >
                          <Ionicons name="bookmark" size={20} color={colors.primary} />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'communities' && (
          <>
            {joinedCommunityItems.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={56} color={colors.textSecondary} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No communities joined</Text>
                <Text style={[s.emptyDesc, { color: colors.text }]}>Join cultural communities to see them here</Text>
                <Pressable style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/communities')}>
                  <Text style={[s.emptyBtnText, { color: colors.textInverse }]}>Browse Communities</Text>
                </Pressable>
              </View>
            ) : (
              joinedCommunityItems.map((community: Community) => (
                <View key={community.id}>
                  <Pressable
                    style={[s.communityCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                    onPress={() => router.push({ pathname: '/community/[id]', params: { id: community.id } })}
                  >
                    <View style={[s.communityAvatar, { backgroundColor: colors.primaryGlow }]}>
                      <Ionicons name="people" size={24} color={colors.primary} />
                    </View>
                    <View style={s.communityInfo}>
                      <Text style={[s.communityName, { color: colors.text }]}>{community.name}</Text>
                      <Text style={[s.communityType, { color: colors.text }]}>{community.category}</Text>
                      <View style={s.communityStats}>
                        <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
                        <Text style={[s.communityStatText, { color: colors.text }]}>{community.memberCount ?? 0} members</Text>
                        {(community as unknown as Record<string, unknown>).events !== undefined && Number((community as unknown as Record<string, unknown>).events) > 0 && (
                          <>
                            <View style={[s.statDot, { backgroundColor: colors.textSecondary }]} />
                            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                            <Text style={[s.communityStatText, { color: colors.text }]}>{String((community as unknown as Record<string, unknown>).events)} events</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleJoinCommunity(community.id);
                      }}
                      style={[s.leaveBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}
                    >
                      <Text style={[s.leaveBtnText, { color: colors.primary }]}>Joined</Text>
                    </Pressable>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
    </AuthGuard>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:            { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:        { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  tabRow:             { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  tab:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tabText:            { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  countBadge:         { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 },
  countText:          { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  emptyState:         { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle:         { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  emptyDesc:          { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 20 },
  emptyBtn:           { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50 },
  emptyBtnText:       { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  eventCard:          { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1 },
  eventImage:         { width: 110, minHeight: 130 },
  eventInfo:          { flex: 1, padding: 14, gap: 4, justifyContent: 'center' },
  eventCommunityRow:  { flexDirection: 'row' },
  eventCommunity:     { fontSize: 11, fontFamily: 'Poppins_600SemiBold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  eventTitle:         { fontSize: 15, fontFamily: 'Poppins_700Bold', marginTop: 2 },
  eventMeta:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText:      { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  eventBottom:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  eventPrice:         { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  communityCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  communityAvatar:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  communityInfo:      { flex: 1, gap: 2 },
  communityName:      { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  communityType:      { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'capitalize' },
  communityStats:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  communityStatText:  { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  statDot:            { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 4 },
  leaveBtn:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, borderWidth: 1 },
  leaveBtnText:       { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
});

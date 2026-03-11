import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
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
import { CultureTokens } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

type TabKey = 'events' | 'communities';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();

  const topInset = isWeb ? 72 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const isDesktop = width >= 1024;

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

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: 'events',      label: 'Saved Events',  icon: 'bookmark', count: savedEventItems.length },
    { key: 'communities', label: 'Communities',   icon: 'people',   count: joinedCommunityItems.length },
  ];

  return (
    <AuthGuard icon="bookmark" title="My Saved" message="Sign in to save events and communities you love.">
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={[s.shell, isDesktop && s.desktopShell]}>
          <View style={s.header}>
            <Pressable 
              onPress={() => goBackOrReplace('/(tabs)')} 
              style={({ pressed }) => [s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.95 : 1 }] }]} 
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.headerTitle, { color: colors.text }]}>My Saved</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={s.tabRow}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    s.tab, 
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    isActive && { backgroundColor: CultureTokens.indigo + '15', borderColor: CultureTokens.indigo + '30' }
                  ]}
                  onPress={() => {
                    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                  }}
                >
                  <Ionicons name={tab.icon} size={18} color={isActive ? CultureTokens.indigo : colors.textSecondary} />
                  <Text style={[s.tabText, { color: colors.textSecondary }, isActive && { color: CultureTokens.indigo }]}>{tab.label}</Text>
                  {tab.count > 0 && (
                    <View style={[
                      s.countBadge, 
                      { backgroundColor: colors.backgroundSecondary },
                      isActive && { backgroundColor: CultureTokens.indigo + '25' }
                    ]}>
                      <Text style={[s.countText, { color: colors.textSecondary }, isActive && { color: CultureTokens.indigo }]}>{tab.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: bottomInset + 40 }}
          >
            {activeTab === 'events' && (
              <>
                {savedEventItems.length === 0 ? (
                  <View style={s.emptyState}>
                    <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
                      <Ionicons name="bookmark-outline" size={48} color={colors.textTertiary} />
                    </View>
                    <Text style={[s.emptyTitle, { color: colors.text }]}>No saved events</Text>
                    <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>Tap the bookmark icon on any event to save it here for later.</Text>
                    <Pressable 
                      style={({ pressed }) => [s.emptyBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => router.push('/(tabs)')}
                    >
                      <Text style={[s.emptyBtnText, { color: '#FFFFFF' }]}>Browse Events</Text>
                    </Pressable>
                  </View>
                ) : (
                  savedEventItems.map((event: EventData) => (
                    <View key={event.id}>
                      <Pressable
                        style={({ pressed }) => [s.eventCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                        onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                      >
                        <Image source={{ uri: event.imageUrl }} style={s.eventImage} />
                        <View style={s.eventInfo}>
                          <View style={s.eventCommunityRow}>
                            <Text style={[s.eventCommunity, { color: CultureTokens.saffron, backgroundColor: CultureTokens.saffron + '15' }]}>{event.communityTag}</Text>
                          </View>
                          <Text style={[s.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                          
                          <View style={s.metaGroup}>
                            <View style={s.eventMeta}>
                              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                              <Text style={[s.eventMetaText, { color: colors.textSecondary }]}>{formatDate(event.date)}</Text>
                            </View>
                            <View style={s.eventMeta}>
                              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                              <Text style={[s.eventMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{event.venue}</Text>
                            </View>
                          </View>

                          <View style={s.eventBottom}>
                            <Text style={[s.eventPrice, { color: CultureTokens.teal }]}>{event.priceLabel}</Text>
                            <Pressable
                              hitSlop={12}
                              style={[s.bookmarkBtn, { backgroundColor: CultureTokens.indigo + '10' }]}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                toggleSaveEvent(event.id);
                              }}
                            >
                              <Ionicons name="bookmark" size={20} color={CultureTokens.indigo} />
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
                    <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
                      <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
                    </View>
                    <Text style={[s.emptyTitle, { color: colors.text }]}>No communities joined</Text>
                    <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>Join cultural communities to see them pinned here.</Text>
                    <Pressable 
                      style={({ pressed }) => [s.emptyBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => router.push('/(tabs)/communities')}
                    >
                      <Text style={[s.emptyBtnText, { color: '#FFFFFF' }]}>Browse Communities</Text>
                    </Pressable>
                  </View>
                ) : (
                  joinedCommunityItems.map((community: Community) => (
                    <View key={community.id}>
                      <Pressable
                        style={({ pressed }) => [s.communityCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                        onPress={() => {
                          if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({ pathname: '/community/[id]', params: { id: community.id } });
                        }}
                      >
                        <View style={[s.communityAvatar, { backgroundColor: CultureTokens.indigo + '15' }]}>
                          <Ionicons name="people" size={28} color={CultureTokens.indigo} />
                        </View>
                        
                        <View style={s.communityInfo}>
                          <Text style={[s.communityName, { color: colors.text }]} numberOfLines={1}>{community.name}</Text>
                          <View style={[s.communityTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <Text style={[s.communityType, { color: colors.textSecondary }]}>{community.category}</Text>
                          </View>
                          
                          <View style={s.communityStats}>
                            <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
                            <Text style={[s.communityStatText, { color: colors.textSecondary }]}>{community.memberCount ?? 0} members</Text>
                            {(community as unknown as Record<string, unknown>).events !== undefined && Number((community as unknown as Record<string, unknown>).events) > 0 && (
                              <>
                                <View style={[s.statDot, { backgroundColor: colors.textTertiary }]} />
                                <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                                <Text style={[s.communityStatText, { color: colors.textSecondary }]}>{String((community as unknown as Record<string, unknown>).events)} events</Text>
                              </>
                            )}
                          </View>
                        </View>

                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            if(!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            toggleJoinCommunity(community.id);
                          }}
                          style={[s.leaveBtn, { backgroundColor: colors.backgroundSecondary }]}
                        >
                          <Ionicons name="checkmark" size={16} color={colors.text} />
                        </Pressable>
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </AuthGuard>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  shell: { flex: 1 },
  desktopShell: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold' },
  
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 4, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  tabText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },
  
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  emptyDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  
  eventCard: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  eventImage: { width: 120, minHeight: 140 },
  eventInfo: { flex: 1, padding: 16, gap: 6, justifyContent: 'center' },
  eventCommunityRow: { flexDirection: 'row' },
  eventCommunity: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', lineHeight: 22 },
  
  metaGroup: { gap: 4, marginVertical: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMetaText: { fontSize: 13, fontFamily: 'Poppins_400Regular', flexShrink: 1 },
  
  eventBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  eventPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  bookmarkBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  
  communityCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  communityAvatar: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  communityInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  communityName: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  
  communityTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  communityType: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  communityStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  communityStatText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  statDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 2 },
  
  leaveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

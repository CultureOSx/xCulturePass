import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaved } from '@/contexts/SavedContext';
import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Community, EventData } from '@/shared/schema';
import { AuthGuard } from '@/components/AuthGuard';
import { CultureTokens } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

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
  const { width } = useWindowDimensions();
  const colors = useColors();
  const s = getStyles(colors);

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
      <View style={[s.container, { paddingTop: topInset }]}>
        <LinearGradient 
          colors={[CultureTokens.indigo + '26', 'transparent']} 
          style={StyleSheet.absoluteFillObject} 
          pointerEvents="none" 
        />
        <View style={[s.shell, isDesktop && s.desktopShell]}>
          <View style={s.header}>
            <Pressable 
              onPress={() => goBackOrReplace('/(tabs)')} 
              style={({ pressed }) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]} 
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={s.headerTitle}>My Saved</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={s.tabRow}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={({ pressed }) => [
                    s.tab, 
                    isActive ? { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight } : { backgroundColor: 'transparent', borderColor: colors.borderLight },
                    pressed && !isActive && { opacity: 0.8 }
                  ]}
                  onPress={() => {
                    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                  }}
                >
                  <Ionicons name={tab.icon} size={18} color={isActive ? colors.text : colors.textSecondary} />
                  <Text style={[s.tabText, isActive ? { color: colors.text } : { color: colors.textSecondary }]}>{tab.label}</Text>
                  {tab.count > 0 && (
                    <View style={[
                      s.countBadge, 
                      isActive ? { backgroundColor: CultureTokens.indigo } : { backgroundColor: colors.backgroundSecondary }
                    ]}>
                      <Text style={[s.countText, isActive ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>{tab.count}</Text>
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
                    <View style={s.emptyIconWrap}>
                      <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
                    </View>
                    <Text style={s.emptyTitle}>No saved events</Text>
                    <Text style={s.emptyDesc}>Tap the bookmark icon on any event to save it here for later.</Text>
                    <Pressable 
                      style={({ pressed }) => [s.emptyBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => router.push('/(tabs)')}
                    >
                      <Text style={s.emptyBtnText}>Browse Events</Text>
                    </Pressable>
                  </View>
                ) : (
                  savedEventItems.map((event: EventData) => (
                    <View key={event.id}>
                      <Pressable
                        style={({ pressed }) => [s.eventCard, pressed && { transform: [{ scale: 0.98 }] }]}
                        onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                      >
                        <Image source={{ uri: event.imageUrl }} style={s.eventImage} />
                        <View style={s.eventInfo}>
                          <View style={s.eventCommunityRow}>
                            <Text style={s.eventCommunity}>{event.communityId}</Text>
                          </View>
                          <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
                          
                          <View style={s.metaGroup}>
                            <View style={s.eventMeta}>
                              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                              <Text style={s.eventMetaText}>{formatDate(event.date)}</Text>
                            </View>
                            <View style={s.eventMeta}>
                              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                              <Text style={s.eventMetaText} numberOfLines={1}>{event.venue}</Text>
                            </View>
                          </View>

                          <View style={s.eventBottom}>
                            <Text style={s.eventPrice}>{event.priceLabel}</Text>
                            <Pressable
                              hitSlop={12}
                              style={({pressed}) => [s.bookmarkBtn, pressed && { opacity: 0.8 }]}
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
                    <View style={s.emptyIconWrap}>
                      <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                    </View>
                    <Text style={s.emptyTitle}>No communities joined</Text>
                    <Text style={s.emptyDesc}>Join cultural communities to see them pinned here.</Text>
                    <Pressable 
                      style={({ pressed }) => [s.emptyBtn, { backgroundColor: CultureTokens.indigo, transform: [{ scale: pressed ? 0.98 : 1 }] }]} 
                      onPress={() => router.push('/(tabs)/communities')}
                    >
                      <Text style={s.emptyBtnText}>Browse Communities</Text>
                    </Pressable>
                  </View>
                ) : (
                  joinedCommunityItems.map((community: Community) => (
                    <View key={community.id}>
                      <Pressable
                        style={({ pressed }) => [s.communityCard, pressed && { transform: [{ scale: 0.98 }] }]}
                        onPress={() => {
                          if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({ pathname: '/community/[id]', params: { id: community.id } });
                        }}
                      >
                        <View style={s.communityAvatar}>
                          <Ionicons name="people" size={28} color={CultureTokens.indigo} />
                        </View>
                        
                        <View style={s.communityInfo}>
                          <Text style={s.communityName} numberOfLines={1}>{community.name}</Text>
                          <View style={s.communityTypeBadge}>
                            <Text style={s.communityType}>{community.category}</Text>
                          </View>
                          
                          <View style={s.communityStats}>
                            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                            <Text style={s.communityStatText}>{community.memberCount ?? 0} members</Text>
                            {(community as unknown as Record<string, unknown>).events !== undefined && Number((community as unknown as Record<string, unknown>).events) > 0 && (
                              <>
                                <View style={s.statDot} />
                                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                <Text style={s.communityStatText}>{String((community as unknown as Record<string, unknown>).events)} events</Text>
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
                          style={({pressed}) => [s.leaveBtn, pressed && { opacity: 0.7 }]}
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

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  desktopShell: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: colors.text },
  
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 4, marginBottom: 8, zIndex: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  tabText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },
  
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: colors.backgroundSecondary },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  emptyDesc: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, maxWidth: 280, color: colors.textSecondary },
  emptyBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  
  eventCard: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  eventImage: { width: 120, minHeight: 140 },
  eventInfo: { flex: 1, padding: 16, gap: 6, justifyContent: 'center' },
  eventCommunityRow: { flexDirection: 'row' },
  eventCommunity: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5, color: CultureTokens.saffron, backgroundColor: CultureTokens.saffron + '15' },
  eventTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 24, color: colors.text },
  
  metaGroup: { gap: 6, marginVertical: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMetaText: { fontSize: 13, fontFamily: 'Poppins_400Regular', flexShrink: 1, color: colors.textSecondary },
  
  eventBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  eventPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: CultureTokens.teal },
  bookmarkBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo + '20' },
  
  communityCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, gap: 14, backgroundColor: colors.surface, borderColor: colors.borderLight },
  communityAvatar: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: CultureTokens.indigo + '15' },
  communityInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  communityName: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text },
  
  communityTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.backgroundSecondary },
  communityType: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary },
  
  communityStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  communityStatText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  statDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 2, backgroundColor: colors.textSecondary },
  
  leaveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.borderLight },
});

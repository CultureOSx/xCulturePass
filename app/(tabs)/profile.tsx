import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Share,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSaved } from '@/contexts/SavedContext';
import { useContacts } from '@/contexts/ContactsContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, getQueryFn } from '@/lib/query-client';
import { api, type RewardsSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { useColors } from '@/hooks/useColors';
import type { User, Wallet, Membership, EventData } from '@shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GuestProfileView } from '@/components/profile/GuestProfileView';
import { MenuItem } from '@/components/profile/MenuItem';
import { LayoutRules, Spacing } from '@/constants/theme';

interface CommunityListItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  members?: number;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ProfileScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const colors   = useColors();
  const { state, resetOnboarding } = useOnboarding();
  const { savedEvents, joinedCommunities } = useSaved();
  const { contacts } = useContacts();
  const [refreshing, setRefreshing] = useState(false);
  const { userId, logout } = useAuth();
  const { isOrganizer, isAdmin, hasMinRole } = useRole();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['api/auth/me'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/wallet', userId] }),
        queryClient.invalidateQueries({ queryKey: [`/api/membership/${userId}`] }),
        queryClient.invalidateQueries({ queryKey: ['rewards', userId] }),
        queryClient.invalidateQueries({ queryKey: [`/api/tickets/${userId}/count`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/notifications/${userId}/unread-count`] }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list', 'profile-tab'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/communities'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['api/auth/me'],
    queryFn: () => api.auth.me() as Promise<User>,
    enabled: !!userId,
  });

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ['/api/wallet', userId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const { data: membership } = useQuery<Membership>({
    queryKey: [`/api/membership/${userId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const { data: rewards } = useQuery<RewardsSummary>({
    queryKey: ['rewards', userId],
    queryFn: () => api.rewards.get(userId!),
    enabled: !!userId,
  });

  const { data: ticketCount } = useQuery<{ count: number }>({
    queryKey: [`/api/tickets/${userId}/count`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const { data: unreadNotifs } = useQuery<{ count: number }>({
    queryKey: [`/api/notifications/${userId}/unread-count`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const { data: allEventsData = [] } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'profile-tab'],
    queryFn: async () => {
      const data = await api.events.list({ pageSize: 100 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  const { data: allCommunitiesData = [] } = useQuery<CommunityListItem[]>({
    queryKey: ['/api/communities'],
    queryFn: () => api.communities.list(),
  });

  const savedEventsList    = useMemo(() => allEventsData.filter(e => savedEvents.includes(e.id)),        [savedEvents, allEventsData]);
  const joinedCommList     = useMemo(() => allCommunitiesData.filter(c => joinedCommunities.includes(c.id)), [joinedCommunities, allCommunitiesData]);

  const tier  = membership?.tier ?? 'free';
  const TIER  = {
    free:    { bg: colors.textTertiary + '18', text: colors.textSecondary, icon: 'shield-outline' },
    plus:    { bg: colors.info + '18',         text: colors.info,         icon: 'star'            },
    premium: { bg: colors.warning + '18',      text: colors.warning,      icon: 'diamond'         },
  } as Record<string, { bg: string; text: string; icon: string }>;
  const tierStyle = TIER[tier] ?? TIER.free;

  const displayName = user?.displayName ?? 'CulturePass User';

  const profileCompleteness = useMemo(() => {
    let pct = 0;
    if (user?.displayName) pct += 20;
    if (user?.bio)         pct += 20;
    if (user?.avatarUrl)   pct += 10;
    if (user?.city || user?.location) pct += 20;
    if (user?.username)    pct += 15;
    if (user?.socialLinks && Object.keys(user.socialLinks).length > 0) pct += 15;
    return pct;
  }, [user?.displayName, user?.bio, user?.avatarUrl, user?.city, user?.location, user?.username, user?.socialLinks]);

  const nextTier = useMemo(() => {
    if (tier === 'free') return { name: 'Plus',    color: colors.info };
    if (tier === 'plus') return { name: 'Premium', color: colors.warning };
    return null;
  }, [tier, colors.info, colors.warning]);

  const displayLocation = useMemo(() => {
    if (user?.city && user?.country) return `${user.city}, ${user.country}`;
    if (state.city && state.country) return `${state.city}, ${state.country}`;
    return state.city ?? '';
  }, [user?.city, user?.country, state.city, state.country]);

  const walletBalance = Number(wallet?.balance ?? 0);
  const tickets       = ticketCount?.count ?? 0;
  const unreadCount   = unreadNotifs?.count ?? 0;

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${displayName} on CulturePass`,
        message: `Check out my CulturePass profile! ${displayName} from ${displayLocation}.`,
      });
    } catch { /* dismissed */ }
  }, [displayName, displayLocation]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout('/(tabs)');
          } catch (error) {
            console.warn('[profile] sign out failed:', error);
            Alert.alert('Sign out failed', 'Please try again.');
          }
        },
      },
    ]);
  }, [logout]);

  const handleReset = useCallback(() => {
    Alert.alert('Reset App', 'This will clear all your data and return you to the onboarding screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => { await resetOnboarding(); router.replace('/(onboarding)'); },
      },
    ]);
  }, [resetOnboarding]);

  if (!userId) return <GuestProfileView topInset={topInset} />;

  if (userLoading) {
    return (
      <ErrorBoundary>
        <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}> 
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading Profile tab...</Text>
        </View>
      </ErrorBoundary>
    );
  }

  const completenessColor = profileCompleteness >= 80 ? colors.success : profileCompleteness >= 50 ? colors.accent : colors.primary;
  const initials = (displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {/* ── Profile hero ── */}
          <View style={[s.profileHeader, isDesktopWeb && s.webSection]}>
            {/* Top bar */}
            <View style={s.headerTopBar}>
              <Pressable style={[s.headerBtn, { backgroundColor: colors.surface }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </Pressable>
              <Text style={[s.headerTitle, { color: colors.text }]}>Profile</Text>
              <Pressable
                style={[s.headerBtn, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                {unreadCount > 0 && <View style={[s.notifDot, { backgroundColor: colors.error }]} />}
              </Pressable>
            </View>

            {/* Avatar */}
            <View style={s.avatarContainer}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={s.avatarImage} contentFit="cover" />
              ) : (
                <LinearGradient colors={['#0081C8', '#5B2EE5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarFallback}>
                  <Text style={[s.avatarInitials, { color: colors.textInverse }]}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={[s.tierIcon, { backgroundColor: tierStyle.bg, borderColor: colors.background }]}>
                <Ionicons name={tierStyle.icon as never} size={12} color={tierStyle.text} />
              </View>
            </View>

            {/* Name, username, chips */}
            <View style={s.heroBody}>
              <View style={s.nameRow}>
                <Text style={[s.name, { color: colors.text }]}>{displayName}</Text>
                {user?.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </View>
              {user?.username ? <Text style={[s.username, { color: colors.textSecondary }]}>@{user.username}</Text> : null}

              <View style={s.idLocationRow}>
                {user?.culturePassId ? (
                  <View style={[s.chip, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name="finger-print" size={12} color={colors.primary} />
                    <Text style={[s.chipText, { color: colors.primary }]}>{user.culturePassId}</Text>
                  </View>
                ) : null}
                {displayLocation ? (
                  <View style={[s.chip, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="location" size={12} color={colors.text} />
                    <Text style={[s.chipText, { color: colors.text }]}>{displayLocation}</Text>
                  </View>
                ) : null}
                <View style={[s.chip, { backgroundColor: tierStyle.bg }]}>
                  <Ionicons name={tierStyle.icon as never} size={11} color={tierStyle.text} />
                  <Text style={[s.chipText, { color: tierStyle.text }]}>{capitalize(tier)}</Text>
                </View>
              </View>

              {user?.bio ? (
                <Text style={[s.bio, { color: colors.textSecondary }]} numberOfLines={2}>{user.bio}</Text>
              ) : null}

              {/* Profile completeness bar */}
              <View style={[s.completenessBox, { backgroundColor: colors.surface }]}>
                <View style={s.completenessHeader}>
                  <Text style={[s.completenessLabel, { color: colors.text }]}>Profile completeness</Text>
                  <Text style={[s.completenessPercent, { color: completenessColor }]}>{profileCompleteness}%</Text>
                </View>
                <View style={[s.completenessTrack, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[s.completenessBar, { width: `${profileCompleteness}%` as never, backgroundColor: completenessColor }]} />
                </View>
              </View>

              {/* Edit button */}
              <Pressable
                style={[s.editBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/profile/edit')}
              >
                <Ionicons name="create-outline" size={16} color={colors.textInverse} />
                <Text style={[s.editBtnText, { color: colors.textInverse }]}>Edit Profile</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Upgrade CTA ── */}
          {nextTier && (
            <Pressable
              style={[s.upgradeCta, isDesktopWeb && s.webSection, { backgroundColor: nextTier.color + '0A', borderColor: nextTier.color + '25' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/membership/upgrade'); }}
            >
              <View style={[s.upgradeIconWrap, { backgroundColor: nextTier.color + '15' }]}>
                <Ionicons name="arrow-up-circle" size={20} color={nextTier.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.upgradeCtaTitle, { color: nextTier.color }]}>Upgrade to {nextTier.name}</Text>
                <Text style={[s.upgradeCtaSub, { color: colors.text }]}>Unlock more perks and benefits</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={nextTier.color} />
            </Pressable>
          )}

          {/* ── Quick actions ── */}
          <View style={[s.quickRow, isDesktopWeb && s.webSection]}>
            {[
              { icon: 'qr-code-outline',     label: 'My QR',   color: colors.secondary, onPress: () => router.push('/profile/qr')         },
              { icon: 'scan-outline',         label: 'Scan',    color: colors.primary,   onPress: () => router.push('/scanner')             },
              { icon: 'people-outline',       label: 'Friends', color: colors.accent,    onPress: () => router.push('/contacts' as never)   },
              { icon: 'share-social-outline', label: 'Share',   color: colors.textSecondary, onPress: handleShare                          },
            ].map(item => (
              <Pressable
                key={item.label}
                style={[s.quickChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
              >
                <View style={[s.quickIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as never} size={18} color={item.color} />
                </View>
                <Text style={[s.quickLabel, { color: colors.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Stats row ── */}
          <View style={[s.statsRow, isDesktopWeb && s.webSection, { backgroundColor: colors.surface }]}> 
            {[
              { num: joinedCommunities.length, label: 'Communities', onPress: () => router.push('/(tabs)/communities') },
              { num: contacts.length,          label: 'Contacts',    onPress: () => router.push('/contacts' as never)  },
              { num: tickets,                  label: 'Tickets',     onPress: () => router.push('/tickets')            },
              { num: savedEvents.length,       label: 'Saved',       onPress: () => router.push('/saved')              },
            ].map((item, i, arr) => (
              <View key={item.label} style={{ flex: 1, flexDirection: 'row' }}>
                <Pressable style={s.statCell} onPress={item.onPress}>
                  <Text style={[s.statNum, { color: colors.text }]}>{item.num}</Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </Pressable>
                {i < arr.length - 1 && <View style={[s.statDivider, { backgroundColor: colors.divider }]} />}
              </View>
            ))}
          </View>

          {/* ── Recent activity ── */}
          <View style={[s.section]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <View style={s.activityRow}>
                <View style={[s.activityDot, { backgroundColor: colors.primaryGlow }]}>
                  <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                </View>
                <Text style={[s.activityText, { color: colors.text }]}>{savedEvents.length} events saved</Text>
              </View>
              <View style={[s.activityDivider, { backgroundColor: colors.divider }]} />
              <View style={s.activityRow}>
                <View style={[s.activityDot, { backgroundColor: colors.secondary + '15' }]}>
                  <Ionicons name="people-outline" size={15} color={colors.secondary} />
                </View>
                <Text style={[s.activityText, { color: colors.text }]}>{joinedCommunities.length} communities active</Text>
              </View>
            </View>
          </View>

          {/* ── My Communities ── */}
          {joinedCommList.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>My Communities</Text>
              <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
                {joinedCommList.slice(0, 3).map((c, idx) => (
                  <View key={c.id}>
                    <Pressable
                      style={s.miniCard}
                      onPress={() => router.push({ pathname: '/community/[id]', params: { id: c.id } })}
                    >
                      <View style={[s.miniIcon, { backgroundColor: (c.color ?? colors.primary) + '15' }]}>
                        <Ionicons name={(c.icon as never) ?? 'people'} size={18} color={c.color ?? colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.miniTitle, { color: colors.text }]}>{c.name}</Text>
                        <Text style={[s.miniSub, { color: colors.text }]}>{(c.members ?? 0).toLocaleString()} members</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </Pressable>
                    {idx < Math.min(joinedCommList.length, 3) - 1 && (
                      <View style={[s.divider, { backgroundColor: colors.divider }]} />
                    )}
                  </View>
                ))}
              </View>
              {joinedCommList.length > 3 && (
                <Pressable style={s.seeAllBtn} onPress={() => router.push('/(tabs)/communities')}>
                  <Text style={[s.seeAllText, { color: colors.primary }]}>See All ({joinedCommList.length})</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Saved Events ── */}
          {savedEventsList.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Saved Events</Text>
              <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
                {savedEventsList.slice(0, 3).map((e, idx) => (
                  <View key={e.id}>
                    <Pressable
                      style={s.miniCard}
                      onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
                    >
                      <View style={[s.miniIcon, { backgroundColor: colors.primaryGlow }]}>
                        <Ionicons name="calendar" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.miniTitle, { color: colors.text }]} numberOfLines={1}>{e.title}</Text>
                        <Text style={[s.miniSub, { color: colors.text }]}>{formatDate(e.date)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </Pressable>
                    {idx < Math.min(savedEventsList.length, 3) - 1 && (
                      <View style={[s.divider, { backgroundColor: colors.divider }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Location & Preferences ── */}
          <View style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Location & Preferences</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="location-outline"  label="Location"       value={displayLocation}                        color={colors.primary}   onPress={() => router.push('/profile/edit')}         colors={colors} />
              <MenuItem icon="people-outline"    label="My Communities" value={`${state.communities.length} selected`} color={colors.secondary} onPress={() => router.push('/(tabs)/communities')}   colors={colors} />
              <MenuItem icon="heart-outline"     label="Interests"      value={`${state.interests.length} selected`}   color={colors.accent}    onPress={() => Alert.alert('Interests', state.interests.join(', ') || 'None selected')} showDivider={false} colors={colors} />
            </View>
          </View>

          {/* ── Tickets & Wallet ── */}
          <View style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Tickets & Wallet</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="ticket-outline"   label="My Tickets"       color="#FF3B30"        badge={tickets}                                                              onPress={() => router.push('/tickets')}          colors={colors} />
              <MenuItem icon="wallet-outline"   label="Ticket Wallet"    color="#34C759"        value={`$${walletBalance.toFixed(2)}`}                                       onPress={() => router.push('/payment/wallet')}   colors={colors} />
              <MenuItem icon="trophy-outline"   label="Rewards Status"   color={colors.warning} value={`${rewards?.tierLabel ?? 'Silver'} · ${rewards?.points ?? wallet?.points ?? 0} pts`} onPress={() => router.push('/payment/wallet')} colors={colors} />
              <MenuItem icon="bookmark-outline" label="Saved Items"      color="#FF9500"        badge={savedEvents.length + joinedCommunities.length}                       onPress={() => router.push('/saved')}            colors={colors} />
              <MenuItem icon="people-outline"   label="My Contacts"      color={colors.secondary} badge={contacts.length}                                                  onPress={() => router.push('/contacts' as never)} colors={colors} />
              <MenuItem icon="scan-outline"     label="Scanner"          color={colors.primary}                                                                             onPress={() => router.push('/scanner')}          colors={colors} />
              {isOrganizer && (
                <MenuItem icon="grid-outline"   label="Organizer Dashboard" color={colors.secondary}  onPress={() => router.push('/dashboard/organizer' as never)} colors={colors} />
              )}
              {isAdmin && (
                <MenuItem icon="people-circle-outline" label="Admin Panel" color="#FF3B30" onPress={() => router.push('/admin/users' as never)} colors={colors} />
              )}
              {hasMinRole('cityAdmin') && (
                <MenuItem icon="megaphone-outline" label="Campaign Targeting" color={colors.info} onPress={() => router.push('/admin/notifications' as never)} colors={colors} />
              )}
              {hasMinRole('cityAdmin') && (
                <MenuItem icon="document-text-outline" label="Campaign Audit Logs" color={colors.warning} onPress={() => router.push('/admin/audit-logs' as never)} colors={colors} />
              )}
              <MenuItem icon="gift-outline"     label="Perks & Benefits" color={colors.accent}  showDivider={false}                                                         onPress={() => router.push('/perks')}            colors={colors} />
            </View>
          </View>

          {/* ── Payment & Billing ── */}
          <View style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Payment & Billing</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="card-outline"    label="Payment Methods"     color="#007AFF" onPress={() => router.push('/payment/methods')}      colors={colors} />
              <MenuItem icon="receipt-outline" label="Transaction History" color="#5856D6" onPress={() => router.push('/payment/transactions')} showDivider={false} colors={colors} />
            </View>
          </View>

          {/* ── Notifications ── */}
          <View style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Notifications</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="notifications-outline" label="View Notifications"      color="#FF9500" badge={unreadCount} onPress={() => router.push('/notifications')}           colors={colors} />
              <MenuItem icon="options-outline"       label="Notification Preferences" color="#FF3B30"                    onPress={() => router.push('/settings/notifications')} showDivider={false} colors={colors} />
            </View>
          </View>

          {/* ── Settings ── */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Settings</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="shield-checkmark-outline" label="Privacy"         color="#5856D6"        onPress={() => router.push('/settings/privacy')} colors={colors} />
              <MenuItem icon="add-circle-outline"       label="Submit a Listing" color={colors.secondary} onPress={() => router.push('/submit')}       showDivider={false} colors={colors} />
            </View>
          </View>

          {/* ── Help & Support ── */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Help & Support</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface }]}>
              <MenuItem icon="help-buoy-outline"           label="Help Centre"          color="#34C759" onPress={() => router.push('/settings/help')}       colors={colors} />
              <MenuItem icon="document-text-outline"       label="Terms & Privacy"      color="#8E8E93" onPress={() => router.push('/legal/terms')}          colors={colors} />
              <MenuItem icon="shield-outline"              label="Community Guidelines" color="#5E5CE6" onPress={() => router.push('/legal/guidelines')}     colors={colors} />
              <MenuItem icon="information-circle-outline"  label="About CulturePass"    color={colors.primary} onPress={() => router.push('/settings/about')} showDivider={false} colors={colors} />
            </View>
          </View>

          {/* ── Bottom actions ── */}
          <View style={[s.bottomActions, isDesktopWeb && s.webSection]}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: colors.surface }]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={[s.actionBtnText, { color: colors.error }]}>Sign Out</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: colors.surface }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleReset(); }}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.error} />
              <Text style={[s.actionBtnText, { color: colors.error }]}>Reset App Data</Text>
            </Pressable>
          </View>

          <Text style={[s.version, isDesktopWeb && s.webSection, { color: colors.textTertiary }]}>CulturePass v1.0.0</Text>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, fontFamily: 'Poppins_500Medium' },

  profileHeader:  { paddingBottom: LayoutRules.betweenCards },
  headerTopBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: LayoutRules.screenHorizontalPadding, paddingVertical: LayoutRules.iconTextGap },
  headerBtn:      { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 22, fontFamily: 'Poppins_700Bold', letterSpacing: -0.4 },
  notifDot:       { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 4.5 },

  avatarContainer:{ alignSelf: 'center', marginTop: Spacing.sm, marginBottom: LayoutRules.betweenCards },
  avatarImage:    { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
  tierIcon:       { position: 'absolute', bottom: 2, right: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },

  heroBody:       { alignItems: 'center', paddingHorizontal: LayoutRules.cardPaddingMax, paddingBottom: Spacing.sm },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap },
  name:           { fontSize: 24, fontFamily: 'Poppins_700Bold', letterSpacing: 0.2 },
  username:       { fontSize: 14, fontFamily: 'Poppins_400Regular', marginTop: Spacing.xs },
  idLocationRow:  { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap, marginTop: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: 10, paddingVertical: 5, borderRadius: LayoutRules.borderRadius },
  chipText:       { fontSize: 11, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.3 },
  bio:            { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: LayoutRules.screenHorizontalPadding, marginTop: Spacing.sm, lineHeight: 20 },

  completenessBox:    { width: '100%', marginTop: LayoutRules.betweenCards, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMin },
  completenessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: LayoutRules.iconTextGap },
  completenessLabel:  { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  completenessPercent:{ fontSize: 13, fontFamily: 'Poppins_700Bold' },
  completenessTrack:  { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  completenessBar:    { height: '100%', borderRadius: 3 },

  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: LayoutRules.iconTextGap, borderRadius: LayoutRules.borderRadius, height: LayoutRules.buttonHeight, paddingHorizontal: 28, marginTop: 18, width: '100%' },
  editBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },

  upgradeCta:     { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap, marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.betweenCards, paddingHorizontal: LayoutRules.cardPaddingMin, paddingVertical: 14, borderRadius: LayoutRules.borderRadius, borderWidth: 1 },
  upgradeIconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  upgradeCtaTitle:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  upgradeCtaSub:  { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 1 },

  quickRow:  { flexDirection: 'row', gap: LayoutRules.betweenCards, marginBottom: LayoutRules.sectionSpacing, paddingHorizontal: LayoutRules.screenHorizontalPadding },
  quickChip: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: LayoutRules.iconTextGap, paddingVertical: 14, borderRadius: LayoutRules.borderRadius, borderWidth: StyleSheet.hairlineWidth },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel:{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },

  statsRow:  { flexDirection: 'row', marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing, borderRadius: LayoutRules.borderRadius, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statCell:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider:{ width: StyleSheet.hairlineWidth, marginVertical: 4 },
  statNum:   { fontSize: 22, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 2 },

  section:      { paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', letterSpacing: -0.2, marginBottom: 12, paddingLeft: 2 },

  activityRow:    { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap, padding: LayoutRules.cardPaddingMin },
  activityDot:    { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityText:   { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  activityDivider:{ height: StyleSheet.hairlineWidth, marginLeft: 58 },

  menuCard: { borderRadius: LayoutRules.borderRadius, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  divider:  { height: StyleSheet.hairlineWidth, marginLeft: 66 },

  miniCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: LayoutRules.cardPaddingMin, gap: LayoutRules.iconTextGap },
  miniIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniTitle:{ fontSize: 15, fontFamily: 'Poppins_500Medium' },
  miniSub:  { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  seeAllBtn:{ alignItems: 'center', paddingVertical: 12 },
  seeAllText:{ fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  bottomActions:{ paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing, gap: LayoutRules.betweenCards },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: LayoutRules.iconTextGap, borderRadius: LayoutRules.borderRadius, height: LayoutRules.buttonHeight, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionBtnText:{ fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  version:      { fontSize: 12, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: LayoutRules.sectionSpacing },
  webSection:   { maxWidth: 1024, width: '100%', alignSelf: 'center' },
});


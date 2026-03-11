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
import { useSaved } from '@/contexts/SavedContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, getQueryFn } from '@/lib/query-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { useColors } from '@/hooks/useColors';
import type { User, Membership } from '@shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GuestProfileView } from '@/components/profile/GuestProfileView';
import { MenuItem } from '@/components/profile/MenuItem';
import { gradients, CultureTokens, AvatarTokens } from '@/constants/theme';
import { BlurView } from 'expo-blur';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const colors = useColors();
  
  const { joinedCommunities } = useSaved();
  const [refreshing, setRefreshing] = useState(false);
  const { userId, logout } = useAuth();
  const { role, isAdmin } = useRole();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['api/auth/me'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/users/me', 'profile-tab', userId] }),
        queryClient.invalidateQueries({ queryKey: ['/api/wallet', userId] }),
        queryClient.invalidateQueries({ queryKey: [`/api/membership/${userId}`] }),
        queryClient.invalidateQueries({ queryKey: ['rewards', userId] }),
        queryClient.invalidateQueries({ queryKey: [`/api/tickets/${userId}/count`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/notifications/${userId}/unread-count`] }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list', 'profile-tab'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/communities'] }),
      ]);
    } finally {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRefreshing(false);
    }
  }, [userId]);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/users/me', 'profile-tab', userId],
    queryFn: () => api.users.me(),
    enabled: !!userId,
  });

  const { data: membership } = useQuery<Membership>({
    queryKey: [`/api/membership/${userId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  const { data: unreadNotifs } = useQuery<{ count: number }>({
    queryKey: [`/api/notifications/${userId}/unread-count`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });


  const tier = membership?.tier ?? 'free';
  const TIER = {
    free:    { bg: colors.surface,         text: colors.textSecondary,  icon: 'shield-outline' },
    plus:    { bg: CultureTokens.info,     text: '#FFFFFF',             icon: 'star'            },
    premium: { bg: CultureTokens.gold,     text: '#000000',             icon: 'diamond'         },
  } as Record<string, { bg: string; text: string; icon: string }>;
  const tierStyle = TIER[tier] ?? TIER.free;

  const displayName = user?.displayName ?? 'Explorer';

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
    if (tier === 'free') return { name: 'Plus',    color: CultureTokens.indigo };
    if (tier === 'plus') return { name: 'Premium', color: CultureTokens.gold };
    return null;
  }, [tier]);


  const unreadCount   = unreadNotifs?.count ?? 0;

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${displayName} on CulturePass`,
        message: `Check out my CulturePass ID. Join me on the platform!`,
      });
    } catch { /* dismissed */ }
  }, [displayName]);

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
        onPress: () => { router.replace('/(onboarding)'); },
      },
    ]);
  }, []);

  if (!userId) return <GuestProfileView topInset={topInset} />;

  if (userLoading) {
    return (
      <ErrorBoundary>
        <View style={[{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}> 
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
        </View>
      </ErrorBoundary>
    );
  }

  const completenessColor = profileCompleteness >= 80 ? CultureTokens.success : profileCompleteness >= 50 ? CultureTokens.saffron : CultureTokens.indigo;
  const initials = (displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ErrorBoundary>
      <View style={[{ flex: 1, backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CultureTokens.indigo} />
          }
        >
          {/* Profile Hero Matrix */}
          <View style={[styles.heroCard, isDesktopWeb && styles.webDesktopMaxWidth]}>
            <LinearGradient
              colors={gradients.culturepassBrand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.95 }}
              style={StyleSheet.absoluteFillObject}
            />
            
            {!isDesktopWeb && (
              <View style={[styles.headerTopBar, { paddingTop: topInset + 16 }]}>
                <Pressable style={styles.iconBtn} onPress={handleShare}>
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                </Pressable>
                
                <Text style={styles.headerTitle}>My Identity</Text>
                
                <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                  <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                  {unreadCount > 0 && <View style={[styles.notifDot, { backgroundColor: CultureTokens.error }]} />}
                </Pressable>
              </View>
            )}

            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={{ width: AvatarTokens.size.xl, height: AvatarTokens.size.xl, borderRadius: AvatarTokens.radius }} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                
                <Pressable
                  style={[styles.editBadge, { backgroundColor: colors.surface }]}
                  onPress={() => router.push('/profile/edit')}
                >
                  <Ionicons name="camera" size={14} color={colors.text} />
                </Pressable>
              </View>

              <Text style={styles.name}>{displayName}</Text>
              {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}

              <View style={styles.badgesRow}>
                {user?.culturePassId && (
                  <View style={styles.tagPill}>
                    <Ionicons name="finger-print" size={12} color="#FFFFFF" />
                    <Text style={styles.tagText}>{user.culturePassId}</Text>
                  </View>
                )}
                <View style={[styles.tagPill, { backgroundColor: tierStyle.bg }]}>
                  <Ionicons name={tierStyle.icon as any} size={11} color={tierStyle.text} />
                  <Text style={[styles.tagText, { color: tierStyle.text }]}>{capitalize(tier)}</Text>
                </View>
              </View>

              {user?.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}

              <View style={[styles.completenessBox, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <View style={styles.completenessHeader}>
                  <Text style={styles.completenessLabel}>Profile Completeness</Text>
                  <Text style={[styles.completenessPercent, { color: completenessColor }]}>{profileCompleteness}%</Text>
                </View>
                <View style={styles.completenessTrack}>
                  <View style={[styles.completenessBar, { width: `${profileCompleteness}%`, backgroundColor: completenessColor }]} />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.contentMatrix, isDesktopWeb && styles.webDesktopMaxWidth]}>
            {/* Upgrade CTA */}
            {nextTier && (
              <Pressable
                style={[styles.calloutCard, { backgroundColor: nextTier.color + '1A', borderColor: nextTier.color + '33' }]}
                onPress={() => { if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/membership/upgrade'); }}
              >
                <View style={[styles.calloutIconWrap, { backgroundColor: nextTier.color }]}>
                  <Ionicons name="star" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.calloutBody}>
                  <Text style={[styles.calloutTitle, { color: nextTier.color }]}>Upgrade to {nextTier.name}</Text>
                  <Text style={styles.calloutSub}>Discover exclusive premium perks</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={nextTier.color} />
              </Pressable>
            )}

            {/* Quick Actions Grid */}
            <View style={styles.quickGrid}>
              {[
                { icon: 'qr-code-outline', label: 'My QR', color: CultureTokens.indigo, action: () => router.push('/profile/qr') },
                { icon: 'wallet-outline', label: 'Wallet', color: CultureTokens.success, action: () => router.push('/payment/wallet') },
                { icon: 'ticket-outline', label: 'Tickets', color: CultureTokens.saffron, action: () => router.push('/tickets') },
                { icon: 'bookmark-outline', label: 'Saved', color: CultureTokens.coral, action: () => router.push('/saved') },
              ].map((item, idx) => (
                <Pressable 
                  key={idx} 
                  style={[styles.quickBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.action(); }}
                >
                  <View style={[styles.quickIconCircle, { backgroundColor: item.color + '1A' }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.quickBoxLabel, { color: colors.text }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Application Sections */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>General</Text>
              <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                <MenuItem icon="person-outline" label="Edit Profile" color={colors.textSecondary} onPress={() => router.push('/profile/edit')} colors={colors} />
                <MenuItem icon="people-outline" label="My Communities" value={`${joinedCommunities.length} Active`} color={colors.textSecondary} onPress={() => router.push('/(tabs)/communities')} colors={colors} />
                <MenuItem icon="star-outline" label="My Perks" color={colors.textSecondary} showDivider={false} onPress={() => router.push('/perks')} colors={colors} />
              </View>
            </View>

            {isAdmin && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Administration</Text>
                <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                  <MenuItem icon="shield-checkmark-outline" label="Role" value={role === 'platformAdmin' ? 'Platform Admin' : 'Admin'} color={CultureTokens.info} onPress={() => {}} colors={colors} />
                  <MenuItem icon="people-circle-outline" label="Users Database" color={CultureTokens.error} onPress={() => router.push('/admin/users' as never)} colors={colors} />
                  <MenuItem icon="business-outline" label="Council Management" color={CultureTokens.indigo} showDivider={false} onPress={() => router.push('/admin/council-management' as never)} colors={colors} />
                </View>
              </View>
            )}

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Settings</Text>
              <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                <MenuItem icon="card-outline" label="Payment Methods" color={colors.textSecondary} onPress={() => router.push('/payment/methods')} colors={colors} />
                <MenuItem icon="receipt-outline" label="Payment History" color={colors.textSecondary} onPress={() => router.push('/payment/transactions')} colors={colors} />
                <MenuItem icon="help-buoy-outline" label="Help & Support" color={colors.textSecondary} onPress={() => router.push('/settings/help')} colors={colors} />
                <MenuItem icon="document-text-outline" label="Legal Center" color={colors.textSecondary} showDivider={false} onPress={() => router.push('/legal/terms')} colors={colors} />
              </View>
            </View>

            {/* Footer Buttons */}
            <View style={styles.footerRow}>
              <Pressable style={[styles.dangerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={CultureTokens.error} />
                <Text style={[styles.dangerBtnText, { color: CultureTokens.error }]}>Sign Out</Text>
              </Pressable>
              
              <Pressable style={[styles.dangerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleReset}>
                <Ionicons name="trash-outline" size={18} color={CultureTokens.error} />
                <Text style={[styles.dangerBtnText, { color: CultureTokens.error }]}>Reset Data</Text>
              </Pressable>
            </View>
            
            <Text style={[styles.versionLabel, { color: colors.textTertiary }]}>CulturePass v1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webDesktopMaxWidth: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    paddingBottom: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarFallback: {
    width: AvatarTokens.size.xl,
    height: AvatarTokens.size.xl,
    borderRadius: AvatarTokens.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  name: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  completenessBox: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completenessLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  completenessPercent: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  completenessTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  completenessBar: {
    height: '100%',
    borderRadius: 3,
  },
  contentMatrix: {
    paddingTop: 24,
    paddingHorizontal: 20,
    gap: 24,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  calloutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBody: {
    flex: 1,
    paddingHorizontal: 12,
  },
  calloutTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  calloutSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#8D8D8D',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickBoxLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    paddingLeft: 4,
  },
  menuContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  versionLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
  },
});

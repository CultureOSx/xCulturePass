import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------
interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  /** Exact match or prefix match for highlighting */
  matchPrefix?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { label: 'Discover',   icon: 'compass-outline',       iconActive: 'compass',        route: '/(tabs)' },
  { label: 'Calendar',   icon: 'calendar-outline',      iconActive: 'calendar',       route: '/(tabs)/calendar' },
  { label: 'Community',  icon: 'people-circle-outline', iconActive: 'people-circle',  route: '/(tabs)/communities' },
  { label: 'Perks',      icon: 'gift-outline',          iconActive: 'gift',           route: '/(tabs)/perks' },
  { label: 'Profile',    icon: 'person-circle-outline', iconActive: 'person-circle',  route: '/(tabs)/profile' },
];

const EXPLORE_NAV: NavItem[] = [
  { label: 'All Events',  icon: 'calendar-number-outline', iconActive: 'calendar-number', route: '/allevents', matchPrefix: true },
  { label: 'Map View',    icon: 'map-outline',              iconActive: 'map',             route: '/map' },
  { label: 'Directory',   icon: 'storefront-outline',       iconActive: 'storefront',      route: '/(tabs)/directory', matchPrefix: true },
  { label: 'Saved',       icon: 'bookmark-outline',         iconActive: 'bookmark',        route: '/saved' },
];

const ORGANIZER_NAV: NavItem[] = [
  { label: 'Dashboard',   icon: 'grid-outline',          iconActive: 'grid',           route: '/dashboard/organizer', matchPrefix: true },
  { label: 'Council Ops', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark', route: '/dashboard/council', matchPrefix: true },
  { label: 'Submit Event',icon: 'add-circle-outline',    iconActive: 'add-circle',     route: '/submit' },
  { label: 'Scanner',     icon: 'qr-code-outline',       iconActive: 'qr-code',        route: '/scanner' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Council Mgmt', icon: 'business-outline',       iconActive: 'business',       route: '/admin/council-management', matchPrefix: true },
  { label: 'Users',       icon: 'people-outline',         iconActive: 'people',         route: '/admin/users', matchPrefix: true },
  { label: 'Audit Logs',  icon: 'list-outline',           iconActive: 'list',           route: '/admin/audit-logs', matchPrefix: true },
  { label: 'Notify',      icon: 'megaphone-outline',      iconActive: 'megaphone',      route: '/admin/notifications', matchPrefix: true },
];

const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings',    icon: 'settings-outline',      iconActive: 'settings',       route: '/settings' },
  { label: 'Help',        icon: 'help-circle-outline',   iconActive: 'help-circle',    route: '/help' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WebSidebar() {
  const pathname = usePathname();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user, logout, isAuthenticated, userId } = useAuth();
  const { isOrganizer, isAdmin, role } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  const { data: notifCount = 0 } = useQuery<number>({
    queryKey: [`/api/notifications/${userId}/unread-count`],
    queryFn: async () => {
      if (!userId) return 0;
      const res = await api.raw<{ count: number }>('GET', `api/notifications/${userId}/unread-count`);
      return (res as { count?: number }).count ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const navWithBadge: NavItem[] = MAIN_NAV.map((item) => {
    if (item.label === 'Profile' && notifCount > 0) return { ...item, badge: notifCount };
    return item;
  });

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return pathname.startsWith(item.route.replace('/(tabs)', ''));
    if (item.route === '/(tabs)') return pathname === '/' || pathname === '/index' || pathname === '';
    const bare = item.route.replace('/(tabs)/', '/').replace('/(tabs)', '/');
    return pathname === bare || pathname.startsWith(bare + '/');
  };

  const navigate = (route: string) => {
    router.navigate(route as Parameters<typeof router.navigate>[0]);
  };

  const displayName = user?.displayName ?? user?.username ?? user?.id?.slice(0, 8) ?? 'You';
  const initials = displayName.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const roleLabel = (() => {
    switch (role) {
      case 'platformAdmin': return 'Platform Admin';
      case 'admin': return 'Admin';
      case 'organizer': return 'Organizer';
      case 'moderator': return 'Moderator';
      default: return null;
    }
  })();

  const bg = isDark ? '#060B14' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  if (collapsed) {
    return (
      <View style={[styles.sidebarCollapsed, { backgroundColor: bg, borderRightColor: border }]}>
        {/* Logo icon */}
        <View style={styles.collapsedLogo}>
          <View style={styles.logoIcon}>
            <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="globe-outline" size={16} color="#fff" />
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: border }]} />
        {/* Collapsed nav icons */}
        <View style={styles.navGroup}>
          {navWithBadge.map((item) => (
            <Pressable
              key={item.route}
              style={[styles.collapsedItem, isActive(item) && { backgroundColor: isDark ? 'rgba(44,42,114,0.2)' : 'rgba(44,42,114,0.08)' }]}
              onPress={() => navigate(item.route)}
              accessibilityLabel={item.label}
            >
              <Ionicons name={isActive(item) ? item.iconActive : item.icon} size={20} color={isActive(item) ? Colors.primary : (isDark ? 'rgba(232,244,255,0.56)' : 'rgba(0,22,40,0.56)')} />
              {(item.badge ?? 0) > 0 && <View style={styles.badgeDot}><Text style={styles.badgeDotText}>{item.badge}</Text></View>}
            </Pressable>
          ))}
        </View>
        {/* Expand button */}
        <View style={{ flex: 1 }} />
        <Pressable style={styles.collapsedItem} onPress={() => setCollapsed(false)}>
          <Ionicons name="chevron-forward-outline" size={20} color={isDark ? 'rgba(232,244,255,0.45)' : 'rgba(0,22,40,0.45)'} />
        </Pressable>
        {/* Avatar */}
        {isAuthenticated && (
          <View style={[styles.collapsedAvatar, { borderTopColor: border }]}>
            {user?.avatarUrl
              ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              : (
                <View style={styles.avatar}>
                  <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )
            }
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.sidebar, { backgroundColor: bg, borderRightColor: border }]}>
      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoIcon}>
          <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="globe-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.logoText, { color: isDark ? '#E8F4FF' : '#001628' }]}>CulturePass</Text>
          <Text style={[styles.logoUrl, { color: isDark ? 'rgba(232,244,255,0.35)' : 'rgba(0,22,40,0.35)' }]}>culturepass.app</Text>
        </View>
        <Pressable onPress={() => setCollapsed(true)} hitSlop={8}>
          <Ionicons name="chevron-back-outline" size={18} color={isDark ? 'rgba(232,244,255,0.4)' : 'rgba(0,22,40,0.4)'} />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Main nav */}
      <SectionGroup>
        {navWithBadge.map((item) => (
          <SidebarItem key={item.route} item={item} active={isActive(item)} isDark={isDark} onPress={() => navigate(item.route)} />
        ))}
      </SectionGroup>

      {/* Explore nav */}
      <SectionLabel label="Explore" isDark={isDark} />
      <SectionGroup>
        {EXPLORE_NAV.map((item) => (
          <SidebarItem key={item.route} item={item} active={isActive(item)} isDark={isDark} onPress={() => navigate(item.route)} />
        ))}
      </SectionGroup>

      {/* Organizer nav */}
      {isOrganizer && (
        <>
          <SectionLabel label="Organizer" isDark={isDark} />
          <SectionGroup>
            {ORGANIZER_NAV.map((item) => (
              <SidebarItem key={item.route} item={item} active={isActive(item)} isDark={isDark} onPress={() => navigate(item.route)} />
            ))}
          </SectionGroup>
        </>
      )}

      {/* Admin nav */}
      {isAdmin && (
        <>
          <SectionLabel label="Admin" isDark={isDark} />
          <SectionGroup>
            {ADMIN_NAV.map((item) => (
              <SidebarItem key={item.route} item={item} active={isActive(item)} isDark={isDark} onPress={() => navigate(item.route)} />
            ))}
          </SectionGroup>
        </>
      )}

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Bottom nav */}
      <SectionGroup>
        {BOTTOM_NAV.map((item) => (
          <SidebarItem key={item.route} item={item} active={isActive(item)} isDark={isDark} onPress={() => navigate(item.route)} />
        ))}
      </SectionGroup>

      {/* User section */}
      {isAuthenticated ? (
        <View style={[styles.userSection, { borderTopColor: border }]}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            : (
              <View style={styles.avatar}>
                <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )
          }
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.userName, { color: isDark ? '#E8F4FF' : '#001628' }]} numberOfLines={1}>{displayName}</Text>
            {roleLabel && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => logout()} hitSlop={8} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={20} color={isDark ? 'rgba(232,244,255,0.45)' : 'rgba(0,22,40,0.45)'} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.userSection, { borderTopColor: border }]}>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/(onboarding)/login')}>
            <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="person-outline" size={16} color="#fff" />
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.navGroup}>{children}</View>;
}

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={[styles.sectionLabelText, { color: isDark ? 'rgba(232,244,255,0.35)' : 'rgba(0,22,40,0.35)' }]}>{label}</Text>
    </View>
  );
}

function SidebarItem({ item, active, isDark, onPress }: {
  item: NavItem;
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const isCommunity = item.label === 'Community';
  const iconColor = active ? Colors.primary : (isDark ? 'rgba(232,244,255,0.56)' : 'rgba(0,22,40,0.56)');

  return (
    <Pressable
      style={[
        itemStyles.item,
        active && [itemStyles.itemActive, { backgroundColor: isDark ? 'rgba(44,42,114,0.15)' : 'rgba(44,42,114,0.07)' }],
      ]}
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active }}
    >
      {active && (
        <LinearGradient
          colors={['#2C2A72', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={itemStyles.activeBar}
        />
      )}
      <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        {isCommunity ? (
          <>
            <Ionicons name={active ? 'people-circle' : 'people-circle-outline'} size={20} color={iconColor} />
            <Ionicons name={active ? 'heart' : 'heart-outline'} size={8} color={active ? Colors.primary : '#111'} style={{ position: 'absolute' }} />
          </>
        ) : (
          <Ionicons name={active ? item.iconActive : item.icon} size={20} color={iconColor} />
        )}
      </View>
      <Text
        style={[
          itemStyles.label,
          { color: active ? Colors.primary : (isDark ? 'rgba(232,244,255,0.8)' : 'rgba(0,22,40,0.8)') },
          active && itemStyles.labelActive,
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {(item.badge ?? 0) > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge! > 99 ? '99+' : item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%' as unknown as number,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingBottom: 0,
    flexShrink: 0,
  },
  sidebarCollapsed: {
    width: 56,
    height: '100%' as unknown as number,
    borderRightWidth: 1,
    paddingTop: 16,
    paddingBottom: 0,
    flexShrink: 0,
    alignItems: 'center',
  },
  collapsedLogo: { paddingBottom: 16 },
  collapsedItem: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  collapsedAvatar: {
    paddingVertical: 12, borderTopWidth: 1, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoText: { fontSize: 15, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
  logoUrl: { fontSize: 10, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  divider: { height: 1, marginHorizontal: 14, marginVertical: 6 },
  navGroup: { paddingHorizontal: 8, paddingVertical: 2, gap: 1 },
  sectionLabel: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 2 },
  sectionLabelText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  userSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  avatarImg: {
    width: 34, height: 34, borderRadius: 17, flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#fff' },
  userName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  roleBadge: {
    backgroundColor: 'rgba(44,42,114,0.15)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2,
  },
  roleBadgeText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: Colors.primary },
  badge: {
    backgroundColor: Colors.error, borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' as unknown as number,
  },
  badgeText: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: '#fff' },
  badgeDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeDotText: { fontSize: 6, fontFamily: 'Poppins_700Bold', color: '#fff' },
  signInBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 38, borderRadius: 10, overflow: 'hidden',
  },
  signInText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
});

const itemStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10,
    position: 'relative',
  },
  itemActive: { borderRadius: 10 },
  activeBar: {
    position: 'absolute', left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2,
  },
  label: { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },
  labelActive: { fontFamily: 'Poppins_600SemiBold' },
});

import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Linking, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { CultureTokens, LayoutRules, Spacing } from '@/constants/theme';

interface SettingItem {
  icon: string;
  label: string;
  sub?: string;
  color: string;
  route?: string;
  action?: () => void;
  rightText?: string;
}
interface SettingSection { title: string; items: SettingItem[] }

export default function AccountSettingsScreen() {
  const insets  = useSafeAreaInsets();
  const webTop  = 0;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const { user, isAuthenticated, logout } = useAuth();
  const { isOrganizer, isAdmin, hasMinRole } = useRole();
  const canTargetCampaigns = hasMinRole('cityAdmin');

  const tier      = user?.subscriptionTier ?? 'free';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierStr   = tier as string;
  const tierColor = tierStr === 'plus' ? CultureTokens.indigo : tierStr === 'premium' || tierStr === 'vip' || tierStr === 'elite' ? CultureTokens.gold : tierStr === 'pro' ? CultureTokens.teal : tierStr === 'sydney-local' ? CultureTokens.success : 'rgba(255,255,255,0.6)';

  const pathname = usePathname();
  const navigate = (route: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (route === '/(onboarding)/login' || route === '/(onboarding)/signup') {
      router.push({ pathname: route, params: { redirectTo: pathname } } as any);
      return;
    }
    try {
      router.push(route as never);
    } catch (error) {
      console.warn('[settings] navigation failed:', route, error);
      router.replace('/(tabs)');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout('/(onboarding)');
          } catch (error) {
            console.warn('[settings] sign out failed:', error);
            Alert.alert('Sign out failed', 'Please try again.');
          }
        },
      },
    ]);
  };

  const AUTH_SECTIONS: SettingSection[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline',        label: 'Edit Profile',         sub: 'Name, bio, photo, social links',   color: CultureTokens.indigo,   route: '/profile/edit' },
        { icon: 'lock-closed-outline',   label: 'Privacy & Security',   sub: 'Profile visibility, data sharing', color: CultureTokens.saffron, route: '/settings/privacy' },
        { icon: 'notifications-outline', label: 'Notifications',        sub: 'Push, email, event reminders',     color: CultureTokens.coral,    route: '/settings/notifications' },
        { icon: 'location-outline',      label: 'Location & City',      sub: 'Update your city and country',     color: CultureTokens.teal,   route: '/settings/location' },
        { icon: 'business-outline',      label: 'Local Council',        sub: 'Choose your council area',         color: CultureTokens.gold,      route: '/council/select' },
      ],
    },
    {
      title: 'Membership & Payments',
      items: [
        { icon: 'star-outline',    label: 'My Membership',       sub: `${tierLabel} Plan · Tap to upgrade`, color: CultureTokens.gold,    route: '/membership/upgrade' },
        { icon: 'wallet-outline',  label: 'Wallet & Balance',    sub: 'Top up, view cashback',              color: CultureTokens.teal, route: '/payment/wallet' },
        { icon: 'card-outline',    label: 'Payment Methods',     sub: 'Cards, bank accounts',               color: CultureTokens.indigo, route: '/payment/methods' },
        { icon: 'receipt-outline', label: 'Transaction History', sub: 'Purchases and payments',             color: 'rgba(255,255,255,0.6)', route: '/payment/transactions' },
      ],
    },
    {
      title: 'My Content',
      items: [
        { icon: 'ticket-outline',   label: 'My Tickets',       sub: 'Upcoming and past events',     color: CultureTokens.saffron, route: '/tickets' },
        { icon: 'bookmark-outline', label: 'Saved Items',      sub: 'Events, perks, businesses',    color: CultureTokens.coral,    route: '/saved' },
        { icon: 'people-outline',   label: 'My Communities',   sub: "Groups you've joined",         color: CultureTokens.teal,   route: '/(tabs)/communities' },
      ],
    },
    ...(isOrganizer ? [{
      title: 'Organizer Tools',
      items: [
        { icon: 'grid-outline',       label: 'Organizer Dashboard', sub: 'Manage your events and tickets',   color: CultureTokens.indigo,   route: '/dashboard/organizer' },
        { icon: 'qr-code-outline',    label: 'Ticket Scanner',      sub: 'Scan attendee tickets at gate',    color: CultureTokens.saffron, route: '/scanner' },
        { icon: 'add-circle-outline', label: 'Submit Content',      sub: 'Events, businesses, listings',     color: CultureTokens.coral,    route: '/submit' },
        ...(canTargetCampaigns ? [{ icon: 'megaphone-outline', label: 'Campaign Targeting', sub: 'Dry-run and send targeted push', color: CultureTokens.gold, route: '/admin/notifications' }] : []),
        ...(canTargetCampaigns ? [{ icon: 'document-text-outline', label: 'Campaign Audit Logs', sub: 'Review admin send history', color: CultureTokens.warning, route: '/admin/audit-logs' }] : []),
      ] as SettingItem[],
    }] : []),
    ...(isAdmin ? [{
      title: 'Admin Tools',
      items: [
        { icon: 'business-outline', label: 'Council Management', sub: 'Council overview, claims, and operations', color: CultureTokens.indigo, route: '/admin/council-management' },
        { icon: 'shield-checkmark-outline', label: 'Council Claims', sub: 'Approve or reject council ownership claims', color: CultureTokens.warning, route: '/admin/council-claims' },
        { icon: 'people-outline', label: 'Admin Panel', sub: 'Manage users and roles', color: CultureTokens.error, route: '/admin/users' },
      ] as SettingItem[],
    }] : []),
    {
      title: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center',        sub: 'FAQs, guides, tutorials',       color: CultureTokens.gold,    route: '/help' },
        { icon: 'mail-outline',        label: 'Contact Us',         sub: 'support@culturepass.app',         color: CultureTokens.teal, action: () => Linking.openURL('mailto:support@culturepass.app?subject=CulturePass%20Support') },
        { icon: 'flag-outline',        label: 'Report a Problem',   sub: 'Something not working?',        color: CultureTokens.warning, action: () => Linking.openURL('mailto:bugs@culturepass.app?subject=Bug%20Report') },
        { icon: 'star-half-outline',   label: 'Rate CulturePass',   sub: 'Share your feedback',           color: CultureTokens.coral,  action: () => Linking.openURL(Platform.OS === 'android' ? 'market://details?id=au.culturepass.app' : 'https://apps.apple.com/app/culturepass/id6742686059') },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy',       color: CultureTokens.gold,      route: '/legal/privacy' },
        { icon: 'document-text-outline',    label: 'Terms of Service',     color: CultureTokens.saffron, route: '/legal/terms' },
        { icon: 'finger-print-outline',     label: 'Cookie Policy',        color: CultureTokens.coral,    route: '/legal/cookies' },
        { icon: 'people-circle-outline',    label: 'Community Guidelines', color: CultureTokens.teal,   route: '/legal/guidelines' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'information-circle-outline', label: 'About CulturePass', color: CultureTokens.indigo,      route: '/settings/about' },
        { icon: 'phone-portrait-outline',     label: 'App Version',       color: 'rgba(255,255,255,0.6)', rightText: '1.0.0 (1)' },
      ],
    },
  ];

  const GUEST_SECTIONS: SettingSection[] = [
    {
      title: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center',  sub: 'FAQs, guides, tutorials', color: CultureTokens.gold,    route: '/help' },
        { icon: 'mail-outline',        label: 'Contact Us',   sub: 'support@culturepass.app',  color: CultureTokens.teal, action: () => Linking.openURL('mailto:support@culturepass.app?subject=CulturePass%20Support') },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy',       color: CultureTokens.gold,      route: '/legal/privacy' },
        { icon: 'document-text-outline',    label: 'Terms of Service',     color: CultureTokens.saffron, route: '/legal/terms' },
        { icon: 'finger-print-outline',     label: 'Cookie Policy',        color: CultureTokens.coral,    route: '/legal/cookies' },
        { icon: 'people-circle-outline',    label: 'Community Guidelines', color: CultureTokens.teal,   route: '/legal/guidelines' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'information-circle-outline', label: 'About CulturePass', color: CultureTokens.indigo,       route: '/settings/about' },
        { icon: 'phone-portrait-outline',     label: 'App Version',       color: 'rgba(255,255,255,0.6)', rightText: '1.0.0 (1)' },
      ],
    },
  ];

  const sections = isAuthenticated ? AUTH_SECTIONS : GUEST_SECTIONS;

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop }]}>
      <LinearGradient 
        colors={['rgba(44, 42, 114, 0.15)', 'transparent']} 
        style={StyleSheet.absoluteFillObject} 
        pointerEvents="none" 
      />
      {/* Header */}
      <View style={s.header}>
        <Pressable 
          style={({pressed}) => [s.backBtn, pressed && { transform: [{ scale: 0.95 }] }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>Account & Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: LayoutRules.sectionSpacing + (Platform.OS === 'web' ? 34 : insets.bottom), paddingTop: 8 }}
      >
        {/* Profile card or guest CTA */}
        {isAuthenticated && user ? (
          <Pressable 
            style={({pressed}) => [s.profileCard, isDesktopWeb && s.webSection, pressed && { transform: [{ scale: 0.98 }] }]} 
            onPress={() => navigate('/profile/edit')}
          >
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' }} />
            <View style={s.profileRow}>
              <View style={s.avatarWrap}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarLetter}>{(user.displayName ?? user.username ?? 'C')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={[s.tierDot, { backgroundColor: tierColor, borderColor: '#0B0B14' }]} />
              </View>
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <Text style={s.profileName} numberOfLines={1}>{user.displayName ?? user.username ?? 'CulturePass User'}</Text>
                <Text style={s.profileEmail} numberOfLines={1}>{user.email ?? ''}</Text>
                <View style={[s.tierBadge, { backgroundColor: tierColor + '20', borderColor: tierColor + '40' }]}>
                  <Ionicons name="star" size={10} color={tierColor} />
                  <Text style={[s.tierText, { color: tierColor }]}>{tierLabel}</Text>
                </View>
              </View>
              <View style={s.editBtn}>
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={s.editBtnText}>Edit</Text>
              </View>
            </View>
            {(user.city || user.country) && (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
                <Text style={s.locationText}>{[user.city, user.country].filter(Boolean).join(', ')}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={[s.guestCard, isDesktopWeb && s.webSection]}> 
            <Ionicons name="person-circle-outline" size={64} color="rgba(255,255,255,0.4)" style={{ marginBottom: 12 }} />
            <Text style={s.guestTitle}>Welcome to CulturePass</Text>
            <Text style={s.guestSub}>
              Sign in to access your profile, tickets, wallet, and exclusive cultural events.
            </Text>
            <Pressable 
              style={({pressed}) => [s.guestSignInBtn, pressed && { opacity: 0.8 }]} 
              onPress={() => navigate('/(onboarding)/login')}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              <Text style={s.guestSignInText}>Sign In</Text>
            </Pressable>
            <Pressable 
              style={({pressed}) => [s.guestSignUpBtn, pressed && { opacity: 0.8 }]} 
              onPress={() => navigate('/(onboarding)/signup')}
            >
              <Text style={s.guestSignUpText}>
                Don&apos;t have an account?{' '}
                <Text style={{ color: CultureTokens.indigo, fontFamily: 'Poppins_600SemiBold' }}>Create one free</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, ii) => (
                <View key={item.label}>
                  <Pressable
                    style={({ pressed }) => [s.settingRow, pressed && { backgroundColor: 'rgba(255,255,255,0.02)' }]}
                    onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (item.route) navigate(item.route); else item.action?.(); }}
                  >
                    <View style={[s.settingIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as never} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.settingLabel}>{item.label}</Text>
                      {item.sub ? <Text style={s.settingSub}>{item.sub}</Text> : null}
                    </View>
                    {item.rightText ? (
                      <Text style={s.settingRightText}>{item.rightText}</Text>
                    ) : (item.route ?? item.action) ? (
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                    ) : null}
                  </Pressable>
                  {ii < section.items.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        {isAuthenticated && (
          <View style={[s.section, isDesktopWeb && s.webSection, { marginBottom: 12 }]}> 
            <Pressable 
              style={({pressed}) => [s.signOutBtn, pressed && { backgroundColor: 'rgba(255, 94, 91, 0.1)' }]} 
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color={CultureTokens.coral} />
              <Text style={s.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        <Text style={s.footer}>
          CulturePass AU · v1.0.0{'\n'}
          Available in Australia
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0B0B14' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LayoutRules.screenHorizontalPadding, paddingVertical: LayoutRules.iconTextGap, zIndex: 10 },
  backBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },

  profileCard:  { marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.betweenCards, borderRadius: 20, padding: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap },
  avatarWrap:   { position: 'relative' },
  avatar:       { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarFallback:{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  avatarLetter: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  tierDot:      { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileName:  { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  profileEmail: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  tierBadge:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: LayoutRules.borderRadius, borderWidth: 1 },
  tierText:     { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, height: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editBtnText:  { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  locationText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },

  guestCard:    { marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.betweenCards, borderRadius: 20, padding: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  guestTitle:   { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8, textAlign: 'center', color: '#FFFFFF' },
  guestSub:     { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 24, color: 'rgba(255,255,255,0.6)' },
  guestSignInBtn:{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', height: 48, borderRadius: 14, width: '100%', marginBottom: 12, backgroundColor: CultureTokens.indigo },
  guestSignInText:{ fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  guestSignUpBtn:{ paddingVertical: Spacing.xs },
  guestSignUpText:{ fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },

  section:      { paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4, color: 'rgba(255,255,255,0.4)' },
  sectionCard:  { borderRadius: 20, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  settingIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  settingSub:   { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 2, color: 'rgba(255,255,255,0.5)' },
  settingRightText:{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  divider:      { height: 1, marginLeft: 70, backgroundColor: 'rgba(255,255,255,0.05)' },

  signOutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, height: 52, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255, 94, 91, 0.3)' },
  signOutText:  { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.coral },
  footer:       { textAlign: 'center', fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 10, marginBottom: 40, lineHeight: 20, color: 'rgba(255,255,255,0.3)' },
  webSection:   { maxWidth: 800, width: '100%', alignSelf: 'center' },
});

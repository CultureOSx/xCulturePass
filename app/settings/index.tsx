import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Linking, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { useColors } from '@/hooks/useColors';
import { LayoutRules, Spacing } from '@/constants/theme';

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
  const webTop  = Platform.OS === 'web' ? 67 : 0;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const colors  = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const { isOrganizer, isAdmin, hasMinRole } = useRole();
  const canTargetCampaigns = hasMinRole('cityAdmin');

  const tier      = user?.subscriptionTier ?? 'free';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierStr   = tier as string;
  const tierColor = tierStr === 'plus' ? colors.info : tierStr === 'premium' || tierStr === 'vip' || tierStr === 'elite' ? colors.gold : tierStr === 'pro' ? colors.primary : tierStr === 'sydney-local' ? colors.success : colors.textSecondary;

  const pathname = usePathname();
  const navigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // when navigating to login/signup include redirectTo so user returns after auth
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        { icon: 'person-outline',        label: 'Edit Profile',         sub: 'Name, bio, photo, social links',   color: colors.primary,   route: '/profile/edit' },
        { icon: 'lock-closed-outline',   label: 'Privacy & Security',   sub: 'Profile visibility, data sharing', color: colors.secondary, route: '/settings/privacy' },
        { icon: 'notifications-outline', label: 'Notifications',        sub: 'Push, email, event reminders',     color: colors.accent,    route: '/settings/notifications' },
        { icon: 'location-outline',      label: 'Location & City',      sub: 'Update your city and country',     color: colors.success,   route: '/settings/location' },
      ],
    },
    {
      title: 'Membership & Payments',
      items: [
        { icon: 'star-outline',    label: 'My Membership',       sub: `${tierLabel} Plan · Tap to upgrade`, color: colors.gold,    route: '/membership/upgrade' },
        { icon: 'wallet-outline',  label: 'Wallet & Balance',    sub: 'Top up, view cashback',              color: colors.success, route: '/payment/wallet' },
        { icon: 'card-outline',    label: 'Payment Methods',     sub: 'Cards, bank accounts',               color: colors.primary, route: '/payment/methods' },
        { icon: 'receipt-outline', label: 'Transaction History', sub: 'Purchases and payments',             color: colors.textSecondary, route: '/payment/transactions' },
      ],
    },
    {
      title: 'My Content',
      items: [
        { icon: 'ticket-outline',   label: 'My Tickets',       sub: 'Upcoming and past events',     color: colors.secondary, route: '/tickets' },
        { icon: 'bookmark-outline', label: 'Saved Items',      sub: 'Events, perks, businesses',    color: colors.accent,    route: '/saved' },
        { icon: 'people-outline',   label: 'My Communities',   sub: "Groups you've joined",         color: colors.success,   route: '/(tabs)/communities' },
      ],
    },
    ...(isOrganizer ? [{
      title: 'Organizer Tools',
      items: [
        { icon: 'grid-outline',       label: 'Organizer Dashboard', sub: 'Manage your events and tickets',   color: colors.primary,   route: '/dashboard/organizer' },
        { icon: 'qr-code-outline',    label: 'Ticket Scanner',      sub: 'Scan attendee tickets at gate',    color: colors.secondary, route: '/scanner' },
        { icon: 'add-circle-outline', label: 'Submit Content',      sub: 'Events, businesses, listings',     color: colors.accent,    route: '/submit' },
        ...(isAdmin ? [{ icon: 'people-outline', label: 'Admin Panel', sub: 'Manage users and roles', color: colors.error, route: '/admin/users' }] : []),
        ...(canTargetCampaigns ? [{ icon: 'megaphone-outline', label: 'Campaign Targeting', sub: 'Dry-run and send targeted push', color: colors.info, route: '/admin/notifications' }] : []),
        ...(canTargetCampaigns ? [{ icon: 'document-text-outline', label: 'Campaign Audit Logs', sub: 'Review admin send history', color: colors.warning, route: '/admin/audit-logs' }] : []),
      ] as SettingItem[],
    }] : []),
    {
      title: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center',        sub: 'FAQs, guides, tutorials',       color: colors.info,    route: '/help' },
        { icon: 'mail-outline',        label: 'Contact Us',         sub: 'support@culturepass.app',         color: colors.success, action: () => Linking.openURL('mailto:support@culturepass.app?subject=CulturePass%20Support') },
        { icon: 'flag-outline',        label: 'Report a Problem',   sub: 'Something not working?',        color: colors.warning, action: () => Linking.openURL('mailto:bugs@culturepass.app?subject=Bug%20Report') },
        { icon: 'star-half-outline',   label: 'Rate CulturePass',   sub: 'Share your feedback',           color: colors.accent,  action: () => Linking.openURL(Platform.OS === 'android' ? 'market://details?id=au.culturepass.app' : 'https://apps.apple.com/app/culturepass/id6742686059') },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy',       color: colors.info,      route: '/legal/privacy' },
        { icon: 'document-text-outline',    label: 'Terms of Service',     color: colors.secondary, route: '/legal/terms' },
        { icon: 'finger-print-outline',     label: 'Cookie Policy',        color: colors.accent,    route: '/legal/cookies' },
        { icon: 'people-circle-outline',    label: 'Community Guidelines', color: colors.success,   route: '/legal/guidelines' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'information-circle-outline', label: 'About CulturePass', color: colors.primary,      route: '/settings/about' },
        { icon: 'phone-portrait-outline',     label: 'App Version',       color: colors.textSecondary, rightText: '1.0.0 (1)' },
      ],
    },
  ];

  const GUEST_SECTIONS: SettingSection[] = [
    {
      title: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center',  sub: 'FAQs, guides, tutorials', color: colors.info,    route: '/help' },
        { icon: 'mail-outline',        label: 'Contact Us',   sub: 'support@culturepass.app',  color: colors.success, action: () => Linking.openURL('mailto:support@culturepass.app?subject=CulturePass%20Support') },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy',       color: colors.info,      route: '/legal/privacy' },
        { icon: 'document-text-outline',    label: 'Terms of Service',     color: colors.secondary, route: '/legal/terms' },
        { icon: 'finger-print-outline',     label: 'Cookie Policy',        color: colors.accent,    route: '/legal/cookies' },
        { icon: 'people-circle-outline',    label: 'Community Guidelines', color: colors.success,   route: '/legal/guidelines' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'information-circle-outline', label: 'About CulturePass', color: colors.primary,       route: '/settings/about' },
        { icon: 'phone-portrait-outline',     label: 'App Version',       color: colors.textSecondary, rightText: '1.0.0 (1)' },
      ],
    },
  ];

  const sections = isAuthenticated ? AUTH_SECTIONS : GUEST_SECTIONS;

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Account & Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: LayoutRules.sectionSpacing + (Platform.OS === 'web' ? 34 : insets.bottom) }}
      >
        {/* Profile card or guest CTA */}
        {isAuthenticated && user ? (
          <Pressable style={[s.profileCard, isDesktopWeb && s.webSection]} onPress={() => navigate('/profile/edit')}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.07)' }} />
            <View style={s.profileRow}>
              <View style={s.avatarWrap}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={[s.avatarLetter, { color: colors.textInverse }]}>{(user.displayName ?? user.username ?? 'C')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={[s.tierDot, { backgroundColor: tierColor, borderColor: colors.textInverse }]} />
              </View>
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <Text style={[s.profileName, { color: colors.textInverse }]} numberOfLines={1}>{user.displayName ?? user.username ?? 'CulturePass User'}</Text>
                <Text style={s.profileEmail} numberOfLines={1}>{user.email ?? ''}</Text>
                <View style={[s.tierBadge, { backgroundColor: tierColor + '30', borderColor: tierColor + '60' }]}>
                  <Ionicons name="star" size={10} color={tierColor} />
                  <Text style={[s.tierText, { color: tierColor }]}>{tierLabel}</Text>
                </View>
              </View>
              <View style={s.editBtn}>
                <Ionicons name="create-outline" size={18} color={colors.textInverse} />
                <Text style={[s.editBtnText, { color: colors.textInverse }]}>Edit</Text>
              </View>
            </View>
            {(user.city || user.country) && (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textInverse} />
                <Text style={s.locationText}>{[user.city, user.country].filter(Boolean).join(', ')}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={[s.guestCard, isDesktopWeb && s.webSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
            <Ionicons name="person-circle-outline" size={64} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[s.guestTitle, { color: colors.text }]}>Welcome to CulturePass</Text>
            <Text style={[s.guestSub, { color: colors.textSecondary }]}>
              Sign in to access your profile, tickets, wallet, and exclusive cultural events.
            </Text>
            <Pressable style={s.guestSignInBtn} onPress={() => navigate('/(onboarding)/login')}>
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="log-in-outline" size={20} color={colors.textInverse} />
              <Text style={[s.guestSignInText, { color: colors.textInverse }]}>Sign In</Text>
            </Pressable>
            <Pressable style={s.guestSignUpBtn} onPress={() => navigate('/(onboarding)/signup')}>
              <Text style={[s.guestSignUpText, { color: colors.textSecondary }]}>
                Don&apos;t have an account?{' '}
                <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Create one free</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={[s.section, isDesktopWeb && s.webSection]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {section.items.map((item, ii) => (
                <View key={item.label}>
                  <Pressable
                    style={({ pressed }) => [s.settingRow, pressed && { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (item.route) navigate(item.route); else item.action?.(); }}
                  >
                    <View style={[s.settingIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as never} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.settingLabel, { color: colors.text }]}>{item.label}</Text>
                      {item.sub ? <Text style={[s.settingSub, { color: colors.text }]}>{item.sub}</Text> : null}
                    </View>
                    {item.rightText ? (
                      <Text style={[s.settingRightText, { color: colors.textSecondary }]}>{item.rightText}</Text>
                    ) : (item.route ?? item.action) ? (
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    ) : null}
                  </Pressable>
                  {ii < section.items.length - 1 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        {isAuthenticated && (
          <View style={[s.section, isDesktopWeb && s.webSection, { marginBottom: 12 }]}> 
            <Pressable style={[s.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.error + '30' }]} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={[s.signOutText, { color: colors.error }]}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        <Text style={[s.footer, { color: colors.textSecondary }]}>
          CulturePass AU · v1.0.0{'\n'}
          Available in Australia
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LayoutRules.screenHorizontalPadding, paddingVertical: LayoutRules.iconTextGap },
  backBtn:      { width: LayoutRules.buttonHeight, height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  profileCard:  { marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.betweenCards, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMax, overflow: 'hidden' },
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap },
  avatarWrap:   { position: 'relative' },
  avatar:       { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFallback:{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarLetter: { fontSize: 26, fontFamily: 'Poppins_700Bold' },
  tierDot:      { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileName:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  profileEmail: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.75)' },
  tierBadge:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: LayoutRules.borderRadius, borderWidth: 1 },
  tierText:     { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: LayoutRules.borderRadius, paddingHorizontal: Spacing.sm, height: LayoutRules.buttonHeight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  editBtnText:  { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  locationText: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)' },

  guestCard:    { marginHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.betweenCards, borderRadius: LayoutRules.borderRadius, padding: LayoutRules.cardPaddingMax, alignItems: 'center', borderWidth: 1 },
  guestTitle:   { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: Spacing.sm, textAlign: 'center' },
  guestSub:     { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: LayoutRules.cardPaddingMax },
  guestSignInBtn:{ flexDirection: 'row', alignItems: 'center', gap: LayoutRules.iconTextGap, justifyContent: 'center', height: LayoutRules.buttonHeight, borderRadius: LayoutRules.borderRadius, width: '100%', overflow: 'hidden', marginBottom: Spacing.sm },
  guestSignInText:{ fontSize: 16, fontFamily: 'Poppins_700Bold' },
  guestSignUpBtn:{ paddingVertical: Spacing.xs },
  guestSignUpText:{ fontSize: 13, fontFamily: 'Poppins_400Regular' },

  section:      { paddingHorizontal: LayoutRules.screenHorizontalPadding, marginBottom: LayoutRules.sectionSpacing },
  sectionTitle: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  sectionCard:  { borderRadius: LayoutRules.borderRadius, borderWidth: 1, overflow: 'hidden' },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: LayoutRules.cardPaddingMin, paddingVertical: 13, gap: LayoutRules.iconTextGap },
  settingIcon:  { width: 36, height: 36, borderRadius: LayoutRules.borderRadius, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  settingSub:   { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: Spacing.xs },
  settingRightText:{ fontSize: 13, fontFamily: 'Poppins_400Regular' },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 62 },

  signOutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: LayoutRules.iconTextGap, borderRadius: LayoutRules.borderRadius, height: LayoutRules.buttonHeight, borderWidth: 1 },
  signOutText:  { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  footer:       { textAlign: 'center', fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: Spacing.sm, marginBottom: Spacing.sm, lineHeight: 18 },
  webSection:   { maxWidth: 1024, width: '100%', alignSelf: 'center' },
});

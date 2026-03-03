import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { api, type MembershipSummary } from '@/lib/api';
import { useColors } from '@/hooks/useColors';

const FEATURES = [
  { icon: 'cash-outline',             title: '2% Cashback',         desc: 'On every ticket purchase, credited to your wallet', free: false, plus: true },
  { icon: 'time-outline',             title: 'Early Access',         desc: '48-hour head start on event tickets',              free: false, plus: true },
  { icon: 'gift-outline',             title: 'Exclusive Perks',      desc: 'Members-only deals from local businesses',          free: false, plus: true },
  { icon: 'shield-checkmark-outline', title: 'Plus Badge',           desc: 'Stand out in the community',                       free: false, plus: true },
  { icon: 'calendar-outline',         title: 'Event Discovery',      desc: 'Browse and discover cultural events',               free: true,  plus: true },
  { icon: 'people-outline',           title: 'Communities',          desc: 'Join and engage with cultural groups',              free: true,  plus: true },
  { icon: 'ticket-outline',           title: 'Ticket Purchases',     desc: 'Buy tickets to events',                            free: true,  plus: true },
  { icon: 'person-outline',           title: 'Profile & Directory',  desc: 'Create and share your profile',                    free: true,  plus: true },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const colors = useColors();
  const pathname = usePathname();
  const { userId, isAuthenticated } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const { data: membership } = useQuery<MembershipSummary>({
    queryKey: ['membership', userId],
    queryFn: () => api.membership.get(userId!),
    enabled: !!userId,
  });

  const { data: memberCountData } = useQuery({
    queryKey: ['membership-member-count'],
    queryFn: () => api.membership.memberCount(),
  });

  const isPlus = membership?.tier === 'plus' && membership?.status === 'active';
  const memberCount = memberCountData?.count ?? 0;
  const price    = billingPeriod === 'yearly' ? '$69' : '$7.99';
  const perMonth = billingPeriod === 'yearly' ? '$5.75' : '$7.99';

  const handleSubscribe = useCallback(async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please sign in to activate CulturePass+.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as any) },
      ]);
      return;
    }
    setLoading(true);
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await api.membership.subscribe({ billingPeriod });
      if (data.alreadyActive) {
        await queryClient.invalidateQueries({ queryKey: ['membership', userId] });
        Alert.alert('Already Active', 'Your CulturePass+ membership is already active.');
        return;
      }
      if (data.checkoutUrl) {
        await WebBrowser.openBrowserAsync(data.checkoutUrl);
        await queryClient.invalidateQueries({ queryKey: ['membership', userId] });
        await queryClient.invalidateQueries({ queryKey: ['membership-member-count'] });

        const pollForUpdate = async (retries = 0): Promise<void> => {
          if (retries >= 8) return;
          try {
            const checkData = await api.membership.get(userId);
            if (checkData?.tier === 'plus' && checkData?.status === 'active') {
              await queryClient.invalidateQueries({ queryKey: ['membership', userId] });
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Welcome to CulturePass+!', 'Your membership is now active. Enjoy early access, cashback rewards, and exclusive perks!');
              return;
            }
          } catch {}
          await new Promise(r => setTimeout(r, 2000));
          return pollForUpdate(retries + 1);
        };
        await pollForUpdate();
      } else if (data.devMode) {
        await queryClient.invalidateQueries({ queryKey: ['membership', userId] });
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Dev Mode', 'Membership upgraded to Plus (dev mode — no Stripe charge).');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start subscription';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [userId, billingPeriod]);

  const handleCancel = useCallback(async () => {
    if (!userId) return;
    Alert.alert(
      'Cancel Membership',
      'Are you sure you want to cancel your CulturePass+ membership? Your subscription will be cancelled immediately and you will lose access to exclusive perks and cashback.',
      [
        { text: 'Keep Membership', style: 'cancel' },
        {
          text: 'Cancel Membership',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.membership.cancel();
              await queryClient.invalidateQueries({ queryKey: ['membership', userId] });
              await queryClient.invalidateQueries({ queryKey: ['membership-member-count'] });
              queryClient.setQueryData(['membership', userId], {
                tier: 'free', tierLabel: 'Free', status: 'inactive', expiresAt: null,
                cashbackRate: 0, cashbackMultiplier: 1, earlyAccessHours: 0,
                eventsAttended: membership?.eventsAttended ?? 0,
              } satisfies MembershipSummary);
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Membership Cancelled', 'Your CulturePass+ membership has been cancelled. You can re-subscribe anytime.');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Failed to cancel';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [userId, membership]);

  if (!isAuthenticated) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
        {/* Header with back button */}
        <View style={[s.header, { borderBottomColor: colors.borderLight, backgroundColor: colors.background }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.primary }]}>CulturePass+</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section - Locked State */}
          <View style={s.heroSection}>
            <View style={[s.lockedIconWrap, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="globe" size={44} color={colors.primary} />
            </View>
            <Text style={[s.heroTitle, { color: colors.primary }]}>Sign In to Unlock</Text>
            <Text style={[s.heroTagline, { color: colors.textSecondary }]}>Premium cultural experiences await</Text>
            <Text style={[s.heroDesc, { color: colors.text, marginTop: 12 }]}> 
              Create your account or sign in to get exclusive access to CulturePass+ benefits and discover your next favorite cultural event.
            </Text>
          </View>

          {/* Preview of benefits */}
          <View style={s.benefitsPreview}>
            <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 12 }]}>{"What You\u2019ll Get"}</Text>
            {[
              { icon: 'cash-outline', title: '2% Cashback', desc: 'Earn rewards on every ticket', color: colors.primaryDark },
              { icon: 'time-outline', title: '48h Early Access', desc: 'First to buy hot tickets', color: colors.primaryDark },
              { icon: 'gift-outline', title: 'Exclusive Perks', desc: 'Members-only deals & discounts', color: colors.primaryDark },
              { icon: 'shield-checkmark-outline', title: 'Plus Badge', desc: 'Stand out in the community', color: colors.primaryDark },
            ].map((benefit) => (
              <View key={benefit.title} style={[s.benefitItem, { backgroundColor: colors.surface, borderLeftColor: colors.primary, borderLeftWidth: 3 }]}>
                <View style={[s.benefitIconWrap, { backgroundColor: colors.primaryGlow }]}>
                  <Ionicons name={benefit.icon as never} size={20} color={benefit.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                  <Text style={[s.benefitDesc, { color: colors.text }]}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Social proof */}
          {memberCount > 0 && (
            <View style={[s.socialProof, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[s.socialProofText, { color: colors.primary }]}>
                Join {memberCount.toLocaleString()}+ members already enjoying CulturePass+
              </Text>
            </View>
          )}

          {/* CTA Section */}
          <View style={s.ctaSection}>
            <Pressable
              style={[s.subscribeBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/(onboarding)/login', params: { redirectTo: pathname } } as any)}
            >
              <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={[s.subscribeBtnText, { color: colors.textInverse }]}>Sign In to Activate</Text>
            </Pressable>
            <Pressable
              style={[s.secondaryBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
              onPress={() => router.replace('/')}
            >
              <Text style={[s.secondaryBtnText, { color: colors.text }]}>Back to Discovery</Text>
            </Pressable>
            <Text style={[s.ctaFine, { color: colors.textSecondary, marginTop: 12 }]}>{"Don\u2019t have an account? Sign up during login"}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.borderLight, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.primary }]}>CulturePass+</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.heroSection}>
          <View style={[s.heroIconWrap, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="globe" size={40} color={colors.primaryDark} />
          </View>
          <Text style={[s.heroTitle, { color: colors.primary }]}>CulturePass+</Text>
          <Text style={[s.heroTagline, { color: colors.primaryDark }]}>Access. Advantage. Influence.</Text>
          <Text style={[s.heroDesc, { color: colors.text }]}> 
            Unlock premium cultural experiences with cashback rewards, early access to events, and exclusive perks from local businesses.
          </Text>
        </View>

        {memberCount > 0 && (
          <View style={[s.socialProof, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="people" size={16} color={colors.primaryDark} />
            <Text style={[s.socialProofText, { color: colors.primary }]}>
              Join {memberCount.toLocaleString()}+ members already enjoying CulturePass+
            </Text>
          </View>
        )}

        {/* Billing toggle */}
        {!isPlus && (
          <View style={s.pricingSection}>
            <View style={[s.toggleRow, { backgroundColor: colors.backgroundSecondary }]}>
              <Pressable
                style={[s.toggleBtn, billingPeriod === 'monthly' && [s.toggleActive, { backgroundColor: colors.surface }]]}
                onPress={() => setBillingPeriod('monthly')}
              >
                <Text style={[s.toggleText, { color: colors.text }, billingPeriod === 'monthly' && { color: colors.primary, fontFamily: 'Poppins_600SemiBold' }]}>Monthly</Text>
              </Pressable>
              <Pressable
                style={[s.toggleBtn, billingPeriod === 'yearly' && [s.toggleActive, { backgroundColor: colors.surface }]]}
                onPress={() => setBillingPeriod('yearly')}
              >
                <Text style={[s.toggleText, { color: colors.text }, billingPeriod === 'yearly' && { color: colors.primary, fontFamily: 'Poppins_600SemiBold' }]}>Yearly</Text>
                {billingPeriod === 'yearly' && (
                  <View style={[s.saveBadge, { backgroundColor: colors.success }]}>
                    <Text style={s.saveBadgeText}>-28%</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <View style={s.priceCard}>
              <Text style={[s.priceAmount, { color: colors.primary }]}>{price}</Text>
              <Text style={[s.pricePeriod, { color: colors.textSecondary }]}>
                {billingPeriod === 'yearly' ? '/year' : '/month'}
              </Text>
              {billingPeriod === 'yearly' && (
                <Text style={[s.priceBreakdown, { color: colors.primaryDark }]}>That&apos;s just {perMonth}/month</Text>
              )}
            </View>
          </View>
        )}

        {/* Feature comparison */}
        <View style={s.comparisonSection}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>What&apos;s Included</Text>
          <View style={s.comparisonHeader}>
            <View style={{ flex: 1 }} />
            <View style={s.compColHeader}>
              <Text style={[s.compColLabel, { color: colors.textSecondary }]}>Free</Text>
            </View>
            <View style={[s.compColHeader, s.compColPlus, { backgroundColor: colors.primary }]}>
              <Ionicons name="star" size={12} color={colors.textInverse} />
              <Text style={[s.compColLabel, { color: colors.textInverse }]}> Plus</Text>
            </View>
          </View>

          {FEATURES.map((f) => (
            <View key={f.title} style={[s.compRow, { borderBottomColor: colors.divider }]}>
              <View style={s.compFeature}>
                <Ionicons name={f.icon as never} size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.compFeatureTitle, { color: colors.text }]}>{f.title}</Text>
                  <Text style={[s.compFeatureDesc, { color: colors.text }]}>{f.desc}</Text>
                </View>
              </View>
              <View style={s.compCheck}>
                {f.free
                  ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  : <Ionicons name="close-circle"    size={20} color={colors.textSecondary} />
                }
              </View>
              <View style={[s.compCheck, s.compCheckPlus]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            </View>
          ))}
        </View>

        {/* Highlights */}
        <View style={s.highlightsSection}>
          {[
            { bg: colors.success + '15', color: colors.success, icon: 'cash',  title: '2% Cashback',    desc: 'Every ticket purchase earns you cashback, automatically credited to your wallet.' },
            { bg: colors.info + '15',    color: colors.info,    icon: 'flash', title: '48h Early Access', desc: 'Get a 48-hour head start on hot event tickets before they go on sale to everyone.' },
            { bg: colors.warning + '15', color: colors.warning, icon: 'gift',  title: 'Exclusive Perks', desc: 'Access members-only deals and discounts from restaurants, shops, and cultural venues.' },
          ].map(h => (
            <View key={h.title} style={[s.highlightCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={[s.highlightIcon, { backgroundColor: h.bg }]}>
                <Ionicons name={h.icon as never} size={24} color={h.color} />
              </View>
              <Text style={[s.highlightTitle, { color: colors.text }]}>{h.title}</Text>
              <Text style={[s.highlightDesc, { color: colors.text }]}>{h.desc}</Text>
            </View>
          ))}
        </View>

        {/* Active / Subscribe CTA */}
        {isPlus ? (
          <View style={s.activeSection}>
            <View style={[s.activeBadge, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[s.activeText, { color: colors.success }]}>You&apos;re a CulturePass+ member</Text>
            </View>
            <Text style={[s.activeSubtext, { color: colors.textSecondary }]}>Thank you for being part of the CulturePass+ community.</Text>
            <Pressable style={s.cancelBtn} onPress={handleCancel} disabled={loading}>
              <Text style={[s.cancelBtnText, { color: colors.error }]}>Cancel Membership</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.ctaSection}>
            <Pressable
              style={[s.subscribeBtn, { backgroundColor: colors.primary }, loading && s.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="star" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={[s.subscribeBtnText, { color: colors.textInverse }]}>Get CulturePass+ for {price}{billingPeriod === 'yearly' ? '/yr' : '/mo'}</Text>
                </>
              )}
            </Pressable>
            <Text style={[s.ctaFine, { color: colors.textSecondary }]}>Cancel anytime. Powered by Stripe.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:            { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle:        { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  scroll:             { flex: 1 },
  scrollContent:      { paddingHorizontal: 20, flexGrow: 1 },
  scrollContainer:    { flex: 1, paddingHorizontal: 20, paddingVertical: 40 },
  heroSection:        { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  heroIconWrap:       { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  lockedIconWrap:     { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroTitle:          { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  heroTagline:        { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  heroDesc:           { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  socialProof:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginTop: 20, marginBottom: 20, alignSelf: 'center' },
  socialProofText:    { fontSize: 13, fontFamily: 'Poppins_500Medium', marginLeft: 6 },
  benefitsPreview:    { marginVertical: 20 },
  benefitItem:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, marginBottom: 10 },
  benefitIconWrap:    { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  benefitTitle:       { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  benefitDesc:        { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  pricingSection:     { marginTop: 24 },
  toggleRow:          { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 16 },
  toggleBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center' },
  toggleActive:       { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText:         { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  saveBadge:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  saveBadgeText:      { fontSize: 10, fontFamily: 'Poppins_700Bold' },
  priceCard:          { alignItems: 'center', paddingVertical: 16 },
  priceAmount:        { fontSize: 44, fontFamily: 'Poppins_700Bold' },
  pricePeriod:        { fontSize: 16, fontFamily: 'Poppins_500Medium', marginTop: 2 },
  priceBreakdown:     { fontSize: 13, fontFamily: 'Poppins_500Medium', marginTop: 6 },
  sectionTitle:       { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 16 },
  comparisonSection:  { marginTop: 8, marginBottom: 20 },
  comparisonHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 4 },
  compColHeader:      { width: 52, alignItems: 'center', paddingVertical: 4 },
  compColPlus:        { borderRadius: 8, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 6 },
  compColLabel:       { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  compRow:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  compFeature:        { flex: 1, flexDirection: 'row', alignItems: 'center' },
  compFeatureTitle:   { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  compFeatureDesc:    { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  compCheck:          { width: 52, alignItems: 'center' },
  compCheckPlus:      {},
  highlightsSection:  { marginBottom: 20, gap: 12 },
  highlightCard:      { borderRadius: 16, padding: 20, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  highlightIcon:      { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  highlightTitle:     { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  highlightDesc:      { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 19 },
  activeSection:      { alignItems: 'center', paddingVertical: 24 },
  activeBadge:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, marginBottom: 12 },
  activeText:         { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginLeft: 8 },
  activeSubtext:      { fontSize: 13, fontFamily: 'Poppins_400Regular', marginBottom: 20 },
  cancelBtn:          { paddingVertical: 10, paddingHorizontal: 24 },
  cancelBtnText:      { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  ctaSection:         { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  subscribeBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, marginBottom: 10 },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText:   { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  secondaryBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', borderWidth: 1.5 },
  secondaryBtnText:   { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  ctaFine:            { fontSize: 12, fontFamily: 'Poppins_400Regular' },
});

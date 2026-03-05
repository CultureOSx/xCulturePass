import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { Perk } from '@/components/perks/types';
import { PERK_TYPE_INFO } from '@/components/perks/constants';
import { PerkHero } from '@/components/perks/PerkHero';
import { PerkAbout } from '@/components/perks/PerkAbout';
import { PerkDetails } from '@/components/perks/PerkDetails';
export default function PerkDetailScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { userId } = useAuth();
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const { data: perk, isLoading } = useQuery({
    queryKey: ['/api/perks', id],
    queryFn: (): Promise<Perk> => api.perks.get(id) as unknown as Promise<Perk>,
    enabled: !!id,
  });

  const { data: membership } = useQuery<{ tier: string }>({
    queryKey: ['/api/membership', userId],
    enabled: !!userId,
  });

  const redeemMutation = useMutation({
    mutationFn: async (perkId: string) => {
      const res = await apiRequest('POST', `/api/perks/${perkId}/redeem`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/redemptions'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!perk) return;
      const code = `CP-${perk.perkType.toUpperCase().replace('_', '')}-${Date.now().toString(36).toUpperCase()}`;
      setCouponCode(code);
      setShowCoupon(true);
    },
    onError: (err: Error) => {
      Alert.alert('Cannot Redeem', err.message);
    },
  });

  if (isLoading || !perk) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}> 
          <Ionicons name="gift-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{isLoading ? 'Loading...' : 'Perk not found'}</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  const typeInfo = PERK_TYPE_INFO[perk.perkType] || PERK_TYPE_INFO.discount_percent;
  const canRedeem = (() => {
    if (perk.isMembershipRequired && (!membership?.tier || membership.tier === 'free')) return false;
    if (perk.usageLimit && (perk.usedCount || 0) >= perk.usageLimit) return false;
    return true;
  })();
  const usagePercent = perk.usageLimit ? Math.round(((perk.usedCount || 0) / perk.usageLimit) * 100) : 0;
  const remaining = perk.usageLimit ? perk.usageLimit - (perk.usedCount || 0) : null;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/perks/${id}`;
      await Share.share({
        title: `${perk.title} - CulturePass Perk`,
        message: `Check out this perk on CulturePass: ${perk.title}! ${perk.description || ''} ${perk.providerName ? `From ${perk.providerName}.` : ''}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  const handleRedeem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canRedeem && perk.isMembershipRequired) {
      router.push('/membership/upgrade');
    } else {
      redeemMutation.mutate(perk.id);
    }
  };

  const isIndigenous = perk.category === 'indigenous';

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <PerkHero
          perk={perk}
          topInset={topInset}
          typeInfo={typeInfo}
          isIndigenous={isIndigenous}
          onShare={handleShare}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <PerkAbout perk={perk} />
          <PerkDetails perk={perk} typeInfo={typeInfo} />
          <PerkAvailability perk={perk} typeInfo={typeInfo} remaining={remaining} usagePercent={usagePercent} />
          <PerkMembershipCard perk={perk} />
          <PerkIndigenousCard isIndigenous={isIndigenous} />

          {perk.endDate && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <View style={styles.expiryRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.expiryText, { color: colors.text }]}>Valid until {new Date(perk.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <PerkCouponModal
          showCoupon={showCoupon}
          couponCode={couponCode}
          setShowCoupon={setShowCoupon}
        />

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 14 }]}> 
          <Pressable
            onPress={handleRedeem}
            disabled={(!canRedeem && !perk.isMembershipRequired) || redeemMutation.isPending}
            style={({ pressed }) => [
              styles.redeemBtn,
              !canRedeem && !perk.isMembershipRequired && styles.redeemBtnDisabled,
              !canRedeem && perk.isMembershipRequired && { backgroundColor: colors.info + '12', borderColor: colors.info },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={canRedeem ? 'Redeem perk' : (perk.isMembershipRequired ? 'Upgrade to CulturePass+' : 'Fully Redeemed')}
          >
            <Ionicons
              name={canRedeem ? 'gift' : (perk.isMembershipRequired ? 'star' : 'lock-closed')}
              size={20}
              color={canRedeem ? colors.textInverse : (perk.isMembershipRequired ? colors.info : colors.textSecondary)}
            />
            <Text style={[
              styles.redeemBtnText,
              !canRedeem && !perk.isMembershipRequired && styles.redeemBtnTextDisabled,
              !canRedeem && perk.isMembershipRequired && { color: colors.info },
              canRedeem && { color: colors.textInverse },
            ]}>
              {redeemMutation.isPending ? 'Redeeming...' : !canRedeem ? (perk.isMembershipRequired ? 'Upgrade to CulturePass+' : 'Fully Redeemed') : 'Redeem Now'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ErrorBoundary>
  );
// ...existing code...
}

// Theme-aware styles
const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { fontSize: 16, fontFamily: 'Poppins_500Medium', marginTop: 12 },
  backLink: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    marginTop: 8,
  },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 16,
  },
  redeemBtnDisabled: {
    backgroundColor: colors.surface,
  },
  upgradeBtn: {
    borderWidth: 1.5,
  },
  redeemBtnText: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
  },
  redeemBtnTextDisabled: { color: colors.textTertiary },
  upgradeBtnText: {},
});

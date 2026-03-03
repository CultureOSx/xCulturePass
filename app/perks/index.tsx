import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';

import { Perk } from '@/components/perks/types';
import { PERK_TYPE_INFO } from '@/components/perks/constants';
import { formatValue } from '@/components/perks/utils';
import { useColors } from '@/hooks/useColors';

const CATEGORIES = [
  { id: 'All', label: 'All Perks', icon: 'gift' },
  { id: 'tickets', label: 'Tickets', icon: 'ticket' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'dining', label: 'Dining', icon: 'restaurant' },
  { id: 'shopping', label: 'Shopping', icon: 'bag' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'indigenous', label: 'First Nations', icon: 'earth' },
];

export default function PerksScreen() {
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 0 : 0;
  const { userId } = useAuth();
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: perks = [], isLoading } = useQuery<Perk[]>({ queryKey: ['/api/perks'] });
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
      Alert.alert('Redeemed!', 'Perk has been added to your account.');
    },
    onError: (err: Error) => {
      Alert.alert('Cannot Redeem', err.message);
    },
  });

  const filteredPerks = selectedCategory === 'All'
    ? perks
    : perks.filter(p => p.category === selectedCategory);

  const canRedeem = (perk: Perk) => {
    if (perk.isMembershipRequired && membership?.tier === 'free') return false;
    if (perk.usageLimit && (perk.usedCount || 0) >= perk.usageLimit) return false;
    return true;
  };

  const handleSharePerk = async (perk: Perk) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${perk.title} - CulturePass Perk`,
        message: `Check out this perk on CulturePass: ${perk.title}! ${perk.description || ''} ${perk.providerName ? `From ${perk.providerName}.` : ''}`,
      });
    } catch {}
  };

  const activePerkCount = perks.filter(p => canRedeem(p)).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Perks & Benefits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBanner}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="gift" size={28} color={colors.textInverse} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textInverse }]}>Exclusive Perks</Text>
          <Text style={[styles.heroSub, { color: colors.textInverse }]}>{activePerkCount} perks available for you</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{perks.length}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{activePerkCount}</Text>
              <Text style={styles.heroStatLabel}>Available</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{membership?.tier?.toUpperCase() || 'FREE'}</Text>
              <Text style={styles.heroStatLabel}>Your Tier</Text>
            </View>
          </View>
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <Pressable key={cat.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(cat.id); }}
                  style={[styles.catPill, isActive && styles.catPillActive]}>
                  <Ionicons name={cat.icon as any} size={16} color={isActive ? colors.textInverse : colors.text} />
                  <Text style={[styles.catPillText, { color: colors.text }, isActive && [styles.catPillTextActive, { color: colors.textInverse }]]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="hourglass" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Loading perks...</Text>
            </View>
          ) : filteredPerks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No perks available in this category</Text>
            </View>
          ) : (
            filteredPerks.map((perk, i) => {
              const typeInfo = PERK_TYPE_INFO[perk.perkType] || PERK_TYPE_INFO.discount_percent;
              const redeemable = canRedeem(perk);
              const usagePercent = perk.usageLimit ? Math.round(((perk.usedCount || 0) / perk.usageLimit) * 100) : 0;
              return (
                <View key={perk.id}>
                  <Pressable style={styles.perkCard} onPress={() => router.push(`/perks/${perk.id}`)}>
                    <View style={styles.perkTop}>
                      <View style={[styles.perkBadge, { backgroundColor: typeInfo.color + '15' }]}>
                        <Ionicons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
                      </View>
                      <View style={styles.perkInfo}>
                        <Text style={styles.perkTitle} numberOfLines={2}>{perk.title}</Text>
                        <View style={styles.providerRow}>
                          <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.perkProvider, { color: colors.text }]}>{perk.providerName || 'CulturePass'}</Text>
                        </View>
                      </View>
                      <View style={styles.perkValueWrap}>
                        <View style={[styles.perkValue, { backgroundColor: typeInfo.color + '15' }]}>
                          <Text style={[styles.perkValueText, { color: typeInfo.color }]}>{formatValue(perk)}</Text>
                        </View>
                        <Pressable hitSlop={8} onPress={() => handleSharePerk(perk)} style={styles.perkShareBtn}>
                          <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>

                    {perk.description && <Text style={[styles.perkDesc, { color: colors.text }]} numberOfLines={2}>{perk.description}</Text>}

                    <View style={styles.perkMeta}>
                      {perk.isMembershipRequired && (
                        <View style={[styles.metaTag, { backgroundColor: colors.secondary + '15' }]}> 
                          <Ionicons name="diamond" size={12} color={colors.secondary} />
                          <Text style={[styles.metaTagText, { color: colors.secondary }]}>{perk.requiredMembershipTier || 'Premium'} Only</Text>
                        </View>
                      )}
                      {perk.usageLimit && (
                        <View style={styles.metaTag}>
                          <Ionicons name="people" size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaTagText, { color: colors.text }]}>{(perk.usageLimit - (perk.usedCount || 0))} left</Text>
                        </View>
                      )}
                      {perk.endDate && (
                        <View style={styles.metaTag}>
                          <Ionicons name="calendar" size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaTagText, { color: colors.text }]}>Ends {new Date(perk.endDate).toLocaleDateString()}</Text>
                        </View>
                      )}
                      {perk.perUserLimit && (
                        <View style={styles.metaTag}>
                          <Ionicons name="person" size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaTagText, { color: colors.text }]}>Max {perk.perUserLimit}/user</Text>
                        </View>
                      )}
                    </View>

                    {perk.usageLimit && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.min(usagePercent, 100)}%`, backgroundColor: usagePercent > 80 ? Colors.error : typeInfo.color }]} />
                        </View>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{usagePercent}% claimed</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); redeemMutation.mutate(perk.id); }}
                      disabled={!redeemable || redeemMutation.isPending}
                      style={[styles.redeemBtn, !redeemable && styles.redeemBtnDisabled]}>
                      <Ionicons name={redeemable ? 'gift' : 'lock-closed'} size={16} color={redeemable ? colors.textInverse : colors.textSecondary} />
                      <Text style={[styles.redeemBtnText, { color: colors.textInverse }, !redeemable && styles.redeemBtnTextDisabled]}>
                        {!redeemable ? (perk.isMembershipRequired ? 'Upgrade to Unlock' : 'Fully Redeemed') : 'Redeem Now'}
                      </Text>
                    </Pressable>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  heroBanner: { marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.primary, borderRadius: 20, padding: 24, alignItems: 'center' },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, gap: 16, width: '100%', justifyContent: 'center' },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFF' },
  heroStatLabel: { fontSize: 10, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  catRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catPillText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  catPillTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  perkCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 12 },
  perkTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  perkBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  perkInfo: { flex: 1 },
  perkTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.text, lineHeight: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  perkProvider: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  perkValueWrap: { alignItems: 'flex-end', gap: 6 },
  perkValue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  perkValueText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  perkShareBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  perkDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  perkMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaTagText: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.backgroundSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: Colors.textTertiary, width: 70, textAlign: 'right' },
  redeemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12 },
  redeemBtnDisabled: { backgroundColor: Colors.backgroundSecondary },
  redeemBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFF' },
  redeemBtnTextDisabled: { color: Colors.textTertiary },
});

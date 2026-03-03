import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Linking,

  Share,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import type { User, Membership } from '@shared/schema';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

import {
  CP,
  ACCENT_COLORS,
  SOCIAL_ICONS,
  TIER_CONFIG,

  formatMemberDate,
  getInitials,
} from './constants';
import { styles } from './styles';

import { BrandDots } from './components/BrandDots';
import { StatItem } from './components/StatItem';
import { SectionHeader } from './components/SectionHeader';
import { SocialCard } from './components/SocialCard';
import { DetailRow } from './components/DetailRow';
import { LoadingSkeleton } from './components/LoadingSkeleton';

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: usersData, isLoading } = useQuery<User[]>({ queryKey: ['/api/users'] });
  const user   = usersData?.[0];
  const userId = user?.id;

  const { data: membership } = useQuery<Membership>({
    queryKey: [`/api/membership/${userId}`],
    enabled: !!userId,
  });

  const tier     = membership?.tier ?? 'free';
  const tierConf = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

  const socialLinks   = useMemo(() => (user?.socialLinks ?? {}) as Record<string, string | undefined>, [user?.socialLinks]);
  const activeSocials = useMemo(() => SOCIAL_ICONS.filter(s => socialLinks[s.key]), [socialLinks]);

  const displayName  = user?.displayName ?? 'CulturePass User';
  const initials     = useMemo(() => getInitials(displayName), [displayName]);
  const locationText = useMemo(() => [user?.city, user?.country].filter(Boolean).join(', '), [user?.city, user?.country]);
  const memberSince  = useMemo(() => formatMemberDate(user?.createdAt), [user?.createdAt]);
  const hasDetails   = !!(locationText || user?.website || user?.phone);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/u/${user?.username}`;
      await Share.share({
        title: `${displayName} on CulturePass`,
        message: `Check out ${displayName}'s profile on CulturePass!\n\nCPID: ${user?.culturePassId}\n@${user?.username}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch { /* noop */ }
  }, [displayName, user?.culturePassId, user?.username]);

  const handleOpenSocial = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = socialLinks[key];
    if (url) Linking.openURL(url);
  }, [socialLinks]);

  if (isLoading) return <LoadingSkeleton topInset={topInset} />;

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="person-outline" size={52} color={CP.muted} />
        <Text style={[styles.errorText, { marginTop: 14 }]}>Profile not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 30 }}
        bounces={false}
      >
        <LinearGradient
          colors={[CP.dark, '#1a0533', '#0a2a2a']}
          style={[styles.hero, { paddingTop: topInset + 8 }]}
        >
          <View style={styles.arcOuter} pointerEvents="none" />
          <View style={styles.arcInner} pointerEvents="none" />

          <View style={styles.heroRingsWm} pointerEvents="none">
            <BrandDots size={60} opacity={0.03} />
          </View>

          <View style={styles.heroNav}>
            <Pressable style={styles.navBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
            </Pressable>
            <Pressable style={styles.navBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={colors.textInverse} />
            </Pressable>
          </View>

          <View style={styles.heroCenter}>
            <View style={styles.avatarGlow} pointerEvents="none" />
            <LinearGradient
              colors={[CP.teal, CP.purple]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatarGradientRing}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </LinearGradient>

            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-sharp" size={14} color={CP.dark} />
              </View>
            )}

            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroHandle}>@{user.username}</Text>

            <View style={styles.heroPills}>
              {user.role === 'admin' && (
                <View style={styles.heroPill}>
                  <Ionicons name="people" size={12} color={CP.muted} />
                  <Text style={styles.heroPillText}>Admin</Text>
                </View>
              )}
              {user.isVerified && (
                <View style={[styles.heroPill, styles.heroPillAccent]}>
                  <Ionicons name="shield-checkmark" size={12} color={CP.teal} />
                  <Text style={[styles.heroPillText, { color: CP.teal }]}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsBar}>
            <LinearGradient colors={[CP.teal + '00', CP.teal, CP.teal + '00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statsAccentLine} />
            <StatItem value={(user as any).connectionsCount ?? 0} label="Connections" />
            <View style={styles.statDivider} />
            <StatItem value={(user as any).eventsAttended ?? 0} label="Events" />
            <View style={styles.statDivider} />
            <StatItem value={(user as any).points ?? 0} label="Points" />
          </View>
        </LinearGradient>

        <View style={styles.tierRow}>
          <LinearGradient
            colors={[tierConf.color + '1A', tierConf.color + '05']}
            style={[styles.tierBadge, { borderColor: tierConf.color + '40' }]}
          >
            <Ionicons name={tierConf.icon as any} size={16} color={tierConf.color} />
            <Text style={[styles.tierText, { color: tierConf.color }]}>{tierConf.label} Member</Text>
          </LinearGradient>

          {memberSince ? (
            <View style={styles.memberSince}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.memberSinceText}>Joined {memberSince}</Text>
            </View>
          ) : null}
        </View>

        {user.bio && (
          <View style={styles.section}>
            <SectionHeader title="About" />
            <View style={styles.card}>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          </View>
        )}

        {activeSocials.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Social" />
            <View style={styles.socialGrid}>
              {activeSocials.map((s, i) => (
                <SocialCard
                  key={s.key}
                  icon={s.icon as any}
                  label={s.label}
                  color={s.color}
                  accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                  onPress={() => handleOpenSocial(s.key)}
                />
              ))}
            </View>
          </View>
        )}

        {hasDetails && (
          <View style={styles.section}>
            <SectionHeader title="Details" />
            <View style={styles.card}>
              {locationText ? (
                <DetailRow
                  icon="location-outline"
                  iconBg={CP.ember + '1A'}
                  iconColor={CP.ember}
                  label="Location"
                  value={locationText}
                />
              ) : null}

              {user.website ? (
                <>
                  {locationText && <View style={styles.detailDivider} />}
                  <DetailRow
                    icon="globe-outline"
                    iconBg={CP.info + '1A'}
                    iconColor={CP.info}
                    label="Website"
                    value={user.website.replace(/^https?:\/\//, '')}
                    valueColor={CP.info}
                    showArrow
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openURL(user.website!.startsWith('http') ? user.website! : `https://${user.website}`);
                    }}
                  />
                </>
              ) : null}
            </View>
          </View>
        )}

        {user.culturePassId && (
          <View style={styles.section}>
            <SectionHeader title="Digital ID" />

            <LinearGradient
              colors={['#2A1B3D', '#1A0B2E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.cpidCard}
            >
              <LinearGradient colors={[CP.purple, CP.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cpidAccentEdge} />

              <View style={styles.cpidDotsWm} pointerEvents="none">
                <BrandDots size={16} opacity={0.15} />
              </View>

              <View style={styles.cpidTop}>
                <View style={styles.cpidLogoRow}>
                  <LinearGradient colors={[CP.teal, CP.purple]} style={styles.cpidLogoIcon}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.textInverse, fontSize: 13 }}>CP</Text>
                  </LinearGradient>
                  <Text style={styles.cpidLogoText}>CulturePass</Text>
                </View>
                {user.isVerified && (
                  <View style={styles.cpidVerifiedIcon}>
                    <Ionicons name="shield-checkmark" size={16} color={CP.teal} />
                  </View>
                )}
              </View>

              <View style={styles.cpidCenter}>
                <Text style={styles.cpidLabel}>MEMBER ID</Text>
                <Text style={styles.cpidValue}>{user.culturePassId.toUpperCase()}</Text>
                <LinearGradient colors={[CP.teal + '00', CP.teal, CP.teal + '00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cpidUnderline} />
              </View>

              <View style={styles.cpidMeta}>
                <View style={styles.cpidMetaItem}>
                  <Text style={styles.cpidMetaLabel}>Status</Text>
                  <Text style={[styles.cpidMetaValue, { color: CP.teal }]}>Active</Text>
                </View>
                <View style={styles.cpidMetaItem}>
                  <Text style={styles.cpidMetaLabel}>Tier</Text>
                  <Text style={styles.cpidMetaValue}>{tierConf.label}</Text>
                </View>
              </View>

              <View style={styles.cpidFooter}>
                <Text style={styles.cpidFooterText}>{displayName}</Text>
                <Text style={styles.cpidFooterText}>@{user.username}</Text>
              </View>
            </LinearGradient>

            <Pressable
              style={styles.viewQrBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile/qr');
              }}
            >
              <LinearGradient colors={[CP.teal + '1A', CP.purple + '0D']} style={styles.viewQrIconWrap}>
                <Ionicons name="qr-code-outline" size={20} color={CP.teal} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewQrText}>View QR Code</Text>
                <Text style={styles.viewQrSub}>Scan to share your profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={CP.muted} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

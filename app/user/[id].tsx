import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import type { User, Membership } from '@shared/schema';
import { LinearGradient } from 'expo-linear-gradient';

import UserProfileHero from '@/components/user/UserProfileHero';
import UserProfileTier from '@/components/user/UserProfileTier';
import UserProfileAbout from '@/components/user/UserProfileAbout';
import UserProfileSocial from '@/components/user/UserProfileSocial';
import UserProfileDetails from '@/components/user/UserProfileDetails';
import UserProfileIdentity from '@/components/user/UserProfileIdentity';
import { CP, SOCIAL_ICONS, TIER_CONFIG, formatMemberDate, getInitials } from '@/components/user/profileUtils';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/users', id as string],
    enabled: !!id,
  });

  const { data: membership } = useQuery<Membership>({
    queryKey: [`/api/membership/${id}`],
    enabled: !!id,
  });

  const tier     = membership?.tier ?? 'free';
  const tierConf = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

  const socialLinks   = useMemo(() => (user?.socialLinks ?? {}) as Record<string, string | undefined>, [user?.socialLinks]);
  const activeSocials = useMemo(() => SOCIAL_ICONS.filter(s => socialLinks[s.key]), [socialLinks]);

  const displayName  = user?.displayName ?? 'CulturePass User';
  const initials     = useMemo(() => getInitials(displayName), [displayName]);
  const locationText = useMemo(() => [user?.city, user?.country].filter(Boolean).join(', '), [user?.city, user?.country]);
  const memberSince  = useMemo(() => formatMemberDate(user?.createdAt), [user?.createdAt]);

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

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[CP.dark, '#1a0533', '#0a2a2a']}
          style={[styles.hero, { paddingTop: topInset + 8, justifyContent: 'center', alignItems: 'center', minHeight: 340 }]}
        >
          <ActivityIndicator size="large" color={CP.teal} />
          <Text style={{ color: CP.muted, marginTop: 12, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>
            Loading profile...
          </Text>
        </LinearGradient>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="person-outline" size={52} color={CP.muted} />
        <Text style={[styles.errorText, { marginTop: 14 }]}>Profile not found</Text>
        <Pressable style={styles.goBackButton} onPress={handleBack}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 52 }}
      >
        <UserProfileHero
          user={user}
          topInset={topInset}
          handleBack={handleBack}
          handleShare={handleShare}
          initials={initials}
          displayName={displayName}
          locationText={locationText}
        />

        <UserProfileTier
          tierConf={tierConf}
          memberSince={memberSince}
        />

        <UserProfileAbout user={user} />

        <UserProfileSocial activeSocials={activeSocials} socialLinks={socialLinks} />

        <UserProfileDetails user={user} locationText={locationText} />

        <UserProfileIdentity
          user={user}
          displayName={displayName}
          memberSince={memberSince}
          tierConf={tierConf}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CP.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  errorText:        { fontSize: 16, fontFamily: 'Poppins_500Medium', color: CP.muted },
  goBackButton:     { marginTop: 16, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14, backgroundColor: CP.purple },
  goBackButtonText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFF' },

  hero: { paddingBottom: 30, overflow: 'hidden' },
});

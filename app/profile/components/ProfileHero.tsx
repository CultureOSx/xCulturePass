import React from 'react';
import { View, Text, Pressable, StyleSheet, Share, Linking } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Profile } from '@/shared/schema';
import { confirmAndReport } from '@/lib/reporting';

interface ProfileHeroProps {
  profile: Profile;
  entityColor: string;
  entityIcon: string;
  topInset: number;
  id: string;
}

export function ProfileHero({ profile, entityColor, entityIcon, topInset, id }: ProfileHeroProps) {
  const colors = useColors();
  return (
    <View style={[styles.hero, { backgroundColor: entityColor, paddingTop: topInset }]}>
      <View style={styles.heroOverlay}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
          <Pressable
            style={styles.shareButton}
            onPress={() => confirmAndReport({ targetType: 'profile', targetId: String(profile.id) })}
          >
            <Ionicons name="flag-outline" size={20} color={colors.textInverse} />
          </Pressable>
          <Pressable
            style={styles.shareButton}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                const shareUrl = `https://culturepass.app/profile/${id}`;
                await Share.share({
                  title: `${profile.name} on CulturePass`,
                  message: `Check out ${profile.name} on CulturePass!${profile.category ? ` ${profile.category}.` : ''}${profile.location ? ` ${profile.location}.` : ''} Join and connect with this ${profile.entityType}!\n\n${shareUrl}`,
                  url: shareUrl,
                });
              } catch {}
            }}
          >
            <Ionicons name="share-outline" size={20} color={colors.textInverse} />
          </Pressable>
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={entityIcon as any} size={36} color={colors.textInverse} />
          </View>
          <View style={styles.heroNameRow}>
            <Text style={[styles.heroTitle, { color: colors.textInverse }]} numberOfLines={2}>{profile.name}</Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />
                <Text style={[styles.verifiedText, { color: colors.textInverse }]}>Verified</Text>
              </View>
            )}
          </View>
          {profile.culturePassId && (
            <View style={styles.cpidBadge}>
              <Ionicons name="finger-print" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.cpidBadgeText}>{profile.culturePassId}</Text>
            </View>
          )}
          {(profile.category || profile.location) && (
            <View style={styles.heroMetaRow}>
              {profile.category && (
                <View style={styles.heroPill}>
                  <Ionicons name="pricetag" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroPillText}>{profile.category}</Text>
                </View>
              )}
              {profile.location && (
                <Pressable
                  style={styles.heroPill}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const query = [profile.city, profile.country].filter(Boolean).join(', ') || profile.location;
                    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query || '')}`);
                  }}
                >
                  <Ionicons name="location" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroPillText}>{profile.location}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260 },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: { gap: 6 },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  cpidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  cpidBadgeText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.95)', letterSpacing: 1 },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.9)',
  },
});

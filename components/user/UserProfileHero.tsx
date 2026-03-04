import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@shared/schema';
import { CP, formatNumber } from './profileUtils';

type Props = {
  user: User;
  topInset: number;
  handleBack: () => void;
  handleShare: () => void;
  initials: string;
  displayName: string;
  locationText: string;
};

export default function UserProfileHero({
  user,
  topInset,
  handleBack,
  handleShare,
  initials,
  displayName,
  locationText,
}: Props) {
  return (
    <LinearGradient
      colors={[CP.dark, '#1a0533', '#0a2a2a']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.hero, { paddingTop: topInset + 8 }]}
    >
      <View style={styles.arcOuter} pointerEvents="none" />
      <View style={styles.arcInner} pointerEvents="none" />

      <View style={styles.heroNav}>
        <Pressable
          style={styles.navBtn}
          onPress={handleBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <Pressable
          style={styles.navBtn}
          onPress={handleShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share profile"
        >
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.heroCenter}>
        <View style={styles.avatarGlow} />

        <LinearGradient
          colors={[CP.teal, CP.purple, CP.teal]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.avatarGradientRing}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </LinearGradient>

        {user.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={10} color="#FFF" />
          </View>
        )}

        <Text style={styles.heroName}>{displayName}</Text>
        {user.username && <Text style={styles.heroHandle}>@{user.username}</Text>}

        <View style={styles.heroPills}>
          {user.culturePassId && (
            <View style={[styles.heroPill, styles.heroPillAccent]}>
              <Ionicons name="finger-print" size={12} color={CP.teal} />
              <Text style={[styles.heroPillText, { color: CP.teal }]}>{user.culturePassId}</Text>
            </View>
          )}
          {locationText ? (
            <View style={styles.heroPill}>
              <Ionicons name="location" size={12} color={CP.muted} />
              <Text style={styles.heroPillText}>{locationText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.statsBar}>
        <LinearGradient
          colors={['transparent', CP.teal, CP.purple, CP.teal, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.statsAccentLine}
        />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatNumber(user.followersCount ?? 0)}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatNumber(user.followingCount ?? 0)}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatNumber(user.likesCount ?? 0)}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 30, overflow: 'hidden' },

  arcOuter: {
    position: 'absolute', top: -90, right: -90,
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 30, borderColor: CP.teal + '10',
  },
  arcInner: {
    position: 'absolute', top: -44, right: -44,
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 20, borderColor: CP.purple + '10',
  },

  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
  },

  avatarGlow: {
    position: 'absolute', top: -20,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: CP.teal + '0A',
    shadowColor: CP.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 40,
  },
  avatarGradientRing: {
    width: 104, height: 104, borderRadius: 52,
    padding: 3, marginBottom: 18,
    shadowColor: CP.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 18,
    elevation: 12,
  },
  avatarInner: {
    flex: 1, borderRadius: 50,
    backgroundColor: CP.darkMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 33, color: CP.teal, letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 74,
    alignSelf: 'center',
    marginLeft: 38,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: CP.teal,
    borderWidth: 3, borderColor: CP.dark,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: CP.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7, shadowRadius: 5,
  },

  heroName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26, color: '#FFF',
    textAlign: 'center', letterSpacing: -0.4,
  },
  heroHandle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15, color: CP.muted,
    marginTop: 3, marginBottom: 16,
  },

  heroPills: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8,
  },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
  },
  heroPillAccent: {
    backgroundColor: CP.teal + '16',
    borderColor: CP.teal + '35',
  },
  heroPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.2,
  },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22, paddingVertical: 20, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  statsAccentLine: {
    position: 'absolute', top: 0, left: 30, right: 30,
    height: 1.5, opacity: 0.6,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFF', letterSpacing: -0.5 },
  statLabel:   { fontFamily: 'Poppins_400Regular', fontSize: 11, color: CP.muted, marginTop: 3, letterSpacing: 0.4 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
});
